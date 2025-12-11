const prisma = require('./prisma/client');
prisma.anomalie.findMany({ where: { employeId: 110 }, orderBy: { date: 'desc' }, take: 5 })
.then(a => { 
  console.log('Anomalies Jordan:'); 
  a.forEach(x => console.log(x.id, x.type, x.date.toISOString(), x.statut)); 
  return prisma['$'+'disconnect'](); 
});
