// Préparation du scénario de test - Pointage sans shift prévu
const prisma = require('./prisma/client');

async function prepareTest() {
  const employeId = 110;
  const today = '2025-12-05';
  
  console.log('🧹 PRÉPARATION DU SCÉNARIO DE TEST');
  console.log('═'.repeat(50));
  
  // 1. Supprimer les anomalies existantes
  console.log('\n1️⃣ Suppression des anomalies existantes...');
  const deleted = await prisma.anomalie.deleteMany({
    where: { employeId }
  });
  console.log('   Anomalies supprimées:', deleted.count);
  
  // 2. Supprimer les pointages existants
  console.log('\n2️⃣ Suppression des pointages existants...');
  const deletedPointages = await prisma.pointage.deleteMany({
    where: { 
      userId: employeId,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });
  console.log('   Pointages supprimés:', deletedPointages.count);
  
  // 3. Vérifier le shift actuel
  console.log('\n3️⃣ Vérification du shift actuel...');
  const shift = await prisma.shift.findFirst({
    where: {
      employeId,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });
  
  if (shift) {
    console.log('   Shift trouvé ID:', shift.id);
    console.log('   Type:', shift.type);
    console.log('   Segments:', JSON.stringify(shift.segments));
    
    // Supprimer le shift pour simuler 'pas d heure prévue'
    console.log('\n4️⃣ Suppression du shift pour simuler absence de planning...');
    await prisma.shift.delete({ where: { id: shift.id } });
    console.log('   ✅ Shift supprimé - Employé sans planning aujourd\'hui');
  } else {
    console.log('   Aucun shift trouvé - Employé déjà sans planning');
  }
  
  // 5. État final
  console.log('\n' + '═'.repeat(50));
  console.log('✅ ÉTAT INITIAL DU TEST:');
  console.log('   - Employé ID 110 (yjordan496@gmail.com)');
  console.log('   - Aucune anomalie');
  console.log('   - Aucun pointage');
  console.log('   - Aucun shift prévu');
  console.log('\n🎯 PRÊT POUR LE TEST: Pointer sans heure prévue');
  
  await prisma.$disconnect();
}

prepareTest().catch(console.error);
