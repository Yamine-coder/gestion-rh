const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import du controller pour simuler le calcul
const comparisonController = require('../controllers/comparisonController');

async function testComparison() {
  const employeId = 99;
  const date = '2026-01-27';
  
  // Récupérer les données
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: employeId,
      date: {
        gte: new Date(date + 'T00:00:00Z'),
        lte: new Date(date + 'T23:59:59Z')
      }
    },
    include: { employe: true }
  });
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employeId,
      horodatage: {
        gte: new Date(date + 'T00:00:00Z'),
        lte: new Date(date + 'T23:59:59Z')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('=== DONNÉES ===');
  console.log('Shift segments:', JSON.stringify(shift.segments, null, 2));
  console.log('Pointages:', pointages.map(p => `${p.type} ${p.horodatage.toISOString()}`));
  
  // Simuler le calcul des écarts
  // Extraire les heures de pointage
  const arrivee = pointages.find(p => p.type === 'arrivee');
  const depart = pointages.find(p => p.type === 'depart');
  
  if (arrivee && depart) {
    // Convertir en heure locale Paris (UTC+1)
    const arrDate = new Date(arrivee.horodatage);
    const depDate = new Date(depart.horodatage);
    
    const arrHeure = `${String(arrDate.getUTCHours() + 1).padStart(2, '0')}:${String(arrDate.getUTCMinutes()).padStart(2, '0')}`;
    const depHeure = `${String(depDate.getUTCHours() + 1).padStart(2, '0')}:${String(depDate.getUTCMinutes()).padStart(2, '0')}`;
    
    console.log('\n=== HEURES POINTÉES ===');
    console.log('Arrivée réelle:', arrHeure);
    console.log('Départ réel:', depHeure);
    
    // Pour chaque segment, calculer l'écart
    const segments = shift.segments;
    console.log('\n=== ANALYSE PAR SEGMENT ===');
    
    segments.forEach((seg, idx) => {
      console.log(`\nSegment ${idx + 1}: ${seg.start} -> ${seg.end} (isExtra: ${seg.isExtra})`);
      
      if (seg.isExtra) {
        console.log('  -> Segment Extra, ignoré pour le calcul d\'écart');
        return;
      }
      
      // Calculer écart arrivée
      const [segStartH, segStartM] = seg.start.split(':').map(Number);
      const [arrH, arrM] = arrHeure.split(':').map(Number);
      const ecartArrivee = (segStartH * 60 + segStartM) - (arrH * 60 + arrM);
      
      // Calculer écart départ
      const [segEndH, segEndM] = seg.end.split(':').map(Number);
      const [depH, depM] = depHeure.split(':').map(Number);
      const ecartDepart = (segEndH * 60 + segEndM) - (depH * 60 + depM);
      
      console.log(`  Écart arrivée: ${ecartArrivee} min (${seg.start} - ${arrHeure})`);
      console.log(`  Écart départ: ${ecartDepart} min (${seg.end} - ${depHeure})`);
      
      // Ce qui devrait être affiché:
      if (ecartArrivee > 0) {
        console.log(`  -> Arrivée anticipée de ${ecartArrivee} min`);
      } else if (ecartArrivee < 0) {
        console.log(`  -> Retard de ${Math.abs(ecartArrivee)} min`);
      }
      
      if (ecartDepart > 0) {
        console.log(`  -> Départ anticipé de ${ecartDepart} min`);
      } else if (ecartDepart < 0) {
        console.log(`  -> Heures sup de ${Math.abs(ecartDepart)} min`);
      }
    });
  }
  
  await prisma.$disconnect();
}

testComparison().catch(e => { console.error(e); prisma.$disconnect(); });
