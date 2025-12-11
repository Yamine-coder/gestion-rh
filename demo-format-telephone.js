/**
 * DÉMONSTRATION VISUELLE DU FORMATAGE TÉLÉPHONE
 */

const formatTelephone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  const truncated = cleaned.substring(0, 10);
  
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

console.log('\n📱 DÉMONSTRATION FORMATAGE TÉLÉPHONE EN TEMPS RÉEL\n');
console.log('═'.repeat(60));

const examples = [
  { input: '0', desc: 'Début de saisie' },
  { input: '06', desc: 'Indicatif mobile' },
  { input: '0612', desc: '4 chiffres' },
  { input: '061234', desc: '6 chiffres' },
  { input: '06123456', desc: '8 chiffres' },
  { input: '0612345678', desc: 'Numéro complet ✅' }
];

console.log('\n🎬 SIMULATION DE FRAPPE AU CLAVIER:\n');

examples.forEach((e, index) => {
  const result = formatTelephone(e.input);
  const chiffres = e.input.replace(/\D/g, '').length;
  const progress = '█'.repeat(chiffres) + '░'.repeat(10 - chiffres);
  const status = chiffres === 10 ? '✅' : '⚠️';
  
  console.log(`${status} Étape ${index + 1}: ${e.desc}`);
  console.log(`   Tape:      "${e.input}"`);
  console.log(`   Affiché:   "${result}"`);
  console.log(`   Progrès:   [${progress}] ${chiffres}/10 chiffres`);
  console.log('');
});

console.log('═'.repeat(60));
console.log('\n🔄 NETTOYAGE AUTOMATIQUE DES FORMATS:\n');

const cleanExamples = [
  { input: '06.12.34.56.78', desc: 'Format avec points' },
  { input: '06-12-34-56-78', desc: 'Format avec tirets' },
  { input: '06/12/34/56/78', desc: 'Format avec slashes' },
  { input: '06 12 34 56 78', desc: 'Déjà bien formaté' },
  { input: 'Tel: 0612345678', desc: 'Avec texte et lettres' },
];

cleanExamples.forEach((e) => {
  const result = formatTelephone(e.input);
  console.log(`📞 ${e.desc}`);
  console.log(`   Avant:  "${e.input}"`);
  console.log(`   Après:  "${result}"`);
  console.log('');
});

console.log('═'.repeat(60));
console.log('\n💡 AVANTAGES:\n');

const advantages = [
  '✅ Format uniforme dans toute la base de données',
  '✅ Pas besoin de penser au formatage pour l\'utilisateur',
  '✅ Validation visuelle en temps réel',
  '✅ Nettoyage automatique des caractères invalides',
  '✅ Limitation intelligente à 10 chiffres',
  '✅ Copier-coller fonctionne quel que soit le format source'
];

advantages.forEach(adv => console.log(`   ${adv}`));

console.log('\n' + '═'.repeat(60) + '\n');
