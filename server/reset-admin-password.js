const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPassword() {
  const newPassword = 'Test1234!';
  const hash = await bcrypt.hash(newPassword, 10);
  
  // Réinitialiser Jordan (ID 110)
  await prisma.user.update({
    where: { id: 110 },
    data: { password: hash }
  });
  
  console.log('✅ Mot de passe réinitialisé!');
  console.log('   Email: yjordan496@gmail.com');
  console.log('   Mot de passe: ' + newPassword);
  
  await prisma.$disconnect();
}

resetPassword();
