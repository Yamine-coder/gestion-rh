// Script pour créer un congé approuvé avec date future (test section "Congés à venir")
const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Récupérer un employé existant
  const employe = await prisma.user.findFirst({
    where: { role: 'employee' }
  });

  if (!employe) {
    console.log('❌ Aucun employé trouvé');
    return;
  }

  console.log(`👤 Employé trouvé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);

  // Créer un congé approuvé pour la semaine prochaine
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() + 7); // Dans 7 jours
  dateDebut.setHours(0, 0, 0, 0);

  const dateFin = new Date(dateDebut);
  dateFin.setDate(dateFin.getDate() + 2); // 3 jours de congé

  const conge = await prisma.conge.create({
    data: {
      userId: employe.id,
      type: 'congés payés',
      statut: 'approuvé',  // <-- Approuvé pour apparaître dans "Congés à venir"
      dateDebut: dateDebut,
      dateFin: dateFin,
      motifEmploye: 'Congé test pour vérifier la section "Congés à venir"',
      vu: true
    }
  });

  console.log('\n✅ Congé de test créé avec succès!');
  console.log('─'.repeat(50));
  console.log(`📋 ID: ${conge.id}`);
  console.log(`📅 Du: ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')}`);
  console.log(`📌 Type: ${conge.type}`);
  console.log(`✅ Statut: ${conge.statut}`);
  console.log('─'.repeat(50));
  console.log('\n🔄 Rafraîchissez la page "Mes congés" pour voir la section "Congés à venir"');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
