/**
 * Test: Créer des anomalies sans pointages pour Jordan
 * Pour voir comment l'app réagit avec des anomalies mais 0 pointage
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n🧪 TEST: Anomalies SANS pointages - ${today}`);
  console.log('='.repeat(60));

  // Vérifier que Jordan a un shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  if (!shift) {
    console.log('⚠️ Pas de shift, création d\'un shift...');
    await prisma.shift.create({
      data: {
        employeId: 110,
        date: new Date(`${today}T00:00:00.000Z`),
        type: 'travail',
        segments: [
          { debut: '09:00', fin: '12:00', type: 'travail' },
          { debut: '12:00', fin: '13:00', type: 'pause' },
          { debut: '13:00', fin: '17:00', type: 'travail' }
        ]
      }
    });
    console.log('✅ Shift créé');
  } else {
    console.log('✅ Shift existe déjà');
  }

  // S'assurer qu'il n'y a PAS de pointages
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: 110,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });
  console.log(`📊 Pointages existants: ${pointages.length}`);

  // Supprimer les anomalies existantes
  await prisma.anomalie.deleteMany({
    where: {
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  // Créer une anomalie de retard (sans pointage associé)
  const anomalie1 = await prisma.anomalie.create({
    data: {
      employeId: 110,
      date: new Date(`${today}T12:00:00.000Z`),
      type: 'retard_critique',
      gravite: 'haute',
      statut: 'en_attente',
      details: {
        heurePrevue: '09:00',
        heureReelle: '09:45',
        ecartMinutes: 45,
        detecteAutomatiquement: true
      },
      description: 'Retard critique de 45 min (arrivée 09:45, prévu 09:00)'
    }
  });
  console.log(`✅ Anomalie créée: ${anomalie1.type} - ${anomalie1.description}`);

  // Créer une anomalie de départ anticipé
  const anomalie2 = await prisma.anomalie.create({
    data: {
      employeId: 110,
      date: new Date(`${today}T12:00:00.000Z`),
      type: 'depart_anticipe',
      gravite: 'moyenne',
      statut: 'en_attente',
      details: {
        heurePrevue: '17:00',
        heureReelle: '15:30',
        ecartMinutes: 90,
        detecteAutomatiquement: true
      },
      description: 'Départ anticipé de 1h30 (départ 15:30, prévu 17:00)'
    }
  });
  console.log(`✅ Anomalie créée: ${anomalie2.type} - ${anomalie2.description}`);

  console.log('\n' + '='.repeat(60));
  console.log('📋 RÉSUMÉ:');
  console.log('   ⏰ Pointages: 0 (aucun)');
  console.log('   🚨 Anomalies: 2');
  console.log('      - Retard critique 45 min');
  console.log('      - Départ anticipé 1h30');
  console.log('\n✅ Rafraîchissez la page Pointage pour voir le comportement!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
