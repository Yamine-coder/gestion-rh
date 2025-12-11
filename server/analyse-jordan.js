const prisma = require('./prisma/client');

async function analyseJordan() {
  console.log('ANALYSE COMPTE JORDAN');
  console.log('='.repeat(70));
  
  const jordan = await prisma.user.findFirst({
    where: { email: { contains: 'JORDAN', mode: 'insensitive' } }
  });
  
  if (!jordan) {
    console.log('Jordan non trouve!');
    return;
  }
  
  console.log('');
  console.log('UTILISATEUR:');
  console.log('  ID:', jordan.id);
  console.log('  Email:', jordan.email);
  console.log('  Nom:', jordan.prenom, jordan.nom);
  
  // Shifts des derniers jours
  console.log('');
  console.log('SHIFTS (5-6 dec):');
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: jordan.id,
      date: { gte: new Date('2025-12-04'), lte: new Date('2025-12-07') }
    },
    orderBy: { date: 'desc' }
  });
  
  if (shifts.length === 0) {
    console.log('  AUCUN SHIFT pour ces dates!');
  } else {
    shifts.forEach(s => {
      console.log('  -', s.date.toISOString().split('T')[0], '| Type:', s.type);
    });
  }
  
  // Pointages 5 dec
  console.log('');
  console.log('POINTAGES 5 dec:');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: jordan.id,
      horodatage: { 
        gte: new Date('2025-12-05T00:00:00Z'),
        lt: new Date('2025-12-06T00:00:00Z')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  if (pointages.length === 0) {
    console.log('  Aucun pointage le 5 dec!');
  } else {
    pointages.forEach(p => {
      const heure = p.horodatage.toLocaleTimeString('fr-FR', {timeZone: 'Europe/Paris'});
      console.log('  -', heure, '|', p.type);
    });
  }
  
  // Anomalies
  console.log('');
  console.log('ANOMALIES:');
  const anomalies = await prisma.anomalie.findMany({
    where: { employeId: jordan.id },
    orderBy: { date: 'desc' },
    take: 5
  });
  
  anomalies.forEach(a => {
    const date = a.date.toISOString().split('T')[0];
    console.log('  -', date, '|', a.type, '|', a.statut);
    console.log('    Desc:', a.description);
  });
  
  await prisma.$disconnect();
}

analyseJordan();
