const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPointages() {
  const pointages = await prisma.pointage.findMany({
    where: { userId: 110 },
    orderBy: { horodatage: 'desc' },
    take: 5
  });
  
  console.log('Pointages Jordan (ID 110):');
  pointages.forEach(p => {
    console.log(`  - ${p.type} @ ${p.horodatage.toISOString()} (local: ${p.horodatage.toLocaleString('fr-FR')})`);
  });
  
  // Tester getWorkDayBounds
  const { getWorkDayBounds } = require('./config/workDayConfig');
  const { debutJournee, finJournee } = getWorkDayBounds();
  
  console.log('\nPériode journée de travail:');
  console.log(`  Début: ${debutJournee.toISOString()} (local: ${debutJournee.toLocaleString('fr-FR')})`);
  console.log(`  Fin:   ${finJournee.toISOString()} (local: ${finJournee.toLocaleString('fr-FR')})`);
  
  // Vérifier si les pointages sont dans la période
  console.log('\nPointages dans la période:');
  pointages.forEach(p => {
    const inPeriod = p.horodatage >= debutJournee && p.horodatage < finJournee;
    console.log(`  - ${p.type} @ ${p.horodatage.toLocaleString('fr-FR')}: ${inPeriod ? '✅ DANS période' : '❌ HORS période'}`);
  });
  
  await prisma.$disconnect();
}

checkPointages();
