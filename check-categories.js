const prisma = require('./server/prisma/client');

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, prenom: true, nom: true, categorie: true },
    orderBy: { id: 'asc' }
  });
  
  console.log('=== CATEGORIES DES EMPLOYES ===');
  users.forEach(u => {
    console.log(`${u.id} | ${u.prenom} ${u.nom} | Catégorie: ${u.categorie}`);
  });
  
  // Récapitulatif
  const categories = {};
  users.forEach(u => {
    categories[u.categorie || 'null'] = (categories[u.categorie || 'null'] || 0) + 1;
  });
  console.log('\n=== RECAPITULATIF ===');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`${cat}: ${count} employé(s)`);
  });
  
  await prisma.$disconnect();
}

main();
