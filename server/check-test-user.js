const prisma = require('./prisma/client');

async function checkTestUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (user) {
      console.log('✅ Utilisateur trouvé:');
      console.log('   Email:', user.email);
      console.log('   ID:', user.id);
      console.log('   Nom:', user.nom);
      console.log('   Prénom:', user.prenom);
    } else {
      console.log('❌ Utilisateur non trouvé');
      
      // Chercher un utilisateur avec ID 86
      const userById = await prisma.user.findUnique({
        where: { id: 86 }
      });
      
      if (userById) {
        console.log('\n✅ Utilisateur ID 86 trouvé:');
        console.log('   Email:', userById.email);
        console.log('   Nom:', userById.nom);
        console.log('   Prénom:', userById.prenom);
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
checkTestUser();
