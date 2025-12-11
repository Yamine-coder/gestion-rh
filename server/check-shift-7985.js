const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShift() {
  const shift = await prisma.shift.findUnique({ where: { id: 7985 } });
  console.log('Shift 7985:');
  console.log(JSON.stringify(shift, null, 2));
  
  // Vérifier s'il a été créé par le planning ou manuellement
  console.log('\nCréé le:', shift?.createdAt);
  console.log('Segments:', shift?.segments?.length);
  
  await prisma.$disconnect();
}
checkShift();
