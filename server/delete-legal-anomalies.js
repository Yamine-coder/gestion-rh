const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Supprimer toutes les anomalies légales
    const deleted = await prisma.anomalie.deleteMany({
      where: {
        type: {
          in: ['pause_non_prise', 'depassement_amplitude']
        }
      }
    });
    
    console.log('✅ Anomalies légales supprimées:', deleted.count);
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
