const prisma = require('./prisma/client');

async function testExtraScenario() {
  try {
    console.log('🧪 Test scénario: TRAVAIL NON PLANIFIÉ (EXTRA)');
    console.log('===============================================\n');
    
    // 1. Supprimer tous les shifts pour l'utilisateur test (ID 86)
    console.log('🧹 Suppression de tous les shifts pour l\'utilisateur test...');
    const deleted = await prisma.shift.deleteMany({
      where: { employeId: 86 }
    });
    console.log('✅ Shifts supprimés:', deleted.count);
    
    // 2. Vérifier qu'il n'y a plus de shifts
    const remainingShifts = await prisma.shift.findMany({
      where: { employeId: 86 }
    });
    console.log('📋 Shifts restants:', remainingShifts.length);
    
    // 3. Créer des pointages pour aujourd'hui (travail non planifié)
    const aujourdhui = new Date();
    console.log('\n⏰ Création de pointages pour travail non planifié...');
    
    // Supprimer les anciens pointages d'aujourd'hui
    await prisma.pointage.deleteMany({
      where: {
        userId: 86,
        horodatage: {
          gte: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
          lt: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 1)
        }
      }
    });
    
    // Créer des pointages d'arrivée et de départ pour simuler du travail
    const arrivee = new Date();
    arrivee.setHours(10, 30, 0, 0); // Arrivée à 10h30
    
    const depart = new Date();
    depart.setHours(14, 15, 0, 0); // Départ à 14h15
    
    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: 86,
        type: 'arrivee',
        horodatage: arrivee
      }
    });
    
    const pointageDepart = await prisma.pointage.create({
      data: {
        userId: 86,
        type: 'depart',
        horodatage: depart
      }
    });
    
    console.log('✅ Pointage arrivée créé:', arrivee.toTimeString().substring(0,8));
    console.log('✅ Pointage départ créé:', depart.toTimeString().substring(0,8));
    
    // 4. Calculer le temps travaillé
    const diffMs = depart - arrivee;
    const heuresTravaillees = diffMs / (1000 * 60 * 60);
    console.log('📊 Temps travaillé:', heuresTravaillees.toFixed(2) + 'h');
    
    console.log('\n🎯 RÉSULTAT ATTENDU DANS L\'INTERFACE:');
    console.log('• Type: TRAVAIL NON PLANIFIÉ');
    console.log('• Icône: ⚡');
    console.log('• Couleur: Orange');
    console.log('• Message: Travail en cours (non planifié)');
    console.log('• Badge: Anomalie');
    console.log('• Toutes les heures comptées comme EXTRA');
    console.log('\n🚀 Connectez-vous avec test@Mouss.com pour voir le résultat !');
    
    // 5. Test des APIs
    console.log('\n🔌 Test des APIs...');
    const axios = require('axios');
    
    try {
      // Connexion
      const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
        email: 'test@Mouss.com',
        password: 'password123'
      });
      
      const token = loginResponse.data.token;
      console.log('✅ Connexion réussie');
      
      // Test total heures
      const totalResponse = await axios.get('http://127.0.0.1:5000/pointage/total-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📊 Total API:', totalResponse.data.totalHeures + 'h');
      
      // Test shift (doit être vide)
      const today = new Date().toISOString().split('T')[0];
      const shiftsResponse = await axios.get(`http://127.0.0.1:5000/shifts/mes-shifts?start=${today}&end=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📋 Shifts trouvés:', shiftsResponse.data.length, '(doit être 0)');
      
    } catch (error) {
      console.log('⚠️ Erreur API test:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
testExtraScenario();
