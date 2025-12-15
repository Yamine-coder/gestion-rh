const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Supprimer les pointages du 14 décembre pour user 110
  const deleted = await prisma.pointage.deleteMany({
    where: {
      userId: 110,
      horodatage: {
        gte: new Date('2025-12-14')
      }
    }
  });
  
  console.log('✅ Pointages supprimés:', deleted.count);
  await prisma.$disconnect();
}

main();
