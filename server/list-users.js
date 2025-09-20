// Lister les utilisateurs disponibles

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        nom: true,
        prenom: true
      }
    });
    
    console.log('👥 Utilisateurs disponibles:');
    users.forEach(user => {
      console.log(`  ID: ${user.id} | ${user.prenom} ${user.nom} | ${user.email} | Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
