const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCompleteExample() {
  const claraId = 104;
  const dateStr = '2026-01-29'; // Hier
  
  console.log('🔧 Création exemple complet pour Clara Moreau\n');
  
  // 1. Créer ou mettre à jour le shift
  let shift = await prisma.shift.findFirst({
    where: {
      employeId: claraId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        employeId: claraId,
        date: new Date(dateStr),
        type: 'travail',
        segments: [{ start: '09:00', end: '17:00', isExtra: false }]
      }
    });
    console.log(`✅ Shift créé: #${shift.id} (09:00-17:00)`);
  } else {
    // Nettoyer les segments Extra
    const segments = (shift.segments || []).filter(s => !s.isExtra);
    if (segments.length === 0) {
      segments.push({ start: '09:00', end: '17:00', isExtra: false });
    }
    await prisma.shift.update({
      where: { id: shift.id },
      data: { segments }
    });
    console.log(`✅ Shift existant nettoyé: #${shift.id}`);
  }
  
  // 2. Nettoyer les anciennes données
  await prisma.pointage.deleteMany({
    where: {
      userId: claraId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  const oldAnomalies = await prisma.anomalie.findMany({
    where: {
      employeId: claraId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    },
    select: { id: true }
  });
  
  if (oldAnomalies.length > 0) {
    await prisma.anomalieAudit.deleteMany({
      where: { anomalieId: { in: oldAnomalies.map(a => a.id) } }
    });
    await prisma.anomalie.deleteMany({
      where: { id: { in: oldAnomalies.map(a => a.id) } }
    });
  }
  console.log(`🧹 Anciennes données nettoyées`);
  
  // 3. Créer les pointages (arrivée 40 min en avance)
  // Shift: 09:00-17:00, Arrivée: 08:20
  await prisma.pointage.create({
    data: {
      userId: claraId,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T07:20:00Z`) // 08:20 Paris
    }
  });
  console.log(`✅ Pointage arrivée: 08:20 (40 min en avance)`);
  
  await prisma.pointage.create({
    data: {
      userId: claraId,
      type: 'depart',
      horodatage: new Date(`${dateStr}T16:00:00Z`) // 17:00 Paris
    }
  });
  console.log(`✅ Pointage départ: 17:00 (à l'heure)`);
  
  // 4. Créer l'anomalie
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: claraId,
      date: new Date(dateStr),
      type: 'arrivee_anticipee_extra',
      gravite: 'a_valider',
      description: `⚠️ Extra potentiel (arrivée): arrivé à 08:20, 40 min en avance (prévu 09:00) → Validation managériale requise`,
      statut: 'en_attente',
      heuresExtra: 0.67,
      details: {
        shiftId: shift.id,
        heureDebutPrevue: '09:00',
        heureArriveeReelle: '08:20',
        ecartMinutes: 40,
        minutesEnAvance: 40,
        heuresSup: 0.67
      }
    }
  });
  
  console.log(`\n✅ Anomalie créée: #${anomalie.id}`);
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎯 EXEMPLE PRÊT POUR CLARA MOREAU`);
  console.log(`${'='.repeat(50)}`);
  console.log(`   Date: ${dateStr}`);
  console.log(`   Shift prévu: 09:00 → 17:00`);
  console.log(`   Pointage réel: 08:20 → 17:00`);
  console.log(`   Écart: +40 min (arrivée anticipée)`);
  console.log(`   Anomalie: #${anomalie.id} (en_attente)`);
  console.log(`\n   → Allez dans le Planning, cherchez "Clara Moreau" le 29/01`);
  console.log(`   → Ou dans Anomalies pour traiter avec "Payer en Extra"`);
  
  await prisma.$disconnect();
}

createCompleteExample().catch(e => { console.error(e); prisma.$disconnect(); });
