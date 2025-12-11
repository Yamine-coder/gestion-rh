const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const userId = 110;
  
  console.log('Shifts pour Moussaoui Yami (2-8 decembre):');
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: userId,
      date: {
        gte: new Date('2025-12-02'),
        lte: new Date('2025-12-08')
      }
    },
    orderBy: { date: 'asc' }
  });
  
  shifts.forEach(s => {
    const dateStr = s.date.toISOString().split('T')[0];
    console.log('  ' + dateStr + ': ' + JSON.stringify(s.segments));
  });
  
  console.log('');
  console.log('Pointages (2-8 decembre):');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      horodatage: {
        gte: new Date('2025-12-02'),
        lte: new Date('2025-12-08T23:59:59')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  pointages.forEach(p => {
    const dateStr = p.horodatage.toISOString();
    console.log('  ' + dateStr + ' - ' + p.type);
  });
  
  await prisma.$disconnect();
}

checkData();
