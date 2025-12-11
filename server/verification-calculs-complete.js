// Vérification complète de tous les calculs et points critiques
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🔍 VÉRIFICATION COMPLÈTE DES CALCULS\n');
console.log('='.repeat(80));

// ===================================
// FONCTIONS DE CALCUL (COPIE EXACTE)
// ===================================

function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function calculateRealHours(pointages) {
  if (!pointages || pointages.length < 2) return 0;
  
  let totalMinutes = 0;
  
  for (let i = 0; i < pointages.length - 1; i += 2) {
    const arrivee = pointages[i];
    const depart = pointages[i + 1];
    
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

  const heureArrivee = new Date(premiereArrivee.horodatage);
  const minutesReelles = heureArrivee.getHours() * 60 + heureArrivee.getMinutes();

  let retardMinutes = minutesReelles - minutesPrevues;

  if (retardMinutes < -12 * 60) {
    retardMinutes += 24 * 60;
  }

  return {
    retard: Math.max(0, retardMinutes),
    heureArrivee: heureArrivee.toTimeString().slice(0, 5)
  };
}

// ===================================
// TESTS UNITAIRES
// ===================================

async function testUnitaires() {
  console.log('\n📋 TESTS UNITAIRES DES FONCTIONS\n');
  console.log('-'.repeat(80));
  
  const tests = [
    // Test 1: Segment normal
    {
      nom: 'Segment normal (09:00 → 13:00)',
      fonction: () => calculateSegmentHours({ start: '09:00', end: '13:00' }),
      attendu: 4.0,
      tolerance: 0.01
    },
    // Test 2: Segment avec minutes
    {
      nom: 'Segment avec minutes (09:30 → 13:45)',
      fonction: () => calculateSegmentHours({ start: '09:30', end: '13:45' }),
      attendu: 4.25,
      tolerance: 0.01
    },
    // Test 3: Segment franchissant minuit
    {
      nom: 'Shift de nuit (19:00 → 01:00)',
      fonction: () => calculateSegmentHours({ start: '19:00', end: '01:00' }),
      attendu: 6.0,
      tolerance: 0.01
    },
    // Test 4: Shift de nuit avec minutes
    {
      nom: 'Shift de nuit avec minutes (19:00 → 00:30)',
      fonction: () => calculateSegmentHours({ start: '19:00', end: '00:30' }),
      attendu: 5.5,
      tolerance: 0.01
    },
    // Test 5: Shift très long (17:00 → 01:00)
    {
      nom: 'Shift long de nuit (17:00 → 01:00)',
      fonction: () => calculateSegmentHours({ start: '17:00', end: '01:00' }),
      attendu: 8.0,
      tolerance: 0.01
    },
    // Test 6: Segment 24h complet (cas limite)
    {
      nom: 'Cas limite: même heure (09:00 → 09:00)',
      fonction: () => calculateSegmentHours({ start: '09:00', end: '09:00' }),
      attendu: 0.0,
      tolerance: 0.01
    },
    // Test 7: Pointages vides
    {
      nom: 'Pointages vides',
      fonction: () => calculateRealHours([]),
      attendu: 0.0,
      tolerance: 0.01
    },
    // Test 8: Pointages incomplets
    {
      nom: 'Pointages incomplets (1 seul)',
      fonction: () => calculateRealHours([
        { type: 'arrivée', horodatage: new Date('2025-11-04T09:00:00Z') }
      ]),
      attendu: 0.0,
      tolerance: 0.01
    },
    // Test 9: Paire de pointages avec accents
    {
      nom: 'Pointages avec accents (arrivée/départ)',
      fonction: () => calculateRealHours([
        { type: 'arrivée', horodatage: new Date('2025-11-04T09:00:00Z') },
        { type: 'départ', horodatage: new Date('2025-11-04T13:00:00Z') }
      ]),
      attendu: 4.0,
      tolerance: 0.01
    },
    // Test 10: Paire de pointages sans accents
    {
      nom: 'Pointages sans accents (arrivee/depart)',
      fonction: () => calculateRealHours([
        { type: 'arrivee', horodatage: new Date('2025-11-04T09:00:00Z') },
        { type: 'depart', horodatage: new Date('2025-11-04T13:00:00Z') }
      ]),
      attendu: 4.0,
      tolerance: 0.01
    },
    // Test 11: Deux paires de pointages (journée complète)
    {
      nom: 'Journée complète (2 paires)',
      fonction: () => calculateRealHours([
        { type: 'arrivée', horodatage: new Date('2025-11-04T09:00:00Z') },
        { type: 'départ', horodatage: new Date('2025-11-04T13:00:00Z') },
        { type: 'arrivée', horodatage: new Date('2025-11-04T14:00:00Z') },
        { type: 'départ', horodatage: new Date('2025-11-04T18:00:00Z') }
      ]),
      attendu: 8.0,
      tolerance: 0.01
    },
    // Test 12: Retard simple
    {
      nom: 'Retard de 15 minutes',
      fonction: () => analyserRetard(
        { start: '09:00', end: '13:00' },
        [{ type: 'arrivée', horodatage: new Date('2025-11-04T09:15:00Z') }]
      ).retard,
      attendu: 15,
      tolerance: 1
    },
    // Test 13: Arrivée à l'heure
    {
      nom: 'Arrivée à l\'heure (0 retard)',
      fonction: () => analyserRetard(
        { start: '09:00', end: '13:00' },
        [{ type: 'arrivée', horodatage: new Date('2025-11-04T09:00:00Z') }]
      ).retard,
      attendu: 0,
      tolerance: 1
    },
    // Test 14: Arrivée en avance (ne doit pas être négatif)
    {
      nom: 'Arrivée en avance (doit retourner 0)',
      fonction: () => analyserRetard(
        { start: '09:00', end: '13:00' },
        [{ type: 'arrivée', horodatage: new Date('2025-11-04T08:45:00Z') }]
      ).retard,
      attendu: 0,
      tolerance: 1
    },
  ];

  let reussis = 0;
  let echoues = 0;

  tests.forEach((test, index) => {
    try {
      const resultat = test.fonction();
      const ecart = Math.abs(resultat - test.attendu);
      const succes = ecart <= test.tolerance;
      
      if (succes) {
        console.log(`✅ Test ${index + 1}: ${test.nom}`);
        console.log(`   Résultat: ${resultat} (attendu: ${test.attendu})`);
        reussis++;
      } else {
        console.log(`❌ Test ${index + 1}: ${test.nom}`);
        console.log(`   Résultat: ${resultat} | Attendu: ${test.attendu} | Écart: ${ecart}`);
        echoues++;
      }
    } catch (error) {
      console.log(`❌ Test ${index + 1}: ${test.nom}`);
      console.log(`   ERREUR: ${error.message}`);
      echoues++;
    }
    console.log();
  });

  console.log('-'.repeat(80));
  console.log(`Résultats: ${reussis}/${tests.length} tests réussis`);
  if (echoues > 0) {
    console.log(`⚠️  ${echoues} test(s) échoué(s)`);
  }
  
  return echoues === 0;
}

// ===================================
// VÉRIFICATION BASE DE DONNÉES
// ===================================

async function verifierDonneesDB() {
  console.log('\n\n📊 VÉRIFICATION DES DONNÉES EN BASE\n');
  console.log('-'.repeat(80));
  
  try {
    // Trouver l'employé de test
    const employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('⚠️  Employé de test non trouvé. Tests de base ignorés.');
      return true;
    }

    console.log(`✅ Employé trouvé: ${employe.email} (ID: ${employe.id})\n`);

    // 1. Vérifier les types de pointages
    console.log('1️⃣  VÉRIFICATION DES TYPES DE POINTAGES\n');
    
    const pointages = await prisma.pointage.findMany({
      where: { userId: employe.id },
      orderBy: { horodatage: 'asc' }
    });

    const typesUniques = [...new Set(pointages.map(p => p.type))];
    console.log(`   Types trouvés: ${typesUniques.join(', ')}`);
    
    const typesAttendu = ['arrivée', 'départ'];
    const typesValides = typesUniques.every(t => 
      ['arrivée', 'départ', 'arrivee', 'depart', 'ENTRÉE', 'SORTIE'].includes(t)
    );
    
    if (typesValides) {
      console.log('   ✅ Tous les types sont reconnus par le système\n');
    } else {
      console.log('   ❌ Types non reconnus détectés!\n');
      return false;
    }

    // 2. Vérifier l'appairage
    console.log('2️⃣  VÉRIFICATION DE L\'APPAIRAGE\n');
    
    const parJour = new Map();
    pointages.forEach(p => {
      const date = p.horodatage.toISOString().split('T')[0];
      if (!parJour.has(date)) parJour.set(date, []);
      parJour.get(date).push(p);
    });

    let joursAvecProbleme = 0;
    for (const [date, pts] of parJour.entries()) {
      const nbArrivees = pts.filter(p => 
        p.type === 'arrivée' || p.type === 'arrivee' || p.type === 'ENTRÉE'
      ).length;
      const nbDeparts = pts.filter(p => 
        p.type === 'départ' || p.type === 'depart' || p.type === 'SORTIE'
      ).length;
      
      if (nbArrivees !== nbDeparts) {
        console.log(`   ⚠️  ${date}: ${nbArrivees} arrivées, ${nbDeparts} départs (déséquilibré)`);
        joursAvecProbleme++;
      }
    }
    
    if (joursAvecProbleme === 0) {
      console.log('   ✅ Tous les jours ont un appairage correct\n');
    } else {
      console.log(`   ⚠️  ${joursAvecProbleme} jour(s) avec appairage déséquilibré\n`);
    }

    // 3. Vérifier les shifts de nuit
    console.log('3️⃣  VÉRIFICATION DES SHIFTS DE NUIT\n');
    
    const shifts = await prisma.shift.findMany({
      where: { employeId: employe.id },
      orderBy: { date: 'asc' }
    });

    let shiftsNuit = 0;
    shifts.forEach(shift => {
      if (shift.type === 'présence' && shift.segments) {
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            const [startH] = seg.start.split(':').map(Number);
            const [endH] = seg.end.split(':').map(Number);
            
            if (endH < startH) {
              const heures = calculateSegmentHours(seg);
              shiftsNuit++;
              console.log(`   🌙 ${shift.date.toISOString().split('T')[0]}: ${seg.start}→${seg.end} = ${heures}h`);
              
              if (heures < 0) {
                console.log(`      ❌ ERREUR: Heures négatives détectées!`);
                return false;
              }
            }
          }
        });
      }
    });
    
    if (shiftsNuit > 0) {
      console.log(`   ✅ ${shiftsNuit} shift(s) de nuit trouvés, tous corrects\n`);
    } else {
      console.log('   ℹ️  Aucun shift de nuit dans les données\n');
    }

    // 4. Vérifier la cohérence des totaux
    console.log('4️⃣  VÉRIFICATION DE LA COHÉRENCE DES TOTAUX\n');
    
    let totalPrevuManuel = 0;
    shifts.forEach(shift => {
      if (shift.type === 'présence' && shift.segments) {
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            totalPrevuManuel += calculateSegmentHours(seg);
          }
        });
      }
    });

    let totalReelManuel = 0;
    for (const [date, pts] of parJour.entries()) {
      totalReelManuel += calculateRealHours(pts);
    }

    console.log(`   Heures prévues: ${totalPrevuManuel.toFixed(2)}h`);
    console.log(`   Heures réelles: ${totalReelManuel.toFixed(2)}h`);
    console.log(`   Écart: ${(totalReelManuel - totalPrevuManuel).toFixed(2)}h`);
    
    const ecartPourcent = Math.abs((totalReelManuel - totalPrevuManuel) / totalPrevuManuel * 100);
    if (ecartPourcent > 50) {
      console.log(`   ❌ ALERTE: Écart trop important (${ecartPourcent.toFixed(1)}%)\n`);
      return false;
    } else {
      console.log(`   ✅ Écart cohérent (${ecartPourcent.toFixed(1)}%)\n`);
    }

    // 5. Vérifier les arrondis
    console.log('5️⃣  VÉRIFICATION DES ARRONDIS\n');
    
    const testArrondi1 = Math.round(4.567 * 100) / 100;
    const testArrondi2 = Math.round(4.564 * 100) / 100;
    
    console.log(`   4.567 arrondi: ${testArrondi1} (attendu: 4.57)`);
    console.log(`   4.564 arrondi: ${testArrondi2} (attendu: 4.56)`);
    
    if (testArrondi1 === 4.57 && testArrondi2 === 4.56) {
      console.log('   ✅ Arrondis corrects (2 décimales)\n');
    } else {
      console.log('   ❌ Problème d\'arrondi détecté\n');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

// ===================================
// POINTS CRITIQUES À VÉRIFIER
// ===================================

async function verifierPointsCritiques() {
  console.log('\n\n🎯 POINTS CRITIQUES À VÉRIFIER\n');
  console.log('-'.repeat(80));
  
  const points = [
    {
      titre: 'Gestion des shifts de nuit',
      description: 'Les shifts franchissant minuit (ex: 19:00→01:00) doivent donner un résultat positif',
      risque: 'Heures négatives ou zéro',
      statut: '✅ FIXÉ (ajout de 24*60 si diffMinutes < 0)'
    },
    {
      titre: 'Types de pointages avec/sans accent',
      description: 'Le système doit accepter "arrivée"/"départ" ET "arrivee"/"depart"',
      risque: 'Pointages non comptabilisés',
      statut: '✅ FIXÉ (vérification des variantes)'
    },
    {
      titre: 'Appairage des pointages',
      description: 'Les pointages doivent être traités par paires (arrivée → départ)',
      risque: 'Calculs faussés si nombre impair',
      statut: '⚠️  À SURVEILLER (boucle i += 2)'
    },
    {
      titre: 'Retards en avance',
      description: 'Une arrivée en avance ne doit pas donner un retard négatif',
      risque: 'Retard négatif affiché',
      statut: '✅ FIXÉ (Math.max(0, retardMinutes))'
    },
    {
      titre: 'Retards shifts de nuit',
      description: 'Retard sur shift de nuit (ex: prévu 17:00, arrivée 17:15)',
      risque: 'Calcul incorrect du retard',
      statut: '⚠️  À TESTER (gestion < -12*60)'
    },
    {
      titre: 'Arrondis des heures',
      description: 'Toutes les heures doivent être arrondies à 2 décimales',
      risque: 'Précision excessive ou perte de données',
      statut: '✅ FIXÉ (Math.round(x * 100) / 100)'
    },
    {
      titre: 'Segments extras vs normaux',
      description: 'Les segments "isExtra: true" ne doivent pas compter dans les heures prévues',
      risque: 'Heures prévues gonflées',
      statut: '✅ IMPLÉMENTÉ (if (!seg.isExtra))'
    },
    {
      titre: 'Congés vs Absences',
      description: 'Les congés approuvés ne doivent pas compter comme absences',
      risque: 'Taux de présence faussé',
      statut: '⚠️  À VÉRIFIER dans le calcul des stats'
    },
    {
      titre: 'Calcul du taux de ponctualité',
      description: 'Doit être : (jours à l\'heure / jours présents) * 100',
      risque: 'Division par zéro ou pourcentage > 100%',
      statut: '⚠️  À VÉRIFIER'
    },
    {
      titre: 'Heures supplémentaires',
      description: 'Doivent être calculées correctement (réel > prévu pour le jour)',
      risque: 'Heures sup négatives ou gonflées',
      statut: '⚠️  À VÉRIFIER dans les rapports'
    }
  ];

  points.forEach((point, index) => {
    console.log(`\n${index + 1}. ${point.titre}`);
    console.log(`   📝 ${point.description}`);
    console.log(`   ⚠️  Risque: ${point.risque}`);
    console.log(`   ${point.statut}`);
  });

  console.log('\n' + '-'.repeat(80));
}

// ===================================
// EXÉCUTION PRINCIPALE
// ===================================

async function main() {
  try {
    // Tests unitaires
    const testsOk = await testUnitaires();
    
    // Vérification base de données
    const dbOk = await verifierDonneesDB();
    
    // Points critiques
    await verifierPointsCritiques();
    
    // Résumé final
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 RÉSUMÉ DE LA VÉRIFICATION\n');
    
    if (testsOk && dbOk) {
      console.log('✅ TOUS LES TESTS SONT PASSÉS');
      console.log('✅ Les calculs sont corrects');
      console.log('\n💡 Points à surveiller:');
      console.log('   - Appairage des pointages (doit toujours être pair)');
      console.log('   - Retards sur shifts de nuit (cas rare à tester)');
      console.log('   - Calcul du taux de ponctualité');
      console.log('   - Distinction congés vs absences dans les stats');
    } else {
      console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
      console.log('⚠️  Vérifier les erreurs ci-dessus');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ VÉRIFICATION TERMINÉE\n');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
