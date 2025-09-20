const prisma = require('./prisma/client');
const crypto = require('crypto');

async function createTestScenarios() {
  try {
    console.log('🎭 Création de scénarios de test pour le système de pointage...\n');

    // Récupérer les employés existants
    const employes = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, email: true, nom: true, prenom: true }
    });

    if (employes.length === 0) {
      console.log('❌ Aucun employé trouvé');
      return;
    }

    console.log(`✅ ${employes.length} employés trouvés\n`);

    // Dates de test
    const today = new Date();
    const dates = {
      aujourdhui: new Date(today),
      demain: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      aprèsDemain: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      dans3jours: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
    };

    // Nettoyer les anciens shifts de test
    console.log('🧹 Nettoyage des anciens shifts de test...');
    await prisma.shift.deleteMany({
      where: {
        OR: [
          { date: dates.aujourdhui },
          { date: dates.demain },
          { date: dates.aprèsDemain },
          { date: dates.dans3jours }
        ]
      }
    });

    const scenariosDeTest = [
      // SCENARIO 1: Shift de présence normal avec segments
      {
        employeId: employes[0]?.id,
        date: dates.demain,
        type: 'présence',
        segments: [
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
        ],
        titre: 'PRÉSENCE NORMALE (7h planifiées)'
      },

      // SCENARIO 2: Shift d'absence planifiée
      {
        employeId: employes[1]?.id || employes[0]?.id,
        date: dates.demain,
        type: 'absence',
        motif: 'Congé maladie',
        segments: [],
        titre: 'ABSENCE PLANIFIÉE (congé maladie)'
      },

      // SCENARIO 3: Shift avec heures supplémentaires
      {
        employeId: employes[2]?.id || employes[0]?.id,
        date: dates.aprèsDemain,
        type: 'présence',
        segments: [
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
            commentaire: 'Heures supplémentaires - Rush imprévu',
            aValider: false,
            isExtra: true,
            extraMontant: '25',
            paymentStatus: 'à_payer',
            paymentMethod: '',
            paymentDate: '',
            paymentNote: ''
          }
        ],
        titre: 'PRÉSENCE AVEC EXTRA (9h dont 1h30 supplémentaires)'
      },

      // SCENARIO 4: Shift planifié vide (présence mais sans détail)
      {
        employeId: employes[3]?.id || employes[0]?.id,
        date: dates.dans3jours,
        type: 'présence',
        segments: [],
        titre: 'PRÉSENCE PLANIFIÉE SANS DÉTAIL (horaires non précisés)'
      }
    ];

    // Créer les shifts de test
    console.log('🎬 Création des scénarios de test:\n');
    let compteur = 1;

    for (const scenario of scenariosDeTest) {
      const employe = employes.find(e => e.id === scenario.employeId);
      const dateStr = scenario.date.toISOString().split('T')[0];

      try {
        const nouveauShift = await prisma.shift.create({
          data: {
            employeId: scenario.employeId,
            date: scenario.date,
            type: scenario.type,
            segments: scenario.segments || [],
            motif: scenario.motif || null
          }
        });

        console.log(`${compteur}. ✅ ${scenario.titre}`);
        console.log(`   👤 Employé: ${employe?.prenom} ${employe?.nom} (${employe?.email})`);
        console.log(`   📅 Date: ${dateStr}`);
        console.log(`   🎭 Type: ${scenario.type}`);
        
        if (scenario.motif) {
          console.log(`   🚫 Motif: ${scenario.motif}`);
        }
        
        if (scenario.segments && scenario.segments.length > 0) {
          let totalMinutes = 0;
          console.log(`   ⏰ Segments:`);
          scenario.segments.forEach((seg, idx) => {
            const [startH, startM] = seg.start.split(':').map(Number);
            const [endH, endM] = seg.end.split(':').map(Number);
            const minutes = (endH * 60 + endM) - (startH * 60 + startM);
            totalMinutes += minutes;
            
            console.log(`      ${idx + 1}. ${seg.start}-${seg.end} | ${seg.commentaire}${seg.isExtra ? ' (EXTRA)' : ''}`);
          });
          console.log(`   📊 Total: ${(totalMinutes / 60).toFixed(1)}h`);
        }
        
        console.log(`   🆔 Shift ID: ${nouveauShift.id}\n`);
        compteur++;

      } catch (error) {
        console.error(`❌ Erreur création shift pour ${employe?.email}:`, error.message);
      }
    }

    // Résumé pour les tests
    console.log('🎯 RÉSUMÉ POUR TESTER LES SCÉNARIOS:');
    console.log('=====================================');
    console.log('🔸 Connectez-vous avec différents comptes employés');
    console.log('🔸 Regardez comment l\'interface s\'adapte selon le type de shift');
    console.log('🔸 Testez les pointages sur chaque scénario\n');

    console.log('📋 SCÉNARIOS CRÉÉS:');
    console.log('1️⃣ NORMAL : Présence avec planning détaillé (7h)');
    console.log('2️⃣ ABSENCE : Congé maladie planifié');
    console.log('3️⃣ EXTRA : Présence avec heures supplémentaires (9h)');
    console.log('4️⃣ VIDE : Présence planifiée sans horaires détaillés\n');

    console.log('🔄 SCÉNARIO MANQUANT pour test complet:');
    console.log('5️⃣ REPOS/EXTRA : Employé sans planning qui fait quand même du pointage');
    console.log('   ➡️ Ne créez pas de shift pour un employé et pointez quand même');

    console.log('\n✅ Tous les scénarios de test créés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des scénarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
createTestScenarios();
