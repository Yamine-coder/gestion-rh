const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSegmentStatus() {
  const shift = await prisma.shift.findUnique({
    where: { id: 13207 }
  });
  
  if (!shift) {
    console.log('Shift non trouvé');
    return;
  }
  
  let segments = typeof shift.segments === 'string' 
    ? JSON.parse(shift.segments) 
    : shift.segments;
  
  console.log('Segments avant:', JSON.stringify(segments, null, 2));
  
  // Mettre à jour le segment extra pour qu'il soit "a_payer"
  segments = segments.map(s => {
    if (s.isExtra) {
      return { ...s, paymentStatus: 'a_payer' };
    }
    return s;
  });
  
  await prisma.shift.update({
    where: { id: 13207 },
    data: { segments }
  });
  
  console.log('\n✅ Segment extra mis à jour: paymentStatus = a_payer');
  
  await prisma.$disconnect();
}

fixSegmentStatus();
