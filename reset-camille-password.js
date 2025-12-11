const prisma = require('./server/prisma/client');
const bcrypt = require('./server/node_modules/bcrypt');

async function resetCamillePassword() {
  try {
    // Chercher Camille Leroy
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { nom: { contains: 'Leroy', mode: 'insensitive' } },
          { prenom: { contains: 'Camille', mode: 'insensitive' } },
          { email: { contains: 'camille', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ Camille Leroy non trouvée');
      
      // Lister tous les users pour debug
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, nom: true, prenom: true }
      });
      console.log('\n📋 Utilisateurs disponibles:');
      allUsers.forEach(u => console.log(`   - ${u.prenom} ${u.nom} (${u.email})`));
      return;
    }

    console.log('👤 Utilisateur trouvé:', user.prenom, user.nom);
    console.log('   Email:', user.email);
    
    // Nouveau mot de passe
    const newPassword = 'Camille2024!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log('');
    console.log('✅ Mot de passe réinitialisé avec succès !');
    console.log('');
    console.log('📧 Email:', user.email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetCamillePassword();
