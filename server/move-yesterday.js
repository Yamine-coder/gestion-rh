const prisma = require('./prisma/client');

async function moveToYesterday() {
  const jordanId = 110;
  const hier = '2025-12-05';
  
  // Shift -> hier
  await prisma.shift.updateMany({
    where: { employeId: jordanId },
    data: { date: new Date(hier + 'T00:00:00Z') }
  });
  
  // Pointages -> hier
  const pointages = await prisma.pointage.findMany({ where: { userId: jordanId }, orderBy: { horodatage: 'asc' } });
  await prisma.pointage.update({ where: { id: pointages[0].id }, data: { horodatage: new Date(hier + 'T08:00:00Z') } });
  await prisma.pointage.update({ where: { id: pointages[1].id }, data: { horodatage: new Date(hier + 'T16:00:00Z') } });
  
  console.log('Donnees deplacees au 5 decembre (hier)');
  console.log('Shift: 09:00-17:00 avec pause 12:00-13:00');
  console.log('Pointages: 09:00 arrivee, 17:00 depart (SANS pause!)');
  
  await prisma['$'+'disconnect']();
}

moveToYesterday();
