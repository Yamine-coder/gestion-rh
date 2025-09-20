const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShiftStructure() {
  try {
    const shift = await prisma.shift.findFirst({
      where: {
        employe: { email: 'test@Mouss.com' }
      },
      include: { employe: true }
    });
    console.log('Shift complet:', JSON.stringify(shift, null, 2));
  } catch (e) {
    console.error('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkShiftStructure();
