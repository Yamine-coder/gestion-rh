const prisma = require('./server/prisma/client');

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        prenom: true,
        nom: true
      }
    });

    console.log('👥 Utilisateurs dans la base:');
    console.log('='.repeat(60));
    users.forEach(u => {
      console.log(`  - ${u.prenom} ${u.nom}`);
      console.log(`    Email: ${u.email}`);
      console.log(`    Role: ${u.role}`);
      console.log(`    ID: ${u.id}`);
      console.log('');
    });
    
    console.log(`Total: ${users.length} utilisateur(s)`);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
