// Recréer les données de test SANS shifts de nuit pour éviter les problèmes d'appairage
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recreerDonneesTest() {
  console.log('🔄 RECRÉATION DONNÉES TEST - SIMPLIFIÉES\n');
  console.log('='.repeat(80));

  try {
    // 1. Trouver l'employé
    let employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé non trouvé. Créer d\'abord avec create-test-complet-heures.js');
      return;
    }

    console.log(`✅ Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);

    // 2. Nettoyer tout
    console.log('\n🧹 Nettoyage...');
    await prisma.pointage.deleteMany({ where: { userId: employe.id } });
    await prisma.shift.deleteMany({ where: { employeId: employe.id } });
    await prisma.conge.deleteMany({ where: { userId: employe.id } });
    console.log('✅ Nettoyage terminé');

    // 3. Créer les shifts (SANS shifts de nuit pour l'instant)
    console.log('\n📅 Création des shifts...');
    
    const shiftsData = [
      // Semaine 1
      { date: '2025-11-04', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h
      { date: '2025-11-05', segments: [{ start: '11:00', end: '15:00' }, { start: '19:00', end: '23:00' }] }, // 8h
      { date: '2025-11-06', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h
      { date: '2025-11-07', segments: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:00' }] }, // 8h
      { date: '2025-11-08', segments: [{ start: '09:00', end: '13:30' }, { start: '14:30', end: '19:00' }] }, // 9h
      
      // Semaine 2
      { date: '2025-11-11', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h
      { date: '2025-11-12', segments: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }] }, // 8h
      { date: '2025-11-13', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:30' }] }, // 8.5h (heures sup)
      { date: '2025-11-14', segments: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:30' }] }, // 8.5h
      
      // Semaine 3 (avec absence et congé)
      { date: '2025-11-18', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h
      { date: '2025-11-19', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h - ABSENCE (pas de pointages)
      // 20-21 nov = congé payé (pas de shift)
      { date: '2025-11-22', segments: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:00' }] }, // 8h
      
      // Semaine 4
      { date: '2025-11-25', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }, // 8h
      { date: '2025-11-26', segments: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:00' }] }, // 8h
      { date: '2025-11-27', segments: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:30' }] }, // 8.5h
      { date: '2025-11-28', segments: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:30' }] }, // 8.5h
      { date: '2025-11-29', segments: [{ start: '09:00', end: '13:30' }, { start: '14:30', end: '19:00' }] }, // 9h
    ];

    let totalHeuresPrevues = 0;
    for (const s of shiftsData) {
      const heuresPrevues = s.segments.reduce((total, seg) => {
        const [startH, startM] = seg.start.split(':').map(Number);
        const [endH, endM] = seg.end.split(':').map(Number);
        const minutes = (endH * 60 + endM) - (startH * 60 + startM);
        return total + minutes / 60;
      }, 0);
      
      totalHeuresPrevues += heuresPrevues;

      await prisma.shift.create({
        data: {
          employeId: employe.id,
          date: new Date(s.date + 'T00:00:00Z'),
          type: 'présence',
          segments: s.segments.map(seg => ({ ...seg, isExtra: false }))
        }
      });
    }

    console.log(`✅ ${shiftsData.length} shifts créés (${totalHeuresPrevues.toFixed(1)}h prévues)`);

    // 4. Créer congé payé
    console.log('\n🏖️  Création congé...');
    await prisma.conge.create({
      data: {
        userId: employe.id,
        type: 'Congé payé',
        dateDebut: new Date('2025-11-20T00:00:00Z'),
        dateFin: new Date('2025-11-21T23:59:59Z'),
        statut: 'approuvé'
      }
    });
    console.log('✅ Congé créé (20-21 nov)');

    // 5. Créer les pointages
    console.log('\n⏱️  Création pointages...');
    
    const pointagesData = [
      // 04 nov - Normal
      { date: '2025-11-04', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:00' },
      // 05 nov - Retard 15min
      { date: '2025-11-05', arrivee1: '11:15', depart1: '15:00', arrivee2: '19:00', depart2: '23:00' },
      // 06 nov - Normal
      { date: '2025-11-06', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:00' },
      // 07 nov - Normal
      { date: '2025-11-07', arrivee1: '10:00', depart1: '14:00', arrivee2: '18:00', depart2: '22:00' },
      // 08 nov - Retard 10min
      { date: '2025-11-08', arrivee1: '09:10', depart1: '13:30', arrivee2: '14:30', depart2: '19:00' },
      
      // 11 nov - Normal
      { date: '2025-11-11', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:00' },
      // 12 nov - Normal
      { date: '2025-11-12', arrivee1: '10:00', depart1: '14:00', arrivee2: '15:00', depart2: '19:00' },
      // 13 nov - Heures sup
      { date: '2025-11-13', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:30' },
      // 14 nov - Normal
      { date: '2025-11-14', arrivee1: '10:00', depart1: '14:00', arrivee2: '18:00', depart2: '22:30' },
      
      // 18 nov - Normal
      { date: '2025-11-18', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:00' },
      // 19 nov - ABSENCE (pas de pointages)
      // 20-21 nov - CONGÉ
      // 22 nov - Normal
      { date: '2025-11-22', arrivee1: '10:00', depart1: '14:00', arrivee2: '18:00', depart2: '22:00' },
      
      // 25 nov - Retard 20min
      { date: '2025-11-25', arrivee1: '09:20', depart1: '13:00', arrivee2: '14:00', depart2: '18:00' },
      // 26 nov - Normal
      { date: '2025-11-26', arrivee1: '10:00', depart1: '14:00', arrivee2: '18:00', depart2: '22:00' },
      // 27 nov - Normal
      { date: '2025-11-27', arrivee1: '09:00', depart1: '13:00', arrivee2: '14:00', depart2: '18:30' },
      // 28 nov - Normal
      { date: '2025-11-28', arrivee1: '10:00', depart1: '14:00', arrivee2: '18:00', depart2: '22:30' },
      // 29 nov - Normal
      { date: '2025-11-29', arrivee1: '09:00', depart1: '13:30', arrivee2: '14:30', depart2: '19:00' },
    ];

    let totalPointages = 0;
    for (const p of pointagesData) {
      const dateBase = p.date + 'T';
      
      // Première paire
      await prisma.pointage.create({
        data: {
          userId: employe.id,
          type: 'arrivée',
          horodatage: new Date(dateBase + p.arrivee1 + ':00Z')
        }
      });
      await prisma.pointage.create({
        data: {
          userId: employe.id,
          type: 'départ',
          horodatage: new Date(dateBase + p.depart1 + ':00Z')
        }
      });
      
      // Deuxième paire
      await prisma.pointage.create({
        data: {
          userId: employe.id,
          type: 'arrivée',
          horodatage: new Date(dateBase + p.arrivee2 + ':00Z')
        }
      });
      await prisma.pointage.create({
        data: {
          userId: employe.id,
          type: 'départ',
          horodatage: new Date(dateBase + p.depart2 + ':00Z')
        }
      });
      
      totalPointages += 4;
    }

    console.log(`✅ ${totalPointages} pointages créés (${pointagesData.length} jours)`);

    // 6. Résumé
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ:\n');
    console.log(`👤 Employé: ${employe.email} (ID: ${employe.id})`);
    console.log(`📅 Période: Novembre 2025`);
    console.log(`⏰ Shifts: ${shiftsData.length} (${totalHeuresPrevues.toFixed(1)}h prévues)`);
    console.log(`⏱️  Pointages: ${totalPointages} (${pointagesData.length} jours travaillés)`);
    console.log(`❌ Absences: 1 jour (19 nov = 8h)`);
    console.log(`🏖️  Congés: 2 jours (20-21 nov)`);
    console.log(`⚠️  Retards: 3 (15min + 10min + 20min = 45min)`);
    console.log(`\n📈 Attendu:`);
    console.log(`   - Heures travaillées: ~${(totalHeuresPrevues - 8).toFixed(1)}h (moins l'absence)`);
    console.log(`   - Taux présence: ${((pointagesData.length / shiftsData.length) * 100).toFixed(1)}%`);
    console.log(`   - Taux ponctualité: ~${(((pointagesData.length - 3) / pointagesData.length) * 100).toFixed(1)}%`);
    
    console.log('\n✅ DONNÉES RECRÉÉES AVEC SUCCÈS!\n');
    console.log('🔍 Tester avec: node test-bout-en-bout.js');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

recreerDonneesTest();
