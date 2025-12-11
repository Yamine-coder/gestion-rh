const prisma = require('./server/prisma/client');
const bcrypt = require('./server/node_modules/bcrypt');

async function fixAdminPassword() {
  try {
    // Vérifier l'admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@gestionrh.com' }
    });

    if (!admin) {
      console.log('❌ Admin non trouvé');
      return;
    }

    console.log('👤 Admin trouvé:', admin.email);
    console.log('   Mot de passe actuel:', admin.motDePasse ? 'Défini' : '❌ NON DÉFINI');
    
    if (!admin.motDePasse) {
      console.log('');
      console.log('🔧 Correction du mot de passe...');
      
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      await prisma.user.update({
        where: { id: admin.id },
        data: { motDePasse: hashedPassword }
      });
      
      console.log('✅ Mot de passe défini: Admin123!');
    } else {
      console.log('✅ Le mot de passe est déjà défini');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword();
