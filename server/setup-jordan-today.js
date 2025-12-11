/**
 * Crée un shift et des pointages pour Jordan AUJOURD'HUI (5 décembre)
 * avec retard et départ anticipé, puis crée les anomalies
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0]; // 2025-12-05
  console.log(`\n🧪 SETUP COMPLET POUR JORDAN - ${today}`);
  console.log('='.repeat(60));

  // Trouver Jordan
  const jordan = await prisma.user.findFirst({
    where: { email: 'yjordan496@gmail.com' }
  });

  if (!jordan) {
    console.log('❌ Jordan non trouvé');
    return;
  }
  console.log(`✅ Jordan trouvé (ID: ${jordan.id})`);

  // Supprimer les données existantes pour aujourd'hui
  console.log('\n🗑️ Nettoyage des données existantes...');
  
  await prisma.anomalie.deleteMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  await prisma.pointage.deleteMany({
    where: {
      userId: jordan.id,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  await prisma.shift.deleteMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  // Créer le shift pour aujourd'hui
  console.log('\n📅 Création du shift 09:00-17:00...');
  const shift = await prisma.shift.create({
    data: {
      employeId: jordan.id,
      date: new Date(`${today}T00:00:00.000Z`),
      type: 'travail',
      segments: [
        { debut: '09:00', fin: '12:00', type: 'travail' },
        { debut: '12:00', fin: '13:00', type: 'pause' },
        { debut: '13:00', fin: '17:00', type: 'travail' }
      ]
    }
  });
  console.log(`   ✅ Shift créé (ID: ${shift.id})`);

  // Créer les pointages avec retard et départ anticipé
  console.log('\n⏰ Création des pointages...');
  
  // Planning: 09:00-12:00 / 13:00-17:00
  // Pointages: 09:20 (retard 20min), 12:00, 13:00, 16:00 (départ anticipé 60min)
  
  const pointagesData = [
    { type: 'ENTRÉE', horodatage: new Date(`${today}T08:20:00.000Z`), desc: '09:20 Paris (+20min retard)' },
    { type: 'SORTIE', horodatage: new Date(`${today}T11:00:00.000Z`), desc: '12:00 Paris' },
    { type: 'ENTRÉE', horodatage: new Date(`${today}T12:00:00.000Z`), desc: '13:00 Paris' },
    { type: 'SORTIE', horodatage: new Date(`${today}T15:00:00.000Z`), desc: '16:00 Paris (-60min départ anticipé)' },
  ];

  for (const p of pointagesData) {
    await prisma.pointage.create({
      data: {
        userId: jordan.id,
        type: p.type,
        horodatage: p.horodatage
      }
    });
    console.log(`   ✅ ${p.type}: ${p.desc}`);
  }

  // Créer les anomalies
  console.log('\n🚨 Création des anomalies...');
  
  // Anomalie 1: Retard de 20 minutes
  await prisma.anomalie.create({
    data: {
      employeId: jordan.id,
      date: new Date(`${today}T12:00:00.000Z`),
      type: 'retard_modere',
      gravite: 'moyenne',
      statut: 'en_attente',
      details: {
        heurePrevue: '09:00',
        heureReelle: '09:20',
        ecartMinutes: 20,
        shiftId: shift.id,
        detecteAutomatiquement: true
      },
      description: 'Retard de 20 min (arrivée 09:20, prévu 09:00)'
    }
  });
  console.log('   ✅ Anomalie RETARD créée (20 min)');

  // Anomalie 2: Départ anticipé de 60 minutes
  await prisma.anomalie.create({
    data: {
      employeId: jordan.id,
      date: new Date(`${today}T12:00:00.000Z`),
      type: 'depart_anticipe',
      gravite: 'haute',
      statut: 'en_attente',
      details: {
        heurePrevue: '17:00',
        heureReelle: '16:00',
        ecartMinutes: 60,
        shiftId: shift.id,
        detecteAutomatiquement: true
      },
      description: 'Départ anticipé de 60 min (départ 16:00, prévu 17:00)'
    }
  });
  console.log('   ✅ Anomalie DÉPART ANTICIPÉ créée (60 min)');

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📋 RÉSUMÉ:');
  console.log('   📅 Shift: 09:00-12:00 / 13:00-17:00 (7h prévues)');
  console.log('   ⏰ Pointages: 09:20-12:00 / 13:00-16:00 (5h40 travaillées)');
  console.log('   🚨 Anomalies:');
  console.log('      - Retard 20 min (arrivée 09:20 au lieu de 09:00)');
  console.log('      - Départ anticipé 60 min (16:00 au lieu de 17:00)');
  console.log('\n✅ Rafraîchissez la page Pointage pour voir les anomalies!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
