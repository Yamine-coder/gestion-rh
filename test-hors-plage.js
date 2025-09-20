// Test des nouveaux barèmes hors-plage
// Exécutez ce test pour vérifier les seuils

const testCases = [
  // Tests ARRIVÉE (shift prévu 18:00-22:00)
  { type: 'IN', prevu: '18:00', reel: '16:30', attendu: 'hors_plage_in', description: '90 min trop tôt' },
  { type: 'IN', prevu: '18:00', reel: '17:40', attendu: 'arrivee_acceptable', description: '20 min trop tôt (OK)' },
  { type: 'IN', prevu: '18:00', reel: '18:05', attendu: 'arrivee_acceptable', description: '5 min de retard (OK)' },
  { type: 'IN', prevu: '18:00', reel: '18:07', attendu: 'retard_modere', description: '7 min de retard (attention)' },
  { type: 'IN', prevu: '18:00', reel: '18:18', attendu: 'retard_modere', description: '18 min de retard' },
  { type: 'IN', prevu: '18:00', reel: '18:25', attendu: 'retard_critique', description: '25 min de retard' },

  // Tests DÉPART (shift prévu 18:00-22:00)
  { type: 'OUT', prevu: '22:00', reel: '21:00', attendu: 'depart_premature_critique', description: '60 min trop tôt' },
  { type: 'OUT', prevu: '22:00', reel: '21:50', attendu: 'depart_acceptable', description: '10 min trop tôt (OK)' },
  { type: 'OUT', prevu: '22:00', reel: '22:40', attendu: 'depart_acceptable', description: '40 min d\'heures sup (OK)' },
  { type: 'OUT', prevu: '22:00', reel: '23:20', attendu: 'heures_supplementaires', description: '80 min d\'heures sup' },
  { type: 'OUT', prevu: '22:00', reel: '00:10', attendu: 'hors_plage_out', description: '130 min d\'heures sup' },
];

// Fonction pour calculer l'écart (même logique que le backend avec gestion du passage à minuit)
function calculerEcartHoraire(heurePrevu, heureReelle) {
  const [hPrevu, mPrevu] = heurePrevu.split(':').map(Number);
  const minutesPrevu = hPrevu * 60 + mPrevu;
  
  const [hReel, mReel] = heureReelle.split(':').map(Number);
  let minutesReel = hReel * 60 + mReel;
  
  // 🔧 GESTION DU PASSAGE À MINUIT
  // Si l'heure réelle est très petite (ex: 00:10 = 10 min) et l'heure prévue est tardive (ex: 22:00 = 1320 min),
  // cela signifie que l'heure réelle est le lendemain
  if (minutesReel < 240 && minutesPrevu > 1200) { // Si réel < 4h et prévu > 20h
    minutesReel += 24 * 60; // Ajouter 24h à l'heure réelle
  }
  
  return minutesPrevu - minutesReel; // positif = anticipé, négatif = retard
}

// Fonction pour déterminer le type (même logique que le backend)
function determinerType(ecart, typePointage) {
  if (typePointage === 'IN') {
    if (ecart > 30) return 'hors_plage_in';
    if (ecart >= -5) return 'arrivee_acceptable';
    if (ecart >= -20) return 'retard_modere';
    return 'retard_critique';
  } else { // OUT
    if (ecart > 30) return 'depart_premature_critique';
    if (ecart > 15) return 'depart_anticipe';
    if (ecart >= -45) return 'depart_acceptable';
    if (ecart >= -90) return 'heures_supplementaires';
    return 'hors_plage_out';
  }
}

console.log('🧪 TEST DES NOUVEAUX BARÈMES HORS-PLAGE\n');

let totalTests = 0;
let testsRéussis = 0;

testCases.forEach(test => {
  const ecart = calculerEcartHoraire(test.prevu, test.reel);
  const typeCalcule = determinerType(ecart, test.type);
  const succès = typeCalcule === test.attendu;
  
  totalTests++;
  if (succès) testsRéussis++;
  
  console.log(`${succès ? '✅' : '❌'} ${test.type} ${test.prevu}→${test.reel}: ${test.description}`);
  console.log(`   Écart: ${ecart} min | Attendu: ${test.attendu} | Calculé: ${typeCalcule}`);
  if (!succès) {
    console.log(`   ⚠️  ÉCHEC: Attendu "${test.attendu}" mais obtenu "${typeCalcule}"`);
  }
  console.log('');
});

console.log(`\n📊 RÉSULTATS: ${testsRéussis}/${totalTests} tests réussis`);
console.log(`${testsRéussis === totalTests ? '🎉 TOUS LES TESTS PASSENT!' : '⚠️ Certains tests échouent'}`);

console.log('\n🎯 BARÈME APPLIQUÉ:');
console.log('ARRIVÉE (IN):');
console.log('  🟣 < -30 min → Hors-plage IN');
console.log('  🟢 -30 → +5 min → Acceptable');
console.log('  🟡 +5 → +20 min → Retard modéré');
console.log('  🔴 > +20 min → Retard critique');
console.log('');
console.log('DÉPART (OUT):');
console.log('  🔴 > +30 min → Départ prématuré critique');
console.log('  🟡 +15 → +30 min → Départ anticipé');
console.log('  🟢 -15 → +15 min → Acceptable');
console.log('  🟡 -45 → -15 min → Heures sup');
console.log('  🟣 < -90 min → Hors-plage OUT');
