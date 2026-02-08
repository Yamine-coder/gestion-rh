const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJulieShift() {
  const employeId = 100;
  const dateStr = '2026-01-28';
  
  // Récupérer le shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  if (!shift) {
    console.log('❌ Shift non trouvé');
    await prisma.$disconnect();
    return;
  }
  
  console.log('=== AVANT ===');
  console.log('Segments:', JSON.stringify(shift.segments, null, 2));
  
  // Filtrer pour ne garder que les segments non-Extra
  const segments = shift.segments || [];
  const segmentsSansExtra = segments.filter(s => !s.isExtra);
  
  // Mettre à jour le shift
  await prisma.shift.update({
    where: { id: shift.id },
    data: { segments: segmentsSansExtra }
  });
  
  console.log('\n=== APRÈS ===');
  console.log('Segments:', JSON.stringify(segmentsSansExtra, null, 2));
  
  // Supprimer aussi le paiementExtra orphelin s'il existe
  const deletedPaiements = await prisma.paiementExtra.deleteMany({
    where: { id: 114 }
  });
  console.log('\n✅ PaiementExtra supprimé:', deletedPaiements.count);
  
  // Réinitialiser l'anomalie
  await prisma.anomalie.updateMany({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') },
      type: 'arrivee_anticipee_extra'
    },
    data: {
      statut: 'en_attente',
      details: {
        shiftId: shift.id,
        heureDebutPrevue: '09:00',
        heureArriveeReelle: '08:15',
        ecartMinutes: 45,
        minutesEnAvance: 45,
        heuresSup: 0.75
      }
    }
  });
  console.log('✅ Anomalie réinitialisée');
  
  await prisma.$disconnect();
}

fixJulieShift().catch(e => { console.error(e); prisma.$disconnect(); });
