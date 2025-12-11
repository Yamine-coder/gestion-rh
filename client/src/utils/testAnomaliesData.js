// client/src/utils/testAnomaliesData.js

/**
 * Données de test pour le système de gestion des anomalies
 * Utilisez ces données pour créer des scénarios de test réalistes
 */

export const TEST_SCENARIOS = {
  // Scénario 1: Retard simple
  retard_simple: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'retard',
      ecartMinutes: 8,
      gravite: 'info',
      description: 'Retard de 8 minutes',
      heurePrevue: '09:00',
      heureReelle: '09:08',
      dureeMinutes: 8
    }
  },

  // Scénario 2: Retard modéré
  retard_modere: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'retard_modere',
      ecartMinutes: 15,
      gravite: 'attention',
      description: 'Retard modéré de 15 minutes',
      heurePrevue: '09:00',
      heureReelle: '09:15',
      dureeMinutes: 15
    }
  },

  // Scénario 3: Retard critique
  retard_critique: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'retard_critique',
      ecartMinutes: 45,
      gravite: 'critique',
      description: 'Retard critique de 45 minutes',
      heurePrevue: '09:00',
      heureReelle: '09:45',
      dureeMinutes: 45
    }
  },

  // Scénario 4: Hors plage horaire (arrivée très tôt)
  hors_plage_matin: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'hors_plage_in',
      ecartMinutes: 120,
      gravite: 'hors_plage',
      description: 'Arrivée à 5h30 (hors plage normale 6h-23h)',
      heurePrevue: '08:00',
      heureReelle: '05:30',
      dureeMinutes: 150
    }
  },

  // Scénario 5: Heures supplémentaires auto-validées
  heures_sup_auto: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'heures_sup_auto_validees',
      ecartMinutes: 60,
      gravite: 'info',
      description: 'Heures supplémentaires (1h) - auto-validées',
      heurePrevue: '17:00',
      heureReelle: '18:00',
      dureeMinutes: 60
    }
  },

  // Scénario 6: Heures supplémentaires à valider
  heures_sup_validation: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'heures_sup_a_valider',
      ecartMinutes: 150,
      gravite: 'a_valider',
      description: 'Heures supplémentaires importantes (2h30) - validation requise',
      heurePrevue: '17:00',
      heureReelle: '19:30',
      dureeMinutes: 150
    }
  },

  // Scénario 7: Départ anticipé modéré
  depart_anticipe: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'depart_anticipe',
      ecartMinutes: 20,
      gravite: 'attention',
      description: 'Départ 20 minutes plus tôt',
      heurePrevue: '17:00',
      heureReelle: '16:40',
      dureeMinutes: 20
    }
  },

  // Scénario 8: Départ prématuré critique
  depart_premature: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'depart_premature_critique',
      ecartMinutes: 90,
      gravite: 'critique',
      description: 'Départ 1h30 plus tôt - critique',
      heurePrevue: '17:00',
      heureReelle: '15:30',
      dureeMinutes: 90
    }
  },

  // Scénario 9: Absence planifiée mais pointé (CRITIQUE)
  absence_avec_pointage: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'absence_planifiee_avec_pointage',
      ecartMinutes: 0,
      gravite: 'critique',
      description: 'Employé pointé malgré absence planifiée',
      absenceType: 'CP',
      heureReelle: '09:15'
    }
  },

  // Scénario 10: Présence non prévue
  presence_non_prevue: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'presence_non_prevue',
      ecartMinutes: 0,
      gravite: 'attention',
      description: 'Pointage alors qu\'aucun shift n\'était prévu',
      heureReelle: '10:00'
    }
  },

  // Scénario 11: Pointage incomplet (arrivée manquante)
  missing_in: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'missing_in',
      ecartMinutes: 0,
      gravite: 'attention',
      description: 'Pointage de départ sans pointage d\'arrivée',
      heurePrevue: '09:00',
      heureReelle: null
    }
  },

  // Scénario 12: Pointage incomplet (départ manquant)
  missing_out: {
    employeId: 1,
    date: new Date().toISOString().split('T')[0],
    ecart: {
      type: 'missing_out',
      ecartMinutes: 0,
      gravite: 'attention',
      description: 'Pointage d\'arrivée sans pointage de départ',
      heurePrevue: '17:00',
      heureReelle: null
    }
  }
};

/**
 * Fonction pour générer un écart de test personnalisé
 */
export function createTestEcart(type, minutesEcart, gravite = 'attention') {
  const now = new Date();
  const heurePrevue = '09:00';
  const [h, m] = heurePrevue.split(':').map(Number);
  const heureReelle = new Date(now.setHours(h, m + minutesEcart));
  
  return {
    type,
    ecartMinutes: minutesEcart,
    gravite,
    description: `Test ${type} - Écart de ${minutesEcart} minutes`,
    heurePrevue,
    heureReelle: heureReelle.toTimeString().substring(0, 5),
    dureeMinutes: Math.abs(minutesEcart)
  };
}

/**
 * Fonction pour créer un batch de tests
 */
export function createTestBatch(employeId, date) {
  return Object.entries(TEST_SCENARIOS).map(([key, scenario]) => ({
    ...scenario,
    employeId,
    date,
    testName: key
  }));
}

/**
 * Scénarios de test par gravité
 */
export const TEST_BY_GRAVITE = {
  critiques: [
    TEST_SCENARIOS.retard_critique,
    TEST_SCENARIOS.depart_premature,
    TEST_SCENARIOS.absence_avec_pointage
  ],
  
  attention: [
    TEST_SCENARIOS.retard_modere,
    TEST_SCENARIOS.depart_anticipe,
    TEST_SCENARIOS.presence_non_prevue,
    TEST_SCENARIOS.missing_in,
    TEST_SCENARIOS.missing_out
  ],
  
  hors_plage: [
    TEST_SCENARIOS.hors_plage_matin
  ],
  
  a_valider: [
    TEST_SCENARIOS.heures_sup_validation
  ],
  
  info: [
    TEST_SCENARIOS.retard_simple,
    TEST_SCENARIOS.heures_sup_auto
  ]
};

/**
 * Messages de test pour différentes situations
 */
export const TEST_MESSAGES = {
  success: {
    sync: '✅ Anomalie synchronisée avec succès',
    create: '✅ Anomalie créée en base de données',
    validate: '✅ Anomalie validée par l\'administrateur',
    refuse: '✅ Anomalie refusée avec justification',
    correct: '✅ Anomalie corrigée et marquée comme résolue'
  },
  
  error: {
    auth: '❌ Erreur d\'authentification - Token invalide',
    permission: '❌ Permissions insuffisantes - Admin requis',
    notFound: '❌ Anomalie introuvable',
    validation: '❌ Données invalides',
    server: '❌ Erreur serveur - Vérifiez que le backend est démarré'
  },
  
  warning: {
    duplicate: '⚠️ Cette anomalie existe déjà',
    processed: '⚠️ Cette anomalie a déjà été traitée',
    outdated: '⚠️ Données obsolètes - Rafraîchissement requis'
  }
};

/**
 * Guide de test étape par étape
 */
export const TEST_GUIDE = [
  {
    step: 1,
    title: 'Vérifier la connexion',
    description: 'Testez la connexion API et le serveur backend',
    action: 'Cliquez sur "Test Serveur" puis "Test API"',
    expected: 'Messages verts confirmant la connexion'
  },
  {
    step: 2,
    title: 'Créer une anomalie test',
    description: 'Créez une anomalie de retard modéré',
    action: 'Cliquez sur "Créer Test"',
    expected: 'Message "1 anomalie(s) créée(s)"'
  },
  {
    step: 3,
    title: 'Vérifier l\'affichage',
    description: 'Activez le mode comparaison et cherchez les badges',
    action: 'Activez le switch "Mode Comparaison"',
    expected: 'Badges colorés visibles dans les cellules'
  },
  {
    step: 4,
    title: 'Tester le clic',
    description: 'Cliquez sur un badge d\'anomalie',
    action: 'Clic sur badge rouge/jaune/violet',
    expected: 'Modale de traitement s\'ouvre'
  },
  {
    step: 5,
    title: 'Valider une anomalie',
    description: 'Testez la validation admin',
    action: 'Cliquez sur "Valider" dans la modale',
    expected: 'Badge disparaît, notification succès'
  },
  {
    step: 6,
    title: 'Vérifier les erreurs',
    description: 'Testez la gestion des erreurs',
    action: 'Cliquez sur "Test Erreurs"',
    expected: 'Erreurs capturées correctement'
  }
];

export default TEST_SCENARIOS;
