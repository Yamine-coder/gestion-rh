// Script pour réinitialiser le mot de passe de Marco Romano
const bcrypt = require('./server/node_modules/bcrypt');
const prisma = require('./server/prisma/client');

async function resetPassword() {
  try {
    const newPassword = 'Marco123!';
    const hash = await bcrypt.hash(newPassword, 10);
    
    const user = await prisma.user.update({
      where: { id: 93 },
      data: { password: hash }
    });
    
    console.log('✅ Mot de passe mis à jour !');
    console.log('');
    console.log('📧 Email:', user.email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('👤 Utilisateur:', user.prenom, user.nom);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
