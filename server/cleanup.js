const prisma = require('./prisma/client');

async function cleanup() {
  const jordanId = 110;
  
  await prisma.anomalie.deleteMany({ where: { employeId: jordanId } });
  await prisma.pointage.deleteMany({ where: { userId: jordanId } });
  await prisma.shift.deleteMany({ where: { employeId: jordanId } });
  
  console.log('Tout supprime pour Jordan (ID 110)');
  console.log('');
  console.log('Maintenant on va:');
  console.log('1. Creer un shift avec pause');
  console.log('2. Simuler scan QR arrivee');
  console.log('3. Simuler scan QR depart (SANS pause)');
  console.log('4. Voir si anomalie detectee');
  
  await prisma['$'+'disconnect']();
}

cleanup();
