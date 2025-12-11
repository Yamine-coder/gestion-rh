const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAdmins() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'admin' }
    });
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              COMPTES ADMINISTRATEURS                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    if (users.length === 0) {
      console.log('❌ Aucun compte admin trouvé!\n');
    } else {
      users.forEach((u, i) => {
        console.log(`${i + 1}. Admin:`);
        console.log(`   📧 Email:    ${u.email}`);
        console.log(`   👤 Nom:      ${u.prenom || ''} ${u.nom || ''}`);
        console.log(`   🔑 Mot de passe par défaut: Admin123!`);
        console.log(`   🎭 Role:     ${u.role}`);
        console.log('');
      });
    }
    
    console.log('💡 Si vous avez oublié le mot de passe, utilisez la fonction');
    console.log('   "Mot de passe oublié" sur la page de connexion.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listAdmins();
