// Configuration des vraies données d'employés
// REMPLIR CE FICHIER AVEC LES VRAIES INFORMATIONS DEMAIN

const VRAIES_DONNEES_EMPLOYES = [
  // ==========================================
  // MODÈLE D'EMPLOYÉ - DUPLIQUER ET MODIFIER
  // ==========================================
  {
    email: "prenom.nom@votreentreprise.com",
    nom: "NOM_FAMILLE",
    prenom: "Prénom",
    telephone: "01.23.45.67.89", // Format français
    categorie: "Cuisine", // Options: "Cuisine", "Service", "Management", "Entretien"
    role: "employee", // Garder "employee" sauf pour les managers
    dateEmbauche: new Date('2024-01-15'), // Format: YYYY-MM-DD
    // Informations optionnelles:
    // statut: "actif", // "actif" ou "inactif"
    // notes: "Informations supplémentaires"
  },
  
  // ==========================================
  // EMPLOYÉS À REMPLIR DEMAIN
  // ==========================================
  
  // ÉQUIPE CUISINE
  {
    email: "", // À remplir
    nom: "",
    prenom: "",
    telephone: "",
    categorie: "Cuisine",
    role: "employee",
    dateEmbauche: new Date('2024-01-01')
  },
  
  // ÉQUIPE SERVICE  
  {
    email: "", // À remplir
    nom: "",
    prenom: "",
    telephone: "",
    categorie: "Service", 
    role: "employee",
    dateEmbauche: new Date('2024-01-01')
  },
  
  // MANAGEMENT
  {
    email: "", // À remplir
    nom: "",
    prenom: "",
    telephone: "",
    categorie: "Management",
    role: "employee", // Ou "admin" si accès admin souhaité
    dateEmbauche: new Date('2024-01-01')
  }
  
  // AJOUTER AUTANT D'EMPLOYÉS QUE NÉCESSAIRE
];

// ==========================================
// CONFIGURATION DES HORAIRES PAR CATÉGORIE
// ==========================================

const HORAIRES_PAR_CATEGORIE = {
  "Cuisine": {
    "lundi": [{ start: "06:00", end: "14:00" }],
    "mardi": [{ start: "06:00", end: "14:00" }],
    "mercredi": [{ start: "06:00", end: "14:00" }],
    "jeudi": [{ start: "06:00", end: "14:00" }],
    "vendredi": [{ start: "06:00", end: "14:00" }],
    "samedi": [{ start: "06:00", end: "14:00" }],
    "dimanche": [] // Jour de repos
  },
  
  "Service": {
    "lundi": [{ start: "08:00", end: "16:00" }, { start: "18:00", end: "23:00" }],
    "mardi": [{ start: "08:00", end: "16:00" }, { start: "18:00", end: "23:00" }],
    "mercredi": [{ start: "08:00", end: "16:00" }, { start: "18:00", end: "23:00" }],
    "jeudi": [{ start: "08:00", end: "16:00" }, { start: "18:00", end: "23:00" }],
    "vendredi": [{ start: "08:00", end: "16:00" }, { start: "18:00", end: "23:00" }],
    "samedi": [{ start: "10:00", end: "22:00" }],
    "dimanche": [] // Jour de repos
  },
  
  "Management": {
    "lundi": [{ start: "09:00", end: "17:00" }],
    "mardi": [{ start: "09:00", end: "17:00" }],
    "mercredi": [{ start: "09:00", end: "17:00" }],
    "jeudi": [{ start: "09:00", end: "17:00" }],
    "vendredi": [{ start: "09:00", end: "17:00" }],
    "samedi": [],
    "dimanche": []
  },
  
  "Entretien": {
    "lundi": [{ start: "05:00", end: "13:00" }],
    "mardi": [{ start: "05:00", end: "13:00" }],
    "mercredi": [{ start: "05:00", end: "13:00" }],
    "jeudi": [{ start: "05:00", end: "13:00" }],
    "vendredi": [{ start: "05:00", end: "13:00" }],
    "samedi": [{ start: "06:00", end: "10:00" }],
    "dimanche": []
  }
};

// ==========================================
// CONFIGURATION DES TAUX HORAIRES
// ==========================================

const TAUX_HORAIRES = {
  "Cuisine": 12.50,
  "Service": 11.80,
  "Management": 16.00,
  "Entretien": 11.50
};

// ==========================================
// INFORMATIONS DE L'ENTREPRISE
// ==========================================

const INFO_ENTREPRISE = {
  nom: "VOTRE ENTREPRISE", // À modifier
  adresse: "123 Rue de la Restauration, 75001 Paris", // À modifier
  email: "contact@votreentreprise.com", // À modifier
  telephone: "01.23.45.67.89", // À modifier
  siret: "12345678901234", // À modifier
  
  // Paramètres de l'application
  heuresOuverture: {
    "lundi": { ouverture: "06:00", fermeture: "23:00" },
    "mardi": { ouverture: "06:00", fermeture: "23:00" },
    "mercredi": { ouverture: "06:00", fermeture: "23:00" },
    "jeudi": { ouverture: "06:00", fermeture: "23:00" },
    "vendredi": { ouverture: "06:00", fermeture: "24:00" },
    "samedi": { ouverture: "08:00", fermeture: "24:00" },
    "dimanche": { ouverture: "10:00", fermeture: "22:00" }
  }
};

// ==========================================
// VALIDATION DES DONNÉES
// ==========================================

function validerDonnees() {
  const erreurs = [];
  
  VRAIES_DONNEES_EMPLOYES.forEach((employe, index) => {
    if (!employe.email || employe.email === "") {
      erreurs.push(`Employé ${index + 1}: Email manquant`);
    }
    
    if (!employe.nom || employe.nom === "") {
      erreurs.push(`Employé ${index + 1}: Nom manquant`);
    }
    
    if (!employe.prenom || employe.prenom === "") {
      erreurs.push(`Employé ${index + 1}: Prénom manquant`);
    }
    
    if (!["Cuisine", "Service", "Management", "Entretien"].includes(employe.categorie)) {
      erreurs.push(`Employé ${index + 1}: Catégorie invalide`);
    }
    
    // Vérifier le format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employe.email && !emailRegex.test(employe.email)) {
      erreurs.push(`Employé ${index + 1}: Format email invalide`);
    }
  });
  
  return erreurs;
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  VRAIES_DONNEES_EMPLOYES,
  HORAIRES_PAR_CATEGORIE,
  TAUX_HORAIRES,
  INFO_ENTREPRISE,
  validerDonnees
};

// ==========================================
// INSTRUCTIONS D'UTILISATION
// ==========================================

console.log(`
📋 INSTRUCTIONS POUR DEMAIN:
=============================

1. 📝 REMPLIR LES DONNÉES:
   - Modifier VRAIES_DONNEES_EMPLOYES avec les vrais employés
   - Vérifier les horaires dans HORAIRES_PAR_CATEGORIE
   - Ajuster les taux horaires dans TAUX_HORAIRES
   - Compléter INFO_ENTREPRISE

2. 🔍 VALIDER:
   - Exécuter: node config-vraies-donnees.js
   - Corriger les erreurs affichées

3. 🚀 MIGRER:
   - Exécuter: node scripts/migration-vraies-donnees.js
   - Suivre les instructions affichées

4. ✅ TESTER:
   - Vérifier la connexion admin
   - Tester avec 1-2 employés
   - Vérifier les plannings générés

5. 📧 COMMUNIQUER:
   - Envoyer les codes d'accès aux employés
   - Former les utilisateurs si nécessaire

⚠️  IMPORTANT:
- Faire une sauvegarde avant migration
- Tester sur un environnement de développement d'abord
- Garder les mots de passe temporaires en sécurité
`);

// Pour tester la validation, décommentez:
// const erreurs = validerDonnees();
// if (erreurs.length > 0) {
//   console.log("❌ ERREURS TROUVÉES:");
//   erreurs.forEach(erreur => console.log("  -", erreur));
// } else {
//   console.log("✅ Configuration valide!");
// }
