const prisma = require('./prisma/client');
async function verify() {
  const dateJour = '2025-12-05';
  console.log('Date recherchee:', dateJour);
  console.log('new Date(dateJour):', new Date(dateJour).toISOString());
  
  const shifts1 = await prisma.shift.findMany({
    where: { date: new Date(dateJour) },
    take: 5
  });
  console.log('Shifts avec new Date():', shifts1.length);
  
  const shifts2 = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date(dateJour + 'T00:00:00.000Z'),
        lt: new Date(dateJour + 'T23:59:59.999Z')
      }
    },
    take: 5
  });
  console.log('Shifts avec plage UTC:', shifts2.length);
  
  await prisma.$disconnect();
}
verify();
