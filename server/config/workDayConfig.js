// Configuration pour la gestion du travail de nuit
// Ce fichier permet de personnaliser les horaires selon votre entreprise

const WORK_DAY_CONFIG = {
  // Heure de coupure : avant cette heure, on considère que c'est encore la journée précédente
  CUTOFF_HOUR: 5, // 5h du matin — aligné avec businessDayUtils.BUSINESS_DAY_CUTOFF_HOUR
  
  // Documentation des cas d'usage
  EXAMPLES: {
    // Équipe de jour classique: 8h-17h
    "equipe-jour": {
      cutoffHour: 6,
      description: "8h → 17h (pause déjeuner possible)"
    },
    
    // Équipe de nuit: 22h-6h du lendemain  
    "equipe-nuit": {
      cutoffHour: 6, 
      description: "22h → 6h+1 (traverse minuit)"
    },
    
    // Équipe très tôt: 4h-14h
    "equipe-tres-tot": {
      cutoffHour: 2, // Avant 2h = jour précédent
      description: "4h → 14h (démarrage très tôt)"
    },
    
    // Service 24h/7j avec rotation
    "service-continu": {
      cutoffHour: 6,
      description: "Rotation 3×8 avec changement d'équipe à 6h, 14h, 22h"
    }
  }
};

/**
 * Calcule les bornes de la "journée de travail" selon la logique métier
 * @param {Date} reference - Date de référence (généralement maintenant)
 * @param {number} cutoffHour - Heure de coupure (défaut: 5h)
 * @returns {Object} { debutJournee, finJournee }
 */
function getWorkDayBounds(reference = new Date(), cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  let debutJournee, finJournee;

  if (reference.getHours() < cutoffHour) {
    // On est avant l'heure de coupure : journée de travail = hier cutoffHour → aujourd'hui cutoffHour
    debutJournee = new Date(reference);
    debutJournee.setDate(debutJournee.getDate() - 1);
    debutJournee.setHours(cutoffHour, 0, 0, 0);
    
    finJournee = new Date(reference);
    finJournee.setHours(cutoffHour, 0, 0, 0);
  } else {
    // Journée normale : aujourd'hui cutoffHour → demain cutoffHour
    debutJournee = new Date(reference);
    debutJournee.setHours(cutoffHour, 0, 0, 0);
    
    finJournee = new Date(reference);
    finJournee.setDate(finJournee.getDate() + 1);
    finJournee.setHours(cutoffHour, 0, 0, 0);
  }

  return { debutJournee, finJournee };
}

/**
 * Formate une période de travail pour l'affichage
 */
function formatWorkPeriod(debutJournee, finJournee) {
  const formatDate = (date) => date.toLocaleString('fr-FR');
  
  return {
    debut: formatDate(debutJournee),
    fin: formatDate(finJournee),
    dureeHeures: Math.round((finJournee - debutJournee) / (1000 * 60 * 60)),
    traverseMinuit: debutJournee.getDate() !== finJournee.getDate()
  };
}

// Test de différentes configurations
function testConfigurations() {
  console.log('🔧 TEST DES CONFIGURATIONS DE TRAVAIL');
  console.log('======================================');
  
  const maintenant = new Date();
  console.log(`📅 Référence: ${maintenant.toLocaleString()}`);
  
  Object.entries(WORK_DAY_CONFIG.EXAMPLES).forEach(([type, config]) => {
    console.log(`\n🏢 ${type.toUpperCase()} (coupure: ${config.cutoffHour}h)`);
    console.log(`   ${config.description}`);
    
    const { debutJournee, finJournee } = getWorkDayBounds(maintenant, config.cutoffHour);
    const periode = formatWorkPeriod(debutJournee, finJournee);
    
    console.log(`   ⏰ Période: ${periode.debut} → ${periode.fin}`);
    console.log(`   🌙 Traverse minuit: ${periode.traverseMinuit ? 'OUI' : 'NON'}`);
    console.log(`   ⚡ Durée max: ${periode.dureeHeures}h`);
  });
  
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('====================');
  console.log('• Équipe de jour classique → cutoffHour: 6');
  console.log('• Travail de nuit régulier → cutoffHour: 6');  
  console.log('• Service très tôt (4h-14h) → cutoffHour: 2');
  console.log('• Horaires flexibles → cutoffHour: 4');
}

module.exports = {
  WORK_DAY_CONFIG,
  getWorkDayBounds,
  formatWorkPeriod,
  testConfigurations
};

// Si exécuté directement, lancer les tests
if (require.main === module) {
  testConfigurations();
}
