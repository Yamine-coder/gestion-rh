const prisma = require('./prisma/client');
prisma.anomalie.findMany({ where: { employeId: 110 }, orderBy: { date: 'desc' } })
.then(a => { 
  console.log('Anomalies Jordan:'); 
  a.forEach(x => {
    console.log('  Type:', x.type);
    console.log('  Description:', x.description);
    console.log('  Statut:', x.statut);
    console.log('');
  });
  console.log('Total:', a.length);
  return prisma['$'+'disconnect'](); 
});
