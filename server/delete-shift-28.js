const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.shift.delete({ where: { id: 159 } });
    console.log('✅ Shift du 28/11 supprimé (ID: 159)');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
  await prisma.$disconnect();
})();
