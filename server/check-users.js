const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true
      },
      take: 5
    });
    
    console.log('Utilisateurs trouvés:');
    users.forEach(user => {
      console.log('---');
      console.log('Email:', user.email);
      console.log('Nom:', user.nom);
      console.log('Prénom:', user.prenom);
      console.log('Nom null?', user.nom === null);
      console.log('Prénom null?', user.prenom === null);
      console.log('Nom undefined?', user.nom === undefined);
      console.log('Prénom undefined?', user.prenom === undefined);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
