const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'MesConges.jsx');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Corrections d'encodage
const replacements = [
  ['é©', 'é'],
  ['é¨', 'è'],
  ['é ', 'à'],
  ['éª', 'ê'],
  ['dé©', 'dé'],
  ['ré©', 'ré'],
  ['congé©', 'congé'],
  ['approuvé©', 'approuvé'],
  ['refusé©', 'refusé'],
  ['duré©e', 'durée'],
  ['validé©e', 'validée'],
  ['modifié©e', 'modifiée'],
  ['envoyé©e', 'envoyée'],
  ['annulé©e', 'annulée'],
  ['Approuvé©es', 'Approuvées'],
  ['Refusé©es', 'Refusées'],
  ['Congé©s', 'Congés']
];

replacements.forEach(([bad, good]) => {
  content = content.split(bad).join(good);
});

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Encodage UTF-8 corrigé avec succès !');
