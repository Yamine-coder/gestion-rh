const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnomalies() {
  const anomalies = await prisma.anomalie.findMany({
    where: { employeId: 110 },
    orderBy: { date: 'desc' },
    take: 5
  });
  
  console.log('Anomalies pour Jordan (ID 110):');
  console.log(JSON.stringify(anomalies, null, 2));
  
  await prisma.$disconnect();
}

checkAnomalies();
