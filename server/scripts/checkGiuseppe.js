const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGiuseppe() {
  // Trouver Giuseppe
  const giuseppe = await prisma.user.findFirst({
    where: { prenom: { contains: 'Giuseppe' } }
  });
  
  if (!giuseppe) {
    console.log('Giuseppe non trouvé');
    return;
  }
  
  console.log('Giuseppe ID:', giuseppe.id, giuseppe.prenom, giuseppe.nom);
  
  // Ses paiements extras
  const paiements = await prisma.paiementExtra.findMany({
    where: { employeId: giuseppe.id }
  });
  
  console.log('\nPaiements extras:');
  paiements.forEach(p => {
    console.log(`  #${p.id} - ${p.date} - ${p.statut} - ${p.montant}€ - shiftId: ${p.shiftId}`);
  });
  
  // Ses shifts du 26 janvier
  const shifts = await prisma.shift.findMany({
    where: { 
      employeId: giuseppe.id,
      date: {
        gte: new Date('2026-01-26'),
        lt: new Date('2026-01-27')
      }
    }
  });
  
  console.log('\nShifts du 26 janvier:');
  shifts.forEach(s => {
    console.log(`  Shift #${s.id}`);
    const segs = typeof s.segments === 'string' ? JSON.parse(s.segments) : s.segments;
    console.log('  Segments:', JSON.stringify(segs, null, 2));
  });
  
  await prisma.$disconnect();
}

checkGiuseppe();
