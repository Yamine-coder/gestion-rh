const prisma = require('./prisma/client');

async function demonstrationComplete() {
  try {
    console.log('🎭 DÉMONSTRATION COMPLÈTE DES SCÉNARIOS DE POINTAGE');
    console.log('==================================================\n');

    const employeId = 86; // test@Mouss.com
    
    // Nettoyer les données existantes
    console.log('🧹 Nettoyage des données de test...');
    await prisma.pointage.deleteMany({ where: { userId: employeId } });
    await prisma.shift.deleteMany({ where: { employeId, date: new Date('2025-08-24T00:00:00.000Z') } });
    console.log('✅ Données nettoyées\n');

    // Scénario final recommandé pour démonstration
    console.log('🎯 CONFIGURATION DU SCÉNARIO DE DÉMONSTRATION');
    console.log('=============================================');
    console.log('Scénario choisi: PRÉSENCE AVEC HEURES SUPPLÉMENTAIRES');
    console.log('- Service midi: 11:00-14:30 (3h30)');
    console.log('- Service soir: 18:00-22:00 (4h)');
    console.log('- Heures sup.: 22:00-23:30 (1h30) [EXTRA]');
    console.log('- TOTAL: 9h dont 1h30 supplémentaires\n');

    // Créer le shift de démonstration
    const segments = [
      {
        id: require('crypto').randomUUID(),
        start: '11:00',
        end: '14:30',
        commentaire: 'Service midi',
        aValider: false,
        isExtra: false,
        extraMontant: '',
        paymentStatus: 'à_payer',
        paymentMethod: '',
        paymentDate: '',
        paymentNote: ''
      },
      {
        id: require('crypto').randomUUID(),
        start: '18:00',
        end: '22:00',
        commentaire: 'Service soir',
        aValider: false,
        isExtra: false,
        extraMontant: '',
        paymentStatus: 'à_payer',
        paymentMethod: '',
        paymentDate: '',
        paymentNote: ''
      },
      {
        id: require('crypto').randomUUID(),
        start: '22:00',
        end: '23:30',
        commentaire: 'Rush imprévu - Heures supplémentaires',
        aValider: false,
        isExtra: true,
        extraMontant: '25',
        paymentStatus: 'à_payer',
        paymentMethod: '',
        paymentDate: '',
        paymentNote: ''
      }
    ];

    const shift = await prisma.shift.create({
      data: {
        employeId,
        date: new Date('2025-08-24T00:00:00.000Z'),
        type: 'présence',
        segments
      }
    });

    console.log(`✅ Shift de démonstration créé - ID: ${shift.id}`);

    // Créer quelques pointages pour montrer la progression
    console.log('\n⏰ Création de pointages de démonstration...');
    
    const maintenant = new Date();
    const baseHour = 11; // 11h00
    
    // Arrivée 11:00
    await prisma.pointage.create({
      data: {
        userId: employeId,
        type: 'arrivee',
        horodatage: new Date(maintenant.setHours(baseHour, 0, 0, 0))
      }
    });
    
    // Départ pause 14:30
    await prisma.pointage.create({
      data: {
        userId: employeId,
        type: 'depart',
        horodatage: new Date(maintenant.setHours(14, 30, 0, 0))
      }
    });
    
    // Retour 18:00
    await prisma.pointage.create({
      data: {
        userId: employeId,
        type: 'arrivee',
        horodatage: new Date(maintenant.setHours(18, 0, 0, 0))
      }
    });

    console.log('✅ Pointages créés:');
    console.log('   • 11:00 - Arrivée (début service midi)');
    console.log('   • 14:30 - Départ (pause)');
    console.log('   • 18:00 - Arrivée (début service soir)');
    console.log('   ⚠️ Session en cours depuis 18:00');

    console.log('\n🎯 RÉSULTAT ATTENDU DANS L\'INTERFACE:');
    console.log('=====================================');
    console.log('📅 Titre: "Selon planning"');
    console.log('🔢 Temps travaillé: 3h30 (service midi terminé)');
    console.log('📊 Objectif: 9.0h');
    console.log('📈 Progression: ~39% (3.5h/9h)');
    console.log('🟦 Segments planning:');
    console.log('   • 11:00–14:30 (Service midi)');
    console.log('   • 18:00–22:00 (Service soir)');
    console.log('   • 22:00–23:30 (Extra) 🟢');
    console.log('⏳ Timeline: 3 pointages avec session en cours depuis 18:00');
    console.log('🔮 Statut: "Service en cours selon planning"');

    console.log('\n🚀 DÉMARRER LA DÉMONSTRATION:');
    console.log('=============================');
    console.log('1. 🌐 Ouvrir: http://localhost:3000');
    console.log('2. 🔑 Connexion: test@Mouss.com / test123');
    console.log('3. 📱 Aller sur la page Pointage');
    console.log('4. 👀 Observer l\'interface adaptative');
    console.log('5. 🔍 Cliquer sur "Voir détails" pour plus d\'infos');

    console.log('\n🎛️ TESTS SUPPLÉMENTAIRES POSSIBLES:');
    console.log('===================================');
    console.log('• Changer de scénario: node test-scenario.js [1-6]');
    console.log('• Tester anomalies: node test-scenario.js 5 + node create-test-pointage.js');
    console.log('• Nettoyer: node clear-test-shift.js');

    console.log('\n✨ DÉMONSTRATION PRÊTE !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

demonstrationComplete();
