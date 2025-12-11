const bcrypt = require('./server/node_modules/bcryptjs');
const prisma = require('./server/prisma/client');

async function resetPassword() {
  const hash = await bcrypt.hash('Test123!', 10);
  await prisma.user.update({
    where: { id: 110 },
    data: { password: hash }
  });
  console.log('✅ Mot de passe réinitialisé pour user 110');
  console.log('📧 Email: yjordan496@gmail.com');
  console.log('🔑 Password: Test123!');
  await prisma.$disconnect();
}

resetPassword();
