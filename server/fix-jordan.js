const prisma = require('./prisma/client');

async function fixJordan() {
  console.log('CORRECTION COMPTE JORDAN');
  console.log('='.repeat(70));
  
  // Supprimer l'anomalie orpheline
  const result = await prisma.anomalie.deleteMany({
    where: {
      employeId: 110,
      type: 'pointage_hors_planning',
      date: {
        gte: new Date('2025-12-05T00:00:00.000Z'),
        lt: new Date('2025-12-06T00:00:00.000Z')
      }
    }
  });
  
  console.log('');
  console.log('Anomalies supprimees:', result.count);
  
  // Verifier qu'il n'y a plus d'anomalies
  const remaining = await prisma.anomalie.findMany({
    where: { employeId: 110 }
  });
  
  console.log('Anomalies restantes pour Jordan:', remaining.length);
  
  console.log('');
  console.log('OK - Le compte Jordan est maintenant propre!');
  console.log('Rafraichissez la page pour voir le changement.');
  
  await prisma.$disconnect();
}

fixJordan();
