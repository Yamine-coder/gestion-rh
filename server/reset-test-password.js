const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

(async () => {
  try {
    const hash = await bcrypt.hash('Test123!', 10);
    await prisma.user.update({ 
      where: { email: 'test.extra@restaurant.com' }, 
      data: { password: hash } 
    });
    console.log('✅ Password reset OK pour test.extra@restaurant.com');
  } catch(e) {
    console.error('❌ Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
