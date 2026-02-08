const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createArriveeAnticipeeTest() {
  // Trouver un employé avec un shift récent (pas Aminata - ID 99)
  const shift = await prisma.shift.findFirst({
    where: {
      date: {
        gte: new Date('2026-01-28'),
        lte: new Date('2026-01-30')
      },
      type: 'travail',
      employeId: { not: 99 } // Pas Aminata
    },
    include: { employe: true }
  });
  
  if (!shift) {
    console.log('❌ Aucun shift trouvé');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n📅 Shift trouvé:`);
  console.log(`   Employé: ${shift.employe.prenom} ${shift.employe.nom} (ID: ${shift.employeId})`);
  console.log(`   Date: ${shift.date.toISOString().split('T')[0]}`);
  
  // Parser les segments
  const segments = typeof shift.segments === 'string' 
    ? JSON.parse(shift.segments) 
    : shift.segments;
  
  // Trouver le premier segment non-extra
  const premierSegment = segments?.find(s => !s.isExtra);
  if (!premierSegment) {
    console.log('❌ Pas de segment valide');
    await prisma.$disconnect();
    return;
  }
  
  const debutPrevu = premierSegment.start;
  const finPrevue = premierSegment.end;
  
  // Simuler une arrivée 45 min en avance (dans la zone extra_potentiel: 30-90 min)
  const [h, m] = debutPrevu.split(':').map(Number);
  const arriveeMinutes = h * 60 + m - 45; // 45 min avant
  const arriveeH = Math.floor(arriveeMinutes / 60);
  const arriveeM = arriveeMinutes % 60;
  const heureArrivee = `${String(arriveeH).padStart(2, '0')}:${String(arriveeM).padStart(2, '0')}`;
  
  console.log(`\n⏰ Horaires:`);
  console.log(`   Prévu: ${debutPrevu} → ${finPrevue}`);
  console.log(`   Arrivée simulée: ${heureArrivee} (45 min en avance)`);
  console.log(`   Départ simulé: ${finPrevue} (à l'heure)`);
  
  // Supprimer les anciens pointages de test pour cet employé ce jour
  const dateStr = shift.date.toISOString().split('T')[0];
  await prisma.pointage.deleteMany({
    where: {
      userId: shift.employeId,
      horodatage: {
        gte: new Date(dateStr + 'T00:00:00Z'),
        lte: new Date(dateStr + 'T23:59:59Z')
      }
    }
  });
  console.log(`\n🧹 Anciens pointages supprimés`);
  
  // Créer les pointages (UTC = heure Paris - 1)
  const arriveeUTC = `${String(arriveeH - 1).padStart(2, '0')}:${String(arriveeM).padStart(2, '0')}`;
  const [finH, finM] = finPrevue.split(':').map(Number);
  const departUTC = `${String(finH - 1).padStart(2, '0')}:${String(finM).padStart(2, '0')}`;
  
  const arrivee = await prisma.pointage.create({
    data: {
      userId: shift.employeId,
      type: 'arrivee',
      horodatage: new Date(`${dateStr}T${arriveeUTC}:00Z`)
    }
  });
  console.log(`✅ Pointage arrivée créé: ${heureArrivee} (Paris)`);
  
  const depart = await prisma.pointage.create({
    data: {
      userId: shift.employeId,
      type: 'depart',
      horodatage: new Date(`${dateStr}T${departUTC}:00Z`)
    }
  });
  console.log(`✅ Pointage départ créé: ${finPrevue} (Paris)`);
  
  // Supprimer les anciennes anomalies de test pour cet employé ce jour
  await prisma.anomalie.deleteMany({
    where: {
      employeId: shift.employeId,
      date: {
        gte: new Date(dateStr + 'T00:00:00Z'),
        lte: new Date(dateStr + 'T23:59:59Z')
      },
      type: 'arrivee_anticipee_extra'
    }
  });
  
  // Créer l'anomalie
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: shift.employeId,
      date: shift.date,
      type: 'arrivee_anticipee_extra',
      gravite: 'a_valider',
      description: `⚠️ Extra potentiel (arrivée): arrivé à ${heureArrivee}, 45 min en avance (prévu ${debutPrevu}) → Validation managériale requise`,
      statut: 'en_attente',
      heuresExtra: 0.75, // 45 min en heures
      details: {
        shiftId: shift.id,
        heureDebutPrevue: debutPrevu,
        heureArriveeReelle: heureArrivee,
        ecartMinutes: 45,
        minutesEnAvance: 45,
        heuresSup: 0.75
      }
    }
  });
  
  console.log(`\n✅ Anomalie créée: #${anomalie.id}`);
  console.log(`   Type: ${anomalie.type}`);
  console.log(`   Gravité: ${anomalie.gravite}`);
  console.log(`   Heures Extra: ${anomalie.heuresExtra}h (45 min)`);
  
  console.log(`\n🎯 TEST PRÊT !`);
  console.log(`   → Allez dans le Planning, cherchez "${shift.employe.prenom} ${shift.employe.nom}"`);
  console.log(`   → Date: ${dateStr}`);
  console.log(`   → Ou allez dans Anomalies pour traiter l'anomalie #${anomalie.id}`);
  
  await prisma.$disconnect();
}

createArriveeAnticipeeTest().catch(e => { console.error(e); prisma.$disconnect(); });
