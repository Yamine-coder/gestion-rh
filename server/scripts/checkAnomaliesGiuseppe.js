const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnomalies() {
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: 94,
      date: {
        gte: new Date('2026-01-26'),
        lt: new Date('2026-01-27')
      }
    }
  });
  
  console.log('Anomalies Giuseppe 26/01:');
  anomalies.forEach(a => {
    console.log(`  #${a.id} - ${a.type} - ${a.statut}`);
    if (a.details) {
      console.log(`    Details:`, JSON.stringify(a.details, null, 2));
    }
  });
  
  if (anomalies.length === 0) {
    console.log('  Aucune anomalie trouvée');
  }
  
  await prisma.$disconnect();
}

checkAnomalies();
