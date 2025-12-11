const prisma = require('./server/prisma/client');
const bcrypt = require('./server/node_modules/bcryptjs');

async function resetAdminPassword() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.update({
      where: { email: 'admin@gestionrh.com' },
      data: { password: hash }
    });
    console.log('✅ Mot de passe admin réinitialisé:', user.email);
    console.log('📧 Email: admin@gestionrh.com');
    console.log('🔑 Password: admin123');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
