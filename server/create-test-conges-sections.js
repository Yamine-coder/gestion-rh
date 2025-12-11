const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver l'utilisateur yjordan496@gmail.com
  const user = await prisma.user.findUnique({
    where: { email: 'yjordan496@gmail.com' }
  });

  if (!user) {
    console.log('❌ Utilisateur non trouvé');
    return;
  }

  console.log(`📧 Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);

  // Dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Créer 3 congés de chaque type pour tester les 3 sections
  const conges = [
    // SECTION 1: Congés à venir (approuvés, date future)
    {
      employeId: user.id,
      type: 'Congés payés',
      dateDebut: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
      dateFin: new Date(today.getTime() + 11 * 24 * 60 * 60 * 1000), // Dans 11 jours
      statut: 'approuvé',
      motif: 'Vacances d\'hiver',
      nbJours: 5
    },
    {
      employeId: user.id,
      type: 'RTT',
      dateDebut: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000), // Dans 21 jours
      dateFin: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000), // Dans 21 jours
      statut: 'approuvé',
      motif: 'Week-end prolongé',
      nbJours: 1
    },

    // SECTION 2: En attente de validation
    {
      employeId: user.id,
      type: 'Congés maladie',
      dateDebut: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
      dateFin: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // Dans 15 jours
      statut: 'en attente',
      motif: 'Rendez-vous médical',
      nbJours: 2
    },
    {
      employeId: user.id,
      type: 'Congés payés',
      dateDebut: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // Dans 30 jours
      dateFin: new Date(today.getTime() + 37 * 24 * 60 * 60 * 1000), // Dans 37 jours
      statut: 'en attente',
      motif: 'Vacances de printemps',
      nbJours: 8
    },

    // SECTION 3: Historique (congés passés + refusés)
    {
      employeId: user.id,
      type: 'Congés payés',
      dateDebut: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Il y a 30 jours
      dateFin: new Date(today.getTime() - 26 * 24 * 60 * 60 * 1000), // Il y a 26 jours
      statut: 'approuvé',
      motif: 'Vacances passées',
      nbJours: 5
    },
    {
      employeId: user.id,
      type: 'RTT',
      dateDebut: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // Il y a 10 jours
      dateFin: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // Il y a 10 jours
      statut: 'approuvé',
      motif: 'RTT du mois dernier',
      nbJours: 1
    },
    {
      employeId: user.id,
      type: 'Congés sans solde',
      dateDebut: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // Dans 5 jours
      dateFin: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
      statut: 'refusé',
      motif: 'Refusé car période de forte activité',
      nbJours: 3
    }
  ];

  // Créer les congés
  for (const conge of conges) {
    const { employeId, motif, nbJours, ...congeData } = conge;
    await prisma.conge.create({ 
      data: {
        ...congeData,
        user: { connect: { id: user.id } }
      }
    });
  }

  console.log(`\n✅ ${conges.length} congés de test créés avec succès !\n`);
  
  console.log('📊 Répartition:');
  console.log(`  - Congés à venir (approuvés futurs): 2`);
  console.log(`  - En attente de validation: 2`);
  console.log(`  - Historique (passés + refusés): 3`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
