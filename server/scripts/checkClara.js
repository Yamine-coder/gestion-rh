const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const claraId = 104;
  const dateStr = '2026-01-29';
  
  console.log('=== SHIFT ===');
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: claraId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  console.log('Shift:', JSON.stringify(shift, null, 2));
  
  console.log('\n=== POINTAGES ===');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: claraId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    },
    orderBy: { horodatage: 'asc' }
  });
  pointages.forEach(p => {
    console.log(`  ${p.type}: ${p.horodatage.toISOString()}`);
  });
  
  console.log('\n=== ANOMALIES ===');
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: claraId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  anomalies.forEach(a => {
    console.log(`  #${a.id}: ${a.type} - ${a.statut} - heuresExtra: ${a.heuresExtra}`);
    console.log(`    Details:`, JSON.stringify(a.details, null, 4));
  });
  
  console.log('\n=== PAIEMENTS EXTRA ===');
  const paiements = await prisma.paiementExtra.findMany({
    where: { shiftId: shift?.id }
  });
  console.log('Paiements:', paiements);
  
  await prisma.$disconnect();
}

check().catch(e => { console.error(e); prisma.$disconnect(); });
