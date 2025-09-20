const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickReset() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (user) {
      await prisma.pointage.deleteMany({
        where: { userId: user.id }
      });
      console.log('✅ Reset terminé');
    }
  } catch (error) {
    console.log('❌ Erreur');
  } finally {
    await prisma.$disconnect();
  }
}

quickReset();
