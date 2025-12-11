const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Shifts de Marco (ID 93) pour le 4-5 décembre
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: 93,
      date: {
        gte: new Date('2025-12-04'),
        lte: new Date('2025-12-06')
      }
    }
  });
  
  console.log('=== SHIFTS MARCO (ID 93) ===');
  shifts.forEach(s => {
    console.log('Date:', s.date.toISOString().split('T')[0], '| Type:', s.type);
    console.log('  Segments JSON:', JSON.stringify(s.segments));
  });
  
  // Pointages de Marco
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: 93,
      horodatage: {
        gte: new Date('2025-12-04'),
        lte: new Date('2025-12-06')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\n=== POINTAGES MARCO ===');
  if (pointages.length === 0) {
    console.log('Aucun pointage trouvé');
  } else {
    pointages.forEach(p => {
      console.log(p.horodatage.toISOString(), '|', p.type);
    });
  }
  
  // Anomalies de Marco
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: 93,
      date: {
        gte: new Date('2025-12-04'),
        lte: new Date('2025-12-06')
      }
    }
  });
  
  console.log('\n=== ANOMALIES MARCO ===');
  if (anomalies.length === 0) {
    console.log('Aucune anomalie trouvée');
  } else {
    anomalies.forEach(a => {
      console.log(a.date.toISOString().split('T')[0], '|', a.type, '|', a.statut);
    });
  }
  
  await prisma.$disconnect();
}

main();
