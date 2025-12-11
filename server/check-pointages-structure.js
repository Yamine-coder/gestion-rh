const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPointages() {
  const pointages = await prisma.pointage.findMany({
    where: { userId: 110 },
    take: 10,
    orderBy: { horodatage: 'desc' }
  });
  
  console.log('Derniers pointages pour userId 110:');
  console.log(JSON.stringify(pointages, null, 2));
  
  await prisma.$disconnect();
}

checkPointages();
