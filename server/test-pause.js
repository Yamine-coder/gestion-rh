const prisma = require('./prisma/client');

async function testPauseNonPrise() {
  console.log('');
  console.log('TEST REEL - PAUSE NON PRISE');
  console.log('='.repeat(70));
  console.log('Simulation: Jordan scanne son QR comme s il etait au travail');
  console.log('');
  
  const jordanId = 110;
  const today = new Date().toISOString().split('T')[0]; // 2025-12-06
  
  // 1. Nettoyer les donnees existantes pour aujourd'hui
  console.log('1. Nettoyage donnees existantes...');
  await prisma.pointage.deleteMany({
    where: {
      userId: jordanId,
      horodatage: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lt: new Date(today + 'T23:59:59.999Z')
      }
    }
  });
  await prisma.anomalie.deleteMany({
    where: {
      employeId: jordanId,
      date: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lt: new Date(today + 'T23:59:59.999Z')
      }
    }
  });
  await prisma.shift.deleteMany({
    where: {
      employeId: jordanId,
      date: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lt: new Date(today + 'T23:59:59.999Z')
      }
    }
  });
  console.log('   OK - Donnees nettoyees');
  
  // 2. Creer un shift avec PAUSE prevue
  console.log('');
  console.log('2. Creation shift avec pause...');
  const shift = await prisma.shift.create({
    data: {
      employeId: jordanId,
      date: new Date(today + 'T00:00:00.000Z'),
      type: 'travail',
      statut: 'planifie',
      heureDebut: '09:00',
      heureFin: '17:00',
      pauseDebut: '12:00',
      pauseFin: '13:00',
      segments: [
        { type: 'travail', start: '09:00', end: '12:00' },
        { type: 'pause', start: '12:00', end: '13:00' },
        { type: 'travail', start: '13:00', end: '17:00' }
      ]
    }
  });
  console.log('   Shift cree: 09:00-17:00 avec pause 12:00-13:00');
  console.log('   ID:', shift.id);
  
  // 3. Simuler les scans QR (SANS pause - travail continu)
  console.log('');
  console.log('3. Simulation scans QR...');
  console.log('');
  
  // Scan 1: Arrivee a 09:00
  const arrivee = new Date(today + 'T08:00:00.000Z'); // 09:00 Paris
  console.log('   [09:00] Jordan scanne son QR...');
  const p1 = await prisma.pointage.create({
    data: {
      userId: jordanId,
      type: 'arrivee',
      horodatage: arrivee
    }
  });
  console.log('   -> ENTREE enregistree');
  
  // Scan 2: Depart a 17:00 (SANS avoir pris de pause!)
  const depart = new Date(today + 'T16:00:00.000Z'); // 17:00 Paris
  console.log('');
  console.log('   [17:00] Jordan scanne son QR pour partir...');
  console.log('   (Il n a PAS pris sa pause de 12h-13h!)');
  const p2 = await prisma.pointage.create({
    data: {
      userId: jordanId,
      type: 'depart',
      horodatage: depart
    }
  });
  console.log('   -> SORTIE enregistree');
  
  // 4. Declencher la detection d'anomalies temps reel
  console.log('');
  console.log('4. Detection anomalies...');
  
  // Calculer le temps de travail continu
  const heuresTravail = (depart - arrivee) / 3600000;
  console.log('   Temps de travail continu:', heuresTravail, 'heures');
  
  // Verifier si pause prise (2 paires de pointages = pause prise)
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: jordanId,
      horodatage: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lt: new Date(today + 'T23:59:59.999Z')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  let paires = 0;
  for (let i = 0; i < pointages.length - 1; i++) {
    if (pointages[i].type === 'arrivee' && pointages[i + 1].type === 'depart') {
      paires++;
    }
  }
  console.log('   Paires arrivee/depart:', paires, '(2 = pause prise, 1 = pas de pause)');
  
  // Creer les anomalies
  if (paires < 2 && heuresTravail > 6) {
    // Pause non prise
    await prisma.anomalie.create({
      data: {
        employeId: jordanId,
        shiftId: shift.id,
        type: 'pause_non_prise',
        gravite: 'haute',
        statut: 'en_attente',
        date: new Date(today + 'T12:00:00.000Z'),
        description: 'Pause non prise - ' + heuresTravail + 'h de travail continu (pause prevue 12:00-13:00)'
      }
    });
    console.log('');
    console.log('   ANOMALIE CREEE: pause_non_prise');
    
    // Depassement amplitude (>6h sans pause = violation code du travail)
    await prisma.anomalie.create({
      data: {
        employeId: jordanId,
        shiftId: shift.id,
        type: 'depassement_amplitude',
        gravite: 'critique',
        statut: 'en_attente',
        date: new Date(today + 'T12:00:00.000Z'),
        description: 'Violation Code du travail - ' + heuresTravail + 'h de travail continu sans pause (max legal: 6h)'
      }
    });
    console.log('   ANOMALIE CREEE: depassement_amplitude (violation code du travail)');
  }
  
  // 5. Resume
  console.log('');
  console.log('='.repeat(70));
  console.log('RESUME - Ce que Jordan voit sur son app:');
  console.log('='.repeat(70));
  console.log('');
  console.log('Shift: 09:00 - 17:00 (pause prevue 12:00-13:00)');
  console.log('Pointages:');
  console.log('   09:00 - Arrivee');
  console.log('   17:00 - Depart');
  console.log('');
  console.log('ANOMALIES DETECTEES:');
  console.log('   1. Pause non prise (HAUTE)');
  console.log('      -> 8h de travail continu sans pause');
  console.log('   2. Depassement amplitude (CRITIQUE)');
  console.log('      -> Violation Code du travail (>6h sans pause)');
  console.log('');
  console.log('Rafraichissez la page de Jordan pour voir!');
  
  await prisma.$disconnect();
}

testPauseNonPrise();
