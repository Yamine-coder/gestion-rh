const prisma = require('./prisma/client');

async function simulateCurrentWork() {
  try {
    console.log('🎭 Simulation: Employé actuellement au travail (non planifié)');
    console.log('========================================================\n');
    
    // Supprimer tous les anciens pointages d'aujourd'hui
    const aujourdhui = new Date();
    await prisma.pointage.deleteMany({
      where: {
        userId: 86,
        horodatage: {
          gte: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
          lt: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 1)
        }
      }
    });
    
    // Créer seulement une arrivée (pas de départ) pour simuler du travail en cours
    const arrivee = new Date();
    arrivee.setHours(9, 30, 0, 0); // Arrivée à 9h30
    
    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: 86,
        type: 'arrivee',
        horodatage: arrivee
      }
    });
    
    console.log('✅ Pointage arrivée créé:', arrivee.toTimeString().substring(0,8));
    console.log('⏳ Pas de départ → travail en cours');
    
    // Calculer le temps écoulé depuis l'arrivée
    const now = new Date();
    const diffMs = now - arrivee;
    const heuresEcoulees = diffMs / (1000 * 60 * 60);
    console.log('⏰ Temps écoulé depuis l\'arrivée:', heuresEcoulees.toFixed(2) + 'h');
    
    console.log('\n🎯 CE QUE VOUS DEVRIEZ VOIR DANS L\'INTERFACE:');
    console.log('===============================================');
    console.log('📱 Section "Temps travaillé":');
    console.log('   • Titre: ⚡ Travail non planifié');
    console.log('   • Badge: "Anomalie" (rouge)');
    console.log('   • Message: "Travail en cours (non planifié)"');
    console.log('   • Couleur: Orange');
    console.log('   • Objectif: 7.0h (par défaut)');
    console.log('   • Encadré orange: "⚡ Travail non planifié détecté"');
    console.log('   • Note: "Ce travail sera comptabilisé comme heures supplémentaires"');
    
    console.log('\n📊 Section "Voir détails":');
    console.log('   • Premier: ' + arrivee.toTimeString().substring(0,5));
    console.log('   • Dernier: --');
    console.log('   • Écart: "Tout extra +' + heuresEcoulees.toFixed(1) + 'h"');
    
    console.log('\n🕒 Section "Timeline":');
    console.log('   • 1 entrée: Arrivée à ' + arrivee.toTimeString().substring(0,5));
    console.log('   • Badge "En cours depuis X heures"');
    console.log('   • Point clignotant (animation)');
    
    console.log('\n🌐 Pour tester:');
    console.log('1. Ouvrez http://localhost:3000 (ou le port de votre frontend)');
    console.log('2. Connectez-vous avec: test@Mouss.com / password123');
    console.log('3. Allez sur la page Pointage');
    console.log('4. Observez l\'interface adaptée pour le travail non planifié');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
simulateCurrentWork();
