const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixAminata() {
  const employeId = 99; // Aminata Diop
  const dateStr = '2026-01-27';
  
  console.log('=== AMINATA DIOP - 27/01/2026 ===\n');
  
  // Shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  console.log('SHIFT actuel:');
  console.log('Segments:', JSON.stringify(shift?.segments, null, 2));
  
  // Pointages
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employeId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\nPOINTAGES:');
  pointages.forEach(p => {
    const h = new Date(p.horodatage);
    console.log(`  ${p.type}: ${String(h.getUTCHours()+1).padStart(2,'0')}:${String(h.getUTCMinutes()).padStart(2,'0')} Paris`);
  });
  
  // Anomalies
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  console.log('\nANOMALIES:');
  anomalies.forEach(a => {
    console.log(`  #${a.id} - ${a.type} - ${a.statut}`);
  });
  
  // Vérifier si le shift a un segment Extra prématuré
  const segments = shift?.segments || [];
  const hasExtraSegment = segments.some(s => s.isExtra);
  
  if (hasExtraSegment) {
    console.log('\n⚠️ Le shift contient un segment Extra prématuré !');
    
    // Filtrer pour ne garder que les segments non-Extra
    const segmentsSansExtra = segments.filter(s => !s.isExtra);
    
    // Mettre à jour le shift
    await prisma.shift.update({
      where: { id: shift.id },
      data: { segments: segmentsSansExtra }
    });
    
    console.log('✅ Segment Extra retiré du shift');
    console.log('Nouveaux segments:', JSON.stringify(segmentsSansExtra, null, 2));
  }
  
  // Supprimer les anomalies incorrectes (absence alors qu'il y a pointages)
  if (pointages.length > 0) {
    const deleted = await prisma.anomalie.deleteMany({
      where: {
        employeId,
        date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') },
        type: { in: ['absence_injustifiee', 'absence_totale', 'segment_non_pointe'] }
      }
    });
    if (deleted.count > 0) {
      console.log(`\n✅ ${deleted.count} anomalie(s) d'absence incorrecte(s) supprimée(s)`);
    }
  }
  
  // Vérifier l'anomalie arrivee_anticipee_extra
  const anomalieExtra = await prisma.anomalie.findFirst({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') },
      type: 'arrivee_anticipee_extra'
    }
  });
  
  if (anomalieExtra) {
    console.log(`\n✅ Anomalie Extra potentiel #${anomalieExtra.id} prête à traiter`);
  }
  
  await prisma.$disconnect();
}

checkAndFixAminata().catch(e => { console.error(e); prisma.$disconnect(); });
