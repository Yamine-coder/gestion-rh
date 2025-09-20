const crypto = require('crypto');

// Générateur de mots de passe lisibles pour fast-food
const genererMotDePasseListible = () => {
  const consonnes = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z'];
  const voyelles = ['a', 'e', 'i', 'o', 'u'];
  
  let motDePasse = '';
  
  // 3 syllabes consonne-voyelle
  for (let i = 0; i < 3; i++) {
    const consonne = consonnes[crypto.randomInt(consonnes.length)];
    const voyelle = voyelles[crypto.randomInt(voyelles.length)];
    motDePasse += consonne + voyelle;
  }
  
  // 4 chiffres à la fin
  for (let i = 0; i < 4; i++) {
    motDePasse += crypto.randomInt(10).toString();
  }
  
  return motDePasse;
};

// Générateur de code PIN court pour usage interne rapide (optionnel)
const genererCodePIN = () => {
  return crypto.randomInt(100000, 999999).toString(); // 6 chiffres
};

// Validation de politique de mot de passe
const validerMotDePasse = (motDePasse) => {
  if (!motDePasse || motDePasse.length < 8) {
    return { valide: false, erreur: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  
  if (motDePasse.length > 100) {
    return { valide: false, erreur: "Le mot de passe est trop long" };
  }
  
  // Pas de restrictions complexes pour un fast-food
  return { valide: true };
};

module.exports = {
  genererMotDePasseListible,
  genererCodePIN,
  validerMotDePasse
};
