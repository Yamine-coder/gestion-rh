const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAllPointages() {
  try {
    console.log('🗑️ Suppression de TOUS les pointages...');
    
    // Compter d'abord
    const count = await prisma.pointage.count();
    console.log(`📊 Pointages à supprimer: ${count}`);
    
    if (count === 0) {
      console.log('✅ Aucun pointage à supprimer');
      return;
    }
    
    // Supprimer tous
    const result = await prisma.pointage.deleteMany({});
    console.log(`✅ ${result.count} pointages supprimés`);
    
    // Vérifier
    const remaining = await prisma.pointage.count();
    console.log(`📊 Pointages restants: ${remaining}`);
    
    if (remaining === 0) {
      console.log('🎉 Base de données de pointages complètement nettoyée !');
    } else {
      console.log('⚠️ Il reste encore des pointages');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllPointages();
