const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper pour créer un pointage (entrée + sortie)
async function createPointage(userId, date, heureArrivee, heureDepart) {
  const dateObj = new Date(date);
  
  // Créer l'entrée
  const [arrH, arrM] = heureArrivee.split(':').map(Number);
  const arriveeDate = new Date(dateObj);
  arriveeDate.setUTCHours(arrH, arrM, 0, 0);
  
  await prisma.pointage.create({
    data: {
      userId,
      type: 'arrivee',
      horodatage: arriveeDate
    }
  });
  
  // Créer la sortie
  const [depH, depM] = heureDepart.split(':').map(Number);
  const departDate = new Date(dateObj);
  departDate.setUTCHours(depH, depM, 0, 0);
  
  await prisma.pointage.create({
    data: {
      userId,
      type: 'depart',
      horodatage: departDate
    }
  });
}

async function createTestAnomalies() {
  // Utiliser Moussaoui Yami (userId 110)
  const userId = 110;
  
  // Semaine du 2 au 8 décembre 2025 (déjà passée pour avoir des pointages)
  const testWeek = [
    { date: '2025-12-02', day: 'Lundi' },
    { date: '2025-12-03', day: 'Mardi' },
    { date: '2025-12-04', day: 'Mercredi' },
    { date: '2025-12-05', day: 'Jeudi' },
    { date: '2025-12-06', day: 'Vendredi' },
    { date: '2025-12-07', day: 'Samedi' },
    { date: '2025-12-08', day: 'Dimanche' },
  ];

  console.log('🧹 Nettoyage des anciennes données de test...\n');
  
  // Supprimer les anciens shifts et pointages de cette semaine pour cet employé
  for (const { date } of testWeek) {
    const startDate = new Date(date + 'T00:00:00.000Z');
    const endDate = new Date(date + 'T23:59:59.999Z');
    
    // Supprimer pointages par horodatage
    await prisma.pointage.deleteMany({
      where: {
        userId,
        horodatage: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Supprimer les demandes de remplacement d'abord
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    for (const shift of shifts) {
      await prisma.demandeRemplacement.deleteMany({ where: { shiftId: shift.id } });
      await prisma.extraPaymentLog.deleteMany({ where: { shiftId: shift.id } });
      await prisma.paiementExtra.deleteMany({ where: { shiftId: shift.id } });
    }
    
    await prisma.shift.deleteMany({
      where: {
        employeId: userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }

  console.log('📅 Création des scénarios d\'anomalies pour la semaine du 2-8 décembre 2025\n');
  console.log('━'.repeat(70));

  // ════════════════════════════════════════════════════════════════════════
  // LUNDI 2 DÉC - ✅ SHIFT PARFAIT (aucune anomalie - référence)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 LUNDI 2 DÉC - ✅ Shift parfait (référence)');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-02T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '09:00', end: '17:00', isExtra: false }]
    }
  });
  await createPointage(userId, '2025-12-02', '09:00', '17:00');
  console.log('   Prévu: 09:00-17:00 | Réel: 09:00-17:00 → ✅ OK');

  // ════════════════════════════════════════════════════════════════════════
  // MARDI 3 DÉC - ⏰ RETARD (arrivée en retard)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 MARDI 3 DÉC - ⏰ Retard de 25 minutes');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-03T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '09:00', end: '17:00', isExtra: false }]
    }
  });
  await createPointage(userId, '2025-12-03', '09:25', '17:00');  // 25 min de retard
  console.log('   Prévu: 09:00-17:00 | Réel: 09:25-17:00 → ⏰ Retard +25min');

  // ════════════════════════════════════════════════════════════════════════
  // MERCREDI 4 DÉC - 🚪 DÉPART ANTICIPÉ
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 MERCREDI 4 DÉC - 🚪 Départ anticipé de 45 minutes');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-04T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '10:00', end: '18:00', isExtra: false }]
    }
  });
  await createPointage(userId, '2025-12-04', '10:00', '17:15');  // 45 min avant
  console.log('   Prévu: 10:00-18:00 | Réel: 10:00-17:15 → 🚪 Départ -45min');

  // ════════════════════════════════════════════════════════════════════════
  // JEUDI 5 DÉC - ⏱️ HEURES SUPPLÉMENTAIRES
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 JEUDI 5 DÉC - ⏱️ Heures supplémentaires (+1h30)');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-05T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '08:00', end: '16:00', isExtra: false }]
    }
  });
  await createPointage(userId, '2025-12-05', '08:00', '17:30');  // +1h30 de plus
  console.log('   Prévu: 08:00-16:00 | Réel: 08:00-17:30 → ⏱️ H.Sup +1h30');

  // ════════════════════════════════════════════════════════════════════════
  // VENDREDI 6 DÉC - ❌ ABSENCE TOTALE (shift non pointé)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 VENDREDI 6 DÉC - ❌ Absence totale (non pointé)');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-06T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '09:00', end: '17:00', isExtra: false }]
    }
  });
  // PAS de pointage = absence
  console.log('   Prévu: 09:00-17:00 | Réel: AUCUN → ❌ Absence');

  // ════════════════════════════════════════════════════════════════════════
  // SAMEDI 7 DÉC - 🔀 RETARD + HEURES SUP (combiné)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 SAMEDI 7 DÉC - 🔀 Retard + Heures sup (combiné)');
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date('2025-12-07T00:00:00.000Z'),
      type: 'présence',
      segments: [{ start: '11:00', end: '19:00', isExtra: false }]
    }
  });
  await createPointage(userId, '2025-12-07', '11:20', '20:00');  // 20 min retard + 1h sup
  console.log('   Prévu: 11:00-19:00 | Réel: 11:20-20:00 → 🔀 Retard +20min & H.Sup +1h');

  // ════════════════════════════════════════════════════════════════════════
  // DIMANCHE 8 DÉC - 📍 POINTAGE SANS SHIFT (extra non planifié)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n📍 DIMANCHE 8 DÉC - 📍 Pointage sans shift prévu');
  // PAS de shift
  await createPointage(userId, '2025-12-08', '14:00', '18:00');
  console.log('   Prévu: AUCUN | Réel: 14:00-18:00 → 📍 Pointage non planifié');

  console.log('\n' + '━'.repeat(70));
  console.log('\n✅ Données de test créées avec succès !');
  console.log('\n📊 Récapitulatif des anomalies à tester en mode Comparer:');
  console.log('   • Lundi 2    : ✅ Aucune anomalie (référence)');
  console.log('   • Mardi 3    : ⏰ Retard');
  console.log('   • Mercredi 4 : 🚪 Départ anticipé');
  console.log('   • Jeudi 5    : ⏱️ Heures supplémentaires');
  console.log('   • Vendredi 6 : ❌ Absence totale');
  console.log('   • Samedi 7   : 🔀 Retard + Heures sup');
  console.log('   • Dimanche 8 : 📍 Pointage non planifié');
  console.log('\n👉 Va sur le planning semaine du 2-8 décembre et active "Comparer" !');

  await prisma.$disconnect();
}

createTestAnomalies().catch(console.error);
