/**
 * Script pour vérifier les utilisateurs admin dans la base
 */

const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('🔍 Recherche des utilisateurs admin...\n');
    
    const admins = await prisma.user.findMany({
      where: {
        role: 'admin'
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true
      }
    });
    
    if (admins.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé dans la base');
      console.log('\n💡 Créez un compte admin avec:');
      console.log('   node fix-admin-password.js');
    } else {
      console.log(`✅ ${admins.length} utilisateur(s) admin trouvé(s):\n`);
      admins.forEach((admin, idx) => {
        console.log(`${idx + 1}. ${admin.prenom} ${admin.nom}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🆔 ID: ${admin.id}`);
        console.log(`   👤 Rôle: ${admin.role}\n`);
      });
      
      console.log('💡 Pour vous connecter avec un de ces comptes:');
      console.log(`   node get-auth-token.js ${admins[0].email} <mot_de_passe>`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
