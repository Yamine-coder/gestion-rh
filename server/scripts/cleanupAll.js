const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAll() {
  console.log('🧹 NETTOYAGE COMPLET DES DONNÉES DE TEST\n');
  
  // Supprimer les paiements extra de test
  const paiements = await prisma.paiementExtra.deleteMany({
    where: {
      employeId: { in: [99, 100] } // Aminata et Julie
    }
  });
  console.log(`✅ PaiementsExtra supprimés: ${paiements.count}`);
  
  // Récupérer les IDs des anomalies à supprimer
  const anomaliesIds = await prisma.anomalie.findMany({
    where: {
      employeId: { in: [99, 100] },
      date: {
        gte: new Date('2026-01-27T00:00:00Z'),
        lte: new Date('2026-01-30T23:59:59Z')
      }
    },
    select: { id: true }
  });
  
  const ids = anomaliesIds.map(a => a.id);
  
  // Supprimer les audits liés
  if (ids.length > 0) {
    const audits = await prisma.anomalieAudit.deleteMany({
      where: { anomalieId: { in: ids } }
    });
    console.log(`✅ AnomalieAudits supprimés: ${audits.count}`);
  }
  
  // Supprimer les anomalies de test
  const anomalies = await prisma.anomalie.deleteMany({
    where: {
      employeId: { in: [99, 100] },
      date: {
        gte: new Date('2026-01-27T00:00:00Z'),
        lte: new Date('2026-01-30T23:59:59Z')
      }
    }
  });
  console.log(`✅ Anomalies supprimées: ${anomalies.count}`);
  
  // Supprimer les pointages de test
  const pointages = await prisma.pointage.deleteMany({
    where: {
      userId: { in: [99, 100] },
      horodatage: {
        gte: new Date('2026-01-27T00:00:00Z'),
        lte: new Date('2026-01-30T23:59:59Z')
      }
    }
  });
  console.log(`✅ Pointages supprimés: ${pointages.count}`);
  
  // Réinitialiser les shifts (retirer les segments Extra)
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: { in: [99, 100] },
      date: {
        gte: new Date('2026-01-27T00:00:00Z'),
        lte: new Date('2026-01-30T23:59:59Z')
      }
    }
  });
  
  for (const shift of shifts) {
    const segments = shift.segments || [];
    const segmentsSansExtra = segments.filter(s => !s.isExtra);
    
    if (segmentsSansExtra.length !== segments.length) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { segments: segmentsSansExtra }
      });
      console.log(`✅ Shift #${shift.id} nettoyé (segments Extra retirés)`);
    }
  }
  
  console.log('\n🎯 Nettoyage terminé ! Prêt pour un nouvel exemple.');
  
  await prisma.$disconnect();
}

cleanupAll().catch(e => { console.error(e); prisma.$disconnect(); });
