const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyseExtras() {
  try {
    // 1. Chercher les shifts de type "extra"
    console.log('=== ANALYSE DES SHIFTS EXTRA ===');
    const shiftsExtra = await prisma.shift.findMany({
      where: {
        OR: [
          { type: 'extra' },
          { type: 'EXTRA' },
          { type: { contains: 'extra' } }
        ]
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true } }
      }
    });
    console.log('Shifts de type extra:', shiftsExtra.length);
    shiftsExtra.slice(0, 5).forEach(s => {
      console.log(`  - Shift ${s.id}: ${s.employe?.prenom} ${s.employe?.nom} - ${s.date} - type: ${s.type}`);
    });

    // 2. Chercher tous les types de shifts distincts
    console.log('\n=== TYPES DE SHIFTS ===');
    const allShifts = await prisma.shift.findMany({
      select: { type: true }
    });
    const types = [...new Set(allShifts.map(s => s.type))];
    console.log('Types distincts:', types);

    // 3. Chercher les anomalies d'heures supplémentaires
    console.log('\n=== ANOMALIES HEURES SUP ===');
    const anomaliesHS = await prisma.anomalie.findMany({
      where: {
        OR: [
          { type: 'heures_supplementaires' },
          { type: 'heure_sup' },
          { type: { contains: 'heures' } },
          { type: { contains: 'sup' } }
        ]
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true } }
      }
    });
    console.log('Anomalies heures sup:', anomaliesHS.length);
    anomaliesHS.slice(0, 5).forEach(a => {
      console.log(`  - Anomalie ${a.id}: ${a.employe?.prenom} ${a.employe?.nom} - ${a.date} - type: ${a.type} - statut: ${a.statut}`);
    });

    // 4. Chercher tous les types d'anomalies distincts
    console.log('\n=== TYPES D\'ANOMALIES ===');
    const allAnomalies = await prisma.anomalie.findMany({
      select: { type: true }
    });
    const typesAnomalies = [...new Set(allAnomalies.map(a => a.type))];
    console.log('Types distincts:', typesAnomalies);

    // 5. Vérifier les segments "extra" dans les shifts
    console.log('\n=== SEGMENTS EXTRA DANS SHIFTS ===');
    const shiftsAvecSegments = await prisma.shift.findMany({
      where: {
        segments: { not: null }
      },
      select: { id: true, segments: true, employeId: true, date: true }
    });
    
    let segmentsExtra = 0;
    shiftsAvecSegments.forEach(s => {
      if (s.segments && Array.isArray(s.segments)) {
        s.segments.forEach((seg, idx) => {
          if (seg.type === 'extra' || seg.extra === true || seg.isExtra === true) {
            segmentsExtra++;
            if (segmentsExtra <= 5) {
              console.log(`  - Shift ${s.id}, segment ${idx}: ${JSON.stringify(seg)}`);
            }
          }
        });
      }
    });
    console.log('Total segments extra trouvés:', segmentsExtra);

  } catch (error) {
    console.error('Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

analyseExtras();
