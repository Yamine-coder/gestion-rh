const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  await p.paiementExtra.update({
    where: { id: 63 },
    data: { 
      arriveeReelle: '21:00', 
      departReelle: '23:30' 
    }
  });
  console.log('Updated paiement 63 with arriveeReelle=21:00 departReelle=23:30');
  await p.$disconnect();
})();
