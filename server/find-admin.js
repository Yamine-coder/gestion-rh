const prisma = require('./prisma/client');

async function findAdmin() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (admin) {
    console.log('Admin trouvé:');
    console.log('  Email:', admin.email);
    console.log('  Nom:', admin.nom, admin.prenom);
  } else {
    console.log('Aucun admin trouvé');
  }
  await prisma.$disconnect();
}

findAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
