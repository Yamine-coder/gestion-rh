const prisma = require('./prisma/client');
const crypto = require('crypto');

async function testScenarios() {
  try {
    console.log('🎭 TESTS DES DIFFÉRENTS SCÉNARIOS DE POINTAGE');
    console.log('==============================================\n');

    const employeId = 86; // test@Mouss.com
    const dateTest = new Date('2025-08-24T00:00:00.000Z');

    // Fonction utilitaire pour créer un shift
    const createShift = async (type, segments = [], motif = null) => {
      await prisma.shift.deleteMany({
        where: { employeId, date: dateTest }
      });

      if (type === null) return null; // Pas de shift

      return await prisma.shift.create({
        data: {
          employeId,
          date: dateTest,
          type,
          segments,
          motif
        }
      });
    };

    const scenarios = [
      {
        name: 'SCÉNARIO 1: JOURNÉE DE REPOS',
        description: 'Aucun planning prévu, aucun pointage',
        action: async () => {
          await createShift(null); // Pas de shift
          console.log('✅ Aucun shift créé - L\'employé est en repos');
          console.log('🔮 Résultat attendu: Interface "Journée de repos" avec 😴');
        }
      },
      
      {
        name: 'SCÉNARIO 2: TRAVAIL NON PLANIFIÉ (EXTRA)',
        description: 'Pas de planning mais l\'employé fait du pointage',
        action: async () => {
          await createShift(null); // Pas de shift
          console.log('✅ Aucun shift créé mais pointage possible');
          console.log('🔮 Résultat attendu: Interface "Travail non planifié" ⚡ avec badge orange');
          console.log('📌 TEST: Faites un pointage sur l\'interface pour voir le changement');
        }
      },

      {
        name: 'SCÉNARIO 3: PRÉSENCE PLANIFIÉE NORMALE',
        description: 'Planning de 7h avec segments détaillés',
        action: async () => {
          const segments = [
            {
              id: crypto.randomUUID(),
              start: '09:00',
              end: '12:00',
              commentaire: 'Service matin',
              aValider: false,
              isExtra: false,
              extraMontant: '',
              paymentStatus: 'à_payer',
              paymentMethod: '',
              paymentDate: '',
              paymentNote: ''
            },
            {
              id: crypto.randomUUID(),
              start: '14:00',
              end: '18:00',
              commentaire: 'Service après-midi',
              aValider: false,
              isExtra: false,
              extraMontant: '',
              paymentStatus: 'à_payer',
              paymentMethod: '',
              paymentDate: '',
              paymentNote: ''
            }
          ];
          
          const shift = await createShift('présence', segments);
          console.log(`✅ Shift présence créé - ID: ${shift.id}`);
          console.log('⏰ Segments: 09:00-12:00, 14:00-18:00 (7h total)');
          console.log('🔮 Résultat attendu: Interface "Selon planning" 📅 avec segments bleus');
        }
      },

      {
        name: 'SCÉNARIO 4: PRÉSENCE AVEC HEURES SUPPLÉMENTAIRES',
        description: 'Planning avec segment extra',
        action: async () => {
          const segments = [
            {
              id: crypto.randomUUID(),
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
              id: crypto.randomUUID(),
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
              id: crypto.randomUUID(),
              start: '22:00',
              end: '23:30',
              commentaire: 'Heures supplémentaires',
              aValider: false,
              isExtra: true,
              extraMontant: '20',
              paymentStatus: 'à_payer',
              paymentMethod: '',
              paymentDate: '',
              paymentNote: ''
            }
          ];
          
          const shift = await createShift('présence', segments);
          console.log(`✅ Shift avec extra créé - ID: ${shift.id}`);
          console.log('⏰ Segments: 11:00-14:30, 18:00-22:00, 22:00-23:30 (EXTRA)');
          console.log('🔮 Résultat attendu: Segments avec badge vert "Extra" pour les heures sup.');
        }
      },

      {
        name: 'SCÉNARIO 5: ABSENCE PLANIFIÉE',
        description: 'Congé maladie prévu',
        action: async () => {
          const shift = await createShift('absence', [], 'Congé maladie');
          console.log(`✅ Shift absence créé - ID: ${shift.id}`);
          console.log('🚫 Motif: Congé maladie');
          console.log('🔮 Résultat attendu: Interface "Absence planifiée" 🚫 avec encadré rouge');
        }
      },

      {
        name: 'SCÉNARIO 6: PRÉSENCE PLANIFIÉE SANS DÉTAIL',
        description: 'Planning prévu mais sans horaires précis',
        action: async () => {
          const shift = await createShift('présence', []);
          console.log(`✅ Shift présence vide créé - ID: ${shift.id}`);
          console.log('📋 Aucun segment défini');
          console.log('🔮 Résultat attendu: Interface "Planning sans détail" 📋 avec objectif 7h par défaut');
        }
      }
    ];

    console.log('🚀 COMMENÇONS LES TESTS:\n');
    console.log('Choisissez un scénario à tester:\n');
    
    scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.name}`);
      console.log(`   ${scenario.description}\n`);
    });

    console.log('📝 INSTRUCTIONS:');
    console.log('================');
    console.log('1. Exécutez: node test-scenario.js [numéro]');
    console.log('2. Rechargez l\'interface web (http://localhost:3000)');
    console.log('3. Connectez-vous avec test@Mouss.com / test123');
    console.log('4. Observez l\'adaptation de l\'interface Pointage');
    console.log('5. Testez les pointages si nécessaire\n');

    console.log('💡 EXEMPLE: node test-scenario.js 1');
    console.log('💡 EXEMPLE: node test-scenario.js 5');

    // Si un argument est passé, exécuter le scénario correspondant
    const scenarioNum = process.argv[2];
    if (scenarioNum) {
      const index = parseInt(scenarioNum) - 1;
      if (index >= 0 && index < scenarios.length) {
        const scenario = scenarios[index];
        console.log(`\n🎬 EXÉCUTION: ${scenario.name}`);
        console.log('=' .repeat(50));
        await scenario.action();
        console.log('\n✅ Scénario configuré ! Rechargez l\'interface pour voir le résultat.');
        console.log('🌐 http://localhost:3000 → Se connecter avec test@Mouss.com / test123');
      } else {
        console.log(`❌ Scénario ${scenarioNum} inexistant. Utilisez un numéro entre 1 et ${scenarios.length}.`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScenarios();
