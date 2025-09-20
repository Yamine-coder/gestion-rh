const prisma = require('./prisma/client');

async function clearTestShift() {
  try {
    console.log('🧹 Suppression du shift de test existant...');
    
    const today = new Date('2025-08-24T00:00:00.000Z');
    
    // Supprimer le shift pour test@Mouss.com (employeId 86) aujourd'hui
    const deleted = await prisma.shift.deleteMany({
      where: {
        employeId: 86,
        date: today
      }
    });
    
    console.log('✅ Shifts supprimés:', deleted.count);
    console.log('📋 L\'employé test@Mouss.com n\'a plus de planning aujourd\'hui');
    console.log('🎯 Scénario actuel: REPOS/TRAVAIL NON PLANIFIÉ');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestShift();
