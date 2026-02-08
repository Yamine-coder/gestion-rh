const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestHorsPlage() {
  const employeId = 106; // Autre employé
  const dateStr = '2026-02-02';
  
  // Vérifier l'employé
  let employe = await prisma.user.findUnique({ where: { id: employeId } });
  let targetId = employeId;
  
  if (!employe) {
    employe = await prisma.user.findFirst({ 
      where: { role: 'employe', actif: true, id: { notIn: [104, 105] } },
      select: { id: true, nom: true, prenom: true }
    });
    if (!employe) {
      console.log('❌ Aucun employé disponible');
      await prisma.$disconnect();
      return;
    }
    targetId = employe.id;
  }
  
  const targetName = `${employe.prenom} ${employe.nom}`;
  
  console.log(`🧹 Nettoyage pour ${targetName} (ID: ${targetId})...\n`);
  
  // 1. Nettoyer
  const oldShift = await prisma.shift.findFirst({
    where: {
      employeId: targetId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  if (oldShift) {
    await prisma.paiementExtra.deleteMany({ where: { shiftId: oldShift.id } });
    const oldAnomalies = await prisma.anomalie.findMany({
      where: { employeId: targetId, date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') } },
      select: { id: true }
    });
    if (oldAnomalies.length > 0) {
      await prisma.anomalieAudit.deleteMany({ where: { anomalieId: { in: oldAnomalies.map(a => a.id) } } });
      await prisma.anomalie.deleteMany({ where: { id: { in: oldAnomalies.map(a => a.id) } } });
    }
    await prisma.shift.delete({ where: { id: oldShift.id } });
  }
  
  await prisma.pointage.deleteMany({
    where: {
      userId: targetId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  console.log('✅ Nettoyage terminé\n');
  
  // 2. Créer le shift
  const shift = await prisma.shift.create({
    data: {
      employeId: targetId,
      date: new Date(dateStr),
      type: 'travail',
      segments: [{ start: '14:00', end: '22:00', isExtra: false }]
    }
  });
  console.log(`✅ Shift créé: #${shift.id} (14:00-22:00)`);
  
  // 3. Créer les pointages (arrivée 2h en avance - HORS PLAGE > 90 min)
  // Shift: 14:00-22:00, Arrivée: 12:00 (120 min en avance > 90 min)
  await prisma.pointage.create({
    data: {
      userId: targetId,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T11:00:00Z`) // 12:00 Paris (UTC+1)
    }
  });
  console.log(`✅ Pointage arrivée: 12:00 (2h = 120 min en avance)`);
  
  await prisma.pointage.create({
    data: {
      userId: targetId,
      type: 'depart',
      horodatage: new Date(`${dateStr}T21:00:00Z`) // 22:00 Paris
    }
  });
  console.log(`✅ Pointage départ: 22:00 (à l'heure)`);
  
  // Créer l'anomalie hors-plage
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: targetId,
      date: new Date(dateStr),
      type: 'hors_plage_in_critique',
      gravite: 'hors_plage',
      description: `🟣 Hors-plage IN critique: arrivée à 12:00, 120 min trop tôt (prévu 14:00) → Probable oubli de badge, correction requise`,
      statut: 'en_attente',
      details: {
        shiftId: shift.id,
        heureDebutPrevue: '14:00',
        heureArriveeReelle: '12:00',
        ecartMinutes: 120,
        minutesEnAvance: 120
      }
    }
  });
  
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🎯 TEST: ARRIVÉE > 90 MIN EN AVANCE (HORS-PLAGE)`);
  console.log(`${'='.repeat(55)}`);
  console.log(`   👤 Employé: ${targetName} (ID: ${targetId})`);
  console.log(`   📅 Date: ${dateStr}`);
  console.log(`   📋 Shift prévu: 14:00 → 22:00`);
  console.log(`   ⏰ Pointages: 12:00 → 22:00`);
  console.log(`   ⏱️  Écart: +120 min (> 90 min = hors-plage critique)`);
  console.log(`   🔔 Anomalie: #${anomalie.id} (hors_plage_in_critique)`);
  console.log(`\n   ✅ COMPORTEMENT ATTENDU:`);
  console.log(`   - Planning: badge VIOLET "Hors-plage"`);
  console.log(`   - Interprétation: probable oubli de débadgeage la veille`);
  console.log(`   - Action: correction manuelle requise (pas de paiement extra)`);
  console.log(`   - Anomalie à traiter avec "Corriger" ou "Ignorer"`);
  
  await prisma.$disconnect();
}

createTestHorsPlage().catch(e => { console.error(e); prisma.$disconnect(); });
