// 🔐 Script d'initialisation - Premier Admin
// Usage: node scripts/create-first-admin.js

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createFirstAdmin() {
  console.log('🚀 INITIALISATION DU PREMIER ADMIN');
  console.log('='.repeat(50));

  try {
    // Vérifier s'il existe déjà un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️  Un admin existe déjà:', existingAdmin.email);
      console.log('💡 Si vous voulez recréer l\'admin, supprimez d\'abord la base de données');
      return;
    }

    // Données du premier admin
    const adminData = {
      email: 'admin@cheantoine.com', // ✅ Changez selon vos besoins
      nom: 'Administrateur',
      prenom: 'Système',
      role: 'admin',
      categorie: 'Direction',
      telephone: '0123456789',
      adresse: 'Siège social',
      dateEmbauche: new Date(),
      salaire: 0, // Salaire admin non affiché
      firstLoginDone: false, // Force l'onboarding pour créer son mot de passe
      isActive: true,
      createdAt: new Date()
    };

    // Mot de passe temporaire sécurisé (sera changé au premier login)
    const motDePasseTemporaire = 'AdminTemp2025!';
    const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 10);
    
    adminData.password = hashedPassword;

    // Créer l'admin
    const newAdmin = await prisma.user.create({
      data: adminData
    });

    console.log('✅ ADMIN CRÉÉ AVEC SUCCÈS !');
    console.log('');
    console.log('📧 Email:', newAdmin.email);
    console.log('🔑 Mot de passe temporaire:', motDePasseTemporaire);
    console.log('');
    console.log('🎯 INSTRUCTIONS POUR LE PREMIER LOGIN :');
    console.log('1. Allez sur http://localhost:3000/login');
    console.log('2. Connectez-vous avec ces identifiants');
    console.log('3. Vous serez redirigé vers l\'onboarding');
    console.log('4. Créez votre mot de passe personnalisé');
    console.log('5. Accès complet au dashboard admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Changez le mot de passe dès la première connexion !');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour réinitialiser complètement la base (DANGER!)
async function resetDatabase() {
  console.log('⚠️  RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES');
  console.log('Cette action supprime TOUTES les données !');
  
  try {
    // Supprimer toutes les données (dans l'ordre des relations)
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Base de données réinitialisée');
    
    // Créer le premier admin
    await createFirstAdmin();
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset')) {
    console.log('🔥 MODE RESET ACTIVÉ');
    await resetDatabase();
  } else {
    await createFirstAdmin();
  }
}

main();
