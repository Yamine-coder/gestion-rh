/**
 * Simule l'appel à detecterRetardsAbsences pour vérifier la détection
 */
const prisma = require('./prisma/client');

async function simulerDetection() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  console.log(`\n🔍 SIMULATION DÉTECTION - ${today} ${now.toLocaleTimeString()}`);
  console.log('='.repeat(60));
  
  // Récupérer les shifts du jour (avec le fix)
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lte: new Date(`${today}T23:59:59.999Z`)
      },
      type: { in: ['présence', 'presence', 'travail'] }
    },
    include: {
      employe: {
        select: { id: true, nom: true, prenom: true, statut: true }
      }
    }
  });
  
  console.log(`📋 ${shifts.length} shift(s) trouvé(s) pour aujourd'hui`);
  
  for (const shift of shifts) {
    if (shift.employe?.statut !== 'actif') {
      console.log(`   ⏭️ ${shift.employe?.prenom} ${shift.employe?.nom} - Ignoré (inactif)`);
      continue;
    }
    
    const segments = shift.segments || [];
    if (segments.length === 0) continue;
    
    // Calculer les heures du shift
    let shiftStartMinutes = Infinity;
    let shiftEndMinutes = 0;
    
    segments.forEach(seg => {
      const start = seg.start || seg.debut;
      const end = seg.end || seg.fin;
      if (start && end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (sh * 60 + sm < shiftStartMinutes) shiftStartMinutes = sh * 60 + sm;
        if (eh * 60 + em > shiftEndMinutes) shiftEndMinutes = eh * 60 + em;
      }
    });
    
    // Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: shift.employeId,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    const hasArrivee = pointages.some(p => p.type === 'arrivee' || p.type === 'ENTRÉE');
    const minutesDepuisDebut = nowMinutes - shiftStartMinutes;
    const isShiftFinished = nowMinutes > shiftEndMinutes;
    
    const shiftStartStr = `${Math.floor(shiftStartMinutes/60).toString().padStart(2,'0')}:${(shiftStartMinutes%60).toString().padStart(2,'0')}`;
    const shiftEndStr = `${Math.floor(shiftEndMinutes/60).toString().padStart(2,'0')}:${(shiftEndMinutes%60).toString().padStart(2,'0')}`;
    
    console.log(`\n👤 ${shift.employe?.prenom} ${shift.employe?.nom} (ID: ${shift.employeId})`);
    console.log(`   📅 Shift: ${shiftStartStr} - ${shiftEndStr}`);
    console.log(`   ⏰ Heure actuelle: ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}`);
    console.log(`   📊 Pointages: ${pointages.length} (hasArrivée: ${hasArrivee})`);
    console.log(`   ⏱️ Minutes depuis début: ${minutesDepuisDebut}`);
    console.log(`   🏁 Shift terminé: ${isShiftFinished}`);
    
    // Détection
    if (!hasArrivee && minutesDepuisDebut > 0) {
      if (isShiftFinished) {
        console.log(`   🚨 ABSENCE CONFIRMÉE - Shift terminé sans pointage!`);
      } else if (minutesDepuisDebut > 60) {
        console.log(`   ⚠️ ABSENCE PROBABLE - ${minutesDepuisDebut} min sans pointage`);
      } else if (minutesDepuisDebut > 15) {
        console.log(`   🟡 RETARD SIGNIFICATIF - ${minutesDepuisDebut} min sans pointage`);
      } else {
        console.log(`   ℹ️ Retard mineur - ${minutesDepuisDebut} min`);
      }
    } else if (hasArrivee) {
      console.log(`   ✅ Présent - a pointé`);
    } else {
      console.log(`   ℹ️ Shift pas encore commencé`);
    }
  }
}

simulerDetection()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
