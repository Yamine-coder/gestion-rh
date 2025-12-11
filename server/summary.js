const prisma = require('./prisma/client');

async function summary() {
  const jordanId = 110;
  
  console.log('=== RESUME JORDAN ===');
  console.log('');
  
  const shift = await prisma.shift.findFirst({ where: { employeId: jordanId } });
  console.log('SHIFT (5 dec):');
  shift.segments.forEach(s => console.log('  ' + s.start + '-' + s.end + ' ' + s.type));
  
  console.log('');
  console.log('POINTAGES:');
  const pts = await prisma.pointage.findMany({ where: { userId: jordanId }, orderBy: { horodatage: 'asc' } });
  pts.forEach(p => {
    const h = new Date(p.horodatage).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    console.log('  ' + h + ' - ' + p.type);
  });
  
  console.log('');
  console.log('ANOMALIES:');
  const anoms = await prisma.anomalie.findMany({ where: { employeId: jordanId } });
  anoms.forEach(a => {
    console.log('  [' + a.type + '] ' + a.description);
  });
  
  console.log('');
  console.log('NOTE: pause_non_prise et depassement_amplitude sont exclus de l affichage front');
  
  await prisma['$'+'disconnect']();
}

summary();
