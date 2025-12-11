// Script de test complet : Créer un employé avec données réalistes pour Novembre 2025
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function creerTestComplet() {
  console.log('🧪 CRÉATION TEST COMPLET - HEURES & CALCULS\n');
  console.log('='.repeat(80));

  try {
    // 1. Créer ou récupérer l'employé de test
    console.log('\n📝 Étape 1: Création employé de test...');
    
    let employeTest = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (employeTest) {
      console.log(`✅ Employé existant trouvé: ${employeTest.prenom} ${employeTest.nom} (ID: ${employeTest.id})`);
      
      // Nettoyer les anciennes données
      console.log('🧹 Nettoyage des anciennes données...');
      await prisma.pointage.deleteMany({ where: { userId: employeTest.id } });
      await prisma.shift.deleteMany({ where: { employeId: employeTest.id } });
      await prisma.conge.deleteMany({ where: { userId: employeTest.id } });
      console.log('✅ Nettoyage terminé');
    } else {
      employeTest = await prisma.user.create({
        data: {
          email: 'test.complet@restaurant.com',
          nom: 'TestComplet',
          prenom: 'Validation',
          role: 'employee',
          statut: 'actif',
          password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456' // Hash fictif
        }
      });
      console.log(`✅ Nouvel employé créé: ${employeTest.prenom} ${employeTest.nom} (ID: ${employeTest.id})`);
    }

    // 2. Créer les shifts pour Novembre 2025
    console.log('\n📅 Étape 2: Création des shifts pour Novembre 2025...');
    
    const shifts = [
      // SEMAINE 1 (3-9 novembre) - Horaires normaux avec quelques variations
      {
        date: new Date('2025-11-03T23:00:00Z'), // Lundi 3 nov (début 4 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false }, // 4h matin
          { start: '14:00', end: '18:00', isExtra: false }  // 4h après-midi = 8h total
        ]
      },
      {
        date: new Date('2025-11-04T23:00:00Z'), // Mardi 4 nov (début 5 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false }, // 4h service midi
          { start: '19:00', end: '23:00', isExtra: false }  // 4h service soir = 8h total
        ]
      },
      {
        date: new Date('2025-11-05T23:00:00Z'), // Mercredi 5 nov (début 6 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-06T23:00:00Z'), // Jeudi 6 nov (début 7 nov locale)
        type: 'présence',
        segments: [
          { start: '17:00', end: '01:00', isExtra: false }  // 8h (shift de nuit)
        ]
      },
      {
        date: new Date('2025-11-07T23:00:00Z'), // Vendredi 7 nov (début 8 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false },
          { start: '19:00', end: '00:30', isExtra: false }  // 4h + 5.5h = 9.5h (nuit)
        ]
      },
      
      // SEMAINE 2 (10-16 novembre) - Avec retards et heures sup
      {
        date: new Date('2025-11-10T23:00:00Z'), // Lundi 10 nov (début 11 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-11T23:00:00Z'), // Mardi 11 nov (début 12 nov locale) - FÉRIÉ mais travaille
        type: 'présence',
        segments: [
          { start: '10:00', end: '14:00', isExtra: false },
          { start: '15:00', end: '19:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-12T23:00:00Z'), // Mercredi 12 nov (début 13 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '19:00', isExtra: false }  // 4h + 5h = 9h (heures sup)
        ]
      },
      {
        date: new Date('2025-11-13T23:00:00Z'), // Jeudi 13 nov (début 14 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false },
          { start: '19:00', end: '23:30', isExtra: false }  // 4h + 4.5h = 8.5h
        ]
      },
      
      // SEMAINE 3 (17-23 novembre) - Avec absence et congé
      {
        date: new Date('2025-11-17T23:00:00Z'), // Lundi 17 nov (début 18 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-18T23:00:00Z'), // Mardi 18 nov (début 19 nov locale) - ABSENCE INJUSTIFIÉE
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:00', isExtra: false }  // 8h planifié (mais absent)
        ]
      },
      // 20-21 nov = Congé payé (pas de shift)
      {
        date: new Date('2025-11-21T23:00:00Z'), // Vendredi 21 nov (début 22 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false },
          { start: '19:00', end: '23:00', isExtra: false }  // 8h
        ]
      },
      
      // SEMAINE 4 (24-30 novembre) - Semaine normale
      {
        date: new Date('2025-11-24T23:00:00Z'), // Lundi 24 nov (début 25 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-25T23:00:00Z'), // Mardi 25 nov (début 26 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false },
          { start: '19:00', end: '23:00', isExtra: false }  // 8h
        ]
      },
      {
        date: new Date('2025-11-26T23:00:00Z'), // Mercredi 26 nov (début 27 nov locale)
        type: 'présence',
        segments: [
          { start: '09:00', end: '13:00', isExtra: false },
          { start: '14:00', end: '18:30', isExtra: false }  // 4h + 4.5h = 8.5h
        ]
      },
      {
        date: new Date('2025-11-27T23:00:00Z'), // Jeudi 27 nov (début 28 nov locale)
        type: 'présence',
        segments: [
          { start: '17:00', end: '01:00', isExtra: false }  // 8h (shift de nuit)
        ]
      },
      {
        date: new Date('2025-11-28T23:00:00Z'), // Vendredi 28 nov (début 29 nov locale)
        type: 'présence',
        segments: [
          { start: '11:00', end: '15:00', isExtra: false },
          { start: '19:00', end: '00:30', isExtra: false }  // 4h + 5.5h = 9.5h
        ]
      }
    ];

    console.log(`📊 Création de ${shifts.length} shifts...`);
    const shiftsCreated = [];
    for (const shiftData of shifts) {
      const shift = await prisma.shift.create({
        data: {
          employeId: employeTest.id,
          date: shiftData.date,
          type: shiftData.type,
          segments: shiftData.segments
        }
      });
      shiftsCreated.push(shift);
    }
    console.log(`✅ ${shiftsCreated.length} shifts créés`);

    // 3. Créer le congé payé (20-21 novembre)
    console.log('\n🏖️  Étape 3: Création congé payé...');
    await prisma.conge.create({
      data: {
        userId: employeTest.id,
        type: 'Congé payé',
        statut: 'approuvé',
        dateDebut: new Date('2025-11-20T00:00:00Z'),
        dateFin: new Date('2025-11-21T00:00:00Z'),
        vu: true
      }
    });
    console.log('✅ Congé payé créé (20-21 nov)');

    // 4. Créer les pointages
    console.log('\n⏱️  Étape 4: Création des pointages...');
    
    const pointages = [
      // Semaine 1
      // Lundi 4 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-04T08:00:00.000Z') },   // 09:00 locale
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-04T12:00:00.000Z') },    // 13:00 locale
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-04T13:00:00.000Z') },   // 14:00 locale
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-04T17:00:00.000Z') },    // 18:00 locale
      
      // Mardi 5 nov - Retard de 15 min au début
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-05T10:15:00.000Z') },   // 11:15 locale (+15min)
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-05T14:00:00.000Z') },    // 15:00 locale
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-05T18:00:00.000Z') },   // 19:00 locale
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-05T22:00:00.000Z') },    // 23:00 locale
      
      // Mercredi 6 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-06T08:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-06T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-06T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-06T17:00:00.000Z') },
      
      // Jeudi 7 nov - Shift de nuit, arrivée à l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-07T16:00:00.000Z') },   // 17:00 locale
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-08T00:00:00.000Z') },    // 01:00 locale (lendemain)
      
      // Vendredi 8 nov - Shift avec nuit, retard 10min
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-08T10:10:00.000Z') },   // 11:10 locale (+10min)
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-08T14:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-08T18:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-08T23:30:00.000Z') },
      
      // Semaine 2
      // Lundi 11 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-11T08:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-11T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-11T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-11T17:00:00.000Z') },
      
      // Mardi 12 nov (férié) - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-12T09:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-12T13:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-12T14:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-12T18:00:00.000Z') },
      
      // Mercredi 13 nov - Heures sup, départ à 19:30 au lieu de 19:00
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-13T08:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-13T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-13T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-13T18:30:00.000Z') },   // +30min HS
      
      // Jeudi 14 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-14T10:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-14T14:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-14T18:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-14T22:30:00.000Z') },
      
      // Semaine 3
      // Lundi 18 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-18T08:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-18T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-18T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-18T17:00:00.000Z') },
      
      // Mardi 19 nov - ABSENCE INJUSTIFIÉE (pas de pointages)
      
      // 20-21 nov = CONGÉ PAYÉ (pas de pointages)
      
      // Vendredi 22 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-22T10:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-22T14:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-22T18:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-22T22:00:00.000Z') },
      
      // Semaine 4
      // Lundi 25 nov - Retard 20min
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-25T08:20:00.000Z') },   // +20min
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-25T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-25T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-25T17:00:00.000Z') },
      
      // Mardi 26 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-26T10:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-26T14:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-26T18:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-26T22:00:00.000Z') },
      
      // Mercredi 27 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-27T08:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-27T12:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-27T13:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-27T17:30:00.000Z') },
      
      // Jeudi 28 nov - Shift de nuit, à l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-28T16:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-29T00:00:00.000Z') },
      
      // Vendredi 29 nov - À l'heure
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-29T10:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-29T14:00:00.000Z') },
      { userId: employeTest.id, type: 'arrivée', horodatage: new Date('2025-11-29T18:00:00.000Z') },
      { userId: employeTest.id, type: 'départ', horodatage: new Date('2025-11-29T23:30:00.000Z') }
    ];

    console.log(`📊 Création de ${pointages.length} pointages...`);
    for (const pointageData of pointages) {
      await prisma.pointage.create({ data: pointageData });
    }
    console.log(`✅ ${pointages.length} pointages créés`);

    // 5. Résumé des données créées
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ DES DONNÉES CRÉÉES\n');
    
    console.log(`👤 Employé: ${employeTest.prenom} ${employeTest.nom}`);
    console.log(`   Email: ${employeTest.email}`);
    console.log(`   ID: ${employeTest.id}`);
    console.log(`   Rôle: ${employeTest.role}`);
    console.log('');
    
    console.log(`📅 Période: Novembre 2025`);
    console.log(`   Shifts créés: ${shiftsCreated.length}`);
    console.log(`   Pointages créés: ${pointages.length / 2} paires (${pointages.length} pointages)`);
    console.log(`   Congés: 1 (20-21 nov - Congé payé)`);
    console.log('');
    
    // Calcul des totaux attendus
    const totalHeuresPrevues = 
      8 + 8 + 8 + 8 + 9.5 +  // Semaine 1: 41.5h
      8 + 8 + 9 + 8.5 +      // Semaine 2: 33.5h
      8 + 8 + 8 +            // Semaine 3: 24h (sans congé ni absence)
      8 + 8 + 8.5 + 8 + 9.5; // Semaine 4: 42h
    
    console.log(`⏰ Heures prévues totales: ${totalHeuresPrevues}h`);
    console.log(`   - Semaine 1 (4-8 nov): 41.5h`);
    console.log(`   - Semaine 2 (11-14 nov): 33.5h`);
    console.log(`   - Semaine 3 (18-22 nov): 24h (absence 19 nov, congé 20-21)`);
    console.log(`   - Semaine 4 (25-29 nov): 42h`);
    console.log('');
    
    console.log(`✅ Jours travaillés: 16 jours`);
    console.log(`❌ Absences injustifiées: 1 jour (19 nov = 8h)`);
    console.log(`🏖️  Congés payés: 2 jours (20-21 nov)`);
    console.log(`⏱️  Retards: 3 occurrences`);
    console.log(`   - 5 nov: +15 min`);
    console.log(`   - 8 nov: +10 min`);
    console.log(`   - 25 nov: +20 min`);
    console.log(`   Total retards: 45 minutes = 0.75h`);
    console.log('');
    
    console.log(`📈 Heures supplémentaires: ~0.5h`);
    console.log(`   - 13 nov: +30 min`);
    console.log('');
    
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLET CRÉÉ AVEC SUCCÈS!\n');
    
    console.log('🔍 Pour tester dans l\'application:');
    console.log(`   1. Ouvrir le rapport de l'employé ID: ${employeTest.id}`);
    console.log(`   2. Email: ${employeTest.email}`);
    console.log(`   3. Période: Novembre 2025`);
    console.log(`   4. Vérifier les calculs dans l'onglet "Détail mensuel"`);
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

creerTestComplet();
