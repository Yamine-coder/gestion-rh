const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAnomalie() {
  const a = await prisma.anomalie.update({
    where: { id: 486 },
    data: {
      heuresExtra: 0.83,
      details: {
        shiftId: 123,
        heureDebutPrevue: '10:00',
        heureArriveeReelle: '09:10',
        ecartMinutes: 50,
        minutesEnAvance: 50,
        heuresSup: 0.83
      }
    }
  });
  console.log('✅ Anomalie mise à jour:', a.id, 'heuresExtra:', a.heuresExtra);
  await prisma.$disconnect();
}

updateAnomalie().catch(e => { console.error(e); prisma.$disconnect(); });
