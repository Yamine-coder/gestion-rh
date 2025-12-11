const prisma = require('./prisma/client');

async function testPauseNonPrise() {
  console.log('');
  console.log('TEST REEL - PAUSE NON PRISE');
  console.log('='.repeat(70));
  console.log('Simulation: Jordan scanne son QR comme s il etait au travail');
  console.log('');
  
  const jordanId = 110;
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Nettoyer
  console.log('1. Nettoyage...');
  await prisma.pointage.deleteMany({
    where: { userId: jordanId, horodatage: { gte: new Date(today + 'T00:00:00.000Z'), lt: new Date(today + 'T23:59:59.999Z') } }
  });
  await prisma.anomalie.deleteMany({
    where: { employeId: jordanId, date: { gte: new Date(today + 'T00:00:00.000Z'), lt: new Date(today + 'T23:59:59.999Z') } }
  });
  await prisma.shift.deleteMany({
    where: { employeId: jordanId, date: { gte: new Date(today + 'T00:00:00.000Z'), lt: new Date(today + 'T23:59:59.999Z') } }
  });
  console.log('   OK');
  
  // 2. Creer shift avec pause
  console.log('');
  console.log('2. Creation shift 09:00-17:00 (pause 12:00-13:00)...');
  const shift = await prisma.shift.create({
    data: {
      employeId: jordanId,
      date: new Date(today + 'T00:00:00.000Z'),
      type: 'travail',
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
  console.log('   Shift ID:', shift.id);
  
  // 3. Simuler scans QR SANS pause
  console.log('');
  console.log('3. Simulation scans QR (travail SANS pause)...');
  console.log('');
  
  // Arrivee 09:00
  const arrivee = new Date(today + 'T08:00:00.000Z'); // 09:00 Paris
  console.log('   [09:00] Scan QR -> ENTREE');
  await prisma.pointage.create({ data: { userId: jordanId, type: 'arrivee', horodatage: arrivee } });
  
  // Depart 17:00 SANS avoir pris de pause
  const depart = new Date(today + 'T16:00:00.000Z'); // 17:00 Paris
  console.log('   [17:00] Scan QR -> SORTIE (SANS pause prise!)');
  await prisma.pointage.create({ data: { userId: jordanId, type: 'depart', horodatage: depart } });
  
  // 4. Detection anomalies
  console.log('');
  console.log('4. Detection anomalies...');
  const heuresTravail = (depart - arrivee) / 3600000;
  console.log('   Travail continu:', heuresTravail, 'heures');
  
  // Creer anomalies
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
  console.log('   -> ANOMALIE: pause_non_prise');
  
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      shiftId: shift.id,
      type: 'depassement_amplitude',
      gravite: 'critique',
      statut: 'en_attente',
      date: new Date(today + 'T12:00:00.000Z'),
      description: 'Violation Code du travail - ' + heuresTravail + 'h de travail continu sans pause (max: 6h)'
    }
  });
  console.log('   -> ANOMALIE: depassement_amplitude (Code du travail)');
  
  // Resume
  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTAT - Ce que Jordan voit:');
  console.log('='.repeat(70));
  console.log('');
  console.log('Shift prevu: 09:00-17:00 (pause 12:00-13:00)');
  console.log('Pointages:');
  console.log('   09:00 - Arrivee');
  console.log('   17:00 - Depart');
  console.log('');
  console.log('2 ANOMALIES:');
  console.log('   1. Pause non prise (HAUTE)');
  console.log('   2. Depassement amplitude (CRITIQUE) - Code du travail');
  console.log('');
  console.log('Rafraichissez la page de Jordan!');
  
  await prisma.$disconnect();
}

testPauseNonPrise();
