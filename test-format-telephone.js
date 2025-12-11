/**
 * TEST DU FORMATAGE AUTOMATIQUE DU TÉLÉPHONE
 * ============================================
 * 
 * Ce script teste la fonction de formatage du téléphone
 * Format attendu: 06 12 34 56 78
 */

// Fonction de formatage (copie de celle du frontend)
const formatTelephone = (value) => {
  // Supprimer tout sauf les chiffres
  const cleaned = value.replace(/\D/g, '');
  
  // Limiter à 10 chiffres maximum
  const truncated = cleaned.substring(0, 10);
  
  // Format automatique: 06 12 34 56 78
  if (truncated.length <= 2) {
    return truncated;
  } else if (truncated.length <= 4) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2)}`;
  } else if (truncated.length <= 6) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4)}`;
  } else if (truncated.length <= 8) {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6)}`;
  } else {
    return `${truncated.substring(0, 2)} ${truncated.substring(2, 4)} ${truncated.substring(4, 6)} ${truncated.substring(6, 8)} ${truncated.substring(8)}`;
  }
};

console.log('\n📞 TEST DU FORMATAGE AUTOMATIQUE DU TÉLÉPHONE\n');
console.log('═'.repeat(60));

// Cas de test
const testCases = [
  { input: '0612345678', expected: '06 12 34 56 78', description: 'Format brut 10 chiffres' },
  { input: '06 12 34 56 78', expected: '06 12 34 56 78', description: 'Déjà formaté' },
  { input: '06.12.34.56.78', expected: '06 12 34 56 78', description: 'Avec points' },
  { input: '06-12-34-56-78', expected: '06 12 34 56 78', description: 'Avec tirets' },
  { input: '+33612345678', expected: '06 12 34 56 78', description: 'Avec préfixe +33 (nettoyé)' },
  { input: '06', expected: '06', description: 'Saisie partielle (2 chiffres)' },
  { input: '0612', expected: '06 12', description: 'Saisie partielle (4 chiffres)' },
  { input: '061234', expected: '06 12 34', description: 'Saisie partielle (6 chiffres)' },
  { input: '061234567890', expected: '06 12 34 56 78', description: 'Plus de 10 chiffres (tronqué)' },
  { input: 'abc0612345678xyz', expected: '06 12 34 56 78', description: 'Avec caractères invalides' },
  { input: '', expected: '', description: 'Chaîne vide' },
  { input: '07 89 12 34 56', expected: '07 89 12 34 56', description: 'Numéro mobile 07' },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = formatTelephone(test.input);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.description}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Output:   "${result}"`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.description}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    failed++;
  }
  console.log('');
});

console.log('═'.repeat(60));
console.log(`\n📊 RÉSULTATS:`);
console.log(`   ✅ Tests réussis: ${passed}/${testCases.length}`);
console.log(`   ❌ Tests échoués: ${failed}/${testCases.length}`);
console.log(`   📈 Taux de réussite: ${Math.round((passed / testCases.length) * 100)}%\n`);

if (failed === 0) {
  console.log('🎉 Tous les tests sont passés avec succès!\n');
} else {
  console.log('⚠️ Certains tests ont échoué. Veuillez vérifier la fonction.\n');
  process.exit(1);
}

// Test de validation
console.log('═'.repeat(60));
console.log('\n🔍 VALIDATION DE NUMÉROS\n');

const validationCases = [
  { number: '06 12 34 56 78', valid: true, reason: 'Complet (10 chiffres)' },
  { number: '06 12 34', valid: false, reason: 'Incomplet (6 chiffres)' },
  { number: '06 12 34 56 7', valid: false, reason: 'Incomplet (9 chiffres)' },
  { number: '', valid: false, reason: 'Vide' },
];

validationCases.forEach((test, index) => {
  const cleaned = test.number.replace(/\D/g, '');
  const isValid = cleaned.length === 10;
  const icon = isValid ? '✅' : '⚠️';
  
  console.log(`${icon} "${test.number}"`);
  console.log(`   Chiffres: ${cleaned.length}/10`);
  console.log(`   Status: ${test.reason}`);
  console.log('');
});

console.log('═'.repeat(60));
console.log('\n✨ Test terminé!\n');
