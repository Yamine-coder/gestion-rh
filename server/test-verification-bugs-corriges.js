// Test final : Vérifier que les bugs sont corrigés
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copie EXACTE des fonctions de production
function calculateRealHours(pointages) {
  if (!pointages || pointages.length < 2) return 0;
  
  let totalMinutes = 0;
  
  for (let i = 0; i < pointages.length - 1; i += 2) {
    const arrivee = pointages[i];
    const depart = pointages[i + 1];
    
    // Gérer les variantes avec et sans accent
    const isArrivee = arrivee.type === 'arrivee' || arrivee.type === 'arrivée' || arrivee.type === 'ENTRÉE';
    const isDepart = depart && (depart.type === 'depart' || depart.type === 'départ' || depart.type === 'SORTIE');
    
    if (isArrivee && isDepart) {
      const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      totalMinutes += diffMs / (1000 * 60);
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function analyserRetard(segment, pointagesJour) {
  const premiereArrivee = pointagesJour.find(p => 
    p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
  );
  
  if (!premiereArrivee) {
    return { retard: 0, heureArrivee: null };
  }

  const [prevuH, prevuM] = segment.start.split(':').map(Number);
  const minutesPrevues = prevuH * 60 + prevuM;

  // CORRECTION BUG TIMEZONE : Utiliser getUTCHours au lieu de getHours
  const heureArrivee = new Date(premiereArrivee.horodatage);
  const minutesReelles = heureArrivee.getUTCHours() * 60 + heureArrivee.getUTCMinutes();

  let retardMinutes = minutesReelles - minutesPrevues;

  if (retardMinutes < -12 * 60) {
    retardMinutes += 24 * 60;
  }

  return {
    retard: Math.max(0, retardMinutes),
    heureArrivee: heureArrivee.toISOString().substring(11, 16)
  };
}

async function verifierBugsCorrects() {
  console.log('🔒 VÉRIFICATION FINALE : BUGS CORRIGÉS\n');
  console.log('='.repeat(80));

  try {
    const employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé de test non trouvé');
      return;
    }

    console.log(`✅ Employé: ${employe.email} (ID: ${employe.id})\n`);

    // ======================================
    // TEST 1 : BUG ACCENTS
    // ======================================
    console.log('🧪 TEST 1 : Vérification bug des accents\n');
    console.log('   Problème: Pointages "arrivée"/"départ" non reconnus');
    console.log('   Attendu: Heures > 0\n');

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-04T00:00:00Z'),
          lte: new Date('2025-11-04T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`   Pointages du 4 nov:`);
    pointages.forEach(p => {
      const heure = p.horodatage.toISOString().substring(11, 16);
      console.log(`     - ${p.type} à ${heure}`);
    });

    const heuresCalculees = calculateRealHours(pointages);
    console.log(`\n   Heures calculées: ${heuresCalculees}h`);
    console.log(`   Attendu: 8.0h\n`);

    if (heuresCalculees === 8.0) {
      console.log('   ✅ BUG ACCENTS CORRIGÉ - Les heures sont calculées\n');
    } else if (heuresCalculees === 0) {
      console.log('   ❌ BUG ACCENTS TOUJOURS PRÉSENT - Heures = 0\n');
      return false;
    } else {
      console.log(`   ⚠️  Heures calculées mais valeur inattendue: ${heuresCalculees}h\n`);
    }

    // ======================================
    // TEST 2 : BUG TIMEZONE
    // ======================================
    console.log('-'.repeat(80));
    console.log('🧪 TEST 2 : Vérification bug timezone retards\n');
    console.log('   Problème: getHours() au lieu de getUTCHours()');
    console.log('   Attendu: Retard = 15min (pas 75min)\n');

    const pointages5Nov = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-05T00:00:00Z'),
          lte: new Date('2025-11-05T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    const shift5Nov = await prisma.shift.findFirst({
      where: {
        employeId: employe.id,
        date: new Date('2025-11-05T00:00:00Z')
      }
    });

    if (shift5Nov && pointages5Nov.length > 0) {
      const premiereArrivee = pointages5Nov.find(p => 
        p.type === 'arrivée' || p.type === 'arrivee' || p.type === 'ENTRÉE'
      );

      console.log(`   Shift prévu: ${shift5Nov.segments[0].start}`);
      console.log(`   Arrivée réelle: ${premiereArrivee.horodatage.toISOString().substring(11, 16)} (UTC)`);

      const retardInfo = analyserRetard(shift5Nov.segments[0], pointages5Nov);
      
      console.log(`\n   Retard calculé: ${retardInfo.retard} minutes`);
      console.log(`   Attendu: 15 minutes\n`);

      if (retardInfo.retard === 15) {
        console.log('   ✅ BUG TIMEZONE CORRIGÉ - Retard correct\n');
      } else if (retardInfo.retard === 75) {
        console.log('   ❌ BUG TIMEZONE TOUJOURS PRÉSENT - Décalage +60min\n');
        console.log('   💡 Le code utilise probablement getHours() au lieu de getUTCHours()\n');
        return false;
      } else {
        console.log(`   ⚠️  Retard inattendu: ${retardInfo.retard}min\n`);
      }
    }

    // ======================================
    // TEST 3 : CALCUL GLOBAL
    // ======================================
    console.log('-'.repeat(80));
    console.log('🧪 TEST 3 : Validation calcul global\n');

    const tousPointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Grouper par jour
    const parJour = new Map();
    tousPointages.forEach(p => {
      const date = p.horodatage.toISOString().split('T')[0];
      if (!parJour.has(date)) parJour.set(date, []);
      parJour.get(date).push(p);
    });

    let totalHeures = 0;
    let joursAvecHeures = 0;
    for (const [date, pts] of parJour.entries()) {
      const heures = calculateRealHours(pts);
      if (heures > 0) {
        totalHeures += heures;
        joursAvecHeures++;
      }
    }

    console.log(`   Total jours travaillés: ${joursAvecHeures}`);
    console.log(`   Total heures calculées: ${totalHeures.toFixed(2)}h`);
    console.log(`   Attendu: ~131-132h\n`);

    if (totalHeures > 130 && totalHeures < 135) {
      console.log('   ✅ CALCUL GLOBAL CORRECT\n');
    } else if (totalHeures === 0) {
      console.log('   ❌ ERREUR : Aucune heure calculée\n');
      return false;
    } else {
      console.log(`   ⚠️  Total hors plage attendue\n`);
    }

    // ======================================
    // TEST 4 : RETARDS MULTIPLES
    // ======================================
    console.log('-'.repeat(80));
    console.log('🧪 TEST 4 : Vérification des 3 retards connus\n');

    const joursRetard = [
      { date: '2025-11-05', prevu: '11:00', reel: '11:15', attendu: 15 },
      { date: '2025-11-08', prevu: '09:00', reel: '09:10', attendu: 10 },
      { date: '2025-11-25', prevu: '09:00', reel: '09:20', attendu: 20 }
    ];

    let retardsCorrects = 0;
    for (const jour of joursRetard) {
      const shift = await prisma.shift.findFirst({
        where: {
          employeId: employe.id,
          date: new Date(jour.date + 'T00:00:00Z')
        }
      });

      const pointagesJour = await prisma.pointage.findMany({
        where: {
          userId: employe.id,
          horodatage: {
            gte: new Date(jour.date + 'T00:00:00Z'),
            lte: new Date(jour.date + 'T23:59:59Z')
          }
        },
        orderBy: { horodatage: 'asc' }
      });

      if (shift && pointagesJour.length > 0) {
        const retardInfo = analyserRetard(shift.segments[0], pointagesJour);
        const correct = retardInfo.retard === jour.attendu;
        
        console.log(`   ${jour.date}: ${retardInfo.retard}min (attendu: ${jour.attendu}min) ${correct ? '✅' : '❌'}`);
        
        if (correct) retardsCorrects++;
      }
    }

    console.log(`\n   ${retardsCorrects}/3 retards calculés correctement\n`);

    if (retardsCorrects === 3) {
      console.log('   ✅ TOUS LES RETARDS CORRECTS\n');
    } else {
      console.log('   ⚠️  Certains retards incorrects\n');
    }

    // ======================================
    // RÉSUMÉ FINAL
    // ======================================
    console.log('='.repeat(80));
    console.log('📋 RÉSUMÉ FINAL\n');

    const tousTestsOK = heuresCalculees === 8.0 && 
                        totalHeures > 130 && 
                        totalHeures < 135 && 
                        retardsCorrects === 3;

    if (tousTestsOK) {
      console.log('✅ TOUS LES BUGS SONT CORRIGÉS\n');
      console.log('✓ Bug des accents : CORRIGÉ');
      console.log('✓ Bug timezone retards : CORRIGÉ');
      console.log('✓ Calculs globaux : CORRECTS');
      console.log('✓ Retards individuels : CORRECTS\n');
      console.log('🎉 Le système est opérationnel et les calculs sont fiables!\n');
    } else {
      console.log('⚠️  CERTAINS PROBLÈMES SUBSISTENT\n');
      if (heuresCalculees === 0) {
        console.log('❌ Bug des accents : TOUJOURS PRÉSENT');
      }
      if (totalHeures <= 130 || totalHeures >= 135) {
        console.log('⚠️  Calculs globaux : À VÉRIFIER');
      }
      if (retardsCorrects < 3) {
        console.log('⚠️  Calcul des retards : À VÉRIFIER');
      }
      console.log();
    }

    console.log('='.repeat(80));
    
    return tousTestsOK;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifierBugsCorrects();
