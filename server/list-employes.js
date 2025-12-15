const prisma = require('./prisma/client');

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'employee', statut: 'actif' },
    select: { id: true, prenom: true, nom: true, email: true, categorie: true },
    orderBy: { categorie: 'asc' },
    take: 25
  });
  
  console.log('=== Employés actifs par catégorie ===\n');
  
  let currentCat = '';
  users.forEach(e => {
    if (e.categorie !== currentCat) {
      currentCat = e.categorie;
      console.log(`\n📁 ${currentCat || 'Sans catégorie'}:`);
    }
    console.log(`   - ${e.prenom} ${e.nom} (${e.email})`);
  });
  
  await prisma.$disconnect();
}

main();
