const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createFreshTest() {
  const claraId = 104;
  const dateStr = '2026-02-02'; // Hier (2 février)
  
  console.log('🧹 Nettoyage des anciennes données...\n');
  
  // 1. Nettoyer les anciennes données pour cette date
  const oldShift = await prisma.shift.findFirst({
    where: {
      employeId: claraId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  if (oldShift) {
    // Supprimer paiements liés
    await prisma.paiementExtra.deleteMany({ where: { shiftId: oldShift.id } });
    // Supprimer anomalies liées
    const oldAnomalies = await prisma.anomalie.findMany({
      where: {
        employeId: claraId,
        date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
      },
      select: { id: true }
    });
    if (oldAnomalies.length > 0) {
      await prisma.anomalieAudit.deleteMany({ where: { anomalieId: { in: oldAnomalies.map(a => a.id) } } });
      await prisma.anomalie.deleteMany({ where: { id: { in: oldAnomalies.map(a => a.id) } } });
    }
    // Supprimer shift
    await prisma.shift.delete({ where: { id: oldShift.id } });
  }
  
  // Supprimer pointages
  await prisma.pointage.deleteMany({
    where: {
      userId: claraId,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  console.log('✅ Nettoyage terminé\n');
  
  // 2. Créer le shift (SANS segment Extra - juste le shift normal)
  const shift = await prisma.shift.create({
    data: {
      employeId: claraId,
      date: new Date(dateStr),
      type: 'travail',
      segments: [{ start: '10:00', end: '18:00', isExtra: false }]
    }
  });
  console.log(`✅ Shift créé: #${shift.id} (10:00-18:00)`);
  
  // 3. Créer les pointages (arrivée 45 min en avance)
  // Shift: 10:00-18:00, Arrivée: 09:15 (45 min en avance)
  await prisma.pointage.create({
    data: {
      userId: claraId,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T08:15:00Z`) // 09:15 Paris (UTC+1)
    }
  });
  console.log(`✅ Pointage arrivée: 09:15 (45 min en avance)`);
  
  await prisma.pointage.create({
    data: {
      userId: claraId,
      type: 'depart',
      horodatage: new Date(`${dateStr}T17:00:00Z`) // 18:00 Paris
    }
  });
  console.log(`✅ Pointage départ: 18:00 (à l'heure)`);
  
  // 4. Créer l'anomalie (EN ATTENTE - pas encore traitée)
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: claraId,
      date: new Date(dateStr),
      type: 'arrivee_anticipee_extra',
      gravite: 'a_valider',
      description: `⚠️ Extra potentiel (arrivée): arrivé à 09:15, 45 min en avance (prévu 10:00) → Validation managériale requise`,
      statut: 'en_attente',
      heuresExtra: 0.75, // 45 min = 0.75h
      details: {
        shiftId: shift.id,
        heureDebutPrevue: '10:00',
        heureArriveeReelle: '09:15',
        ecartMinutes: 45,
        minutesEnAvance: 45,
        heuresSup: 0.75
      }
    }
  });
  
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🎯 NOUVEAU TEST CRÉÉ POUR CLARA MOREAU`);
  console.log(`${'='.repeat(55)}`);
  console.log(`   📅 Date: ${dateStr} (hier)`);
  console.log(`   📋 Shift prévu: 10:00 → 18:00 (SANS segment Extra)`);
  console.log(`   ⏰ Pointages: 09:15 → 18:00`);
  console.log(`   ⏱️  Écart: +45 min (arrivée anticipée)`);
  console.log(`   🔔 Anomalie: #${anomalie.id} (en_attente)`);
  console.log(`\n   📝 TESTS À FAIRE:`);
  console.log(`   1. Planning → Mode Comparaison → Clara le 02/02`);
  console.log(`      → Vérifier: segment affiche "Réel: 09:15-18:00"`);
  console.log(`      → Vérifier: badge "+45min" sur l'arrivée`);
  console.log(`   2. Anomalies → Anomalie #${anomalie.id}`);
  console.log(`      → Cliquer "Payer en Extra"`);
  console.log(`   3. Retour Planning → Vérifier:`);
  console.log(`      → Segment Extra 09:15-10:00 avec "À valider" ou "Payé"`);
  console.log(`      → Segment principal 10:00-18:00 avec heures réelles`);
  
  await prisma.$disconnect();
}

createFreshTest().catch(e => { console.error(e); prisma.$disconnect(); });
