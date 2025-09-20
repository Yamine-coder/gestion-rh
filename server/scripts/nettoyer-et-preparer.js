// Script simple pour nettoyer uniquement les données factices
// Gardez ce qui est utile, supprimez seulement les données de test

const prisma = require('../prisma/client');

async function nettoyerDonneesFactices() {
  console.log('🧹 NETTOYAGE DES DONNÉES FACTICES');
  console.log('=================================');
  
  try {
    // 1. Supprimer les données liées d'abord (pour éviter les erreurs de clés étrangères)
    console.log('🗑️  Suppression des données liées...');
    
    const deleteExtraPayments = await prisma.extraPaymentLog.deleteMany();
    console.log(`   - ${deleteExtraPayments.count} paiements extras supprimés`);
    
    const deleteShifts = await prisma.shift.deleteMany();
    console.log(`   - ${deleteShifts.count} shifts supprimés`);
    
    const deleteConges = await prisma.conge.deleteMany();
    console.log(`   - ${deleteConges.count} congés supprimés`);
    
    const deletePointages = await prisma.pointage.deleteMany();
    console.log(`   - ${deletePointages.count} pointages supprimés`);
    
    const deletePlannings = await prisma.planning.deleteMany();
    console.log(`   - ${deletePlannings.count} plannings supprimés`);
    
    const deletePasswordResets = await prisma.passwordReset.deleteMany();
    console.log(`   - ${deletePasswordResets.count} tokens de reset supprimés`);
    
    // 2. Supprimer tous les utilisateurs (gardez juste un admin temporaire)
    const deleteUsers = await prisma.user.deleteMany();
    console.log(`   - ${deleteUsers.count} utilisateurs supprimés`);
    
    // 3. Créer un compte admin temporaire pour vous connecter
    const adminTemp = await prisma.user.create({
      data: {
        nom: "Admin",
        prenom: "Temporaire",
        email: "admin@temp.com",
        password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password = "password"
        role: "admin",
        telephone: "0000000000",
        dateEmbauche: new Date(),
        poste: "Administrateur Temporaire",
        departement: "IT",
        statut: "actif"
      }
    });
    
    console.log('\n✅ NETTOYAGE TERMINÉ !');
    console.log('==========================================');
    console.log('📧 Compte admin temporaire créé :');
    console.log('   Email: admin@temp.com');
    console.log('   Password: password');
    console.log('');
    console.log('🚀 MAINTENANT VOUS POUVEZ :');
    console.log('   1. Vous connecter avec ce compte');
    console.log('   2. Utiliser "👨‍🍳 Ajouter un employé" pour chaque vrai employé');
    console.log('   3. Utiliser "Création rapide planning" pour les horaires');
    console.log('   4. Supprimer ce compte admin temporaire quand terminé');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  console.log('🧹 NETTOYAGE DES DONNÉES FACTICES');
  console.log('==================================');
  console.log('⚠️  Cette opération va supprimer TOUTES les données actuelles');
  console.log('📝 Un compte admin temporaire sera créé pour vous permettre de vous connecter');
  console.log('');
  
  // Attendre 3 secondes pour laisser le temps de lire
  setTimeout(() => {
    nettoyerDonneesFactices().then(() => {
      console.log('\n🎉 Prêt pour ajouter vos vrais employés via l\'interface !');
      process.exit(0);
    }).catch((error) => {
      console.error('💥 Échec du nettoyage:', error);
      process.exit(1);
    });
  }, 3000);
}

module.exports = { nettoyerDonneesFactices };
