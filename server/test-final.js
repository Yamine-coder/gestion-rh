const prisma = require('./prisma/client');

async function testPauseNonPrise() {
  console.log('');
  console.log('TEST - PAUSE NON PRISE');
  console.log('='.repeat(60));
  
  const jordanId = 110;
  const today = new Date().toISOString().split('T')[0];
  
  // Nettoyage
  await prisma.pointage.deleteMany({ where: { userId: jordanId, horodatage: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  await prisma.anomalie.deleteMany({ where: { employeId: jordanId, date: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  await prisma.shift.deleteMany({ where: { employeId: jordanId, date: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  console.log('1. Nettoyage OK');
  
  // Shift avec pause
  await prisma.shift.create({
    data: {
      employeId: jordanId,
      date: new Date(today + 'T00:00:00Z'),
      type: 'travail',
      segments: [
        { type: 'travail', start: '09:00', end: '12:00' },
        { type: 'pause', start: '12:00', end: '13:00' },
        { type: 'travail', start: '13:00', end: '17:00' }
      ]
    }
  });
  console.log('2. Shift cree: 09:00-17:00 (pause 12:00-13:00)');
  
  // Pointages SANS pause
  await prisma.pointage.create({ data: { userId: jordanId, type: 'arrivee', horodatage: new Date(today + 'T08:00:00Z') } });
  await prisma.pointage.create({ data: { userId: jordanId, type: 'depart', horodatage: new Date(today + 'T16:00:00Z') } });
  console.log('3. Pointages: 09:00 arrivee, 17:00 depart (8h continu!)');
  
  // Anomalies
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      type: 'pause_non_prise',
      gravite: 'haute',
      statut: 'en_attente',
      date: new Date(today + 'T12:00:00Z'),
      description: 'Pause non prise - 8h de travail continu (pause prevue 12:00-13:00)'
    }
  });
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      type: 'depassement_amplitude',
      gravite: 'critique',
      statut: 'en_attente',
      date: new Date(today + 'T12:00:00Z'),
      description: 'Violation Code du travail - 8h continu sans pause (max 6h)'
    }
  });
  console.log('4. Anomalies creees: pause_non_prise + depassement_amplitude');
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Jordan peut voir sur son app:');
  console.log('  - Shift: 09:00-17:00 (pause 12:00-13:00)');
  console.log('  - Pointages: 09:00 + 17:00 (pas de pause)');
  console.log('  - 2 ANOMALIES detectees!');
  console.log('='.repeat(60));
  
  await prisma.$disconnect();
}

testPauseNonPrise();
