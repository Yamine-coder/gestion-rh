const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { employeId: 2 }
    });
    console.log('Premier shift trouvé:');
    console.log(JSON.stringify(shift, null, 2));
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
