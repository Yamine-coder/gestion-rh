/**
 * VÉRIFICATION RAPIDE DE LA CONFIGURATION EMAIL
 */

require('dotenv').config();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  📧 VÉRIFICATION CONFIGURATION EMAIL');
console.log('═══════════════════════════════════════════════════════════════\n');

let hasErrors = false;

// Vérifier EMAIL_USER
console.log('🔍 Vérification EMAIL_USER:');
if (!process.env.EMAIL_USER) {
  console.log('   ❌ EMAIL_USER non défini dans .env');
  hasErrors = true;
} else if (process.env.EMAIL_USER === 'votre-email@gmail.com') {
  console.log('   ❌ EMAIL_USER toujours à la valeur par défaut');
  console.log('   Valeur actuelle: votre-email@gmail.com');
  console.log('   ⚠️  Action requise: Remplacez par votre vrai email Gmail');
  hasErrors = true;
} else {
  console.log('   ✅ EMAIL_USER défini: ' + process.env.EMAIL_USER);
}

console.log('');

// Vérifier EMAIL_PASS
console.log('🔍 Vérification EMAIL_PASS:');
if (!process.env.EMAIL_PASS) {
  console.log('   ❌ EMAIL_PASS non défini dans .env');
  hasErrors = true;
} else if (process.env.EMAIL_PASS === 'votre-mot-de-passe-application') {
  console.log('   ❌ EMAIL_PASS toujours à la valeur par défaut');
  console.log('   ⚠️  Action requise: Remplacez par votre mot de passe d\'application Gmail');
  hasErrors = true;
} else if (process.env.EMAIL_PASS === 'test-mode-disabled') {
  console.log('   ⚠️  MODE TEST activé (emails non envoyés)');
  console.log('   Les employés seront créés mais sans envoi d\'email');
} else {
  console.log('   ✅ EMAIL_PASS défini (longueur: ' + process.env.EMAIL_PASS.length + ' caractères)');
  
  // Vérifier longueur typique d'un mot de passe d'application Gmail (16 caractères sans espaces ou 19 avec espaces)
  const length = process.env.EMAIL_PASS.replace(/\s/g, '').length;
  if (length !== 16) {
    console.log('   ⚠️  Longueur inhabituelle pour un mot de passe d\'application Gmail');
    console.log('   Attendu: 16 caractères (format: xxxx xxxx xxxx xxxx)');
    console.log('   Actuel: ' + length + ' caractères');
  }
}

console.log('');

// Résumé
console.log('═══════════════════════════════════════════════════════════════');
if (hasErrors) {
  console.log('  ❌ CONFIGURATION INCOMPLÈTE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📋 ÉTAPES À SUIVRE:\n');
  console.log('1. Ouvrez le fichier: server/.env');
  console.log('2. Modifiez les lignes suivantes:\n');
  console.log('   EMAIL_USER="votre.email@gmail.com"      # ← Votre email Gmail');
  console.log('   EMAIL_PASS="xxxx xxxx xxxx xxxx"        # ← Mot de passe d\'application\n');
  console.log('3. Pour obtenir un mot de passe d\'application Gmail:');
  console.log('   - Allez sur: https://myaccount.google.com/security');
  console.log('   - Activez la "Validation en deux étapes"');
  console.log('   - Créez un "Mot de passe d\'application"');
  console.log('   - Copiez-collez le mot de passe de 16 caractères\n');
  console.log('4. Consultez le guide complet: CONFIGURATION-EMAIL-GUIDE.md\n');
  console.log('5. Relancez ce script pour vérifier: node test-email-rapide.js\n');
  
  process.exit(1);
} else if (process.env.EMAIL_PASS === 'test-mode-disabled') {
  console.log('  ⚠️  MODE TEST ACTIVÉ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Les emails ne seront PAS envoyés.');
  console.log('Les mots de passe temporaires seront affichés dans la console.\n');
  console.log('Pour activer l\'envoi d\'emails:');
  console.log('1. Configurez EMAIL_USER et EMAIL_PASS dans server/.env');
  console.log('2. Consultez: CONFIGURATION-EMAIL-GUIDE.md\n');
} else {
  console.log('  ✅ CONFIGURATION OK');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('La configuration email semble correcte!\n');
  console.log('Prochaine étape: Tester l\'envoi réel d\'email');
  console.log('Commande: node test-email.js\n');
}
