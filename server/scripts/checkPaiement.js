const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaiement() {
  const paiement = await prisma.paiementExtra.findUnique({
    where: { id: 109 }
  });
  
  console.log('Paiement #109:');
  console.log('  shiftId:', paiement.shiftId);
  console.log('  segmentIndex:', paiement.segmentIndex);
  console.log('  statut:', paiement.statut);
  
  await prisma.$disconnect();
}

checkPaiement();
