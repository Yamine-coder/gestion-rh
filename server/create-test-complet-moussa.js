// Script de test complet pour toutes les possibilités hors-plage
// Test avec l'employé test@Mouss.com

const bcrypt = require('bcrypt');
const prisma = require('./prisma/client');

async function createComprehensiveTestData() {
  try {
    console.log('🚀 CRÉATION COMPLÈTE DES TESTS HORS-PLAGE POUR MOUSSA');
    console.log('==================================================\n');

    // 1. Vérifier/créer l'employé
    console.log('👤 1. Vérification de l\'employé...');
    
    let employe = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!employe) {
      const hashedPassword = await bcrypt.hash('7704154915Ym@!!', 10);
      employe = await prisma.user.create({
        data: {
          email: 'test@Mouss.com',
          password: hashedPassword,
          prenom: 'Moussa',
          nom: 'Test',
          telephone: '0123456789',
          role: 'employee',
          statut: 'actif',
          categorie: 'Serveur',
          dateEmbauche: new Date('2025-08-01')
        }
      });
      console.log('✅ Employé créé avec ID: ' + employe.id);
    } else {
      console.log('✅ Employé existant trouvé (ID: ' + employe.id + ')');
    }

    // 2. NETTOYER COMPLÈTEMENT LES ANCIENNES DONNÉES
    console.log('\n🧹 2. Nettoyage complet des données...');
    
    // Supprimer les congés existants pour éviter les conflits
    await prisma.conge.deleteMany({ where: { userId: employe.id } });
    console.log('   ✅ Congés supprimés');
    
    // Supprimer les pointages existants
    await prisma.pointage.deleteMany({ where: { userId: employe.id } });
    console.log('   ✅ Pointages supprimés');
    
    // Supprimer les shifts existants
    await prisma.shift.deleteMany({ where: { employeId: employe.id } });
    console.log('   ✅ Shifts supprimés');

    // 3. CRÉER LES SCÉNARIOS DE TEST COMPLETS
    console.log('\n📅 3. Création des scénarios de test...');

    const scenarios = [
      // SCENARIO 1: ARRIVÉES HORS-PLAGE
      {
        date: '2025-08-24', // Il y a 4 jours
        description: '🟣 ARRIVÉES HORS-PLAGE',
        shift: { start: '18:00', end: '22:00' },
        pointages: [
          { type: 'arrivee', heure: '16:00', ecartMin: 120, attendu: 'hors_plage_in', description: '2h trop tôt - HORS PLAGE' },
          { type: 'depart', heure: '22:00', ecartMin: 0, attendu: 'a_l_heure', description: 'À l\'heure' }
        ]
      },
      
      // SCENARIO 2: ARRIVÉES ACCEPTABLES
      {
        date: '2025-08-25', // Il y a 3 jours
        description: '🟢 ARRIVÉES ACCEPTABLES',
        shift: { start: '18:00', end: '22:00' },
        pointages: [
          { type: 'arrivee', heure: '17:40', ecartMin: 20, attendu: 'arrivee_acceptable', description: '20min tôt - Acceptable' },
          { type: 'depart', heure: '22:10', ecartMin: -10, attendu: 'depart_acceptable', description: '10min tard - Acceptable' }
        ]
      },
      
      // SCENARIO 3: RETARDS MODÉRÉS
      {
        date: '2025-08-26', // Il y a 2 jours  
        description: '🟡 RETARDS MODÉRÉS',
        shift: { start: '18:00', end: '22:00' },
        pointages: [
          { type: 'arrivee', heure: '18:15', ecartMin: -15, attendu: 'retard_modere', description: '15min retard - Modéré' },
          { type: 'depart', heure: '22:20', ecartMin: -20, attendu: 'depart_acceptable', description: '20min tard - Acceptable' }
        ]
      },
      
      // SCENARIO 4: RETARDS CRITIQUES
      {
        date: '2025-08-27', // Hier
        description: '🔴 RETARDS CRITIQUES',
        shift: { start: '12:00', end: '16:00' },
        pointages: [
          { type: 'arrivee', heure: '12:35', ecartMin: -35, attendu: 'retard_critique', description: '35min retard - CRITIQUE' },
          { type: 'depart', heure: '15:45', ecartMin: 15, attendu: 'depart_acceptable', description: '15min tôt - Acceptable' }
        ]
      },
      
      // SCENARIO 5: DÉPARTS PRÉMATURÉS CRITIQUES
      {
        date: '2025-08-27', // Hier (deuxième shift)
        description: '🔴 DÉPARTS PRÉMATURÉS CRITIQUES',
        shift: { start: '19:00', end: '23:00' },
        pointages: [
          { type: 'arrivee', heure: '19:05', ecartMin: -5, attendu: 'arrivee_acceptable', description: '5min retard - Acceptable' },
          { type: 'depart', heure: '22:00', ecartMin: 60, attendu: 'depart_premature_critique', description: '1h trop tôt - CRITIQUE' }
        ]
      },
      
      // SCENARIO 6: HEURES SUPPLÉMENTAIRES
      {
        date: '2025-08-28', // Aujourd'hui
        description: '🟡 HEURES SUPPLÉMENTAIRES',
        shift: { start: '14:00', end: '18:00' },
        pointages: [
          { type: 'arrivee', heure: '14:00', ecartMin: 0, attendu: 'a_l_heure', description: 'À l\'heure' },
          { type: 'depart', heure: '19:00', ecartMin: -60, attendu: 'heures_supplementaires', description: '1h sup - Heures sup' }
        ]
      },
      
      // SCENARIO 7: DÉPARTS HORS-PLAGE (passage minuit)
      {
        date: '2025-08-28', // Aujourd'hui (shift de nuit)
        description: '🟣 DÉPARTS HORS-PLAGE',
        shift: { start: '20:00', end: '00:00' },
        pointages: [
          { type: 'arrivee', heure: '20:00', ecartMin: 0, attendu: 'a_l_heure', description: 'À l\'heure' }
          // Le départ sera créé demain à 02:30 pour tester hors-plage
        ]
      }
    ];

    // Créer tous les shifts et pointages
    for (const scenario of scenarios) {
      console.log(`\n   📍 ${scenario.description} - ${scenario.date}`);
      
      // Créer le shift
      const shift = await prisma.shift.create({
        data: {
          employeId: employe.id,
          date: new Date(scenario.date),
          type: 'présence',
          segments: [{
            start: scenario.shift.start,
            end: scenario.shift.end,
            commentaire: `${scenario.description} - ${scenario.date}`
          }]
        }
      });
      
      console.log(`      ⏰ Shift: ${scenario.shift.start}-${scenario.shift.end}`);
      
      // Créer les pointages
      for (const pointage of scenario.pointages) {
        let dateTime = new Date(`${scenario.date}T${pointage.heure}:00.000Z`);
        
        // Gestion spéciale pour les heures après minuit
        if (pointage.heure.startsWith('02:') || pointage.heure.startsWith('01:')) {
          dateTime.setDate(dateTime.getDate() + 1);
        }
        
        await prisma.pointage.create({
          data: {
            userId: employe.id,
            type: pointage.type,
            horodatage: dateTime
          }
        });
        
        console.log(`      📍 ${pointage.type.toUpperCase()} ${pointage.heure}: ${pointage.description}`);
      }
    }

    // 4. CRÉER LE POINTAGE SPÉCIAL HORS-PLAGE DÉPART (pour demain)
    console.log('\n📍 4. Création du pointage hors-plage départ...');
    
    // Note: Ce pointage sera créé manuellement car il nécessite une date future
    console.log('   ⚠️  Le pointage de départ hors-plage (02:30) doit être créé manuellement');
    console.log('       ou en modifiant la contrainte de base de données temporairement');

    // 5. VÉRIFICATION DES DONNÉES CRÉÉES
    console.log('\n📊 5. Vérification des données...');
    
    const shiftsCreated = await prisma.shift.count({
      where: { employeId: employe.id }
    });
    
    const pointagesCreated = await prisma.pointage.count({
      where: { userId: employe.id }
    });
    
    console.log(`   ✅ ${shiftsCreated} shifts créés`);
    console.log(`   ✅ ${pointagesCreated} pointages créés`);

    // 6. INSTRUCTIONS DE TEST
    console.log('\n🎯 INSTRUCTIONS DE TEST COMPLÈTES');
    console.log('================================');
    console.log('');
    console.log('📧 Connexion: test@Mouss.com / 7704154915Ym@!!');
    console.log('');
    console.log('📅 Scénarios à tester dans le planning:');
    console.log('');
    
    scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.date} - ${scenario.description}`);
      console.log(`   Shift: ${scenario.shift.start}-${scenario.shift.end}`);
      scenario.pointages.forEach(p => {
        console.log(`   📍 ${p.description}`);
      });
      console.log('');
    });
    
    console.log('🔧 ACTIONS À FAIRE:');
    console.log('1. Démarrer serveur: npm start');
    console.log('2. Démarrer client: cd ../client && npm start');
    console.log('3. Se connecter avec test@Mouss.com');
    console.log('4. Aller au planning et activer "Comparaison Planning vs Réalité"');
    console.log('5. Regarder la semaine du 24-28 août 2025');
    console.log('6. Vérifier que les badges apparaissent selon les barèmes:');
    console.log('   🟣 Hors-plage (>30min tôt, >90min tard)');
    console.log('   🟢 Acceptable (-30 à +5min arrivée, -45 à +15min départ)');  
    console.log('   🟡 Modéré/Attention (+5 à +20min retard, heures sup)');
    console.log('   🔴 Critique (>20min retard, >30min tôt départ)');
    
    console.log('\n✅ DONNÉES DE TEST COMPLÈTES CRÉÉES!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createComprehensiveTestData();
