const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAnomaliesDate() {
  // Corriger la date des anomalies de Jordan pour qu'elles soient trouvables
  const result = await prisma.anomalie.updateMany({
    where: { employeId: 110 },
    data: { date: new Date('2025-12-05T00:00:00.000Z') }
  });
  
  console.log('✅ Anomalies mises à jour:', result.count);
  
  // Vérifier
  const anomalies = await prisma.anomalie.findMany({
    where: { employeId: 110 }
  });
  
  console.log('\nAnomalies Jordan:');
  anomalies.forEach(a => {
    console.log(`  - ${a.type}: date=${a.date.toISOString()}`);
  });
  
  await prisma.$disconnect();
}

fixAnomaliesDate();
