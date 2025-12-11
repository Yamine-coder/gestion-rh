const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Rattrapage des historiques manquants pour les demandes approuvées...\n');
  
  // Récupérer toutes les demandes approuvées
  const demandesApprouvees = await prisma.demandes_modification.findMany({
    where: { statut: 'approuve' },
    orderBy: { date_traitement: 'desc' }
  });
  
  console.log(`📝 ${demandesApprouvees.length} demande(s) approuvée(s) trouvée(s)\n`);
  
  for (const demande of demandesApprouvees) {
    // Vérifier si un historique existe déjà pour cette demande (même date approximative)
    const historiqueExistant = await prisma.historique_modifications.findFirst({
      where: {
        employe_id: demande.employe_id,
        champ_modifie: demande.champ_modifie,
        nouvelle_valeur: demande.nouvelle_valeur
      }
    });
    
    if (!historiqueExistant) {
      // Créer l'entrée d'historique manquante
      const nouvelHistorique = await prisma.historique_modifications.create({
        data: {
          employe_id: demande.employe_id,
          champ_modifie: demande.champ_modifie,
          ancienne_valeur: demande.ancienne_valeur,
          nouvelle_valeur: demande.nouvelle_valeur,
          date_modification: demande.date_traitement || new Date()
        }
      });
      
      console.log(`✅ Historique créé pour: ${demande.champ_modifie} (demande #${demande.id})`);
      console.log(`   Ancienne: ${demande.ancienne_valeur?.substring(0, 30)}`);
      console.log(`   Nouvelle: ${demande.nouvelle_valeur?.substring(0, 30)}`);
      console.log(`   Date: ${demande.date_traitement}\n`);
    } else {
      console.log(`⏭️ Historique déjà existant pour: ${demande.champ_modifie} (demande #${demande.id})`);
    }
  }
  
  console.log('\n✅ Rattrapage terminé !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
