const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAnomalie474() {
  // Récupérer le shift et les pointages pour reconstituer les détails
  const shift = await prisma.shift.findUnique({
    where: { id: 13207 },
    include: { employe: true }
  });
  
  const dateDebut = new Date('2026-01-26T00:00:00Z');
  const dateFin = new Date('2026-01-26T23:59:59Z');
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: 94,
      horodatage: { gte: dateDebut, lte: dateFin }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('Shift:', shift?.id, shift?.date);
  console.log('Pointages:', pointages.length);
  pointages.forEach(p => console.log('  -', new Date(p.horodatage).toLocaleTimeString()));
  
  // Calculer le départ réel
  let departReel = null;
  if (pointages.length >= 2) {
    departReel = new Date(pointages[pointages.length - 1].horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  
  // Segment prévu
  const segments = typeof shift?.segments === 'string' ? JSON.parse(shift.segments) : shift?.segments;
  const dernierSegment = segments?.[segments.length - 1];
  const finPrevue = dernierSegment?.end || '17:00';
  
  console.log('Fin prévue:', finPrevue);
  console.log('Départ réel:', departReel);
  
  // Calculer les minutes supplémentaires
  const [finH, finM] = finPrevue.split(':').map(Number);
  const [depH, depM] = departReel ? departReel.split(':').map(Number) : [0, 0];
  const minutesSup = (depH * 60 + depM) - (finH * 60 + finM);
  const heuresSup = minutesSup / 60;
  
  console.log('Minutes sup:', minutesSup, '=', heuresSup.toFixed(2), 'h');
  
  // Mettre à jour l'anomalie avec les bonnes infos
  await prisma.anomalie.update({
    where: { id: 474 },
    data: {
      description: `⏰ Départ tardif: ${finPrevue} prévu → ${departReel} réel (+${Math.round(minutesSup)} min)`,
      details: {
        shiftId: shift?.id,
        heureFinPrevue: finPrevue,
        heureDepartReelle: departReel,
        ecartMinutes: minutesSup,
        heuresSup: heuresSup,
        paiementAnnuleLe: new Date().toISOString(),
        paiementAnnuleRaison: 'Paiement annulé - à re-traiter'
      }
    }
  });
  
  console.log('\n✅ Anomalie #474 mise à jour avec les bonnes infos');
  
  await prisma.$disconnect();
}

fixAnomalie474();
