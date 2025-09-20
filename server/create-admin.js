// Script pour créer un compte administrateur
const bcrypt = require('bcrypt');
const prisma = require('./prisma/client');

async function createAdmin() {
  try {
    console.log('🔧 Création d\'un compte administrateur...\n');

    // Données admin
    const adminData = {
      email: 'admin@gestion-rh.com',
      password: 'AdminRH2025!', // Mot de passe temporaire
      nom: 'Administrateur',
      prenom: 'Système',
      role: 'admin',
      telephone: '+33 1 23 45 67 89',
      categorie: 'Direction',
      dateEmbauche: new Date('2025-01-01')
    };

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email }
    });

    if (existingAdmin) {
      console.log('⚠️  Un administrateur existe déjà avec cet email');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Nom:', existingAdmin.prenom, existingAdmin.nom);
      console.log('🎭 Rôle:', existingAdmin.role);
      
      // Proposer de réinitialiser le mot de passe
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      });
      
      console.log('\n🔑 Mot de passe réinitialisé pour l\'admin existant');
    } else {
      // Créer un nouvel admin
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          ...adminData,
          password: hashedPassword
        }
      });

      console.log('✅ Compte administrateur créé avec succès!');
      console.log('🆔 ID:', newAdmin.id);
      console.log('👤 Nom:', newAdmin.prenom, newAdmin.nom);
    }

    console.log('\n🔐 INFORMATIONS DE CONNEXION ADMIN:');
    console.log('┌─────────────────────────────────────┐');
    console.log('│ 📧 Email: admin@gestion-rh.com     │');
    console.log('│ 🔑 Mot de passe: AdminRH2025!      │');
    console.log('└─────────────────────────────────────┘');
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Exécuter le script
createAdmin();
