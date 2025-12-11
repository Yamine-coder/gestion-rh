const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCompleteScenarios() {
  try {
    console.log('🎯 CRÉATION DE SCÉNARIOS COMPLETS POUR TOUS LES STATUTS\n');

    // Trouver Léa Garcia
    const lea = await prisma.user.findFirst({
      where: {
        nom: 'Garcia',
        prenom: { contains: 'Léa' }
      }
    });

    if (!lea) {
      console.error('❌ Léa Garcia non trouvée!');
      return;
    }

    console.log(`✅ Léa Garcia trouvée (ID: ${lea.id})\n`);

    // Supprimer les anciens shifts et pointages de décembre
    await prisma.pointage.deleteMany({
      where: {
        userId: lea.id,
        horodatage: {
          gte: new Date('2025-12-01T00:00:00.000Z'),
          lt: new Date('2025-12-08T00:00:00.000Z')
        }
      }
    });

    await prisma.shift.deleteMany({
      where: {
        employeId: lea.id,
        date: {
          gte: new Date('2025-12-01T00:00:00.000Z'),
          lt: new Date('2025-12-08T00:00:00.000Z')
        }
      }
    });

    console.log('🧹 Anciennes données nettoyées\n');

    // ===== LUNDI 1er DÉCEMBRE : TRAVAIL PARFAIT ✅ =====
    console.log('📅 LUNDI 1er : Travail PARFAIT ✅');
    console.log('   → Arrivée/départ exactement à l\'heure');
    const shiftLundi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-01T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '09:00', end: '13:00', isExtra: false, commentaire: null },
          { start: '14:00', end: '18:00', isExtra: false, commentaire: null }
        ]
      }
    });
    
    // France = UTC+1, donc 09:00 local = 08:00 UTC
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-01T08:00:00.000Z') }, // 09:00 local
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-01T12:00:00.000Z') },  // 13:00 local
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-01T13:00:00.000Z') }, // 14:00 local
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-01T17:00:00.000Z') }   // 18:00 local
      ]
    });
    console.log('   ✅ Shift créé + 4 pointages parfaits → Statut attendu: OK\n');

    // ===== MARDI 2 DÉCEMBRE : PETIT RETARD ⚠️ =====
    console.log('📅 MARDI 2 : Petit RETARD de 10 minutes ⚠️');
    const shiftMardi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-02T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '09:00', end: '13:00', isExtra: false, commentaire: null },
          { start: '14:00', end: '18:00', isExtra: false, commentaire: null }
        ]
      }
    });
    
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-02T08:10:00.000Z') }, // 09:10 local (+10min)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-02T12:00:00.000Z') },  // 13:00 local (OK)
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-02T13:00:00.000Z') }, // 14:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-02T17:00:00.000Z') }   // 18:00 local (OK)
      ]
    });
    console.log('   ⚠️ Retard matin: 10 minutes → Statut attendu: RETARD\n');

    // ===== MERCREDI 3 DÉCEMBRE : HEURES SUPPLÉMENTAIRES PURES 🟣 =====
    console.log('📅 MERCREDI 3 : HEURES SUPPLÉMENTAIRES (sans retard) 🟣');
    const shiftMercredi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-03T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '09:00', end: '13:00', isExtra: false, commentaire: null },
          { start: '14:00', end: '18:00', isExtra: false, commentaire: null }
        ]
      }
    });
    
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-03T08:00:00.000Z') }, // 09:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-03T12:30:00.000Z') },  // 13:30 local (+30min)
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-03T13:00:00.000Z') }, // 14:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-03T18:30:00.000Z') }   // 19:30 local (+90min)
      ]
    });
    console.log('   ⏱️ Heures sup: +30min matin, +90min soir → Statut attendu: H.SUP\n');

    // ===== JEUDI 4 DÉCEMBRE : RETARD + HEURES SUP (retard prime) ⚠️ =====
    console.log('📅 JEUDI 4 : RETARD + Heures sup (retard prioritaire) ⚠️');
    const shiftJeudi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-04T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '09:00', end: '13:00', isExtra: false, commentaire: null },
          { start: '14:00', end: '18:00', isExtra: false, commentaire: null }
        ]
      }
    });
    
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-04T08:20:00.000Z') }, // 09:20 local (+20min retard)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-04T12:00:00.000Z') },  // 13:00 local (OK)
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-04T13:00:00.000Z') }, // 14:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-04T19:00:00.000Z') }   // 20:00 local (+2h heures sup)
      ]
    });
    console.log('   ⚠️ Retard: +20min | Heures sup: +2h → Statut attendu: RETARD (prioritaire)\n');

    // ===== VENDREDI 5 DÉCEMBRE : ABSENCE TOTALE 🔴 =====
    console.log('📅 VENDREDI 5 : ABSENCE TOTALE (aucun pointage) 🔴');
    const shiftVendredi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-05T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '09:00', end: '13:00', isExtra: false, commentaire: null },
          { start: '14:00', end: '18:00', isExtra: false, commentaire: null }
        ]
      }
    });
    // PAS de pointages = absence
    console.log('   🚫 Aucun pointage → Statut attendu: ABSENT\n');

    // ===== SAMEDI 6 DÉCEMBRE : DÉPART ANTICIPÉ (parti trop tôt) ⚠️ =====
    console.log('📅 SAMEDI 6 : DÉPART ANTICIPÉ (parti 45min trop tôt) ⚠️');
    const shiftSamedi = await prisma.shift.create({
      data: {
        employeId: lea.id,
        date: new Date('2025-12-06T00:00:00.000Z'),
        type: 'présence',
        motif: null,
        segments: [
          { start: '10:00', end: '14:00', isExtra: false, commentaire: null },
          { start: '15:00', end: '19:00', isExtra: false, commentaire: null }
        ]
      }
    });
    
    await prisma.pointage.createMany({
      data: [
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-06T09:00:00.000Z') }, // 10:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-06T12:15:00.000Z') },  // 13:15 local (-45min)
        { userId: lea.id, type: 'arrivee', horodatage: new Date('2025-12-06T14:00:00.000Z') }, // 15:00 local (OK)
        { userId: lea.id, type: 'depart', horodatage: new Date('2025-12-06T18:00:00.000Z') }   // 19:00 local (OK)
      ]
    });
    console.log('   ⚠️ Départ anticipé: -45min → Statut attendu: RETARD\n');

    console.log('✅ TOUS LES SCÉNARIOS CRÉÉS AVEC SUCCÈS!\n');
    console.log('📊 RÉSUMÉ ATTENDU:');
    console.log('   Lundi 1er    → ✅ OK (travail parfait)');
    console.log('   Mardi 2      → ⚠️ RETARD (10min)');
    console.log('   Mercredi 3   → 🟣 H.SUP (+2h)');
    console.log('   Jeudi 4      → ⚠️ RETARD (+20min, priorité sur heures sup)');
    console.log('   Vendredi 5   → 🔴 ABSENT (aucun pointage)');
    console.log('   Samedi 6     → ⚠️ RETARD (départ -45min)');
    console.log('\n🎯 Va dans le planning, vue SEMAINE du 1-7 décembre, active "Comparaison"!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCompleteScenarios();
