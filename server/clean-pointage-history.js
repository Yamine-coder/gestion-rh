const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanPointageHistory() {
  try {
    console.log('🗑️ Nettoyage de l\'historique de pointage...');
    
    // Trouver l'utilisateur test@Mouss.com
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`👤 Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    
    // Compter les pointages existants
    const countBefore = await prisma.pointage.count({
      where: { userId: user.id }
    });
    
    console.log(`📊 Pointages existants: ${countBefore}`);
    
    // Supprimer tous les pointages de cet utilisateur
    const deleteResult = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    
    console.log(`✅ ${deleteResult.count} pointages supprimés`);
    
    // Vérifier que tout a été supprimé
    const countAfter = await prisma.pointage.count({
      where: { userId: user.id }
    });
    
    console.log(`📊 Pointages restants: ${countAfter}`);
    
    console.log('🎉 Historique nettoyé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le nettoyage
cleanPointageHistory();
