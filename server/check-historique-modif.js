const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vérifier l'historique des modifications pour l'employé 110
  const historique = await prisma.historique_modifications.findMany({
    where: { employe_id: 110 },
    orderBy: { date_modification: 'desc' },
    take: 10
  });
  
  console.log(`\n📜 ${historique.length} entrée(s) d'historique pour employé 110:\n`);
  
  if (historique.length === 0) {
    console.log('❌ Aucun historique trouvé !');
  } else {
    historique.forEach(h => {
      console.log(`ID: ${h.id}`);
      console.log(`  Champ: ${h.champ_modifie}`);
      console.log(`  Ancienne valeur: ${h.ancienne_valeur}`);
      console.log(`  Nouvelle valeur: ${h.nouvelle_valeur}`);
      console.log(`  Date: ${h.date_modification}`);
      console.log('');
    });
  }
  
  // Vérifier les demandes de modification traitées
  const demandes = await prisma.demandes_modification.findMany({
    where: { employe_id: 110 },
    orderBy: { date_demande: 'desc' },
    take: 10
  });
  
  console.log(`\n📝 ${demandes.length} demande(s) de modification pour employé 110:\n`);
  
  demandes.forEach(d => {
    console.log(`ID: ${d.id} | Champ: ${d.champ_modifie} | Statut: ${d.statut}`);
    console.log(`  Ancienne: ${d.ancienne_valeur?.substring(0, 30)}`);
    console.log(`  Nouvelle: ${d.nouvelle_valeur?.substring(0, 30)}`);
    console.log(`  Date demande: ${d.date_demande}`);
    console.log(`  Date traitement: ${d.date_traitement}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
