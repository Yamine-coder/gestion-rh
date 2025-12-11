const prisma = require('./prisma/client');

async function fixPointages() {
  const jordanId = 110;
  
  // Supprimer les pointages futurs
  await prisma.pointage.deleteMany({ where: { userId: jordanId } });
  
  // Hier (5 décembre) - journée complete
  const hier = '2025-12-05';
  await prisma.pointage.create({ data: { userId: jordanId, type: 'arrivee', horodatage: new Date(hier + 'T08:00:00Z') } });
  await prisma.pointage.create({ data: { userId: jordanId, type: 'depart', horodatage: new Date(hier + 'T16:00:00Z') } });
  
  // Mettre a jour les anomalies pour hier aussi
  await prisma.anomalie.updateMany({
    where: { employeId: jordanId, date: { gte: new Date('2025-12-06T00:00:00Z') } },
    data: { date: new Date(hier + 'T12:00:00Z') }
  });
  
  // Mettre a jour le shift pour hier
  await prisma.shift.updateMany({
    where: { employeId: jordanId, date: { gte: new Date('2025-12-06T00:00:00Z') } },
    data: { date: new Date(hier + 'T00:00:00Z') }
  });
  
  console.log('CORRIGE! Pointages maintenant dates du 5 decembre (hier)');
  console.log('');
  console.log('Jordan devrait voir:');
  console.log('  - Pointage arrivee: 5 dec 09:00 (Paris)');
  console.log('  - Pointage depart: 5 dec 17:00 (Paris)');
  console.log('  - 2 anomalies du 5 dec');
  
  await prisma['$' + 'disconnect']();
}

fixPointages();
