// scripts/create-admin.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Création d\'un compte administrateur...');
    
    // Données de l'admin
    const adminData = {
      email: 'admin@gesrh.com',
      password: 'Admin123!',
      nom: 'Administrateur',
      prenom: 'Système',
      role: 'admin'
    };
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email }
    });
    
    if (existingAdmin) {
      console.log('⚠️  Un utilisateur avec cet email existe déjà:', adminData.email);
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Nom:', existingAdmin.prenom, existingAdmin.nom);
      console.log('🔑 Rôle:', existingAdmin.role);
      
      // Proposer de mettre à jour le rôle
      if (existingAdmin.role !== 'admin') {
        console.log('🔄 Mise à jour du rôle vers admin...');
        const updatedUser = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'admin' }
        });
        console.log('✅ Utilisateur mis à jour avec le rôle admin');
        return updatedUser;
      } else {
        console.log('✅ L\'utilisateur est déjà administrateur');
        return existingAdmin;
      }
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Créer l'admin
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        nom: adminData.nom,
        prenom: adminData.prenom,
        role: adminData.role
      }
    });
    
    console.log('✅ Compte administrateur créé avec succès!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Mot de passe:', adminData.password);
    console.log('👤 Nom:', admin.prenom, admin.nom);
    console.log('🔑 Rôle:', admin.role);
    console.log('');
    console.log('🔐 Informations de connexion:');
    console.log('   Email:', adminData.email);
    console.log('   Mot de passe:', adminData.password);
    
    return admin;
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  createAdmin()
    .then(() => {
      console.log('🎉 Script terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { createAdmin };
