const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createScenarios() {
  try {
    console.log('🎬 Création des scénarios de test pour Léa Garcia (semaine du 1-7 décembre)\n');
    
    // Trouver Léa
    const lea = await prisma.user.findFirst({
      where: { prenom: 'Léa', nom: 'Garcia' }
    });
    
    if (!lea) {
      console.log('❌ Léa Garcia non trouvée');
      return;
    }
    
    console.log(`✅ Léa Garcia trouvée (ID: ${lea.id})\n`);
    
    // Supprimer les anciens shifts/pointages de la semaine test
    await prisma.pointage.deleteMany({
      where: {
        userId: lea.id,
        horodatage: {
          gte: new Date('2025-12-01T00:00:00.000Z'),
          lte: new Date('2025-12-07T23:59:59.999Z')
        }
      }
    });
    
    await prisma.shift.deleteMany({
      where: {
        employeId: lea.id,
        date: {
          gte: new Date('2025-12-01T00:00:00.000Z'),
          lte: new Date('2025-12-07T23:59:59.999Z')
        }
      }
    });
    
    console.log('🧹 Anciennes données nettoyées\n');
    
    // ===== LUNDI 1er DÉCEMBRE : Travail normal, tout OK ✅ =====
    console.log('📅 LUNDI 1er : Travail parfait ✅');
    const shiftLundi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-01T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-01T09:00:00.000Z') },
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-01T13:00:00.000Z') },
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-01T14:00:00.000Z') },
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-01T18:00:00.000Z') }
      ]
    });
    console.log('   ✅ Shift créé + 4 pointages (09:00, 13:00, 14:00, 18:00)\n');
    
    // ===== MARDI 2 DÉCEMBRE : Petit retard acceptable (10 min) ⚠️ =====
    console.log('📅 MARDI 2 : Petit retard 10min ⚠️');
    const shiftMardi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-02T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-02T09:10:00.000Z') }, // +10min
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-02T13:00:00.000Z') },
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-02T14:05:00.000Z') }, // +5min
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-02T18:00:00.000Z') }
      ]
    });
    console.log('   ⚠️ Retards: 10min (matin) + 5min (après-midi)\n');
    
    // ===== MERCREDI 3 DÉCEMBRE : Gros problème - Retard + Départ anticipé ⚠️⚠️ =====
    console.log('📅 MERCREDI 3 : Retard 45min + Départ anticipé 30min ⚠️⚠️');
    const shiftMercredi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-03T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-03T09:45:00.000Z') }, // +45min
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-03T12:30:00.000Z') }, // -30min
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-03T14:20:00.000Z') }, // +20min
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-03T17:30:00.000Z') } // -30min
      ]
    });
    console.log('   🔴 MANQUE TOTAL: ~2h15 de travail sur la journée!\n');
    
    // ===== JEUDI 4 DÉCEMBRE : Heures supplémentaires importantes ⏱️ =====
    console.log('📅 JEUDI 4 : Heures supplémentaires ⏱️');
    const shiftJeudi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-04T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-04T08:30:00.000Z') }, // -30min (plus tôt)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-04T13:30:00.000Z') }, // +30min
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-04T14:00:00.000Z') },
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-04T19:30:00.000Z') } // +1h30
      ]
    });
    console.log('   ⭐ EXTRA: +2h30 d\'heures supplémentaires\n');
    
    // ===== VENDREDI 5 DÉCEMBRE : ABSENCE NON JUSTIFIÉE 🚫 =====
    console.log('📅 VENDREDI 5 : Absence non justifiée 🚫');
    const shiftVendredi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-05T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ]
      }
    });
    // PAS DE POINTAGES = ABSENCE
    console.log('   🚫 Aucun pointage - Shift prévu mais personne venue!\n');
    
    // ===== SAMEDI 6 DÉCEMBRE : Cas mixte - Retard + Heures sup ⚠️⏱️ =====
    console.log('📅 SAMEDI 6 : Retard + Heures sup (cas mixte) ⚠️⏱️');
    const shiftSamedi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-06T00:00:00.000Z'),
        type: 'présence',
        segments: [
          { start: '10:00', end: '14:00' },
          { start: '15:00', end: '19:00' }
        ]
      }
    });
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-06T10:25:00.000Z') }, // +25min retard
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-06T14:00:00.000Z') },
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-06T15:10:00.000Z') }, // +10min retard
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-06T20:00:00.000Z') } // +1h heures sup
      ]
    });
    console.log('   ⚠️ Retards: 25min + 10min');
    console.log('   ⏱️ Heures sup: +1h\n');
    
    // ===== DIMANCHE 7 DÉCEMBRE : Jour de repos (aucun shift) =====
    console.log('📅 DIMANCHE 7 : Repos (aucun shift)\n');
    
    console.log('✅ TOUS LES SCÉNARIOS CRÉÉS!\n');
    console.log('📊 Récapitulatif:');
    console.log('   - Lundi: ✅ Parfait');
    console.log('   - Mardi: ⚠️ Petits retards (10min + 5min)');
    console.log('   - Mercredi: 🔴 PROBLÈME MAJEUR (manque 2h15)');
    console.log('   - Jeudi: ⭐ Heures sup (+2h30)');
    console.log('   - Vendredi: 🚫 ABSENCE NON JUSTIFIÉE');
    console.log('   - Samedi: ⚠️⏱️ Retard + Heures sup');
    console.log('   - Dimanche: Repos\n');
    
    console.log('🎯 Allez dans le planning, vue SEMAINE du 1-7 décembre, activez "Comparaison"!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createScenarios();
