const prisma = require('./prisma/client');

async function main() {
  const p = await prisma.paiementExtra.findUnique({where:{id:26}});
  if (p) {
    console.log('PaiementExtra 26:');
    console.log('  Heures:', p.heures);
    console.log('  Montant:', p.montant);
    console.log('  Statut:', p.statut);
    console.log('  Source:', p.source);
    console.log('  ShiftId:', p.shiftId);
  } else {
    console.log('PaiementExtra 26 non trouvé');
  }
  
  // Lister tous les paiements à payer
  const aPayer = await prisma.paiementExtra.findMany({
    where: { statut: 'a_payer' },
    orderBy: { id: 'desc' },
    take: 10
  });
  
  console.log('\n--- 10 derniers paiements à payer ---');
  aPayer.forEach(p => {
    console.log(`ID:${p.id} | ${p.heures}h | ${p.montant}€ | src:${p.source}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
