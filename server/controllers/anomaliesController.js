// server/controllers/anomaliesController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getParisDateString } = require("../utils/parisTimeUtils");

/**
 * Types et gravités d'anomalies supportés
 * ⚠️ IMPORTANT: Ces types doivent correspondre à ceux générés par comparisonController.js
 */
const ANOMALIE_TYPES = {
  // Retards (3 niveaux)
  RETARD: 'retard',
  RETARD_MODERE: 'retard_modere',
  RETARD_CRITIQUE: 'retard_critique',
  RETARD_ACCEPTABLE: 'arrivee_acceptable', // Pas vraiment une anomalie mais pour cohérence
  
  // Hors plage
  HORS_PLAGE: 'hors_plage',
  HORS_PLAGE_IN: 'hors_plage_in',
  HORS_PLAGE_OUT: 'hors_plage_out',
  HORS_PLAGE_OUT_CRITIQUE: 'hors_plage_out_critique',
  
  // Départs
  DEPART_ANTICIPE: 'depart_anticipe',
  DEPART_PREMATURE_CRITIQUE: 'depart_premature_critique',
  DEPART_ACCEPTABLE: 'depart_acceptable',
  
  // Heures supplémentaires (3 zones)
  HEURES_SUP: 'heures_sup',
  HEURES_SUP_AUTO_VALIDEES: 'heures_sup_auto_validees',
  HEURES_SUP_A_VALIDER: 'heures_sup_a_valider',
  
  // Absences
  ABSENCE_TOTALE: 'absence_totale',
  ABSENCE_CONFORME: 'absence_conforme',
  ABSENCE_PLANIFIEE_AVEC_POINTAGE: 'absence_planifiee_avec_pointage',
  PRESENCE_NON_PREVUE: 'presence_non_prevue',
  
  // Pointages incomplets
  SEGMENT_NON_POINTE: 'segment_non_pointe',
  MISSING_IN: 'missing_in',
  MISSING_OUT: 'missing_out',
  POINTAGE_HORS_PLANNING: 'pointage_hors_planning'
};

const GRAVITE_LEVELS = {
  CRITIQUE: 'critique',
  ATTENTION: 'attention',
  INFO: 'info',
  HORS_PLAGE: 'hors_plage',  // Niveau spécial pour hors-plage
  A_VALIDER: 'a_valider',     // Nécessite validation managériale
  OK: 'ok'                     // État normal (pas vraiment une anomalie)
};

const STATUTS = {
  EN_ATTENTE: 'en_attente',
  VALIDEE: 'validee',
  REFUSEE: 'refusee',
  CORRIGEE: 'corrigee',
  OBSOLETE: 'obsolete'  // 🆕 Anomalie invalidée car shift modifié
};

/**
 * Critères et seuils pour les anomalies
 */
const ANOMALIE_CRITERIA = {
  // Retards considérés comme critiques (en minutes)
  RETARD_CRITIQUE_MINUTES: 30,
  // Retards nécessitant attention (en minutes)  
  RETARD_ATTENTION_MINUTES: 10,
  // Départ anticipé critique (en minutes)
  DEPART_ANTICIPE_CRITIQUE_MINUTES: 30,
  // Heures hors plage normale (avant/après ces heures = critique)
  HEURE_DEBUT_NORMALE: 6, // 6h00
  HEURE_FIN_NORMALE: 23,  // 23h00
  // Seuil d'heures supplémentaires nécessitant validation admin
  HEURES_SUP_ADMIN_VALIDATION: 2, // 2h+
  // Écart minimum pour créer une anomalie (en minutes)
  ECART_MINIMUM_MINUTES: 5
};

/**
 * Détermine la gravité d'une anomalie selon des critères stricts
 * ⚠️ Gère tous les types générés par comparisonController
 */
const determineGravite = (ecart) => {
  // Si gravite déjà fournie par le backend, la conserver
  if (ecart.gravite) {
    return ecart.gravite;
  }
  
  // Sinon, déterminer selon le type
  switch (ecart.type) {
    // Retards - 3 niveaux
    case ANOMALIE_TYPES.RETARD_CRITIQUE:
    case 'retard_critique':
      return GRAVITE_LEVELS.CRITIQUE;
    
    case ANOMALIE_TYPES.RETARD_MODERE:
    case 'retard_modere':
      return GRAVITE_LEVELS.ATTENTION;
    
    case ANOMALIE_TYPES.RETARD:
    case 'retard':
      if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_CRITIQUE_MINUTES) {
        return GRAVITE_LEVELS.CRITIQUE;
      } else if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_ATTENTION_MINUTES) {
        return GRAVITE_LEVELS.ATTENTION;
      }
      return GRAVITE_LEVELS.INFO;
    
    case ANOMALIE_TYPES.RETARD_ACCEPTABLE:
    case 'arrivee_acceptable':
      return GRAVITE_LEVELS.INFO;

    // Départs
    case ANOMALIE_TYPES.DEPART_PREMATURE_CRITIQUE:
    case 'depart_premature_critique':
      return GRAVITE_LEVELS.CRITIQUE;
    
    case ANOMALIE_TYPES.DEPART_ANTICIPE:
    case 'depart_anticipe':
      if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.DEPART_ANTICIPE_CRITIQUE_MINUTES) {
        return GRAVITE_LEVELS.CRITIQUE;
      }
      return GRAVITE_LEVELS.ATTENTION;
    
    case ANOMALIE_TYPES.DEPART_ACCEPTABLE:
    case 'depart_acceptable':
      return GRAVITE_LEVELS.INFO;

    // Hors plage - toujours critique ou hors_plage
    case ANOMALIE_TYPES.HORS_PLAGE:
    case ANOMALIE_TYPES.HORS_PLAGE_IN:
    case ANOMALIE_TYPES.HORS_PLAGE_OUT_CRITIQUE:
    case 'hors_plage':
    case 'hors_plage_in':
    case 'hors_plage_out_critique':
      return 'hors_plage'; // Gravité spéciale pour hors-plage
    
    case ANOMALIE_TYPES.HORS_PLAGE_OUT:
    case 'hors_plage_out':
      return 'a_valider'; // Nécessite validation

    // Heures supplémentaires - 3 zones
    case ANOMALIE_TYPES.HEURES_SUP_AUTO_VALIDEES:
    case 'heures_sup_auto_validees':
      return GRAVITE_LEVELS.INFO; // Auto-validées, pas grave
    
    case ANOMALIE_TYPES.HEURES_SUP_A_VALIDER:
    case 'heures_sup_a_valider':
      return 'a_valider'; // Nécessite validation manager
    
    case ANOMALIE_TYPES.HEURES_SUP:
    case 'heures_sup':
      const heuresExtra = Math.abs(ecart.ecartMinutes) / 60;
      if (heuresExtra >= ANOMALIE_CRITERIA.HEURES_SUP_ADMIN_VALIDATION) {
        return GRAVITE_LEVELS.CRITIQUE;
      }
      return GRAVITE_LEVELS.ATTENTION;

    // Absences
    case ANOMALIE_TYPES.ABSENCE_TOTALE:
    case ANOMALIE_TYPES.PRESENCE_NON_PREVUE:
    case ANOMALIE_TYPES.ABSENCE_PLANIFIEE_AVEC_POINTAGE:
    case ANOMALIE_TYPES.SEGMENT_NON_POINTE:
    case ANOMALIE_TYPES.MISSING_IN:
    case ANOMALIE_TYPES.MISSING_OUT:
    case 'absence_totale':
    case 'presence_non_prevue':
    case 'absence_planifiee_avec_pointage':
    case 'segment_non_pointe':
    case 'missing_in':
    case 'missing_out':
      return GRAVITE_LEVELS.CRITIQUE;
    
    case ANOMALIE_TYPES.ABSENCE_CONFORME:
    case 'absence_conforme':
      return GRAVITE_LEVELS.INFO; // Normal
    
    case ANOMALIE_TYPES.POINTAGE_HORS_PLANNING:
    case 'pointage_hors_planning':
      return GRAVITE_LEVELS.ATTENTION;

    default:
      console.warn(`⚠️ Type d'anomalie non reconnu: ${ecart.type}`);
      return GRAVITE_LEVELS.INFO;
  }
};

/**
 * Vérifie si un écart est significatif selon nos critères
 * ⚠️ VERSION AMÉLIORÉE: Accepte tous les types d'anomalies avec logique intelligente
 */
const isEcartSignificatif = (ecart) => {
  // 1. Types toujours significatifs (critiques par nature)
  const typesToujoursCritiques = [
    'absence_totale', 'absence_planifiee_avec_pointage', 'presence_non_prevue',
    'hors_plage', 'hors_plage_in', 'hors_plage_out_critique',
    'retard_critique', 'depart_premature_critique',
    'segment_non_pointe', 'missing_in', 'missing_out', 'pointage_hors_planning'
  ];
  
  if (typesToujoursCritiques.includes(ecart.type)) {
    console.log(`✅ [isEcartSignificatif] Type critique accepté: ${ecart.type}`);
    return true;
  }
  
  // 2. Types avec validation requise (toujours significatifs)
  const typesValidation = [
    'heures_sup_a_valider', 'hors_plage_out'
  ];
  
  if (typesValidation.includes(ecart.type)) {
    console.log(`✅ [isEcartSignificatif] Type validation accepté: ${ecart.type}`);
    return true;
  }
  
  // 3. Types informatifs ignorés (pas d'anomalie à créer)
  const typesIgnores = [
    'absence_conforme', 'arrivee_acceptable', 'depart_acceptable',
    'arrivee_a_l_heure', 'depart_a_l_heure'
  ];
  
  if (typesIgnores.includes(ecart.type)) {
    console.log(`⚠️ [isEcartSignificatif] Type ignoré (normal): ${ecart.type}`);
    return false;
  }
  
  // 4. Retards modérés : vérifier seuil
  if (ecart.type === 'retard_modere' || ecart.type === 'retard') {
    const estSignificatif = ecart.ecartMinutes && Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_ATTENTION_MINUTES;
    console.log(`${estSignificatif ? '✅' : '⚠️'} [isEcartSignificatif] Retard ${ecart.ecartMinutes}min: ${estSignificatif ? 'accepté' : 'ignoré'}`);
    return estSignificatif;
  }
  
  // 5. Départs anticipés : vérifier seuil
  if (ecart.type === 'depart_anticipe') {
    const estSignificatif = ecart.ecartMinutes && Math.abs(ecart.ecartMinutes) >= 15;
    console.log(`${estSignificatif ? '✅' : '⚠️'} [isEcartSignificatif] Départ anticipé ${ecart.ecartMinutes}min: ${estSignificatif ? 'accepté' : 'ignoré'}`);
    return estSignificatif;
  }
  
  // 6. Heures sup auto-validées : toujours créer (traçabilité paiement)
  if (ecart.type === 'heures_sup_auto_validees') {
    const estSignificatif = ecart.ecartMinutes && Math.abs(ecart.ecartMinutes) >= 15;
    console.log(`${estSignificatif ? '✅' : '⚠️'} [isEcartSignificatif] H.sup auto ${ecart.ecartMinutes}min: ${estSignificatif ? 'accepté' : 'ignoré'}`);
    return estSignificatif;
  }
  
  // 7. Autres heures sup
  if (ecart.type === 'heures_sup' || ecart.type?.includes('heures_sup')) {
    const estSignificatif = ecart.ecartMinutes && Math.abs(ecart.ecartMinutes) >= 15;
    console.log(`${estSignificatif ? '✅' : '⚠️'} [isEcartSignificatif] Heures sup ${ecart.ecartMinutes}min: ${estSignificatif ? 'accepté' : 'ignoré'}`);
    return estSignificatif;
  }
  
  // 8. Type inconnu : accepter par défaut (principe de précaution)
  console.log(`⚠️ [isEcartSignificatif] Type inconnu accepté par précaution: ${ecart.type}`);
  return true;
};

/**
 * Créer ou mettre à jour des anomalies basées sur les écarts calculés
 * POST /api/anomalies/sync-from-comparison
 */
const syncAnomaliesFromComparison = async (req, res) => {
  const { employeId, date, ecarts, forceCreate } = req.body;

  if (!employeId || !date || !Array.isArray(ecarts)) {
    return res.status(400).json({ 
      success: false,
      error: "employeId, date et ecarts requis" 
    });
  }

  console.log(`📊 [Sync] Traitement ${ecarts.length} écart(s) pour employé ${employeId} le ${date}`);
  console.log(`📊 [Sync] Force create: ${forceCreate}`);
  console.log(`📊 [Sync] Écarts reçus:`, ecarts);

  // Validation des écarts avec critères stricts (sauf si forceCreate)
  const ecartsSignificatifs = [];
  for (const ecart of ecarts) {
    if (!ecart.type) {
      return res.status(400).json({ 
        success: false,
        error: "Chaque écart doit avoir un type" 
      });
    }
    
    // Si forceCreate, accepter tous les écarts, sinon vérifier la significativité
    const isSignificant = forceCreate || isEcartSignificatif(ecart);
    
    if (!isSignificant) {
      console.log(`📊 [Sync] Écart non significatif ignoré:`, ecart);
      continue; // Ignorer cet écart
    }
    
    console.log(`✅ [Sync] Écart accepté:`, { type: ecart.type, ecartMinutes: ecart.ecartMinutes, forceCreate });
    
    // S'assurer que chaque écart a une description
    if (!ecart.description) {
      ecart.description = `Anomalie de type ${ecart.type}`;
    }
    
    // Déterminer la gravité selon nos critères stricts
    ecart.gravite = determineGravite(ecart);
    
    ecartsSignificatifs.push(ecart);
  }

  // Si aucun écart significatif, retourner sans créer d'anomalie
  if (ecartsSignificatifs.length === 0) {
    const message = forceCreate 
      ? "Aucun écart valide trouvé (même avec forceCreate)"
      : "Aucun écart significatif détecté selon les critères établis";
    
    console.log(`⚠️ [Sync] ${message}`);
    console.log(`📊 [Sync] Écarts originaux:`, ecarts);
    
    return res.json({
      success: true,
      anomaliesCreees: 0,
      anomalies: [],
      message: message
    });
  }

  try {
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const anomaliesCreees = [];

    for (const ecart of ecartsSignificatifs) {
      // Préparer les détails spécifiques selon le type
      const details = {
        ecartMinutes: ecart.ecartMinutes || null,
        heurePrevu: ecart.heurePrevu || null,
        heureReelle: ecart.heureReelle || null,
        motif: ecart.motif || null,
        originalDescription: ecart.description,
        requiresAdminValidation: ecart.requiresAdminValidation || false
      };

      // Calculer les heures supplémentaires si applicable
      let heuresExtra = null;
      let montantExtra = null;
      if (ecart.type === 'heures_sup' && ecart.ecartMinutes) {
        heuresExtra = Math.abs(ecart.ecartMinutes) / 60;
        // Calcul basique du montant (à ajuster selon vos règles)
        montantExtra = heuresExtra * 12.50; // Exemple : 12.50€/h sup
      }

      // Déterminer le statut initial selon la gravité et les privilèges
      let statutInitial = STATUTS.EN_ATTENTE;
      if (ecart.gravite === GRAVITE_LEVELS.CRITIQUE || ecart.requiresAdminValidation) {
        statutInitial = STATUTS.EN_ATTENTE; // Toujours en attente pour les cas critiques
      }

      // Vérifier si l'anomalie existe déjà
      const anomalieExistante = await prisma.anomalie.findFirst({
        where: {
          employeId: parseInt(employeId),
          date: dateObj,
          type: ecart.type,
          description: ecart.description
        }
      });

      if (anomalieExistante) {
        // Mettre à jour si nécessaire (par exemple, si les détails ont changé)
        if (anomalieExistante.statut === STATUTS.EN_ATTENTE) {
          const anomalieMAJ = await prisma.anomalie.update({
            where: { id: anomalieExistante.id },
            data: {
              gravite: ecart.gravite,
              details: details,
              heuresExtra,
              montantExtra,
              updatedAt: new Date()
            }
          });
          anomaliesCreees.push(anomalieMAJ);
        }
      } else {
        // Créer nouvelle anomalie
        const nouvelleAnomalie = await prisma.anomalie.create({
          data: {
            employeId: parseInt(employeId),
            date: dateObj,
            type: ecart.type,
            gravite: ecart.gravite,
            description: ecart.description,
            details: details,
            heuresExtra,
            montantExtra,
            statut: STATUTS.EN_ATTENTE
          }
        });
        anomaliesCreees.push(nouvelleAnomalie);
      }
    }

    res.json({
      success: true,
      anomaliesCreees: anomaliesCreees.length,
      anomalies: anomaliesCreees
    });

  } catch (error) {
    console.error("Erreur synchronisation anomalies:", error);
    console.error("Stack trace:", error.stack);
    
    // Erreur spécifique Prisma
    if (error.code) {
      console.error("Code erreur Prisma:", error.code);
      console.error("Meta:", error.meta);
    }
    
    res.status(500).json({ 
      error: "Erreur lors de la synchronisation des anomalies",
      details: error.message,
      code: error.code || null
    });
  }
};

/**
 * Récupérer les anomalies avec filtres
 * GET /api/anomalies?employeId=1&dateDebut=2024-01-01&dateFin=2024-01-31&statut=en_attente
 * 
 * 🔒 SÉCURITÉ: 
 * - Admin/Manager: peut voir toutes les anomalies
 * - Employé: ne peut voir QUE ses propres anomalies
 */
const getAnomalies = async (req, res) => {
  const { employeId, dateDebut, dateFin, statut, type, gravite, limit = 50, offset = 0 } = req.query;
  const userRole = req.user?.role || 'employee';
  const userId = req.userId || req.user?.userId || req.user?.id;

  try {
    const where = {};

    // 🔒 SÉCURITÉ: Employé ne peut voir que ses propres anomalies
    if (userRole === 'employee') {
      where.employeId = parseInt(userId);
      // Ignorer le paramètre employeId de la query pour les employés
      console.log(`🔒 [getAnomalies] Employé ${userId} - Accès restreint à ses propres anomalies`);
    } else if (employeId) {
      where.employeId = parseInt(employeId);
    }

    if (dateDebut && dateFin) {
      // Gérer le timezone Paris (UTC+1) - les dates sont stockées à 23:00 UTC pour minuit Paris
      // On élargit la recherche de -1 jour côté début pour capturer les anomalies du jour
      const startDate = new Date(dateDebut + 'T00:00:00.000Z');
      startDate.setDate(startDate.getDate() - 1); // -1 jour pour couvrir le timezone
      
      where.date = {
        gte: startDate,
        lte: new Date(dateFin + 'T23:59:59.999Z')
      };
    } else if (dateDebut) {
      const startDate = new Date(dateDebut + 'T00:00:00.000Z');
      startDate.setDate(startDate.getDate() - 1);
      
      where.date = {
        gte: startDate
      };
    } else if (dateFin) {
      where.date = {
        lte: new Date(dateFin + 'T23:59:59.999Z')
      };
    }

    if (statut) {
      where.statut = statut;
    }

    if (type) {
      where.type = type;
    }

    if (gravite) {
      where.gravite = gravite;
    }

    const [anomalies, total] = await Promise.all([
      prisma.anomalie.findMany({
        where,
        include: {
          employe: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              categorie: true
            }
          },
          traiteur: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.anomalie.count({ where })
    ]);

    res.json({
      success: true,
      anomalies,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error("Erreur récupération anomalies:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des anomalies" });
  }
};

/**
 * Calculer pénalité validation (modérée)
 */
function calculerPenaliteValidation(anomalie) {
  const typeMap = {
    'retard_simple': -2,
    'retard': -2,
    'retard_modere': -5,
    'retard_critique': -10,
    'depart_anticipe': -3,
    'depart_premature_critique': -8,
    'heures_sup': 0, // Pas de pénalité si validé
    'heures_sup_auto_validees': 0,
    'heures_sup_a_valider': 0,
    'missing_in': -5,
    'missing_out': -5,
    'absence_totale': -10
  };
  
  return typeMap[anomalie.type] || -5;
}

/**
 * Calculer pénalité refus (double)
 */
function calculerPenaliteRefus(anomalie) {
  return calculerPenaliteValidation(anomalie) * 2;
}

/**
 * Traiter une anomalie (valider, refuser, corriger, payer_extra)
 * PUT /api/anomalies/:id/traiter
 */
const traiterAnomalie = async (req, res) => {
  const { id } = req.params;
  const { action, commentaire, montantExtra, heuresExtra, shiftCorrection, payerHeuresManquantes, heuresARecuperer, tauxHoraire, methodePaiement, questionVerification, notifierEmploye } = req.body;
  const userId = req.userId || req.user?.userId || req.user?.id;
  const userRole = req.user?.role || 'employee';

  console.log('🔍 traiterAnomalie - Action:', action, 'User:', userId, 'Role:', userRole);
  if (payerHeuresManquantes) {
    console.log('💰 Payer heures manquantes:', heuresARecuperer, 'heures');
  }

  if (!id) {
    return res.status(400).json({ error: "ID de l'anomalie requis" });
  }

  if (!action || !['valider', 'refuser', 'corriger', 'payer_extra', 'reporter', 'convertir_extra'].includes(action)) {
    return res.status(400).json({ error: "Action invalide (valider, refuser, corriger, payer_extra, reporter, convertir_extra)" });
  }

  try {
    const anomalieId = parseInt(id);
    
    if (isNaN(anomalieId)) {
      return res.status(400).json({ error: "ID d'anomalie invalide" });
    }

    const anomalie = await prisma.anomalie.findUnique({
      where: { id: anomalieId },
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      }
    });

    if (!anomalie) {
      return res.status(404).json({ error: "Anomalie non trouvée" });
    }

    // Permettre de traiter les anomalies "en_attente" ou "a_verifier"
    const statutsModifiables = [STATUTS.EN_ATTENTE, 'a_verifier'];
    if (!statutsModifiables.includes(anomalie.statut)) {
      return res.status(400).json({ 
        error: `Cette anomalie a déjà été traitée (statut: ${anomalie.statut})`,
        currentStatus: anomalie.statut,
        anomalieId: anomalie.id
      });
    }

    // Log audit - État avant
    const etatAvant = { ...anomalie };

    let nouveauStatut;
    let shiftModifie = false;
    const updateData = {
      commentaireManager: commentaire,
      traitePar: userId,
      traiteAt: new Date()
    };

    switch (action) {
      case 'valider':
        // ✅ VALIDATION - Pas de modif shift
        nouveauStatut = STATUTS.VALIDEE;
        
        // Pour les heures sup, on peut ajuster le montant
        if (anomalie.type.includes('heures_sup')) {
          if (montantExtra !== undefined) updateData.montantExtra = parseFloat(montantExtra);
          if (heuresExtra !== undefined) updateData.heuresExtra = parseFloat(heuresExtra);
        }
        
        // 💰 GESTION PAIEMENT HEURES MANQUANTES
        if (payerHeuresManquantes && heuresARecuperer > 0) {
          updateData.payerHeuresManquantes = true;
          updateData.heuresARecuperer = heuresARecuperer;
          console.log(`💰 Validation avec paiement heures: ${heuresARecuperer}h à récupérer`);
        } else {
          console.log(`✅ Validation simple: heures réelles payées`);
        }
        break;

      case 'refuser':
        // ❌ REFUS - Double pénalité
        nouveauStatut = STATUTS.REFUSEE;
        impactScore = calculerPenaliteRefus(anomalie);
        
        console.log(`❌ Refus: Double pénalité ${impactScore} points`);
        break;

      case 'corriger':
        // 🔧 CORRECTION - SEUL CAS où on modifie le shift
        
        // Vérifier droits (RH ou Admin uniquement)
        if (!['admin', 'rh'].includes(userRole)) {
          return res.status(403).json({ 
            error: 'Seuls les RH et administrateurs peuvent corriger un shift' 
          });
        }

        if (!shiftCorrection || !shiftCorrection.raison) {
          return res.status(400).json({ 
            error: 'Justification de la correction requise' 
          });
        }

        nouveauStatut = STATUTS.CORRIGEE;
        shiftModifie = true;

        console.log(`🔧 Correction shift: Type ${shiftCorrection.type}`);
        
        // Note: La modification réelle du shift serait faite ici
        // Pour l'instant on marque juste l'anomalie comme corrigée
        updateData.details = {
          ...(typeof anomalie.details === 'object' ? anomalie.details : {}),
          shiftCorrige: true,
          typeCorrection: shiftCorrection.type,
          raisonCorrection: shiftCorrection.raison,
          nouvelleHeure: shiftCorrection.nouvelleHeure
        };
        
        break;

      case 'payer_extra':
        // 💰 PAYER EN EXTRA - Créer un paiement espèces hors fiche de paie
        
        // Vérifier que c'est une anomalie d'heures sup
        if (!anomalie.type.includes('heures_sup') && !anomalie.type.includes('hors_plage')) {
          return res.status(400).json({ 
            error: 'Cette action n\'est possible que pour les heures supplémentaires' 
          });
        }

        // Récupérer les heures de l'anomalie
        const heuresAPayer = heuresExtra || anomalie.heuresExtra || 
          (anomalie.details?.minutesEcart ? anomalie.details.minutesEcart / 60 : 0) ||
          (anomalie.ecartMinutes ? Math.abs(anomalie.ecartMinutes) / 60 : 0);
        
        if (heuresAPayer <= 0) {
          return res.status(400).json({ 
            error: 'Aucune heure à payer pour cette anomalie' 
          });
        }

        const tauxEffectif = tauxHoraire || 10; // Taux par défaut 10€/h
        const montantCalcule = montantExtra || (heuresAPayer * tauxEffectif);

        // Préparer le commentaire enrichi avec le contexte
        const anomalieDetails = typeof anomalie.details === 'object' ? anomalie.details : {};
        const commentaireEnrichi = commentaire || 
          `Heures sup du ${new Date(anomalie.date).toLocaleDateString('fr-FR')}` +
          (anomalieDetails.heurePrevueFin ? ` - Prévu fin: ${anomalieDetails.heurePrevueFin}` : '') +
          (anomalieDetails.heureReelleFin ? ` - Réel fin: ${anomalieDetails.heureReelleFin}` : '');

        // Créer le paiement extra
        const paiementExtra = await prisma.paiementExtra.create({
          data: {
            employeId: anomalie.employeId,
            anomalieId: anomalie.id,
            shiftId: anomalie.shiftId || null,
            date: anomalie.date,
            heures: parseFloat(heuresAPayer.toFixed(2)),
            tauxHoraire: parseFloat(tauxEffectif),
            montant: parseFloat(montantCalcule.toFixed(2)),
            source: 'anomalie_heures_sup',
            statut: 'a_payer',
            commentaire: commentaireEnrichi,
            creePar: userId
          }
        });

        nouveauStatut = STATUTS.VALIDEE;
        
        // Ajouter les infos du paiement dans les détails de l'anomalie
        updateData.details = {
          ...(typeof anomalie.details === 'object' ? anomalie.details : {}),
          payeEnExtra: true,
          paiementExtraId: paiementExtra.id,
          heuresPayeesExtra: heuresAPayer,
          montantExtra: montantCalcule,
          tauxHoraire: tauxEffectif
        };

        console.log(`💰 Paiement extra créé: ${heuresAPayer.toFixed(2)}h à ${tauxEffectif}€/h = ${montantCalcule.toFixed(2)}€ pour ${anomalie.employe.prenom} ${anomalie.employe.nom}`);
        
        break;

      case 'reporter':
        // ⏳ REPORTER - Mettre en attente de vérification
        nouveauStatut = 'a_verifier';
        
        // Stocker la question/note dans les détails
        updateData.details = {
          ...(typeof anomalie.details === 'object' ? anomalie.details : {}),
          questionVerification: questionVerification || 'Vérification nécessaire',
          reportePar: userId,
          reporteAt: new Date().toISOString(),
          notificationEnvoyee: notifierEmploye || false
        };
        
        // TODO: Si notifierEmploye, créer une notification pour l'employé
        if (notifierEmploye) {
          try {
            await prisma.notification.create({
              data: {
                userId: anomalie.employeId,
                type: 'verification_demandee',
                titre: 'Vérification demandée',
                message: `Une vérification est demandée concernant l'anomalie du ${new Date(anomalie.date).toLocaleDateString('fr-FR')}. ${questionVerification || ''}`,
                lien: `/anomalies/${anomalieId}`,
                metadata: {
                  anomalieId: anomalieId,
                  questionVerification: questionVerification
                }
              }
            });
            console.log(`📧 Notification envoyée à l'employé ${anomalie.employe.prenom} ${anomalie.employe.nom}`);
          } catch (notifError) {
            console.warn('⚠️ Erreur création notification (non bloquant):', notifError.message);
          }
        }
        
        console.log(`⏳ Anomalie ${id} reportée - Question: "${questionVerification || 'Vérification nécessaire'}"`);
        
        break;

      case 'convertir_extra':
        // 🆕 CONVERTIR EN EXTRA - Transformer un pointage hors planning en paiement extra
        // Cas d'usage: Employé pointe sans shift prévu, manager valide comme travail extra "au noir"
        
        // Vérifier que c'est bien un pointage hors planning ou présence non prévue
        const typesConvertibles = ['pointage_hors_planning', 'presence_non_prevue', 'pointage_pendant_conge'];
        if (!typesConvertibles.includes(anomalie.type)) {
          return res.status(400).json({ 
            error: `Cette action n'est possible que pour les anomalies de type: ${typesConvertibles.join(', ')}`,
            typeActuel: anomalie.type
          });
        }

        // Récupérer les heures travaillées depuis les détails de l'anomalie
        const anomalieDetailsExtra = typeof anomalie.details === 'object' ? anomalie.details : {};
        const heuresExtraConversion = heuresExtra || 
          anomalieDetailsExtra.heuresTravaillees || 
          anomalie.heuresExtra || 
          0;
        
        if (heuresExtraConversion <= 0) {
          return res.status(400).json({ 
            error: 'Aucune heure à convertir pour cette anomalie. Précisez les heures via heuresExtra.',
            details: anomalieDetailsExtra
          });
        }

        const tauxConversion = tauxHoraire || 10; // Taux par défaut 10€/h
        const montantConversion = montantExtra || (heuresExtraConversion * tauxConversion);

        // Construire le commentaire avec contexte
        const pointagesInfo = anomalieDetailsExtra.pointages?.map(p => `${p.type}: ${p.heure}`).join(', ') || 'N/A';
        const commentaireConversion = commentaire || 
          `Heures extra converties - ${new Date(anomalie.date).toLocaleDateString('fr-FR')} - Pointages: ${pointagesInfo}`;

        // 1. Créer le paiement extra
        const paiementExtraConverti = await prisma.paiementExtra.create({
          data: {
            employeId: anomalie.employeId,
            anomalieId: anomalie.id,
            shiftId: anomalie.shiftId || null,
            date: anomalie.date,
            heures: parseFloat(heuresExtraConversion.toFixed(2)),
            tauxHoraire: parseFloat(tauxConversion),
            montant: parseFloat(montantConversion.toFixed(2)),
            source: 'conversion_anomalie', // 🆕 Source spécifique
            statut: 'a_payer',
            commentaire: commentaireConversion,
            creePar: userId
          }
        });

        // 2. Optionnel: Créer un shift rétroactif avec segment extra pour traçabilité
        let shiftExtraConverti = null;
        try {
          // Vérifier s'il n'y a pas déjà un shift ce jour
          const shiftExistant = await prisma.shift.findFirst({
            where: {
              employeId: anomalie.employeId,
              date: {
                gte: new Date(new Date(anomalie.date).setHours(0, 0, 0, 0)),
                lt: new Date(new Date(anomalie.date).setHours(23, 59, 59, 999))
              }
            }
          });

          if (!shiftExistant) {
            // Créer un shift avec segment extra
            // Récupérer les heures depuis les pointages
            const premiereHeure = anomalieDetailsExtra.pointages?.[0]?.heure || '09:00';
            const derniereHeure = anomalieDetailsExtra.pointages?.[anomalieDetailsExtra.pointages?.length - 1]?.heure || '17:00';
            
            shiftExtraConverti = await prisma.shift.create({
              data: {
                employeId: anomalie.employeId,
                date: anomalie.date,
                type: 'travail',
                segments: [{
                  start: premiereHeure,
                  end: derniereHeure,
                  isExtra: true, // 🔑 Marquer comme extra
                  commentaire: `Converti depuis anomalie #${anomalie.id} - ${commentaireConversion}`,
                  paiementExtraId: paiementExtraConverti.id
                }],
                notes: `🔄 Shift créé automatiquement depuis anomalie pointage_hors_planning`
              }
            });
            
            console.log(`📅 Shift extra créé: ID ${shiftExtraConverti.id}`);
          } else {
            // Ajouter le segment extra au shift existant
            const segmentsActuels = shiftExistant.segments || [];
            const premiereHeure = anomalieDetailsExtra.pointages?.[0]?.heure || '09:00';
            const derniereHeure = anomalieDetailsExtra.pointages?.[anomalieDetailsExtra.pointages?.length - 1]?.heure || '17:00';
            
            segmentsActuels.push({
              start: premiereHeure,
              end: derniereHeure,
              isExtra: true,
              commentaire: `Converti depuis anomalie #${anomalie.id}`,
              paiementExtraId: paiementExtraConverti.id
            });
            
            await prisma.shift.update({
              where: { id: shiftExistant.id },
              data: { 
                segments: segmentsActuels,
                notes: (shiftExistant.notes || '') + `\n🔄 Segment extra ajouté depuis anomalie #${anomalie.id}`
              }
            });
            
            console.log(`📅 Segment extra ajouté au shift existant: ID ${shiftExistant.id}`);
          }
        } catch (shiftError) {
          console.warn('⚠️ Impossible de créer le shift extra (non bloquant):', shiftError.message);
        }

        nouveauStatut = STATUTS.VALIDEE;
        
        // Mettre à jour les détails de l'anomalie
        updateData.details = {
          ...anomalieDetailsExtra,
          convertiEnExtra: true,
          paiementExtraId: paiementExtraConverti.id,
          heuresConverties: heuresExtraConversion,
          montantExtra: montantConversion,
          tauxHoraire: tauxConversion,
          shiftExtraId: shiftExtraConverti?.id || null
        };

        console.log(`🔄 Anomalie ${id} convertie en extra: ${heuresExtraConversion.toFixed(2)}h à ${tauxConversion}€/h = ${montantConversion.toFixed(2)}€ pour ${anomalie.employe.prenom} ${anomalie.employe.nom}`);
        
        break;
    }

    updateData.statut = nouveauStatut;

    // Mise à jour de l'anomalie
    const anomalieMAJ = await prisma.anomalie.update({
      where: { id: anomalieId },
      data: updateData,
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        },
        traiteur: {
          select: { nom: true, prenom: true }
        }
      }
    });

    // Log de l'action
    console.log(`🔧 Anomalie ${id} ${action}ée par ${userRole} ${userId} pour employé ${anomalie.employe.nom} ${anomalie.employe.prenom}`);
    console.log(`📊 Shift modifié: ${shiftModifie}`);

    // 🆕 CRÉER L'AUDIT TRAIL
    try {
      await prisma.anomalieAudit.create({
        data: {
          anomalieId: anomalieId,
          action,
          etatAvant,
          etatApres: anomalieMAJ,
          userId,
          userRole,
          commentaire,
          metadata: {
            shiftModifie,
            payerHeuresManquantes: payerHeuresManquantes || false,
            heuresARecuperer: heuresARecuperer || 0
          }
        }
      });
    } catch (auditError) {
      console.error('❌ Erreur création audit:', auditError);
      // On continue même si l'audit échoue
    }

    res.json({
      success: true,
      anomalie: anomalieMAJ,
      shiftModifie,
      payerHeuresManquantes: payerHeuresManquantes || false,
      heuresARecuperer: heuresARecuperer || 0,
      message: `Anomalie ${nouveauStatut} avec succès`
    });

  } catch (error) {
    console.error("Erreur traitement anomalie:", error);
    res.status(500).json({ error: "Erreur lors du traitement de l'anomalie" });
  }
};

/**
 * Récupérer le score et l'historique d'un employé
 * GET /api/anomalies/employe/:employeId/score
 */
const getScoreEmploye = async (req, res) => {
  const { employeId } = req.params;

  try {
    const score = await prisma.employeScore.findUnique({
      where: { employeId: parseInt(employeId) },
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    if (!score) {
      // Score par défaut si jamais traité
      return res.json({
        score: 100,
        historiqueModifications: [],
        employe: null
      });
    }

    // Récupérer aussi l'historique des audits
    const audits = await prisma.anomalieAudit.findMany({
      where: {
        anomalie: {
          employeId: parseInt(employeId)
        }
      },
      include: {
        anomalie: {
          select: {
            id: true,
            type: true,
            date: true,
            description: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    res.json({
      ...score,
      audits
    });

  } catch (error) {
    console.error('Erreur récupération score:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Statistiques des anomalies pour le dashboard
 * GET /api/anomalies/stats?employeId=1&periode=semaine
 */
const getStatsAnomalies = async (req, res) => {
  const { employeId, periode = 'semaine' } = req.query;

  try {
    let dateDebut;
    const maintenant = new Date();

    switch (periode) {
      case 'jour':
        dateDebut = new Date(maintenant);
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case 'semaine':
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() - 7);
        break;
      case 'mois':
        dateDebut = new Date(maintenant);
        dateDebut.setMonth(maintenant.getMonth() - 1);
        break;
      default:
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() - 7);
    }

    const where = {
      date: {
        gte: dateDebut
      }
    };

    if (employeId) {
      where.employeId = parseInt(employeId);
    }

    // Statistiques générales
    const [
      totalAnomalies,
      enAttente,
      validees,
      refusees,
      parType,
      parGravite
    ] = await Promise.all([
      prisma.anomalie.count({ where }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.EN_ATTENTE } }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.VALIDEE } }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.REFUSEE } }),
      prisma.anomalie.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.anomalie.groupBy({
        by: ['gravite'],
        where,
        _count: true
      })
    ]);

    // Anomalies récentes (pour widget)
    const anomaliesRecentes = await prisma.anomalie.findMany({
      where,
      include: {
        employe: {
          select: { nom: true, prenom: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      success: true,
      stats: {
        total: totalAnomalies,
        enAttente,
        validees,
        refusees,
        parType: parType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        parGravite: parGravite.reduce((acc, item) => {
          acc[item.gravite] = item._count;
          return acc;
        }, {})
      },
      anomaliesRecentes,
      periode
    });

  } catch (error) {
    console.error("Erreur stats anomalies:", error);
    res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
  }
};

/**
 * Marquer les anomalies comme vues (pour l'employé)
 * PUT /api/anomalies/marquer-vues
 */
const marquerAnomaliesVues = async (req, res) => {
  const { anomalieIds } = req.body;
  const userId = req.userId || req.user?.userId || req.user?.id; // Compatible avec authMiddleware

  if (!Array.isArray(anomalieIds) || anomalieIds.length === 0) {
    return res.status(400).json({ error: "Liste d'IDs d'anomalies requise" });
  }

  try {
    // Vérifier que l'utilisateur ne peut marquer que ses propres anomalies
    const result = await prisma.anomalie.updateMany({
      where: {
        id: { in: anomalieIds.map(id => parseInt(id)) },
        employeId: userId
      },
      data: {
        // On pourrait ajouter un champ 'vuParEmploye' si nécessaire
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      anomaliesMAJ: result.count
    });

  } catch (error) {
    console.error("Erreur marquage anomalies vues:", error);
    res.status(500).json({ error: "Erreur lors du marquage" });
  }
};

/**
 * Analytics avancés pour le dashboard
 * GET /api/anomalies/analytics?periode=mois&dept=all
 */
const getAnalytics = async (req, res) => {
  const { periode = 'mois', dept = 'all' } = req.query;

  try {
    let dateDebut, dateFin = new Date();
    const maintenant = new Date();

    // Calculer les dates selon la période
    switch (periode) {
      case 'jour':
        dateDebut = new Date(maintenant);
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case 'semaine':
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() - 7);
        break;
      case 'mois':
        dateDebut = new Date(maintenant);
        dateDebut.setMonth(maintenant.getMonth() - 1);
        break;
      case 'trimestre':
        dateDebut = new Date(maintenant);
        dateDebut.setMonth(maintenant.getMonth() - 3);
        break;
      case 'annee':
        dateDebut = new Date(maintenant);
        dateDebut.setFullYear(maintenant.getFullYear() - 1);
        break;
      default:
        dateDebut = new Date(maintenant);
        dateDebut.setMonth(maintenant.getMonth() - 1);
    }

    // Période précédente pour comparaison
    const duree = dateFin - dateDebut;
    const datePeriodePrecedente = new Date(dateDebut - duree);

    const where = {
      date: { gte: dateDebut, lte: dateFin }
    };
    const wherePeriodePrecedente = {
      date: { gte: datePeriodePrecedente, lte: dateDebut }
    };

    // 1. KPIs principaux
    const [
      totalEmployes,
      totalAnomaliesPeriode,
      totalAnomaliesPrecedente,
      enAttente,
      validees,
      refusees
    ] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['employee', 'manager'] } } }),
      prisma.anomalie.count({ where }),
      prisma.anomalie.count({ where: wherePeriodePrecedente }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.EN_ATTENTE } }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.VALIDEE } }),
      prisma.anomalie.count({ where: { ...where, statut: STATUTS.REFUSEE } })
    ]);

    // Taux de ponctualité = 100% - (anomalies / employés / jours)
    const nbJours = Math.ceil(duree / (1000 * 60 * 60 * 24));
    const tauxPonctualite = totalEmployes > 0 
      ? Math.max(0, 100 - ((totalAnomaliesPeriode / (totalEmployes * nbJours)) * 100))
      : 100;
    const tauxPonctualitePrecedente = totalEmployes > 0
      ? Math.max(0, 100 - ((totalAnomaliesPrecedente / (totalEmployes * nbJours)) * 100))
      : 100;

    // Taux de validation
    const tauxValidation = totalAnomaliesPeriode > 0
      ? ((validees / totalAnomaliesPeriode) * 100)
      : 100;
    const totalTraiteesPrecedente = await prisma.anomalie.count({
      where: { ...wherePeriodePrecedente, statut: { in: [STATUTS.VALIDEE, STATUTS.REFUSEE] } }
    });
    const valideesPrecedente = await prisma.anomalie.count({
      where: { ...wherePeriodePrecedente, statut: STATUTS.VALIDEE }
    });
    const tauxValidationPrecedente = totalTraiteesPrecedente > 0
      ? ((valideesPrecedente / totalTraiteesPrecedente) * 100)
      : 100;

    // Coût heures sup
    const heuresSup = await prisma.anomalie.findMany({
      where: {
        ...where,
        type: { contains: 'heures_sup' },
        statut: STATUTS.VALIDEE
      },
      select: { montantExtra: true }
    });
    const coutHeuresSup = heuresSup.reduce((sum, a) => sum + (a.montantExtra || 0), 0);

    const heuresSupPrecedente = await prisma.anomalie.findMany({
      where: {
        ...wherePeriodePrecedente,
        type: { contains: 'heures_sup' },
        statut: STATUTS.VALIDEE
      },
      select: { montantExtra: true }
    });
    const coutHeuresSupPrecedente = heuresSupPrecedente.reduce((sum, a) => sum + (a.montantExtra || 0), 0);

    // 2. Tendances (par jour/semaine selon période)
    const anomaliesGroupees = await prisma.anomalie.groupBy({
      by: ['date'],
      where,
      _count: true,
      orderBy: { date: 'asc' }
    });

    const tendances = anomaliesGroupees.map(a => ({
      label: a.date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      count: a._count
    }));

    // 3. Répartition par type
    const parType = await prisma.anomalie.groupBy({
      by: ['type'],
      where,
      _count: true,
      orderBy: { _count: { type: 'desc' } }
    });

    const repartitionTypes = parType.slice(0, 5).map(t => ({
      type: t.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: t._count
    }));

    // 4. Top employés à surveiller
    const anomaliesParEmploye = await prisma.anomalie.groupBy({
      by: ['employeId'],
      where: { ...where, gravite: { in: ['critique', 'attention'] } },
      _count: true,
      orderBy: { _count: { employeId: 'desc' } }
    });

    const topEmployesIds = anomaliesParEmploye.slice(0, 10).map(a => a.employeId);
    const employesDetails = await prisma.user.findMany({
      where: { id: { in: topEmployesIds } },
      select: { id: true, nom: true, prenom: true, categorie: true }
    });

    const topEmployes = await Promise.all(
      anomaliesParEmploye.slice(0, 10).map(async (a) => {
        const employe = employesDetails.find(e => e.id === a.employeId);
        const score = await calculerScoreEmploye(a.employeId, dateDebut, dateFin);
        const tendance = await determinerTendance(a.employeId, dateDebut, dateFin);
        
        return {
          nom: employe ? `${employe.prenom} ${employe.nom}` : 'Inconnu',
          poste: employe?.categorie || 'N/A',
          nbAnomalies: a._count,
          score: score,
          tendance: tendance
        };
      })
    );

    // 5. Insights et recommandations (IA basique)
    const insights = [];

    if (enAttente > 10) {
      insights.push({
        type: 'warning',
        titre: 'Volume élevé d\'anomalies en attente',
        description: `${enAttente} anomalies nécessitent votre attention. Priorisez les critiques.`,
        action: 'Voir anomalies'
      });
    }

    if (tauxPonctualite < 85) {
      insights.push({
        type: 'warning',
        titre: 'Taux de ponctualité faible',
        description: `Le taux est de ${tauxPonctualite.toFixed(1)}%. Envisagez un entretien d'équipe.`,
        action: 'Planifier entretien'
      });
    }

    if (tauxValidation > 90) {
      insights.push({
        type: 'success',
        titre: 'Excellent taux de validation',
        description: `${tauxValidation.toFixed(1)}% des anomalies sont validées. L'équipe répond bien.`,
        action: null
      });
    }

    if (coutHeuresSup > 1000) {
      insights.push({
        type: 'info',
        titre: 'Coût heures sup élevé',
        description: `${coutHeuresSup.toFixed(0)}€ ce mois. Vérifiez la planification.`,
        action: 'Optimiser planning'
      });
    }

    // KPIs avec évolution
    const kpis = {
      tauxPonctualite: Math.round(tauxPonctualite * 10) / 10,
      tauxPonctualiteEvolution: Math.round((tauxPonctualite - tauxPonctualitePrecedente) * 10) / 10,
      enAttente,
      enAttenteEvolution: Math.round(((enAttente - (totalAnomaliesPrecedente - totalTraiteesPrecedente)) / Math.max(1, totalAnomaliesPrecedente - totalTraiteesPrecedente)) * 100),
      tauxValidation: Math.round(tauxValidation * 10) / 10,
      tauxValidationEvolution: Math.round((tauxValidation - tauxValidationPrecedente) * 10) / 10,
      coutHeuresSup: Math.round(coutHeuresSup),
      coutHeuresSupEvolution: Math.round(((coutHeuresSup - coutHeuresSupPrecedente) / Math.max(1, coutHeuresSupPrecedente)) * 100),
      repartitionTypes,
      insights
    };

    res.json({
      success: true,
      kpis,
      tendances,
      topEmployes,
      couts: {
        heuresSup: coutHeuresSup,
        total: coutHeuresSup
      }
    });

  } catch (error) {
    console.error("Erreur analytics:", error);
    res.status(500).json({ error: "Erreur lors du calcul des analytics" });
  }
};

/**
 * Calculer le score de ponctualité d'un employé (0-100)
 */
async function calculerScoreEmploye(employeId, dateDebut, dateFin) {
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId,
      date: { gte: dateDebut, lte: dateFin }
    }
  });

  let score = 100;
  
  anomalies.forEach(a => {
    if (a.type.includes('retard_critique')) score -= 15;
    else if (a.type.includes('retard_modere')) score -= 5;
    else if (a.type.includes('retard')) score -= 2;
    else if (a.gravite === 'critique') score -= 10;
    else if (a.gravite === 'attention') score -= 3;
  });

  return Math.max(0, Math.min(100, score));
}

/**
 * Déterminer la tendance (amélioration/dégradation/stable)
 */
async function determinerTendance(employeId, dateDebut, dateFin) {
  const duree = dateFin - dateDebut;
  const milieu = new Date(dateDebut.getTime() + duree / 2);

  const [premiereMoitie, secondeMoitie] = await Promise.all([
    prisma.anomalie.count({
      where: {
        employeId,
        date: { gte: dateDebut, lt: milieu },
        gravite: { in: ['critique', 'attention'] }
      }
    }),
    prisma.anomalie.count({
      where: {
        employeId,
        date: { gte: milieu, lte: dateFin },
        gravite: { in: ['critique', 'attention'] }
      }
    })
  ]);

  if (secondeMoitie < premiereMoitie * 0.8) return 'amelioration';
  if (secondeMoitie > premiereMoitie * 1.2) return 'degradation';
  return 'stable';
}

/**
 * Score détaillé d'un employé avec historique
 * GET /api/anomalies/score/:employeId
 */
const getEmployeScore = async (req, res) => {
  const { employeId } = req.params;

  try {
    const maintenant = new Date();
    const il30Jours = new Date(maintenant);
    il30Jours.setDate(maintenant.getDate() - 30);

    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: parseInt(employeId),
        date: { gte: il30Jours }
      },
      orderBy: { date: 'asc' }
    });

    // Historique par semaine (4 semaines)
    const historique = [];
    for (let i = 0; i < 4; i++) {
      const debutSemaine = new Date(il30Jours);
      debutSemaine.setDate(il30Jours.getDate() + (i * 7));
      const finSemaine = new Date(debutSemaine);
      finSemaine.setDate(debutSemaine.getDate() + 7);

      const anomaliesSemaine = anomalies.filter(a => 
        a.date >= debutSemaine && a.date < finSemaine
      );

      let scoreSemaine = 100;
      anomaliesSemaine.forEach(a => {
        if (a.type.includes('retard_critique')) scoreSemaine -= 15;
        else if (a.type.includes('retard_modere')) scoreSemaine -= 5;
        else if (a.type.includes('retard')) scoreSemaine -= 2;
        else if (a.gravite === 'critique') scoreSemaine -= 10;
        else if (a.gravite === 'attention') scoreSemaine -= 3;
      });

      historique.push({
        semaine: `S${i + 1}`,
        score: Math.max(0, scoreSemaine)
      });
    }

    const scoreActuel = historique[historique.length - 1]?.score || 100;
    const scorePrecedent = historique[historique.length - 2]?.score || 100;
    const tendance = scoreActuel > scorePrecedent ? 'hausse' : 
                     scoreActuel < scorePrecedent ? 'baisse' : 'stable';

    res.json({
      success: true,
      score: scoreActuel,
      historique,
      tendance
    });

  } catch (error) {
    console.error("Erreur score employé:", error);
    res.status(500).json({ error: "Erreur calcul score" });
  }
};

/**
 * Détecter les patterns d'anomalies
 * GET /api/anomalies/patterns/:employeId
 */
const getEmployePatterns = async (req, res) => {
  const { employeId } = req.params;

  try {
    const maintenant = new Date();
    const il30Jours = new Date(maintenant);
    il30Jours.setDate(maintenant.getDate() - 30);

    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: parseInt(employeId),
        date: { gte: il30Jours }
      },
      orderBy: { date: 'desc' }
    });

    const patterns = [];

    // Pattern 1: Retards répétitifs (3+ en 7 jours)
    const retards = anomalies.filter(a => a.type.includes('retard'));
    if (retards.length >= 3) {
      const dernierRetard = retards[0].date;
      const il7Jours = new Date(dernierRetard);
      il7Jours.setDate(dernierRetard.getDate() - 7);
      const retardsRecents = retards.filter(r => r.date >= il7Jours);
      
      if (retardsRecents.length >= 3) {
        patterns.push({
          type: 'retards_repetitifs',
          titre: 'Retards répétitifs détectés',
          description: `${retardsRecents.length} retards en 7 jours`,
          gravite: 'critique',
          actions: ['Entretien individuel', 'Vérifier contraintes personnelles']
        });
      }
    }

    // Pattern 2: Absences stratégiques (vendredi/lundi)
    const absences = anomalies.filter(a => a.type.includes('absence') || a.type.includes('missing'));
    const absencesWeekend = absences.filter(a => {
      const jour = a.date.getDay();
      return jour === 1 || jour === 5; // Lundi ou Vendredi
    });

    if (absencesWeekend.length >= 2) {
      patterns.push({
        type: 'absences_strategiques',
        titre: 'Absences en fin/début de semaine',
        description: `${absencesWeekend.length} absences les lundis/vendredis`,
        gravite: 'attention',
        actions: ['Vérifier justificatifs', 'Discuter organisation']
      });
    }

    // Pattern 3: Heures sup excessives
    const heuresSup = anomalies.filter(a => a.type.includes('heures_sup'));
    const totalHeuresSup = heuresSup.reduce((sum, a) => {
      const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
      return sum + Math.abs(details?.ecartMinutes || 0);
    }, 0);

    if (totalHeuresSup > 600) { // 10h en 30 jours
      patterns.push({
        type: 'heures_sup_excessives',
        titre: 'Volume élevé d\'heures supplémentaires',
        description: `${Math.round(totalHeuresSup / 60)}h en 30 jours`,
        gravite: 'attention',
        actions: ['Rééquilibrer charge de travail', 'Vérifier planning']
      });
    }

    res.json({
      success: true,
      patterns
    });

  } catch (error) {
    console.error("Erreur patterns:", error);
    res.status(500).json({ error: "Erreur détection patterns" });
  }
};

/**
 * Demander une justification à l'employé
 * POST /api/anomalies/:id/demander-justification
 */
const demanderJustification = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.userId || req.user?.userId || req.user?.id;

  try {
    const anomalie = await prisma.anomalie.findUnique({
      where: { id: parseInt(id) },
      include: { employe: true }
    });

    if (!anomalie) {
      return res.status(404).json({ error: "Anomalie non trouvée" });
    }

    // Mettre à jour l'anomalie avec la demande
    const updated = await prisma.anomalie.update({
      where: { id: parseInt(id) },
      data: {
        details: {
          ...anomalie.details,
          justificationDemandee: true,
          justificationMessage: message,
          justificationDemandeeAt: new Date().toISOString(),
          justificationDemandePar: userId,
          justificationDelai: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
        }
      }
    });

    // TODO: Envoyer notification à l'employé (email/push)
    console.log(`📧 Justification demandée pour anomalie ${id} - Employé: ${anomalie.employe.email}`);

    res.json({
      success: true,
      anomalie: updated,
      message: 'Demande de justification envoyée'
    });

  } catch (error) {
    console.error("Erreur demande justification:", error);
    res.status(500).json({ error: "Erreur lors de la demande" });
  }
};

/**
 * 🔄 Invalider les anomalies après modification de shift
 * Appelé automatiquement quand un shift est modifié
 * POST /api/anomalies/invalider-pour-shift
 */
const invaliderAnomaliesPourShift = async (req, res) => {
  const { employeId, date, shiftId, raison } = req.body;

  if (!employeId || !date) {
    return res.status(400).json({ error: "employeId et date requis" });
  }

  try {
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Trouver toutes les anomalies en_attente pour cet employé et cette date
    const anomaliesAInvalider = await prisma.anomalie.findMany({
      where: {
        employeId: parseInt(employeId),
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        statut: STATUTS.EN_ATTENTE
      }
    });

    if (anomaliesAInvalider.length === 0) {
      return res.json({
        success: true,
        invalidees: 0,
        message: "Aucune anomalie en attente à invalider"
      });
    }

    // Marquer comme obsolètes (nouveau statut ou ajout dans details)
    const updatePromises = anomaliesAInvalider.map(anomalie => 
      prisma.anomalie.update({
        where: { id: anomalie.id },
        data: {
          details: {
            ...(typeof anomalie.details === 'object' ? anomalie.details : {}),
            obsolete: true,
            obsoleteRaison: raison || 'Shift modifié après création de l\'anomalie',
            obsoleteAt: new Date().toISOString(),
            shiftModifieId: shiftId || null
          },
          statut: 'obsolete' // Nouveau statut
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`🔄 ${anomaliesAInvalider.length} anomalie(s) invalidée(s) suite à modification shift pour employé ${employeId} le ${date}`);

    res.json({
      success: true,
      invalidees: anomaliesAInvalider.length,
      anomaliesIds: anomaliesAInvalider.map(a => a.id),
      message: `${anomaliesAInvalider.length} anomalie(s) marquée(s) comme obsolètes`
    });

  } catch (error) {
    console.error("Erreur invalidation anomalies:", error);
    res.status(500).json({ error: "Erreur lors de l'invalidation des anomalies" });
  }
};

/**
 * ⏰ Récupérer les anomalies non traitées depuis plus de X jours
 * GET /api/anomalies/alertes-non-traitees?jours=7
 */
const getAlertesNonTraitees = async (req, res) => {
  const { jours = 7, employeId, gravite } = req.query;
  const joursLimite = parseInt(jours);

  try {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - joursLimite);

    const where = {
      statut: STATUTS.EN_ATTENTE,
      createdAt: {
        lte: dateLimite
      }
    };

    if (employeId) {
      where.employeId = parseInt(employeId);
    }

    if (gravite) {
      where.gravite = gravite;
    }

    const anomaliesEnRetard = await prisma.anomalie.findMany({
      where,
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      },
      orderBy: [
        { gravite: 'desc' }, // Critiques en premier
        { createdAt: 'asc' }  // Plus anciennes en premier
      ]
    });

    // Calculer le nombre de jours en attente pour chaque anomalie
    const anomaliesAvecRetard = anomaliesEnRetard.map(anomalie => {
      const joursEnAttente = Math.floor(
        (new Date() - new Date(anomalie.createdAt)) / (1000 * 60 * 60 * 24)
      );
      return {
        ...anomalie,
        joursEnAttente,
        urgence: joursEnAttente > 14 ? 'critique' : joursEnAttente > 7 ? 'haute' : 'normale'
      };
    });

    // Statistiques par gravité
    const statsParGravite = {
      critique: anomaliesAvecRetard.filter(a => a.gravite === 'critique').length,
      attention: anomaliesAvecRetard.filter(a => a.gravite === 'attention').length,
      hors_plage: anomaliesAvecRetard.filter(a => a.gravite === 'hors_plage').length,
      a_valider: anomaliesAvecRetard.filter(a => a.gravite === 'a_valider').length,
      info: anomaliesAvecRetard.filter(a => a.gravite === 'info').length
    };

    // Statistiques par employé (top 5 avec le plus d'anomalies en retard)
    const parEmploye = {};
    anomaliesAvecRetard.forEach(a => {
      const key = a.employeId;
      if (!parEmploye[key]) {
        parEmploye[key] = {
          employeId: a.employeId,
          nom: a.employe?.nom || 'Inconnu',
          prenom: a.employe?.prenom || '',
          count: 0,
          maxJours: 0
        };
      }
      parEmploye[key].count++;
      parEmploye[key].maxJours = Math.max(parEmploye[key].maxJours, a.joursEnAttente);
    });

    const topEmployes = Object.values(parEmploye)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      total: anomaliesAvecRetard.length,
      seuilJours: joursLimite,
      anomalies: anomaliesAvecRetard,
      stats: {
        parGravite: statsParGravite,
        topEmployes,
        plusAncienne: anomaliesAvecRetard.length > 0 
          ? anomaliesAvecRetard[anomaliesAvecRetard.length - 1].joursEnAttente 
          : 0
      },
      alerte: anomaliesAvecRetard.length > 0,
      message: anomaliesAvecRetard.length > 0 
        ? `⚠️ ${anomaliesAvecRetard.length} anomalie(s) en attente depuis plus de ${joursLimite} jours`
        : `✅ Aucune anomalie en retard de traitement`
    });

  } catch (error) {
    console.error("Erreur récupération alertes:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des alertes" });
  }
};

/**
 * Récupérer le bilan journalier d'un employé pour une date donnée
 * GET /api/anomalies/bilan-journalier/:employeId/:date
 * Retourne le solde net (heures sup - retards/départs anticipés)
 */
const getBilanJournalier = async (req, res) => {
  const { employeId, date } = req.params;
  
  try {
    // Utiliser des dates UTC pour éviter les problèmes de timezone
    const dateDebut = new Date(date + 'T00:00:00.000Z');
    const dateFin = new Date(date + 'T23:59:59.999Z');
    
    console.log(`📊 Bilan journalier: employeId=${employeId}, date=${date}`);
    
    // 1. Récupérer le shift prévu pour ce jour
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: parseInt(employeId),
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z')
        }
      }
    });
    
    // 2. Récupérer les pointages réels
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    // 3. Récupérer les anomalies pour référence
    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: parseInt(employeId),
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`   Shift trouvé: ${shift ? 'OUI' : 'NON'}, Pointages: ${pointages.length}, Anomalies: ${anomalies.length}`);
    
    // Helper: convertir "HH:MM" en minutes depuis minuit
    const heureEnMinutes = (heure) => {
      if (!heure) return 0;
      const [h, m] = heure.split(':').map(Number);
      return h * 60 + m;
    };
    
    // Helper: convertir Date en minutes depuis minuit (heure locale Paris)
    const dateEnMinutes = (d) => {
      // Ajouter 1h pour Paris (UTC+1 en hiver)
      const parisDate = new Date(d.getTime() + 60 * 60 * 1000);
      return parisDate.getUTCHours() * 60 + parisDate.getUTCMinutes();
    };
    
    // 4. CALCUL MÉTIER : Temps travaillé net vs temps prévu
    let minutesPrevues = 0;
    let minutesTravaillees = 0;
    const detailsSegments = [];
    
    // Extraire les segments du shift
    const segments = shift?.segments || [];
    
    // Regrouper les pointages en paires arrivée/départ
    const pairesPointages = [];
    for (let i = 0; i < pointages.length; i += 2) {
      if (pointages[i] && pointages[i + 1]) {
        pairesPointages.push({
          arrivee: pointages[i],
          depart: pointages[i + 1]
        });
      }
    }
    
    // Calculer pour chaque segment
    segments.forEach((segment, idx) => {
      const debutPrevu = heureEnMinutes(segment.debut || segment.start);
      const finPrevue = heureEnMinutes(segment.fin || segment.end);
      const dureePrevue = finPrevue - debutPrevu;
      minutesPrevues += dureePrevue;
      
      // Trouver le pointage correspondant (même index)
      const pointage = pairesPointages[idx];
      let dureeReelle = 0;
      let arriveeReelle = null;
      let departReel = null;
      
      if (pointage) {
        arriveeReelle = dateEnMinutes(pointage.arrivee.horodatage);
        departReel = dateEnMinutes(pointage.depart.horodatage);
        dureeReelle = departReel - arriveeReelle;
        minutesTravaillees += dureeReelle;
      }
      
      const ecartSegment = dureeReelle - dureePrevue;
      
      detailsSegments.push({
        segment: idx + 1,
        prevu: {
          debut: segment.debut || segment.start,
          fin: segment.fin || segment.end,
          duree: dureePrevue
        },
        reel: pointage ? {
          debut: `${Math.floor(arriveeReelle / 60)}:${String(arriveeReelle % 60).padStart(2, '0')}`,
          fin: `${Math.floor(departReel / 60)}:${String(departReel % 60).padStart(2, '0')}`,
          duree: dureeReelle
        } : null,
        ecart: ecartSegment
      });
    });
    
    // 5. SOLDE NET = temps travaillé - temps prévu
    const soldeMinutes = minutesTravaillees - minutesPrevues;
    const soldeHeures = soldeMinutes / 60;
    
    // 6. Catégoriser les anomalies pour l'affichage (garder la compatibilité)
    let minutesRetardAnomalies = 0;
    let minutesHeuresSupAnomalies = 0;
    const detailsNegatifs = [];
    const detailsPositifs = [];
    
    anomalies.forEach(anomalie => {
      const ecartMinutes = anomalie.details?.ecartMinutes || 
        anomalie.ecartMinutes || 
        (anomalie.heuresExtra ? anomalie.heuresExtra * 60 : 0) || 0;
      
      if (['retard', 'retard_modere', 'retard_critique', 'retard_simple', 'depart_anticipe'].includes(anomalie.type)) {
        minutesRetardAnomalies += Math.abs(ecartMinutes);
        detailsNegatifs.push({
          id: anomalie.id,
          type: anomalie.type,
          minutes: Math.abs(ecartMinutes),
          description: anomalie.description,
          statut: anomalie.statut
        });
      } else if (['heures_sup', 'heures_sup_a_valider', 'heures_sup_auto_validees', 'hors_plage_out'].includes(anomalie.type)) {
        minutesHeuresSupAnomalies += Math.abs(ecartMinutes);
        detailsPositifs.push({
          id: anomalie.id,
          type: anomalie.type,
          minutes: Math.abs(ecartMinutes),
          description: anomalie.description,
          statut: anomalie.statut
        });
      }
    });
    
    // Formatage du solde
    const formatMinutes = (mins) => {
      const h = Math.floor(Math.abs(mins) / 60);
      const m = Math.abs(mins) % 60;
      const signe = mins < 0 ? '-' : '+';
      return `${signe}${h}h${m.toString().padStart(2, '0')}`;
    };
    
    console.log(`📊 Bilan: Prévu=${minutesPrevues}min, Travaillé=${minutesTravaillees}min, Solde=${soldeMinutes}min`);
    
    res.json({
      success: true,
      employeId: parseInt(employeId),
      date,
      // NOUVEAU: Calcul basé sur temps travaillé réel
      calcul: {
        methode: 'temps_travaille_net',
        minutesPrevues,
        minutesTravaillees,
        soldeMinutes,
        soldeHeures: parseFloat(soldeHeures.toFixed(2)),
        detailsSegments
      },
      // ANCIEN FORMAT (compatibilité) - mais avec valeurs corrigées
      bilan: {
        retards: {
          totalMinutes: minutesRetardAnomalies,
          formatted: formatMinutes(-minutesRetardAnomalies),
          details: detailsNegatifs
        },
        heuresSup: {
          totalMinutes: minutesHeuresSupAnomalies,
          formatted: formatMinutes(minutesHeuresSupAnomalies),
          details: detailsPositifs
        },
        solde: {
          // Utiliser le VRAI solde net calculé
          minutes: soldeMinutes,
          heures: parseFloat(soldeHeures.toFixed(2)),
          formatted: formatMinutes(soldeMinutes),
          isPositif: soldeMinutes > 0,
          isNegatif: soldeMinutes < 0,
          isNeutre: soldeMinutes === 0
        }
      },
      recommendation: {
        extraPayable: soldeMinutes > 0,
        heuresSuggeres: soldeMinutes > 0 ? parseFloat((soldeMinutes / 60).toFixed(2)) : 0,
        message: soldeMinutes > 0 
          ? `✅ Solde positif : ${formatMinutes(soldeMinutes)} payables en extra`
          : soldeMinutes < 0
            ? `⚠️ Solde négatif : l'employé doit ${formatMinutes(Math.abs(soldeMinutes))} - aucun extra recommandé`
            : `📊 Solde neutre : heures conformes au planning`
      }
    });
    
  } catch (error) {
    console.error("Erreur calcul bilan journalier:", error);
    res.status(500).json({ error: "Erreur lors du calcul du bilan journalier" });
  }
};

module.exports = {
  syncAnomaliesFromComparison,
  getAnomalies,
  traiterAnomalie,
  getStatsAnomalies,
  marquerAnomaliesVues,
  getAnalytics,
  getEmployeScore,
  getEmployePatterns,
  demanderJustification,
  invaliderAnomaliesPourShift,
  getAlertesNonTraitees,
  getBilanJournalier,
  ANOMALIE_TYPES,
  GRAVITE_LEVELS,
  STATUTS
};
