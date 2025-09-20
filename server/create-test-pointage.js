const prisma = require('./prisma/client');

async function createTestPointage() {
  try {
    console.log('⏰ Création d\'un pointage de test pour tester les anomalies...');
    
    const employeId = 86; // test@Mouss.com
    const maintenant = new Date();
    
    // Créer un pointage d'arrivée
    const pointage = await prisma.pointage.create({
      data: {
        userId: employeId,
        type: 'arrivee',
        horodatage: maintenant
      }
    });
    
    console.log(`✅ Pointage d'arrivée créé - ID: ${pointage.id}`);
    console.log(`⏰ Heure: ${maintenant.toLocaleTimeString()}`);
    console.log('📋 Type: Arrivée');
    console.log('\n🎯 RÉSULTAT ATTENDU:');
    console.log('Si un shift d\'absence est configuré → Badge "Anomalie" rouge');
    console.log('Si pas de shift → Interface "Travail non planifié" orange');
    
    console.log('\n🔄 Pour tester le départ:');
    console.log('node create-test-pointage.js depart');
    
    if (process.argv[2] === 'depart') {
      console.log('\n⏰ Création d\'un pointage de départ...');
      
      const pointageDepart = await prisma.pointage.create({
        data: {
          userId: employeId,
          type: 'depart',
          horodatage: new Date(maintenant.getTime() + 2 * 60 * 60 * 1000) // +2h
        }
      });
      
      console.log(`✅ Pointage de départ créé - ID: ${pointageDepart.id}`);
      console.log(`⏰ Heure: ${new Date(maintenant.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString()}`);
      console.log('📋 Type: Départ');
      console.log('⏳ Session: 2h00');
    }
    
    console.log('\n🔄 POUR NETTOYER LES TESTS:');
    console.log('node -e "const prisma = require(\'./prisma/client\'); prisma.pointage.deleteMany({where:{userId:86}}).then(r=>console.log(\'✅ Pointages supprimés:\',r.count)).finally(()=>prisma.$disconnect());"');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPointage();
