const prisma = require('./prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  // Lister les utilisateurs admin
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true, nom: true, prenom: true, password: true }
  });
  
  console.log('=== Utilisateurs Admin ===');
  for (const a of admins) {
    const match = await bcrypt.compare('Admin123!', a.password);
    console.log(`ID:${a.id} | ${a.email} | ${a.prenom} ${a.nom} | Pwd OK:${match}`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
