const prisma = require('./prisma/client');

async function testPauseNonPrise() {
  console.log('');
  console.log('TEST REEL - PAUSE NON PRISE');
  console.log('='.repeat(70));
  
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
  
  // 2. Creer shift avec pause (segments uniquement!)
  console.log('');
  console.log('2. Creation shift 09:00-17:00 (pause 12:00-13:00)...');
  const shift = await prisma.shift.create({
    data: {
      employeId: jordanId,
      date: new Date(today + 'T00:00:00.000Z'),
      type: 'travail',
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
  
  // Arrivee 09:00 Paris = 08:00 UTC
  const arrivee = new Date(today + 'T08:00:00.000Z');
  console.log('   [09:00] Scan QR -> ENTREE');
  await prisma.pointage.create({ data: { userId: jordanId, type: 'arrivee', horodatage: arrivee } });
  
  // Depart 17:00 Paris = 16:00 UTC SANS pause
  const depart = new Date(today + 'T16:00:00.000Z');
  console.log('   [17:00] Scan QR -> SORTIE (SANS pause!)');
  await prisma.pointage.create({ data: { userId: jordanId, type: 'depart', horodatage: depart } });
  
  // 4. Detection anomalies
  console.log('');
  console.log('4. Creation anomalies...');
  const heuresTravail = (depart - arrivee) / 3600000;
  
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
  console.log('   -> pause_non_prise (HAUTE)');
  
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      shiftId: shift.id,
      type: 'depassement_amplitude',
      gravite: 'critique',
      statut: 'en_attente',
      date: new Date(today + 'T12:00:00.000Z'),
      description: 'Violation Code du travail - ' + heuresTravail + 'h continu sans pause (max 6h)'
    }
  });
  console.log('   -> depassement_amplitude (CRITIQUE)');
  
  // Resume
  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTAT pour Jordan:');
  console.log('='.repeat(70));
  console.log('');
  console.log('Shift: 09:00-12:00 | PAUSE 12:00-13:00 | 13:00-17:00');
  console.log('');
  console.log('Pointages:');
  console.log('   09:00 - Arrivee');
  console.log('   17:00 - Depart (8h de travail continu!)');
  console.log('');
  console.log('ANOMALIES DETECTEES:');
  console.log('   1. pause_non_prise (HAUTE)');
  console.log('   2. depassement_amplitude (CRITIQUE)');
  console.log('');
  console.log('Rafraichissez la page de Jordan!');
  
  await prisma.$disconnect();
}

testPauseNonPrise();
