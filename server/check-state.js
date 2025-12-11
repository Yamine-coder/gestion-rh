const prisma = require('./prisma/client');

async function check() {
  const jordanId = 110;
  
  console.log('=== ETAT ACTUEL JORDAN ===');
  console.log('');
  
  // Shift
  const shift = await prisma.shift.findFirst({ where: { employeId: jordanId }, orderBy: { date: 'desc' } });
  console.log('SHIFT PREVU:');
  if (shift) {
    shift.segments.forEach(s => console.log('  ' + s.start + ' - ' + s.end + ' : ' + s.type));
  }
  
  // Pointages
  console.log('');
  console.log('POINTAGES REELS:');
  const pointages = await prisma.pointage.findMany({ where: { userId: jordanId }, orderBy: { horodatage: 'asc' } });
  pointages.forEach(p => {
    const heure = new Date(p.horodatage).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    console.log('  ' + heure + ' - ' + p.type);
  });
  
  // Anomalies
  console.log('');
  console.log('ANOMALIES:');
  const anomalies = await prisma.anomalie.findMany({ where: { employeId: jordanId } });
  if (anomalies.length === 0) {
    console.log('  Aucune (le scheduler doit tourner pour detecter pause_non_prise)');
  } else {
    anomalies.forEach(a => console.log('  ' + a.type + ': ' + a.description));
  }
  
  console.log('');
  console.log('ANALYSE:');
  console.log('  - Shift prevu avec pause 12:00-13:00');
  console.log('  - Pointages: arrivee + depart SEULEMENT');
  console.log('  - Pas de pointage pause_debut / pause_fin');
  console.log('  -> Le scheduler devrait detecter: pause_non_prise');
  
  await prisma['$'+'disconnect']();
}

check();
