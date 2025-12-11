// Script pour créer des pointages réalistes avec anomalies correspondantes
// pour tester l'intégration UI dans la Timeline

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Marco Romano - employé test (userId dans la DB)
    const userId = 93;
    
    // Date d'aujourd'hui (4 décembre 2025)
    const today = new Date('2025-12-04T00:00:00');
    const todayStr = '2025-12-04';
    const tomorrow = new Date('2025-12-05T00:00:00');
    
    console.log('📅 Date du test:', todayStr);
    console.log('👤 Employé: Marco Romano (ID:', userId, ')');
    console.log('');

    // 1. Supprimer les anciennes données de test pour aujourd'hui
    console.log('🧹 Nettoyage des données existantes pour aujourd\'hui...');
    
    await prisma.anomalie.deleteMany({
      where: {
        employeId: userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    console.log('   ✅ Anomalies supprimées');
    
    await prisma.pointage.deleteMany({
      where: {
        userId: userId,
        horodatage: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    console.log('   ✅ Pointages supprimés');

    // 2. Créer/mettre à jour le shift prévu pour Marco aujourd'hui
    // Shift prévu: 09:00 - 17:00
    console.log('');
    console.log('📋 Création du shift prévu (09:00 - 17:00)...');
    
    // Supprimer ancien shift du jour
    await prisma.shift.deleteMany({
      where: {
        employeId: userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Créer le shift
    await prisma.shift.create({
      data: {
        employeId: userId,
        date: today,
        type: 'matin',
        segments: [
          {
            debut: '09:00',
            fin: '12:30',
            poste: 'Service'
          },
          {
            debut: '13:30',
            fin: '17:00',
            poste: 'Service'
          }
        ],
        version: 1
      }
    });
    console.log('   ✅ Shift créé (09:00-12:30 + 13:30-17:00)');

    // 3. Créer les pointages réalistes
    console.log('');
    console.log('⏱️  Création des pointages...');
    
    // Scénario: Marco arrive en retard (09:23 au lieu de 09:00) = 23 min de retard
    // et fait des heures sup (départ à 18:15 au lieu de 17:00) = 1h15 de plus
    
    const pointages = [
      {
        type: 'arrivee',
        heure: '09:23', // 23 min de retard
        description: 'Arrivée en retard (embouteillages)'
      },
      {
        type: 'depart',
        heure: '12:35', // Pause déjeuner (5 min après prévu)
        description: 'Départ pause déjeuner'
      },
      {
        type: 'arrivee',
        heure: '13:45', // Retour pause (15 min de retard)
        description: 'Retour pause déjeuner'
      },
      {
        type: 'depart',
        heure: '18:15', // Heures sup (+1h15)
        description: 'Départ avec heures supplémentaires'
      }
    ];

    for (const p of pointages) {
      const [h, m] = p.heure.split(':').map(Number);
      const horodatage = new Date(`2025-12-04T${p.heure}:00`);
      
      await prisma.pointage.create({
        data: {
          userId: userId,
          horodatage: horodatage,
          type: p.type
        }
      });
      console.log(`   ✅ ${p.type.toUpperCase()} à ${p.heure} - ${p.description}`);
    }

    // 4. Créer les anomalies correspondantes
    console.log('');
    console.log('⚠️  Création des anomalies liées aux pointages...');
    
    const anomalies = [
      {
        type: 'retard_modere',
        description: 'Arrivée à 09:23 au lieu de 09:00 (retard de 23 minutes)',
        details: {
          heurePrevue: '09:00',
          heureReelle: '09:23',
          ecartMinutes: 23
        },
        statut: 'en_attente',
        gravite: 'moyenne'
      },
      {
        type: 'heures_sup_a_valider',
        description: 'Départ à 18:15 au lieu de 17:00 (1h15 supplémentaires)',
        details: {
          heurePrevue: '17:00',
          heureReelle: '18:15',
          heuresSupp: 1.25,
          ecartMinutes: 75
        },
        statut: 'en_attente',
        gravite: 'faible'
      }
    ];

    for (const a of anomalies) {
      await prisma.anomalie.create({
        data: {
          employeId: userId,
          date: today,
          type: a.type,
          description: a.description,
          details: a.details,
          statut: a.statut,
          gravite: a.gravite
        }
      });
      console.log(`   ✅ ${a.type}: ${a.description}`);
    }

    // 5. Vérification des données créées
    console.log('');
    console.log('🔍 Vérification des données créées...');
    
    const pointagesCreated = await prisma.pointage.findMany({
      where: {
        userId: userId,
        horodatage: { gte: today, lt: tomorrow }
      },
      orderBy: { horodatage: 'asc' }
    });
    console.log(`   📍 ${pointagesCreated.length} pointages trouvés`);
    
    const anomaliesCreated = await prisma.anomalie.findMany({
      where: {
        employeId: userId,
        date: { gte: today, lt: tomorrow }
      }
    });
    console.log(`   ⚠️  ${anomaliesCreated.length} anomalies trouvées`);
    
    const shiftCreated = await prisma.shift.findFirst({
      where: {
        employeId: userId,
        date: { gte: today, lt: tomorrow }
      }
    });
    console.log(`   📋 Shift trouvé: ${shiftCreated ? 'Oui' : 'Non'}`);

    // 6. Afficher le résumé
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DU SCÉNARIO DE TEST');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('👤 Employé: Marco Romano');
    console.log('📅 Date: ' + todayStr);
    console.log('');
    console.log('📋 SHIFT PRÉVU:');
    console.log('   • Matin: 09:00 - 12:30');
    console.log('   • Après-midi: 13:30 - 17:00');
    console.log('   • Durée prévue: 7h');
    console.log('');
    console.log('⏱️  POINTAGES RÉELS:');
    console.log('   1. 09:23 → Arrivée (23 min de RETARD)');
    console.log('   2. 12:35 → Départ (pause)');
    console.log('   3. 13:45 → Arrivée (retour pause)');
    console.log('   4. 18:15 → Départ (1h15 d\'HEURES SUP)');
    console.log('');
    console.log('⚠️  ANOMALIES GÉNÉRÉES:');
    console.log('   • Retard modéré: +23 min (statut: en_attente)');
    console.log('   • Heures sup à valider: +1h15 (statut: en_attente)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🔗 Pour tester:');
    console.log('   Email: marco.romano@restaurant.com');
    console.log('   Mot de passe: Marco123!');
    console.log('');
    console.log('✅ Les anomalies devraient apparaître:');
    console.log('   • Badge "2 anomalies" dans le header Timeline');
    console.log('   • Retard affiché sur le pointage 09:23 (point ORANGE)');
    console.log('   • Heures sup affichées sur le pointage 18:15 (point ORANGE)');
    console.log('   • Pointages 12:35 et 13:45 normaux (points verts/bleus)');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
