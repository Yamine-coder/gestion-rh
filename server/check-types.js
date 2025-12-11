const p = require('./prisma/client');
p.pointage.findMany({ 
  where: { userId: 110 }, 
  orderBy: { horodatage: 'asc' }, 
  take: 10 
}).then(r => { 
  console.log('Pointages Jordan:');
  r.forEach(x => console.log(`  ${x.type} - ${x.horodatage.toISOString()}`)); 
  p.$disconnect(); 
});
