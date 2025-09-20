/**
 * Script pour nettoyer toutes les données de test@Mouss.com
 * Supprime tous les pointages et shifts pour recommencer les tests
 */

const prisma = require('./prisma/client');

async function cleanTestMoussData() {
  console.log('🧹 Nettoyage des données de test@Mouss.com');
  
  try {
    // 1. Trouver l'utilisateur test@Mouss.com
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.prenom} ${user.nom} (ID: ${user.id})`);
    
    // 2. Supprimer tous les pointages
    const deletePointages = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    
    console.log(`🗑️ Pointages supprimés: ${deletePointages.count}`);
    
    // 3. Supprimer tous les shifts
    const deleteShifts = await prisma.shift.deleteMany({
      where: { employeId: user.id }
    });
    
    console.log(`🗑️ Shifts supprimés: ${deleteShifts.count}`);
    
    // 4. Vérification
    const remainingPointages = await prisma.pointage.count({
      where: { userId: user.id }
    });
    
    const remainingShifts = await prisma.shift.count({
      where: { employeId: user.id }
    });
    
    console.log(`\n📊 Vérification finale:`);
    console.log(`   Pointages restants: ${remainingPointages}`);
    console.log(`   Shifts restants: ${remainingShifts}`);
    
    if (remainingPointages === 0 && remainingShifts === 0) {
      console.log('✅ Nettoyage terminé avec succès ! test@Mouss.com est prêt pour de nouveaux tests.');
    } else {
      console.log('⚠️ Il reste des données, vérification nécessaire.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestMoussData();
