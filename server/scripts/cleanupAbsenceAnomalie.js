const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAbsenceAnomalie() {
  // Supprimer les anomalies incorrectes pour Julie Martin le 28/01
  // (absence et segment_non_pointe alors qu'il y a des pointages)
  const deleted = await prisma.anomalie.deleteMany({
    where: {
      employeId: 100,
      date: {
        gte: new Date('2026-01-28T00:00:00Z'),
        lte: new Date('2026-01-28T23:59:59Z')
      },
      type: { in: ['absence_injustifiee', 'absence_totale', 'segment_non_pointe'] }
    }
  });
  
  console.log('✅ Anomalies incorrectes supprimées:', deleted.count);
  
  // Vérifier les anomalies restantes
  const remaining = await prisma.anomalie.findMany({
    where: {
      employeId: 100,
      date: {
        gte: new Date('2026-01-28T00:00:00Z'),
        lte: new Date('2026-01-28T23:59:59Z')
      }
    }
  });
  
  console.log('\n📋 Anomalies restantes pour Julie Martin (28/01):');
  remaining.forEach(a => {
    console.log(`   #${a.id} - ${a.type} - ${a.statut}`);
  });
  
  await prisma.$disconnect();
}

cleanupAbsenceAnomalie().catch(e => { console.error(e); prisma.$disconnect(); });
