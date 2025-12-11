// Corriger les shifts avec des heures de début incorrectes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixShifts() {
  console.log('🔧 Correction des shifts avec heures suspectes...\n');

  const shifts = await prisma.shift.findMany({
    where: { segments: { not: undefined } },
    include: { employe: { select: { prenom: true, nom: true, categorie: true } } }
  });

  let corriges = 0;

  for (const s of shifts) {
    if (s.segments && s.segments[0] && s.segments[0].start) {
      const [h, m] = s.segments[0].start.split(':').map(Number);
      
      // Si l'heure de début est avant 6h, c'est probablement une erreur
      // On corrige en supposant que c'était l'heure + 8 (ex: 01:30 -> 09:30)
      if (h < 6) {
        const newStart = `${String(h + 8).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        // Corriger aussi l'heure de fin
        let newEnd = s.segments[0].end;
        if (s.segments[0].end) {
          const [hEnd, mEnd] = s.segments[0].end.split(':').map(Number);
          if (hEnd < 12) {
            newEnd = `${String(hEnd + 8).padStart(2, '0')}:${String(mEnd).padStart(2, '0')}`;
          }
        }

        const newSegments = [{
          ...s.segments[0],
          start: newStart,
          end: newEnd
        }];

        console.log(`   Shift ${s.id} (${s.employe?.prenom}): ${s.segments[0].start}-${s.segments[0].end} → ${newStart}-${newEnd}`);

        await prisma.shift.update({
          where: { id: s.id },
          data: { segments: newSegments }
        });

        corriges++;
      }
    }
  }

  console.log(`\n✅ ${corriges} shifts corrigés`);

  // Recalculer les retards
  console.log('\n📊 Recalcul des retards...\n');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  const pointages = await prisma.pointage.findMany({
    where: { 
      horodatage: { gte: startDate }, 
      type: 'ENTRÉE',
      user: { role: 'employee' }
    }
  });

  const shiftsCorr = await prisma.shift.findMany({
    where: { 
      date: { gte: startDate, lte: today }, 
      type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'] }
    }
  });

  let retards = 0;
  for (const p of pointages) {
    const dateP = new Date(p.horodatage);
    const dateStr = dateP.toISOString().split('T')[0];
    
    const shift = shiftsCorr.find(s => 
      s.employeId === p.userId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    );

    if (shift && shift.segments && shift.segments[0] && shift.segments[0].start) {
      const [hPrevu, mPrevu] = shift.segments[0].start.split(':').map(Number);
      const minutesPrevues = hPrevu * 60 + mPrevu;
      const minutesReelles = dateP.getHours() * 60 + dateP.getMinutes();
      
      if (minutesReelles > minutesPrevues + 5) {
        retards++;
      }
    }
  }

  const tauxRetards = ((retards / pointages.length) * 100).toFixed(1);
  const ponctualite = (100 - parseFloat(tauxRetards)).toFixed(1);

  console.log(`   Pointages analysés: ${pointages.length}`);
  console.log(`   Retards détectés: ${retards}`);
  console.log(`   Taux de retards: ${tauxRetards}%`);
  console.log(`   PONCTUALITÉ CORRIGÉE: ${ponctualite}%`);

  await prisma.$disconnect();
}

fixShifts().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
