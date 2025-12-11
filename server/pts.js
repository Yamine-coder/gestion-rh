const prisma = require('./prisma/client');
prisma.pointage.findMany({ where: { userId: 110 }, orderBy: { horodatage: 'desc' } })
.then(p => { 
  console.log('Pointages Jordan:'); 
  p.forEach(x => {
    const paris = x.horodatage.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'});
    console.log('  -', x.type, 'UTC:', x.horodatage.toISOString(), '-> Paris:', paris); 
  });
  return prisma['$'+'disconnect'](); 
});
