const prisma = require('./prisma/client');

async function debug() {
  console.log('DEBUG ANOMALIE JORDAN');
  console.log('='.repeat(70));
  
  // L'anomalie dit 8h travaillees sans shift le 5 dec
  // Mais on voit qu'il n'y a PAS de pointages le 5 dec
  
  // Cherchons TOUS les pointages de Jordan
  const jordan = await prisma.user.findFirst({
    where: { email: { contains: 'JORDAN', mode: 'insensitive' } }
  });
  
  console.log('');
  console.log('TOUS les pointages de Jordan (userId:', jordan.id, '):');
  const allPointages = await prisma.pointage.findMany({
    where: { userId: jordan.id },
    orderBy: { horodatage: 'desc' },
    take: 10
  });
  
  if (allPointages.length === 0) {
    console.log('  AUCUN POINTAGE!');
  } else {
    allPointages.forEach(p => {
      const date = p.horodatage.toISOString();
      const heureParis = p.horodatage.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'});
      console.log('  -', date, '| Paris:', heureParis, '|', p.type);
    });
  }
  
  // Chercher l'anomalie
  console.log('');
  console.log('ANOMALIE DETAILS:');
  const anomalie = await prisma.anomalie.findFirst({
    where: { 
      employeId: jordan.id,
      type: 'pointage_hors_planning'
    }
  });
  
  if (anomalie) {
    console.log('  ID:', anomalie.id);
    console.log('  Date anomalie:', anomalie.date.toISOString());
    console.log('  Date Paris:', anomalie.date.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}));
    console.log('  Type:', anomalie.type);
    console.log('  Description:', anomalie.description);
    console.log('  Creee le:', anomalie.createdAt?.toISOString());
  }
  
  // Verifier les shifts du 5 dec
  console.log('');
  console.log('SHIFTS 5 dec pour Jordan:');
  const shifts5 = await prisma.shift.findMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date('2025-12-05T00:00:00.000Z'),
        lt: new Date('2025-12-06T00:00:00.000Z')
      }
    }
  });
  console.log('  Nombre:', shifts5.length);
  shifts5.forEach(s => console.log('  -', s.type, s.date.toISOString()));
  
  await prisma.$disconnect();
}

debug();
