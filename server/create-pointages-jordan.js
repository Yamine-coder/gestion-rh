// Script pour créer des pointages avec anomalies pour Jordan (yjordan496@gmail.com)
// Basé sur create-test-pointages-anomalies.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestDataForJordan() {
  try {
    // Jordan - yjordan496@gmail.com (ID 110)
    const userId = 110;
    
    // Date d'aujourd'hui (5 décembre 2025)
    const today = new Date('2025-12-05T00:00:00');
    const todayStr = '2025-12-05';
    const tomorrow = new Date('2025-12-06T00:00:00');
    
    console.log('=== CRÉATION POINTAGES AVEC ANOMALIES POUR JORDAN ===\n');
    console.log('📅 Date du test:', todayStr);
    console.log('👤 Employé: Jordan/Yamine (ID:', userId, ')');
    console.log('');

    // 1. Vérifier le shift existant
    console.log('📋 Vérification du shift existant...');
    const existingShift = await prisma.shift.findFirst({
      where: {
        employeId: userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    if (existingShift) {
      console.log(`   ✅ Shift trouvé: ID ${existingShift.id}`);
      console.log(`   📍 Horaires prévus:`, JSON.stringify(existingShift.segments));
    } else {
      console.log('   ❌ Aucun shift trouvé - création...');
      await prisma.shift.create({
        data: {
          employeId: userId,
          date: today,
          type: 'présence',
          segments: [{ start: '09:00', end: '17:00' }],
          version: 1
        }
      });
      console.log('   ✅ Shift créé (09:00-17:00)');
    }

    // 2. Supprimer les anciens pointages de test pour aujourd'hui
    console.log('\n🧹 Nettoyage des données existantes...');
    
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

    // 3. Créer les pointages réalistes avec anomalies
    console.log('\n⏱️  Création des pointages (scénario: retard + heures sup)...');
    
    // Scénario: 
    // - Arrivée prévue 09:00 → Arrivée réelle 09:35 (35 min de retard)
    // - Départ prévu 17:00 → Départ réel 18:20 (1h20 de plus)
    
    const pointages = [
      {
        type: 'arrivee',
        heure: '09:35', // 35 min de retard
        description: 'Arrivée en retard'
      },
      {
        type: 'depart',
        heure: '18:20', // Heures sup (+1h20)
        description: 'Départ avec heures supplémentaires'
      }
    ];

    for (const p of pointages) {
      const horodatage = new Date(`2025-12-05T${p.heure}:00`);
      
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
    console.log('\n⚠️  Création des anomalies liées...');
    
    const anomalies = [
      {
        type: 'retard',
        description: 'Arrivée à 09:35 au lieu de 09:00 (retard de 35 minutes)',
        details: {
          heurePrevue: '09:00',
          heureReelle: '09:35',
          ecartMinutes: 35
        },
        statut: 'en_attente',
        gravite: 'moyenne'
      },
      {
        type: 'heures_supplementaires',
        description: 'Départ à 18:20 au lieu de 17:00 (1h20 supplémentaires)',
        details: {
          heurePrevue: '17:00',
          heureReelle: '18:20',
          heuresSupp: 1.33,
          ecartMinutes: 80
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

    // 5. Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ POUR JORDAN:');
    console.log('='.repeat(50));
    console.log('');
    console.log('   📅 Shift prévu: 09:00 → 17:00 (8h)');
    console.log('   ⏰ Pointages réels:');
    console.log('      • Arrivée: 09:35 (⚠️ +35 min retard)');
    console.log('      • Départ:  18:20 (✅ +1h20 heures sup)');
    console.log('');
    console.log('   ⏱️  Temps travaillé: 8h45');
    console.log('   📋 Temps prévu: 8h00');
    console.log('   📈 Écart net: +45 min (retard compensé par heures sup)');
    console.log('');
    console.log('   ⚠️  Anomalies créées:');
    console.log('      1. Retard (35 min) - statut: en_attente');
    console.log('      2. Heures sup (1h20) - statut: en_attente');
    console.log('');
    console.log('='.repeat(50));
    console.log('✅ Jordan peut maintenant voir ces données sur sa page Pointage');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDataForJordan();
