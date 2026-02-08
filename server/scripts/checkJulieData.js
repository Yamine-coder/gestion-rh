const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJulieData() {
  const employeId = 100;
  const dateStr = '2026-01-28';
  
  // Shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  console.log('=== SHIFT Julie Martin 28/01 ===');
  console.log('Segments:', JSON.stringify(shift?.segments, null, 2));
  
  // Pointages
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: employeId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\n=== POINTAGES ===');
  pointages.forEach(p => {
    const h = new Date(p.horodatage);
    console.log(`  ${p.type}: ${h.toISOString()} (${String(h.getUTCHours()+1).padStart(2,'0')}:${String(h.getUTCMinutes()).padStart(2,'0')} Paris)`);
  });
  
  await prisma.$disconnect();
}

checkJulieData().catch(e => { console.error(e); prisma.$disconnect(); });
