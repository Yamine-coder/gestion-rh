const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExtraSegments() {
  const shifts = await prisma.shift.findMany({ 
    where: { segments: { not: null } }, 
    include: { employe: true } 
  });
  
  console.log('Shifts avec segments extra:\n');
  
  for (const s of shifts) {
    const segs = typeof s.segments === 'string' ? JSON.parse(s.segments) : s.segments;
    if (segs && segs.some(x => x.isExtra)) {
      console.log('Shift', s.id, '-', s.employe?.prenom, s.employe?.nom);
      console.log('Date:', s.date);
      console.log('Segments:', JSON.stringify(segs, null, 2));
      console.log('---');
    }
  }
  
  await prisma.$disconnect();
}

checkExtraSegments();
