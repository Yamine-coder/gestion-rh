    const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestConges() {
  try {
    console.log('🔄 Suppression des congés de test des dernières 24h...\n');

    // Supprimer tous les congés créés dans les dernières 24 heures
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const deletedConges = await prisma.conge.deleteMany({
      where: {
        dateDebut: {
          gte: yesterday.toISOString()
        }
      }
    });

    console.log(`✅ ${deletedConges.count} congés récents supprimés avec succès !`);
    console.log('🎉 Base de données nettoyée !\n');

  } catch (error) {
    console.error('❌ Erreur lors de la suppression des congés de test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  cleanTestConges();
}

module.exports = { cleanTestConges };
