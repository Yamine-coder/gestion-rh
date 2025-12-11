const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestShift() {
  // Créer un shift de nuit qui a commencé il y a 1h (01:30) pour Marco Romano (ID 93)
  const shift = await prisma.shift.create({
    data: {
      employe: { connect: { id: 93 } },
      date: new Date('2025-12-05'),
      type: 'présence',
      segments: [{ start: '01:30', end: '09:00' }]
    }
  });
  
  console.log('✅ Shift de test créé:', shift);
  console.log('\n📍 Marco Romano devrait pointer depuis 01:30');
  console.log('⏰ Il est maintenant ~02:40 → Retard de +1h détecté!');
  
  await prisma.$disconnect();
}

createTestShift();
