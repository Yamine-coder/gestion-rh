const prisma = require('./prisma/client');

async function createShift() {
  const jordanId = 110;
  const today = new Date().toISOString().split('T')[0];
  
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
  
  console.log('Shift cree pour Jordan - ' + today);
  console.log('  09:00 - 12:00 : Travail');
  console.log('  12:00 - 13:00 : Pause');
  console.log('  13:00 - 17:00 : Travail');
  console.log('');
  console.log('Total prevu: 7h (avec 1h pause)');
  
  await prisma['$'+'disconnect']();
}

createShift();
