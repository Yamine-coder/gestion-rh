const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function supprimerPointagesTest() {
  try {
    console.log('🗑️ Suppression des pointages de test...');
    
    // D'abord voir combien il y en a
    const existingPointages = await prisma.pointage.findMany({
      where: {
        user: {
          email: 'test@Mouss.com'
        }
      },
      include: {
        user: true
      }
    });
    
    console.log('📊 Pointages trouvés pour test@Mouss.com:', existingPointages.length);
    existingPointages.forEach(p => {
      console.log(`  - ${p.type} à ${new Date(p.horodatage).toLocaleTimeString('fr-FR')}`);
    });
    
    // Supprimer tous les pointages de test@Mouss.com
    const result = await prisma.pointage.deleteMany({
      where: {
        user: {
          email: 'test@Mouss.com'
        }
      }
    });
    
    console.log('✅ Pointages supprimés:', result.count);
    
    // Vérifier qu'il ne reste plus de pointages
    const remaining = await prisma.pointage.findMany({
      where: {
        user: {
          email: 'test@Mouss.com'
        }
      }
    });
    
    console.log('📊 Pointages restants après suppression:', remaining.length);
    
    if (remaining.length === 0) {
      console.log('🎉 Tous les pointages de test ont été supprimés avec succès !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
  } finally {
    await prisma.$disconnect();
  }
}

supprimerPointagesTest();
