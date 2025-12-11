const prisma = require('./server/prisma/client');

async function fixMoussaouiShift() {
  // Trouver le shift de Moussaoui du 7 décembre
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: 110,
      date: {
        gte: new Date('2025-12-07T00:00:00Z'),
        lte: new Date('2025-12-07T23:59:59Z')
      }
    }
  });
  
  if (!shift) {
    console.log('❌ Shift non trouvé');
    return;
  }
  
  console.log('📅 Shift trouvé:', shift.id, shift.type, shift.motif);
  
  // Corriger : type = repos, segments = []
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      type: 'repos',
      segments: [],
      motif: 'Remplacé par Chloé Simon - Motif: demande de remplacement'
    }
  });
  
  console.log('✅ Shift corrigé:', updated.id, updated.type, updated.segments);
  
  await prisma.$disconnect();
}

fixMoussaouiShift();
