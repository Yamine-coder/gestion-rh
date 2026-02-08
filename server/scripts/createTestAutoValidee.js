const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAutoValidee() {
  // Utilisons un autre employé pour ce test
  const employeId = 105; // Emma Petit ou autre
  const dateStr = '2026-02-02';
  
  // Vérifier l'employé
  const employe = await prisma.user.findUnique({ where: { id: employeId } });
  if (!employe) {
    console.log('❌ Employé ID 105 non trouvé, recherche d\'un autre...');
    const autre = await prisma.user.findFirst({ 
      where: { role: 'employe', actif: true, id: { notIn: [104] } },
      select: { id: true, nom: true, prenom: true }
    });
    if (!autre) {
      console.log('❌ Aucun employé disponible');
      return;
    }
    console.log(`Utilisation de ${autre.prenom} ${autre.nom} (ID: ${autre.id})`);
  }
  
  const targetId = employe ? employeId : 105;
  const targetName = employe ? `${employe.prenom} ${employe.nom}` : 'Employé';
  
  console.log(`🧹 Nettoyage pour ${targetName}...\n`);
  
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
      segments: [{ start: '09:00', end: '17:00', isExtra: false }]
    }
  });
  console.log(`✅ Shift créé: #${shift.id} (09:00-17:00)`);
  
  // 3. Créer les pointages (arrivée 20 min en avance - DANS la zone auto-validée)
  // Shift: 09:00-17:00, Arrivée: 08:40 (20 min en avance < 30 min)
  await prisma.pointage.create({
    data: {
      userId: targetId,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T07:40:00Z`) // 08:40 Paris (UTC+1)
    }
  });
  console.log(`✅ Pointage arrivée: 08:40 (20 min en avance)`);
  
  await prisma.pointage.create({
    data: {
      userId: targetId,
      type: 'depart',
      horodatage: new Date(`${dateStr}T16:00:00Z`) // 17:00 Paris
    }
  });
  console.log(`✅ Pointage départ: 17:00 (à l'heure)`);
  
  // PAS d'anomalie créée - c'est le comportement attendu pour < 30 min
  
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🎯 TEST: ARRIVÉE < 30 MIN EN AVANCE (AUTO-VALIDÉE)`);
  console.log(`${'='.repeat(55)}`);
  console.log(`   👤 Employé: ${targetName} (ID: ${targetId})`);
  console.log(`   📅 Date: ${dateStr}`);
  console.log(`   📋 Shift prévu: 09:00 → 17:00`);
  console.log(`   ⏰ Pointages: 08:40 → 17:00`);
  console.log(`   ⏱️  Écart: +20 min (< 30 min = zone auto-validée)`);
  console.log(`\n   ✅ COMPORTEMENT ATTENDU:`);
  console.log(`   - Planning: affiche "Réel: 08:40-17:00"`);
  console.log(`   - Badge: vert ou info (pas rouge/orange)`);
  console.log(`   - PAS d'anomalie à traiter (auto-validée)`);
  console.log(`   - Les 20 min sont payées automatiquement`);
  
  await prisma.$disconnect();
}

createTestAutoValidee().catch(e => { console.error(e); prisma.$disconnect(); });
