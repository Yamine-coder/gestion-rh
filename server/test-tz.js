const prisma = require('./prisma/client');
async function test() {
  console.log('ANALYSE TIMEZONE');
  const shift = await prisma.shift.findFirst({orderBy: {date: 'desc'}});
  if (shift) {
    console.log('Shift date ISO:', shift.date.toISOString());
  }
  const p = await prisma.pointage.findFirst({orderBy: {horodatage: 'desc'}});
  if (p) {
    console.log('Pointage ISO:', p.horodatage.toISOString());
  }
  console.log('new Date(2025-12-06):', new Date('2025-12-06').toISOString());
  await prisma.$disconnect();
}
test();
