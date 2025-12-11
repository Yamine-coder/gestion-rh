const prisma = require('./prisma/client');
prisma.pointage.findMany({
  where: { userId: 110 },
  orderBy: { horodatage: 'desc' },
  take: 5
}).then(p => {
  console.log('POINTAGES JORDAN (derniers 5):');
  console.log('');
  p.forEach(x => {
    const utc = x.horodatage.toISOString();
    const paris = x.horodatage.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'});
    console.log('  Type:', x.type);
    console.log('  UTC:', utc);
    console.log('  Paris:', paris);
    console.log('');
  });
  
  const now = new Date();
  console.log('MAINTENANT:');
  console.log('  UTC:', now.toISOString());
  console.log('  Paris:', now.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}));
  
  return prisma.\();
});
