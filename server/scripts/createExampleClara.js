const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createExampleClaraMoreau() {
  console.log('🔍 Recherche de Clara Moreau...\n');
  
  // Trouver Clara Moreau
  const clara = await prisma.user.findFirst({
    where: {
      OR: [
        { nom: { contains: 'Moreau', mode: 'insensitive' } },
        { prenom: { contains: 'Clara', mode: 'insensitive' } }
      ]
    }
  });
  
  if (!clara) {
    console.log('❌ Clara Moreau non trouvée');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Trouvée: ${clara.prenom} ${clara.nom} (ID: ${clara.id})`);
  
  // Trouver un shift récent pour Clara
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: clara.id,
      type: 'travail',
      date: {
        gte: new Date('2026-01-27'),
        lte: new Date('2026-01-30')
      }
    },
    orderBy: { date: 'desc' }
  });
  
  if (!shift) {
    console.log('❌ Aucun shift trouvé pour Clara');
    
    // Lister les shifts disponibles
    const allShifts = await prisma.shift.findMany({
      where: { employeId: clara.id },
      orderBy: { date: 'desc' },
      take: 5
    });
    console.log('\nDerniers shifts:');
    allShifts.forEach(s => console.log(`  - ${s.date.toISOString().split('T')[0]}: ${JSON.stringify(s.segments)}`));
    
    await prisma.$disconnect();
    return;
  }
  
  const dateStr = shift.date.toISOString().split('T')[0];
  console.log(`📅 Shift trouvé: ${dateStr}`);
  
  // Parser les segments
  const segments = typeof shift.segments === 'string' 
    ? JSON.parse(shift.segments) 
    : shift.segments;
  
  const premierSegment = segments?.find(s => !s.isExtra);
  if (!premierSegment) {
    console.log('❌ Pas de segment valide');
    await prisma.$disconnect();
    return;
  }
  
  const debutPrevu = premierSegment.start;
  const finPrevue = premierSegment.end;
  
  console.log(`⏰ Shift prévu: ${debutPrevu} → ${finPrevue}`);
  
  // Simuler une arrivée 40 min en avance (dans la zone extra_potentiel: 30-90 min)
  const [h, m] = debutPrevu.split(':').map(Number);
  const arriveeMinutes = h * 60 + m - 40; // 40 min avant
  const arriveeH = Math.floor(arriveeMinutes / 60);
  const arriveeM = arriveeMinutes % 60;
  const heureArrivee = `${String(arriveeH).padStart(2, '0')}:${String(arriveeM).padStart(2, '0')}`;
  
  console.log(`\n🎯 Simulation:`);
  console.log(`   Arrivée: ${heureArrivee} (40 min en avance)`);
  console.log(`   Départ: ${finPrevue} (à l'heure)`);
  
  // Nettoyer les anciennes données de test
  await prisma.pointage.deleteMany({
    where: {
      userId: clara.id,
      horodatage: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    }
  });
  
  const oldAnomaliesIds = await prisma.anomalie.findMany({
    where: {
      employeId: clara.id,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lte: new Date(dateStr + 'T23:59:59Z') }
    },
    select: { id: true }
  });
  
  if (oldAnomaliesIds.length > 0) {
    await prisma.anomalieAudit.deleteMany({
      where: { anomalieId: { in: oldAnomaliesIds.map(a => a.id) } }
    });
    await prisma.anomalie.deleteMany({
      where: { id: { in: oldAnomaliesIds.map(a => a.id) } }
    });
  }
  
  console.log(`\n🧹 Anciennes données nettoyées`);
  
  // Créer les pointages (UTC = heure Paris - 1)
  const arriveeUTC = `${String(arriveeH - 1).padStart(2, '0')}:${String(arriveeM).padStart(2, '0')}`;
  const [finH, finM] = finPrevue.split(':').map(Number);
  const departUTC = `${String(finH - 1).padStart(2, '0')}:${String(finM).padStart(2, '0')}`;
  
  await prisma.pointage.create({
    data: {
      userId: clara.id,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T${arriveeUTC}:00Z`)
    }
  });
  console.log(`✅ Pointage arrivée créé: ${heureArrivee} (Paris)`);
  
  await prisma.pointage.create({
    data: {
      userId: clara.id,
      type: 'depart',
      horodatage: new Date(`${dateStr}T${departUTC}:00Z`)
    }
  });
  console.log(`✅ Pointage départ créé: ${finPrevue} (Paris)`);
  
  // Créer l'anomalie arrivée anticipée extra
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: clara.id,
      date: shift.date,
      type: 'arrivee_anticipee_extra',
      gravite: 'a_valider',
      description: `⚠️ Extra potentiel (arrivée): arrivé à ${heureArrivee}, 40 min en avance (prévu ${debutPrevu}) → Validation managériale requise`,
      statut: 'en_attente',
      heuresExtra: 0.67, // 40 min en heures
      details: {
        shiftId: shift.id,
        heureDebutPrevue: debutPrevu,
        heureArriveeReelle: heureArrivee,
        ecartMinutes: 40,
        minutesEnAvance: 40,
        heuresSup: 0.67
      }
    }
  });
  
  console.log(`\n✅ Anomalie créée: #${anomalie.id}`);
  console.log(`   Type: ${anomalie.type}`);
  console.log(`   Heures Extra: ${anomalie.heuresExtra}h (40 min)`);
  
  console.log(`\n🎯 TEST PRÊT !`);
  console.log(`   → Planning: cherchez "${clara.prenom} ${clara.nom}" le ${dateStr}`);
  console.log(`   → Anomalies: traiter l'anomalie #${anomalie.id}`);
  
  await prisma.$disconnect();
}

createExampleClaraMoreau().catch(e => { console.error(e); prisma.$disconnect(); });
