const fs = require('fs');
const content = fs.readFileSync('c:/Users/mouss/Documents/Projets/gestion-rh/client/src/pages/HomeEmploye.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Recherche caractères suspects ===\n');

// Le caractère U+0090 et U+008F sont des caractères de contrôle
// Ils sont probablement dans les commentaires avec les bullets •

// Chercher les lignes avec des caractères de contrôle
lines.forEach((line, idx) => {
  // Caractères de contrôle (0x80-0x9F)
  if (/[\x80-\x9F]/.test(line)) {
    // Ignorer les commentaires avec bullets
    if (!line.includes('// •') && !line.includes('{/* •') && !line.includes('•••')) {
      console.log(`Control char L${idx + 1}: ${line.substring(0, 100)}`);
    }
  }
  
  // Guillemets typographiques
  if (line.includes('"') || line.includes('"')) {
    console.log(`Guillemet L${idx + 1}: ${line.trim().substring(0, 100)}`);
  }
  
  // Euro, cent, etc.
  if (line.includes('€') && !line.includes('// €')) {
    console.log(`Euro L${idx + 1}: ${line.trim().substring(0, 100)}`);
  }
});

// Remplacer les bullets avec caractères de contrôle par des versions propres
console.log('\n=== Nettoyage des commentaires ===');
let newContent = content;

// Les commentaires avec • ont souvent un caractère de contrôle caché
// Remplaçons tous les commentaires bullets par des versions propres
const bulletCommentPattern = /\/\/ [•\x80-\x9F]+/g;
const bulletBlockPattern = /\{\/\* [•\x80-\x9F]+/g;
const closingBulletPattern = /[•\x80-\x9F]+ \*\/\}/g;

newContent = newContent.replace(bulletCommentPattern, (match) => {
  const bulletCount = (match.match(/•/g) || []).length;
  return '// ' + '═'.repeat(bulletCount);
});

newContent = newContent.replace(bulletBlockPattern, (match) => {
  const bulletCount = (match.match(/•/g) || []).length;
  return '{/* ' + '═'.repeat(bulletCount);
});

newContent = newContent.replace(closingBulletPattern, (match) => {
  const bulletCount = (match.match(/•/g) || []).length;
  return '═'.repeat(bulletCount) + ' */}';
});

// Guillemets typographiques -> droits
newContent = newContent.replace(/"/g, '"');
newContent = newContent.replace(/"/g, '"');

// Supprimer les caractères de contrôle isolés
newContent = newContent.replace(/[\x80-\x9F]/g, '');

// Espaces insécables -> espaces normaux
newContent = newContent.replace(/\u00A0/g, ' ');

fs.writeFileSync('c:/Users/mouss/Documents/Projets/gestion-rh/client/src/pages/HomeEmploye.jsx', newContent, 'utf8');

console.log('Fichier nettoyé!');

// Vérification finale
const finalContent = fs.readFileSync('c:/Users/mouss/Documents/Projets/gestion-rh/client/src/pages/HomeEmploye.jsx', 'utf8');
const controlChars = (finalContent.match(/[\x80-\x9F]/g) || []).length;
console.log(`Caractères de contrôle restants: ${controlChars}`);
