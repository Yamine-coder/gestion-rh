const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Supprimer les anomalies existantes pour Jordan le 5 décembre
    const deleted = await prisma.anomalie.deleteMany({
      where: {
        employeId: 110,
        date: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      }
    });
    console.log('✅ Anomalies supprimées:', deleted.count);
    
    // 2. Importer et exécuter le scheduler
    const AnomalyScheduler = require('./server/services/anomalyScheduler');
    
    // 3. Forcer le check sur les shifts terminés
    console.log('\n🔍 Exécution du scheduler...\n');
    await AnomalyScheduler.checkEndedShifts();
    
    // 4. Vérifier les nouvelles anomalies créées
    console.log('\n📋 Anomalies créées pour Jordan:');
    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: 110,
        date: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    anomalies.forEach(a => {
      console.log(`  - ${a.type}: ${a.description}`);
    });
    
    if (anomalies.length === 0) {
      console.log('  (Aucune anomalie détectée)');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
