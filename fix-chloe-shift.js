const prisma = require('./server/prisma/client');

async function fixChloeShift() {
  try {
    const shift = await prisma.shift.update({
      where: { id: 7905 },
      data: { type: 'présence' }
    });
    
    console.log('✅ Shift corrigé:', shift.id, '- Type:', shift.type);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixChloeShift();
