const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    const pointage = await prisma.pointage.findFirst({
      include: { user: true }
    });
    console.log('Structure du pointage:', JSON.stringify(pointage, null, 2));
  } catch (e) {
    console.error('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
