const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Supprimer tous les pointages de décembre pour Léa
  const deleted = await prisma.pointage.deleteMany({
    where: {
      userId: 56,
      horodatage: {
        gte: new Date('2025-12-01T00:00:00Z'),
        lt: new Date('2025-12-31T23:59:59Z')
      }
    }
  });
  
  console.log(`✅ Supprimé ${deleted.count} pointages`);
  
  // Recréer tous les pointages correctement
  const scenarios = [
    {
      date: '2025-12-08',
      pointages: [
        { arrivee: '08:45', depart: '13:00' },
        { arrivee: '14:00', depart: '18:30' }
      ]
    },
    {
      date: '2025-12-09',
      pointages: [
        { arrivee: '09:15', depart: '13:00' },
        { arrivee: '14:00', depart: '17:45' }
      ]
    },
    {
      date: '2025-12-10',
      pointages: [
        { arrivee: '09:00', depart: '13:00' },
        { arrivee: '14:00', depart: '19:00' }
      ]
    },
    {
      date: '2025-12-11',
      pointages: [
        { arrivee: '10:30', depart: '14:00' },
        { arrivee: '15:00', depart: '19:00' }
      ]
    },
    {
      date: '2025-12-12',
      pointages: [
        { arrivee: '09:00', depart: '13:30' },
        { arrivee: '14:00', depart: '17:00' }
      ]
    },
    {
      date: '2025-12-13',
      pointages: [
        { arrivee: '10:00', depart: '16:15' }
      ]
    },
    {
      date: '2025-12-14',
      pointages: [
        { arrivee: '14:10', depart: '18:00' }
      ]
    }
  ];
  
  let total = 0;
  for (const scenario of scenarios) {
    for (const pointage of scenario.pointages) {
      // Arrivée
      await prisma.pointage.create({
        data: {
          userId: 56,
          type: 'arrivee',
          horodatage: new Date(`${scenario.date}T${pointage.arrivee}:00+01:00`)
        }
      });
      
      // Départ
      await prisma.pointage.create({
        data: {
          userId: 56,
          type: 'depart',
          horodatage: new Date(`${scenario.date}T${pointage.depart}:00+01:00`)
        }
      });
      
      total += 2;
    }
    console.log(`✅ ${scenario.date}: ${scenario.pointages.length} paires créées`);
  }
  
  console.log(`\n🎉 Total: ${total} pointages créés`);
  
  await prisma.$disconnect();
})();
