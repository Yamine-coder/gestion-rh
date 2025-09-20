const prisma = require('./prisma/client');

async function fixAnomalyScenario() {
  try {
    console.log('🔧 Correction du scénario anomalie...');
    
    // Supprimer tous les shifts existants pour l'utilisateur
    await prisma.shift.deleteMany({ where: { employeId: 86 } });
    
    // Créer le shift d'absence pour aujourd'hui
    const aujourdhui = new Date();
    const newShift = await prisma.shift.create({
      data: {
        employeId: 86,
        date: aujourdhui,
        type: 'absence',
        motif: 'Congé maladie',
        segments: []
      }
    });
    
    console.log('✅ Shift d\'absence créé - ID:', newShift.id);
    console.log('📅 Date:', newShift.date.toISOString().split('T')[0]);
    console.log('🎭 Type:', newShift.type);
    console.log('🚫 Motif:', newShift.motif);
    
    // Vérifier les pointages existants
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: 86,
        horodatage: {
          gte: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
          lt: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 1)
        }
      }
    });
    
    console.log('⏱️  Pointages aujourd\'hui:', pointages.length);
    pointages.forEach(p => {
      console.log('   ', p.type, 'à', new Date(p.horodatage).toTimeString().substring(0,5));
    });
    
    console.log('\n🎯 Scénario anomalie configuré correctement !');
    console.log('Shift d\'absence + pointages = ANOMALIE détectée');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAnomalyScenario();
