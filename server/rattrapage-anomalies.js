// Script de rattrapage pour créer les anomalies manquées
const prisma = require('./prisma/client');

async function rattrapageAnomalies() {
  const today = '2025-12-05';
  
  console.log('🔍 Recherche des shifts terminés sans pointage...\n');
  
  // Récupérer tous les shifts de travail du jour
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      },
      type: { in: ['travail', 'présence', 'presence'] }
    },
    include: {
      employe: { select: { id: true, nom: true, prenom: true, statut: true } }
    }
  });
  
  console.log(`📋 ${shifts.length} shift(s) trouvé(s) aujourd'hui\n`);
  
  let anomaliesCreees = 0;
  
  for (const shift of shifts) {
    if (shift.employe?.statut !== 'actif') continue;
    
    const segments = shift.segments || [];
    const workSegments = segments.filter(seg => {
      const segType = seg.type?.toLowerCase();
      return segType !== 'pause' && segType !== 'break';
    });
    
    if (!workSegments.length) continue;
    
    const firstSeg = workSegments[0];
    const lastSeg = workSegments[workSegments.length - 1];
    const shiftStart = firstSeg?.start || firstSeg?.debut || '?';
    const shiftEnd = lastSeg?.end || lastSeg?.fin || '?';
    
    // Vérifier si shift terminé
    const now = new Date();
    const [endH, endM] = (shiftEnd || '23:59').split(':').map(Number);
    const shiftEndTime = new Date();
    shiftEndTime.setHours(endH, endM, 0, 0);
    
    if (now < shiftEndTime) {
      console.log(`⏳ ${shift.employe.prenom} ${shift.employe.nom}: Shift pas encore terminé (${shiftEnd})`);
      continue;
    }
    
    // Vérifier pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: shift.employeId,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    const hasArrivee = pointages.some(p => p.type === 'ENTRÉE' || p.type === 'arrivee');
    
    if (hasArrivee) {
      console.log(`✅ ${shift.employe.prenom} ${shift.employe.nom}: A pointé (${pointages.length} pointage(s))`);
      continue;
    }
    
    // Vérifier si anomalie existe déjà
    const anomalieExistante = await prisma.anomalie.findFirst({
      where: {
        employeId: shift.employeId,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        },
        type: { in: ['absence', 'absence_injustifiee'] }
      }
    });
    
    if (anomalieExistante) {
      console.log(`📝 ${shift.employe.prenom} ${shift.employe.nom}: Anomalie déjà existante`);
      continue;
    }
    
    // CRÉER L'ANOMALIE
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: shift.employeId,
        date: new Date(`${today}T12:00:00.000Z`),
        type: 'absence_injustifiee',
        gravite: 'critique',
        statut: 'en_attente',
        details: {
          shiftId: shift.id,
          heurePrevueDebut: shiftStart,
          heurePrevueFin: shiftEnd,
          detecteAutomatiquement: true,
          detectePar: 'scheduler_rattrapage'
        },
        description: `Absence non justifiée - Aucun pointage pour le shift ${shiftStart} - ${shiftEnd}`
      }
    });
    
    console.log(`🚨 ${shift.employe.prenom} ${shift.employe.nom}: ANOMALIE CRÉÉE (ID: ${anomalie.id})`);
    anomaliesCreees++;
  }
  
  console.log(`\n✅ Rattrapage terminé: ${anomaliesCreees} anomalie(s) créée(s)`);
  
  await prisma.$disconnect();
}

rattrapageAnomalies().catch(console.error);
