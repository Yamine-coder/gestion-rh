const prisma = require('./prisma/client');

async function run() {
  // Trouver un employé parti
  const user = await prisma.user.findFirst({ 
    where: { dateSortie: { not: null } } 
  });
  console.log('Employé parti trouvé:', user ? `ID ${user.id} - ${user.prenom} ${user.nom}` : 'AUCUN');
  
  if (!user) {
    // Créer un employé de test puis le marquer comme parti
    console.log('\nCréation d\'un employé de test...');
    const test = await prisma.user.create({
      data: {
        email: 'test-delete-' + Date.now() + '@test.com',
        password: 'test',
        nom: 'TestDelete',
        prenom: 'User',
        role: 'employee',
        statut: 'inactif',
        dateSortie: new Date(),
        motifDepart: 'Test suppression'
      }
    });
    console.log('Créé:', test.id);
  }
  
  await prisma.$disconnect();
}

run();
