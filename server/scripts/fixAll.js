const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAll() {
  // 1. Mettre le segment à a_payer
  const shift = await prisma.shift.findUnique({
    where: { id: 13207 }
  });
  
  let segments = typeof shift.segments === 'string' 
    ? JSON.parse(shift.segments) 
    : shift.segments;
  
  // Corriger le segment extra
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
  
  console.log('✅ Segment extra corrigé: paymentStatus = a_payer');
  
  // 2. Vérifier le paiement #109
  const paiement109 = await prisma.paiementExtra.findUnique({
    where: { id: 109 }
  });
  console.log('\nPaiement #109:', paiement109?.statut);
  
  await prisma.$disconnect();
}

fixAll();
