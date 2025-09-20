// Script pour vérifier les comptes admin dans la base de données

const prisma = require('../prisma/client');

async function checkAdminUsers() {
  try {
    console.log('🔍 Vérification des utilisateurs admin dans la base...\n');
    
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        role: true,
        prenom: true,
        nom: true,
        firstLoginDone: true,
        createdAt: true,
        statut: true
      }
    });

    if (adminUsers.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé dans la base de données');
      return;
    }

    console.log(`✅ ${adminUsers.length} utilisateur(s) admin trouvé(s):\n`);
    
    adminUsers.forEach((user, index) => {
      console.log(`📋 Admin ${index + 1}:`);
      console.log(`   • ID: ${user.id}`);
      console.log(`   • Email: ${user.email}`);
      console.log(`   • Role: ${user.role}`);
      console.log(`   • Nom: ${user.prenom} ${user.nom}`);
      console.log(`   • Premier login terminé: ${user.firstLoginDone}`);
      console.log(`   • Statut: ${user.statut}`);
      console.log(`   • Créé le: ${user.createdAt}`);
      console.log('');
    });

    // Vérifier aussi tous les utilisateurs pour debug
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        firstLoginDone: true
      }
    });

    console.log('🔍 Tous les utilisateurs:');
    allUsers.forEach(user => {
      console.log(`   • ${user.email} - ${user.role} (onboarding: ${user.firstLoginDone ? 'terminé' : 'à faire'})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
