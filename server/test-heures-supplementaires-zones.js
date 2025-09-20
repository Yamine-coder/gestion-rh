/**
 * Test des 3 zones de gestion des heures supplémentaires
 * Zone 1: 0-30 min => auto-validées
 * Zone 2: 30-90 min => à valider  
 * Zone 3: >90 min => hors-plage critique
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHeuresSupplementaires() {
  console.log('🧪 Test des zones de gestion des heures supplémentaires\n');
  
  const employeId = 86; // test@Mouss.com
  const dateBase = '2025-08-20'; // Date dans le passé pour éviter les contraintes
  
  try {
    // 1. Nettoyer les données existantes
    await prisma.pointage.deleteMany({
      where: { userId: employeId }
    });
    await prisma.shift.deleteMany({
      where: { employeId: employeId }
    });
    
    console.log('✅ Données nettoyées\n');
    
    // 2. Créer des scénarios de test pour chaque zone
    const scenarios = [
      {
        nom: 'Zone 1: Heures sup auto-validées (15 min)',
        shift: { debut: '09:00', fin: '17:00' },
        pointages: [
          { type: 'arrivee', heure: '09:00' },
          { type: 'depart', heure: '17:15' }  // +15 min
        ],
        expectedType: 'heures_sup_auto_validees'
      },
      {
        nom: 'Zone 1: Heures sup auto-validées (30 min exactement)',
        shift: { debut: '14:00', fin: '22:00' },
        pointages: [
          { type: 'arrivee', heure: '14:00' },
          { type: 'depart', heure: '22:30' }  // +30 min (limite)
        ],
        expectedType: 'heures_sup_auto_validees'
      },
      {
        nom: 'Zone 2: Heures sup à valider (45 min)',
        shift: { debut: '08:00', fin: '16:00' },
        pointages: [
          { type: 'arrivee', heure: '08:00' },
          { type: 'depart', heure: '16:45' }  // +45 min
        ],
        expectedType: 'heures_sup_a_valider'
      },
      {
        nom: 'Zone 2: Heures sup à valider (90 min exactement)',
        shift: { debut: '10:00', fin: '18:00' },
        pointages: [
          { type: 'arrivee', heure: '10:00' },
          { type: 'depart', heure: '19:30' }  // +90 min (limite)
        ],
        expectedType: 'heures_sup_a_valider'
      },
      {
        nom: 'Zone 3: Hors-plage critique (120 min)',
        shift: { debut: '09:00', fin: '17:00' },
        pointages: [
          { type: 'arrivee', heure: '09:00' },
          { type: 'depart', heure: '19:00' }  // +120 min
        ],
        expectedType: 'hors_plage_out_critique'
      },
      {
        nom: 'Zone 3: Hors-plage critique extrême (3h)',
        shift: { debut: '09:00', fin: '17:00' },
        pointages: [
          { type: 'arrivee', heure: '09:00' },
          { type: 'depart', heure: '20:00' }  // +180 min
        ],
        expectedType: 'hors_plage_out_critique'
      }
    ];
    
    // 3. Créer et tester chaque scénario
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const testDate = new Date(dateBase);
      testDate.setDate(testDate.getDate() + i);
      const dateStr = testDate.toISOString().split('T')[0];
      
      console.log(`📋 ${scenario.nom}`);
      console.log(`   Date: ${dateStr}`);
      console.log(`   Shift: ${scenario.shift.debut}-${scenario.shift.fin}`);
      console.log(`   Pointages: ${scenario.pointages.map(p => `${p.type}@${p.heure}`).join(', ')}`);
      
      // Créer le shift
      const shiftDate = new Date(dateStr + 'T00:00:00.000Z');
      await prisma.shift.create({
        data: {
          employeId,
          date: shiftDate,
          type: 'présence',
          segments: [{
            start: scenario.shift.debut,
            end: scenario.shift.fin,
            isExtra: false,
            aValider: false,
            commentaire: `Test zone heures sup`,
            paymentStatus: 'à_payer'
          }]
        }
      });
      
      // Créer les pointages
      for (const p of scenario.pointages) {
        const [hours, minutes] = p.heure.split(':').map(Number);
        const horodatage = new Date(dateStr + 'T00:00:00.000Z');
        horodatage.setHours(hours, minutes, 0, 0);
        
        await prisma.pointage.create({
          data: {
            userId: employeId,
            type: p.type,
            horodatage
          }
        });
      }
      
      console.log(`   ✅ Données créées\n`);
    }
    
    console.log(`🧪 ${scenarios.length} scénarios créés pour test des zones heures sup`);
    console.log(`📅 Dates: ${dateBase} à ${new Date(dateBase + 'T00:00:00Z').getDate() + scenarios.length - 1}/08`);
    console.log(`👤 Employé: ${employeId} (test@Mouss.com)\n`);
    
    console.log('🎯 Pour tester, utilisez:');
    scenarios.forEach((scenario, i) => {
      const testDate = new Date(dateBase);
      testDate.setDate(testDate.getDate() + i);
      const dateStr = testDate.toISOString().split('T')[0];
      console.log(`   curl "http://localhost:5000/api/comparison/planning-vs-realite?employeId=86&date=${dateStr}"`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHeuresSupplementaires();
