const prisma = require('./server/prisma/client');

async function checkMoussaouiAllShifts() {
  const shifts = await prisma.shift.findMany({
    where: { employeId: 110 },
    orderBy: { date: 'desc' },
    take: 15
  });
  
  console.log('📅 Tous les shifts de Moussaoui (ID 110):');
  shifts.forEach(s => {
    const dateStr = s.date.toISOString().split('T')[0];
    console.log(`  ID:${s.id} | ${dateStr} | type: ${s.type} | motif: ${s.motif?.substring(0,40) || '(aucun)'}`);
  });
  
  await prisma.$disconnect();
}

checkMoussaouiAllShifts();
