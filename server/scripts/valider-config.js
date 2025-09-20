// Script de validation de la configuration
// Vérifier que config-vraies-donnees.js est correctement rempli

const { VRAIES_DONNEES_EMPLOYES, HORAIRES_PAR_CATEGORIE, TAUX_HORAIRES } = require('./config-vraies-donnees');

function validerConfiguration() {
  console.log('🔍 VALIDATION DE LA CONFIGURATION');
  console.log('===================================');
  
  let erreurs = [];
  let avertissements = [];
  
  // 1. Vérifier les employés
  if (!VRAIES_DONNEES_EMPLOYES || VRAIES_DONNEES_EMPLOYES.length === 0) {
    erreurs.push('❌ Aucun employé défini dans VRAIES_DONNEES_EMPLOYES');
  } else {
    console.log(`✅ ${VRAIES_DONNEES_EMPLOYES.length} employés définis`);
    
    VRAIES_DONNEES_EMPLOYES.forEach((employe, index) => {
      const prefix = `Employé #${index + 1}`;
      
      // Vérifications obligatoires
      if (!employe.nom || employe.nom.trim() === '') {
        erreurs.push(`❌ ${prefix}: nom manquant`);
      }
      if (!employe.prenom || employe.prenom.trim() === '') {
        erreurs.push(`❌ ${prefix}: prénom manquant`);
      }
      if (!employe.email || !employe.email.includes('@')) {
        erreurs.push(`❌ ${prefix}: email invalide (${employe.email})`);
      }
      if (!employe.telephone || employe.telephone.length < 8) {
        erreurs.push(`❌ ${prefix}: téléphone invalide (${employe.telephone})`);
      }
      if (!employe.poste || employe.poste.trim() === '') {
        erreurs.push(`❌ ${prefix}: poste manquant`);
      }
      if (!employe.departement || employe.departement.trim() === '') {
        erreurs.push(`❌ ${prefix}: département manquant`);
      }
      if (!employe.role || !['admin', 'employee', 'manager'].includes(employe.role)) {
        erreurs.push(`❌ ${prefix}: rôle invalide (${employe.role})`);
      }
      if (!employe.dateEmbauche) {
        erreurs.push(`❌ ${prefix}: date d'embauche manquante`);
      }
      
      // Vérifications de cohérence
      if (employe.dateEmbauche && new Date(employe.dateEmbauche) > new Date()) {
        avertissements.push(`⚠️  ${prefix}: date d'embauche dans le futur`);
      }
      if (employe.email && employe.email === 'exemple@entreprise.com') {
        avertissements.push(`⚠️  ${prefix}: email semble être un exemple`);
      }
      if (employe.telephone && employe.telephone === '0123456789') {
        avertissements.push(`⚠️  ${prefix}: téléphone semble être un exemple`);
      }
      
      // Vérifier unicité des emails
      const emailDuplique = VRAIES_DONNEES_EMPLOYES.find((autre, autreIndex) => 
        autreIndex !== index && autre.email === employe.email
      );
      if (emailDuplique) {
        erreurs.push(`❌ Email dupliqué: ${employe.email}`);
      }
    });
  }
  
  // 2. Vérifier les horaires par catégorie
  if (!HORAIRES_PAR_CATEGORIE || Object.keys(HORAIRES_PAR_CATEGORIE).length === 0) {
    erreurs.push('❌ Aucun horaire défini dans HORAIRES_PAR_CATEGORIE');
  } else {
    console.log(`✅ ${Object.keys(HORAIRES_PAR_CATEGORIE).length} catégories d'horaires définies`);
    
    Object.entries(HORAIRES_PAR_CATEGORIE).forEach(([categorie, config]) => {
      if (!config.debut || !config.fin) {
        erreurs.push(`❌ Horaires incomplets pour ${categorie}`);
      }
      if (!config.pauseDebut || !config.pauseFin) {
        avertissements.push(`⚠️  ${categorie}: pause non définie`);
      }
      
      // Vérifier la logique des heures
      if (config.debut && config.fin && config.debut >= config.fin) {
        erreurs.push(`❌ ${categorie}: heure de fin avant heure de début`);
      }
    });
  }
  
  // 3. Vérifier les taux horaires
  if (!TAUX_HORAIRES || Object.keys(TAUX_HORAIRES).length === 0) {
    erreurs.push('❌ Aucun taux horaire défini dans TAUX_HORAIRES');
  } else {
    console.log(`✅ ${Object.keys(TAUX_HORAIRES).length} catégories de taux définies`);
    
    Object.entries(TAUX_HORAIRES).forEach(([categorie, taux]) => {
      if (!taux.normal || taux.normal <= 0) {
        erreurs.push(`❌ ${categorie}: taux normal invalide (${taux.normal})`);
      }
      if (!taux.majore || taux.majore <= taux.normal) {
        avertissements.push(`⚠️  ${categorie}: taux majoré pas plus élevé que normal`);
      }
    });
  }
  
  // 4. Vérifier la cohérence entre employés et catégories
  const categoriesEmployes = [...new Set(VRAIES_DONNEES_EMPLOYES.map(e => e.categorieHoraire))];
  const categoriesHoraires = Object.keys(HORAIRES_PAR_CATEGORIE);
  const categoriesTaux = Object.keys(TAUX_HORAIRES);
  
  categoriesEmployes.forEach(cat => {
    if (!categoriesHoraires.includes(cat)) {
      erreurs.push(`❌ Catégorie horaire "${cat}" utilisée mais non définie`);
    }
    if (!categoriesTaux.includes(cat)) {
      erreurs.push(`❌ Catégorie taux "${cat}" utilisée mais non définie`);
    }
  });
  
  // Afficher les résultats
  console.log('\n📊 RÉSULTATS DE LA VALIDATION:');
  console.log('===============================');
  
  if (erreurs.length > 0) {
    console.log('\n🚨 ERREURS CRITIQUES:');
    erreurs.forEach(erreur => console.log(erreur));
  }
  
  if (avertissements.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    avertissements.forEach(avertissement => console.log(avertissement));
  }
  
  if (erreurs.length === 0 && avertissements.length === 0) {
    console.log('✅ CONFIGURATION PARFAITE!');
    console.log('🚀 Vous pouvez procéder à la migration en toute sécurité.');
    return true;
  } else if (erreurs.length === 0) {
    console.log('⚠️  CONFIGURATION ACCEPTABLE AVEC AVERTISSEMENTS');
    console.log('🔄 Vous pouvez procéder à la migration, mais vérifiez les avertissements.');
    return true;
  } else {
    console.log('❌ CONFIGURATION INVALIDE');
    console.log('🛑 CORRIGEZ LES ERREURS AVANT DE PROCÉDER À LA MIGRATION!');
    return false;
  }
}

// Fonction pour générer un exemple de configuration
function genererExempleConfiguration() {
  console.log('\n📝 EXEMPLE DE CONFIGURATION:');
  console.log('============================');
  
  const exemple = `
// Exemple d'employé correctement configuré:
{
  nom: "Martin",
  prenom: "Sophie",
  email: "sophie.martin@votreentreprise.com",
  telephone: "0145678901",
  dateNaissance: "1990-06-15",
  dateEmbauche: "2023-01-15",
  poste: "Responsable Comptabilité",
  departement: "Finance",
  role: "employee", // ou "admin" ou "manager"
  categorieHoraire: "bureau", // doit correspondre à HORAIRES_PAR_CATEGORIE
  salaire: 2800,
  statutMarital: "celibataire",
  adresse: "123 Rue de la Paix, 75001 Paris",
  situationFamiliale: "0 enfant",
  personneUrgence: {
    nom: "Martin Pierre",
    telephone: "0145678902",
    relation: "conjoint"
  }
}

// Les catégories doivent être cohérentes:
HORAIRES_PAR_CATEGORIE = {
  "bureau": { debut: "09:00", fin: "17:30", ... },
  // autres catégories...
}

TAUX_HORAIRES = {
  "bureau": { normal: 15.50, majore: 23.25 },
  // autres catégories...
}
  `;
  
  console.log(exemple);
}

module.exports = { validerConfiguration, genererExempleConfiguration };

// Exécuter si appelé directement
if (require.main === module) {
  try {
    const valide = validerConfiguration();
    if (!valide) {
      console.log('\n📝 Besoin d\'aide pour la configuration?');
      console.log('Tapez: node valider-config.js --exemple');
      
      if (process.argv.includes('--exemple')) {
        genererExempleConfiguration();
      }
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error('💥 Erreur lors de la validation:', error.message);
    console.log('\n💡 Assurez-vous que config-vraies-donnees.js existe et est correctement formaté.');
    process.exit(1);
  }
}
