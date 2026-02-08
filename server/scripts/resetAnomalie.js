const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAnomalie() {
  const a = await prisma.anomalie.update({
    where: { id: 486 },
    data: {
      statut: 'en_attente',
      details: {
        shiftId: 13203,
        heureDebutPrevue: '10:00',
        heureArriveeReelle: '09:10',
        ecartMinutes: 50,
        minutesEnAvance: 50,
        heuresSup: 0.83
      }
    }
  });
  console.log('✅ Anomalie', a.id, 'réinitialisée:', a.statut);
  await prisma.$disconnect();
}

resetAnomalie().catch(e => { console.error(e); prisma.$disconnect(); });
