// CONFIGURATION DES VRAIES DONNÉES EMPLOYÉS
// ==========================================
// REMPLIR CE FICHIER AVEC LES VRAIES INFORMATIONS DEMAIN

const VRAIES_DONNEES_EMPLOYES = [
  // EXEMPLE - REMPLACER PAR VOS VRAIS EMPLOYÉS
  {
    nom: "Martin",
    prenom: "Sophie",
    email: "sophie.martin@votreentreprise.com",
    telephone: "0145678901",
    dateNaissance: "1990-06-15",
    dateEmbauche: "2023-01-15",
    poste: "Responsable Comptabilité",
    departement: "Finance",
    role: "employee", // "admin", "employee", ou "manager"
    categorieHoraire: "bureau", // doit correspondre aux catégories ci-dessous
    salaire: 2800,
    statutMarital: "celibataire",
    adresse: "123 Rue de la Paix, 75001 Paris",
    situationFamiliale: "0 enfant",
    personneUrgence: {
      nom: "Martin Pierre",
      telephone: "0145678902",
      relation: "conjoint"
    }
  },
  
  // AJOUTEZ ICI TOUS VOS AUTRES EMPLOYÉS
  {
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@votreentreprise.com",
    telephone: "0145678903",
    dateNaissance: "1985-03-22",
    dateEmbauche: "2022-09-01",
    poste: "Directeur",
    departement: "Direction",
    role: "admin", // CELUI-CI SERA ADMIN
    categorieHoraire: "direction",
    salaire: 4500,
    statutMarital: "marie",
    adresse: "456 Avenue des Champs, 75008 Paris",
    situationFamiliale: "2 enfants",
    personneUrgence: {
      nom: "Dupont Marie",
      telephone: "0145678904",
      relation: "epouse"
    }
  }
  
  // CONTINUEZ À AJOUTER VOS EMPLOYÉS ICI...
];

// HORAIRES DE TRAVAIL PAR CATÉGORIE D'EMPLOYÉ
const HORAIRES_PAR_CATEGORIE = {
  "bureau": {
    debut: "09:00",
    fin: "17:30",
    pauseDebut: "12:00",
    pauseFin: "13:00",
    joursOuverture: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"]
  },
  
  "direction": {
    debut: "08:30",
    fin: "18:00",
    pauseDebut: "12:30",
    pauseFin: "13:30",
    joursOuverture: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"]
  },
  
  "production": {
    debut: "08:00",
    fin: "16:00",
    pauseDebut: "12:00",
    pauseFin: "12:30",
    joursOuverture: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  }
  
  // AJOUTEZ D'AUTRES CATÉGORIES SI NÉCESSAIRE
};

// TAUX HORAIRES PAR CATÉGORIE
const TAUX_HORAIRES = {
  "bureau": {
    normal: 15.50,
    majore: 23.25 // Heures supplémentaires à +50%
  },
  
  "direction": {
    normal: 25.00,
    majore: 37.50
  },
  
  "production": {
    normal: 12.50,
    majore: 18.75
  }
  
  // AJUSTEZ SELON VOS TAUX RÉELS
};

// INFORMATIONS DE L'ENTREPRISE
const INFO_ENTREPRISE = {
  nom: "VOTRE ENTREPRISE", // REMPLACER PAR LE VRAI NOM
  adresse: "123 Rue de Votre Entreprise, 75001 Paris", // VRAIE ADRESSE
  telephone: "01 23 45 67 89", // VRAI NUMÉRO
  email: "contact@votreentreprise.com", // VRAI EMAIL
  siret: "12345678901234", // VRAI SIRET
  codeAPE: "6201Z" // VRAI CODE APE
};

// PARAMÈTRES RH
const PARAMETRES_RH = {
  congesAnnuels: 25, // Jours de congés par an
  heuresSupSeuil: 35, // Seuil heures sup par semaine
  tauxMajorationHS: 0.25, // +25% pour heures sup
  joursFeriesPayes: true,
  periodeEssai: {
    employe: 60, // 60 jours pour employé
    cadre: 90 // 90 jours pour cadre
  }
};

module.exports = {
  VRAIES_DONNEES_EMPLOYES,
  HORAIRES_PAR_CATEGORIE,
  TAUX_HORAIRES,
  INFO_ENTREPRISE,
  PARAMETRES_RH
};
