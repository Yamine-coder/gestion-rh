const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

(async () => {
  try {
    const email = 'yjordan496@gmail.com';
    const newPassword = 'Password123!'; // Mot de passe temporaire
    
    console.log('🔄 Réinitialisation du mot de passe...\n');
    
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Mot de passe réinitialisé avec succès !');
    console.log('📧 Email:', email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('\n⚠️  Changez ce mot de passe après connexion !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
