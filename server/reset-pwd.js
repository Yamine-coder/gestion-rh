const prisma = require('./prisma/client');
const bcrypt = require('bcrypt');

async function resetPassword() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.update({
    where: { id: 110 },
    data: { password: hash }
  });
  console.log('Mot de passe reset pour Jordan (password123)');
  await prisma['$'+'disconnect']();
}

resetPassword();
