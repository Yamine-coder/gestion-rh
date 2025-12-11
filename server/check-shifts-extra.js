const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const shifts = await p.shift.findMany({
    where: { employe: { email: 'test.extra@restaurant.com' } },
    include: { employe: true },
    orderBy: { date: 'desc' },
    take: 5
  });
  
  console.log('Shifts pour test.extra@restaurant.com:');
  shifts.forEach(s => {
    console.log(`  Shift ${s.id} - ${s.date.toISOString().split('T')[0]}`);
    console.log(`    Segments: ${JSON.stringify(s.segments)}`);
  });

  // Chercher les pointages du shift 7986 (100% extra)
  const shift7986 = await p.shift.findUnique({ where: { id: 7986 }, include: { employe: true } });
  if (shift7986) {
    console.log('\n📅 Shift 7986 (100% extra):');
    console.log(`   Date: ${shift7986.date.toISOString().split('T')[0]}`);
    console.log(`   Segments: ${JSON.stringify(shift7986.segments)}`);
    
    // Pointages du jour
    const dateDebut = new Date(shift7986.date);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(shift7986.date);
    dateFin.setHours(23, 59, 59, 999);
    
    const pointages = await p.pointage.findMany({
      where: {
        userId: shift7986.employeId,
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`\n   Pointages: ${pointages.length}`);
    pointages.forEach(pt => {
      console.log(`     - ${pt.type}: ${pt.horodatage.toLocaleTimeString('fr-FR')}`);
    });
  }
  
  await p.$disconnect();
})();
