const prisma = require('./prisma/client');

async function main() {
  const users = await prisma.user.findMany({
    take: 10,
    select: { id: true, nom: true, prenom: true, role: true, statut: true }
  });
  console.log('Utilisateurs:');
  users.forEach(u => console.log(`  ID:${u.id} | ${u.prenom} ${u.nom} | role:${u.role} | statut:${u.statut}`));
  await prisma.$disconnect();
}

main();
