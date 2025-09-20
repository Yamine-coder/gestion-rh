/**
 * Script simple pour nettoyer test@Mouss.com - Version directe
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Nettoyage test@Mouss.com');
  
  try {
    // 1. Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ID ${user.id}`);
    
    // 2. Supprimer pointages
    const pointagesResult = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    
    console.log(`🗑️ ${pointagesResult.count} pointages supprimés`);
    
    // 3. Supprimer shifts
    const shiftsResult = await prisma.shift.deleteMany({
      where: { employeId: user.id }
    });
    
    console.log(`🗑️ ${shiftsResult.count} shifts supprimés`);
    
    // 4. Vérifier
    const remainingPointages = await prisma.pointage.count({
      where: { userId: user.id }
    });
    
    const remainingShifts = await prisma.shift.count({
      where: { employeId: user.id }
    });
    
    console.log(`\n📊 Vérification:`);
    console.log(`   Pointages restants: ${remainingPointages}`);
    console.log(`   Shifts restants: ${remainingShifts}`);
    
    if (remainingPointages === 0 && remainingShifts === 0) {
      console.log('\n✅ test@Mouss.com nettoyé avec succès !');
    } else {
      console.log('\n⚠️ Nettoyage incomplet');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
