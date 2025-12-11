// Test de la correction du taux de ponctualité
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testerCorrectionPonctualite() {
  console.log('🔍 TEST DE LA CORRECTION DU TAUX DE PONCTUALITÉ\n');
  console.log('='.repeat(80));

  try {
    // Créer un employé de test avec 2 segments par jour
    let employeTest = await prisma.user.findFirst({
      where: { email: 'test.double.segment@restaurant.com' }
    });

    if (!employeTest) {
      console.log('📝 Création d\'un employé de test avec 2 segments par jour...\n');
      employeTest = await prisma.user.create({
        data: {
          nom: 'TestDouble',
          prenom: 'Segment',
          email: 'test.double.segment@restaurant.com',
          telephone: '0600000099',
          role: 'employe',
          password: 'test123'
        }
      });
    }

    // Nettoyer les données existantes
    await prisma.pointage.deleteMany({ where: { userId: employeTest.id } });
    await prisma.shift.deleteMany({ where: { employeId: employeTest.id } });

    console.log(`✅ Employé: ${employeTest.nom} ${employeTest.prenom} (ID: ${employeTest.id})\n`);

    // Créer 5 jours de shifts avec 2 segments chacun (08:00-12:00 et 14:00-18:00)
    const dates = [
      '2025-11-24', // Lundi - en retard aux 2 segments
      '2025-11-25', // Mardi - à l'heure
      '2025-11-26', // Mercredi - à l'heure
      '2025-11-27', // Jeudi - en retard à 1 segment
      '2025-11-28'  // Vendredi - à l'heure
    ];

    console.log('📅 Création des shifts avec 2 segments par jour:\n');
    for (const date of dates) {
      await prisma.shift.create({
        data: {
          employeId: employeTest.id,
          date: new Date(date),
          type: 'présence',
          segments: [
            { start: '08:00', end: '12:00', isExtra: false },
            { start: '14:00', end: '18:00', isExtra: false }
          ]
        }
      });
      console.log(`   ✓ ${date}: 08:00-12:00 et 14:00-18:00`);
    }

    console.log('\n📊 Création des pointages:\n');

    // Lundi - en retard aux 2 segments (8:20 et 14:15)
    await prisma.pointage.createMany({
      data: [
        { userId: employeTest.id, horodatage: new Date('2025-11-24T08:20:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-24T12:00:00Z'), type: 'depart' },
        { userId: employeTest.id, horodatage: new Date('2025-11-24T14:15:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-24T18:00:00Z'), type: 'depart' }
      ]
    });
    console.log('   Lundi: Arrivée 08:20 (retard 20min) et 14:15 (retard 15min)');

    // Mardi - à l'heure
    await prisma.pointage.createMany({
      data: [
        { userId: employeTest.id, horodatage: new Date('2025-11-25T08:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-25T12:00:00Z'), type: 'depart' },
        { userId: employeTest.id, horodatage: new Date('2025-11-25T14:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-25T18:00:00Z'), type: 'depart' }
      ]
    });
    console.log('   Mardi: À l\'heure');

    // Mercredi - à l'heure
    await prisma.pointage.createMany({
      data: [
        { userId: employeTest.id, horodatage: new Date('2025-11-26T08:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-26T12:00:00Z'), type: 'depart' },
        { userId: employeTest.id, horodatage: new Date('2025-11-26T14:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-26T18:00:00Z'), type: 'depart' }
      ]
    });
    console.log('   Mercredi: À l\'heure');

    // Jeudi - en retard au 1er segment seulement (8:10)
    await prisma.pointage.createMany({
      data: [
        { userId: employeTest.id, horodatage: new Date('2025-11-27T08:10:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-27T12:00:00Z'), type: 'depart' },
        { userId: employeTest.id, horodatage: new Date('2025-11-27T14:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-27T18:00:00Z'), type: 'depart' }
      ]
    });
    console.log('   Jeudi: Arrivée 08:10 (retard 10min) puis à l\'heure l\'après-midi');

    // Vendredi - à l'heure
    await prisma.pointage.createMany({
      data: [
        { userId: employeTest.id, horodatage: new Date('2025-11-28T08:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-28T12:00:00Z'), type: 'depart' },
        { userId: employeTest.id, horodatage: new Date('2025-11-28T14:00:00Z'), type: 'arrivee' },
        { userId: employeTest.id, horodatage: new Date('2025-11-28T18:00:00Z'), type: 'depart' }
      ]
    });
    console.log('   Vendredi: À l\'heure');

    console.log('\n' + '='.repeat(80));
    console.log('\n🧮 CALCUL ATTENDU:\n');
    console.log('   Jours présents: 5');
    console.log('   Jours avec retard:');
    console.log('      - Lundi: OUI (2 segments en retard → 1 JOUR compté)');
    console.log('      - Mardi: NON');
    console.log('      - Mercredi: NON');
    console.log('      - Jeudi: OUI (1 segment en retard → 1 JOUR compté)');
    console.log('      - Vendredi: NON');
    console.log('   Total jours avec retard: 2');
    console.log('\n   ✅ TAUX ATTENDU: (5 - 2) / 5 * 100 = 60%\n');

    console.log('='.repeat(80));
    console.log('\n❌ ANCIEN CALCUL (BUG):\n');
    console.log('   Comptait 3 retards (2 lundi + 1 jeudi) = (5 - 3) / 5 = 40%');
    console.log('   ❌ Problème: Comptait chaque segment en retard séparément\n');

    console.log('='.repeat(80));
    console.log('\n✅ RÉSULTAT:\n');
    console.log('Employé créé avec succès !');
    console.log(`ID: ${employeTest.id}`);
    console.log('Email: test.double.segment@restaurant.com');
    console.log('\nPour tester, appelez l\'API:');
    console.log(`GET /api/stats/rapport-tous-employes?periode=semaine&date=2025-11-24`);
    console.log('\nCherchez l\'employé "TestDouble Segment" et vérifiez:');
    console.log('  - nombreRetards: devrait être 2 (pas 3)');
    console.log('  - tauxPonctualite: devrait être 60% (pas 40%)');
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testerCorrectionPonctualite();
