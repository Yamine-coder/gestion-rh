const prisma = require('./prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);
  
  const updated = await prisma.user.update({
    where: { id: 90 },
    data: { password: hash }
  });
  
  console.log('Mot de passe mis à jour pour', updated.email);
  
  // Vérifier
  const user = await prisma.user.findUnique({ where: { id: 90 }, select: { password: true } });
  const match = await bcrypt.compare('Admin123!', user.password);
  console.log('Vérification:', match ? '✓ OK' : '✗ ERREUR');
  
  await prisma.$disconnect();
}

main().catch(console.error);
