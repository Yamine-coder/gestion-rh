// server/controllers/anomaliesController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getParisDateString } = require("../utils/parisTimeUtils");

/**
 * Types et gravités d'anomalies supportés
 */
const ANOMALIE_TYPES = {
  RETARD: 'retard',
  HORS_PLAGE: 'hors_plage',
  ABSENCE_TOTALE: 'absence_totale',
  PRESENCE_NON_PREVUE: 'presence_non_prevue',
  DEPART_ANTICIPE: 'depart_anticipe',
  HEURES_SUP: 'heures_sup',
  ABSENCE_PLANIFIEE_AVEC_POINTAGE: 'absence_planifiee_avec_pointage'
};

const GRAVITE_LEVELS = {
  CRITIQUE: 'critique',
  ATTENTION: 'attention',
  INFO: 'info'
};

const STATUTS = {
  EN_ATTENTE: 'en_attente',
  VALIDEE: 'validee',
  REFUSEE: 'refusee',
  CORRIGEE: 'corrigee'
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
 */
const determineGravite = (ecart) => {
  switch (ecart.type) {
    case ANOMALIE_TYPES.RETARD:
      if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_CRITIQUE_MINUTES) {
        return GRAVITE_LEVELS.CRITIQUE;
      } else if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_ATTENTION_MINUTES) {
        return GRAVITE_LEVELS.ATTENTION;
      }
      return GRAVITE_LEVELS.INFO;

    case ANOMALIE_TYPES.DEPART_ANTICIPE:
      if (Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.DEPART_ANTICIPE_CRITIQUE_MINUTES) {
        return GRAVITE_LEVELS.CRITIQUE;
      }
      return GRAVITE_LEVELS.ATTENTION;

    case ANOMALIE_TYPES.HORS_PLAGE:
      // Toujours critique si hors des heures normales
      return GRAVITE_LEVELS.CRITIQUE;

    case ANOMALIE_TYPES.HEURES_SUP:
      const heuresExtra = Math.abs(ecart.ecartMinutes) / 60;
      if (heuresExtra >= ANOMALIE_CRITERIA.HEURES_SUP_ADMIN_VALIDATION) {
        return GRAVITE_LEVELS.CRITIQUE;
      }
      return GRAVITE_LEVELS.ATTENTION;

    case ANOMALIE_TYPES.ABSENCE_TOTALE:
    case ANOMALIE_TYPES.PRESENCE_NON_PREVUE:
    case ANOMALIE_TYPES.ABSENCE_PLANIFIEE_AVEC_POINTAGE:
      return GRAVITE_LEVELS.CRITIQUE;

    default:
      return GRAVITE_LEVELS.INFO;
  }
};

/**
 * Vérifie si un écart est significatif selon nos critères
 */
const isEcartSignificatif = (ecart) => {
  // Ignorer les écarts trop petits
  if (ecart.ecartMinutes && Math.abs(ecart.ecartMinutes) < ANOMALIE_CRITERIA.ECART_MINIMUM_MINUTES) {
    return false;
  }

  // Vérifier selon le type
  switch (ecart.type) {
    case ANOMALIE_TYPES.RETARD:
    case ANOMALIE_TYPES.DEPART_ANTICIPE:
      return Math.abs(ecart.ecartMinutes) >= ANOMALIE_CRITERIA.RETARD_ATTENTION_MINUTES;
    
    case ANOMALIE_TYPES.HORS_PLAGE:
    case ANOMALIE_TYPES.ABSENCE_TOTALE:
    case ANOMALIE_TYPES.PRESENCE_NON_PREVUE:
    case ANOMALIE_TYPES.ABSENCE_PLANIFIEE_AVEC_POINTAGE:
      return true; // Toujours significatifs
    
    case ANOMALIE_TYPES.HEURES_SUP:
      return Math.abs(ecart.ecartMinutes) >= 30; // Au moins 30 min d'heures sup
    
    default:
      return true;
  }
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
 */
const getAnomalies = async (req, res) => {
  const { employeId, dateDebut, dateFin, statut, type, gravite, limit = 50, offset = 0 } = req.query;

  try {
    const where = {};

    if (employeId) {
      where.employeId = parseInt(employeId);
    }

    if (dateDebut && dateFin) {
      where.date = {
        gte: new Date(dateDebut + 'T00:00:00.000Z'),
        lte: new Date(dateFin + 'T23:59:59.999Z')
      };
    } else if (dateDebut) {
      where.date = {
        gte: new Date(dateDebut + 'T00:00:00.000Z')
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
 * Traiter une anomalie (valider, refuser, corriger)
 * PUT /api/anomalies/:id/traiter
 */
const traiterAnomalie = async (req, res) => {
  const { id } = req.params;
  const { action, commentaire, montantExtra, heuresExtra } = req.body;
  const userId = req.userId || req.user?.userId || req.user?.id; // Compatible avec authMiddleware

  console.log('🔍 traiterAnomalie - Params:', { id, action, userId });
  console.log('🔍 traiterAnomalie - Body:', req.body);
  console.log('🔍 traiterAnomalie - Raw ID:', id, 'Type:', typeof id);

  if (!id) {
    return res.status(400).json({ error: "ID de l'anomalie requis" });
  }

  if (!action || !['valider', 'refuser', 'corriger'].includes(action)) {
    return res.status(400).json({ error: "Action invalide (valider, refuser, corriger)" });
  }

  try {
    const anomalieId = parseInt(id);
    console.log('🔍 traiterAnomalie - Parsed ID:', anomalieId);
    
    if (isNaN(anomalieId)) {
      return res.status(400).json({ error: "ID d'anomalie invalide" });
    }
    const anomalie = await prisma.anomalie.findUnique({
      where: { id: anomalieId },
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    if (!anomalie) {
      return res.status(404).json({ error: "Anomalie non trouvée" });
    }

    if (anomalie.statut !== STATUTS.EN_ATTENTE) {
      return res.status(400).json({ 
        error: `Cette anomalie a déjà été traitée (statut: ${anomalie.statut})`,
        currentStatus: anomalie.statut,
        anomalieId: anomalie.id
      });
    }

    let nouveauStatut;
    const updateData = {
      commentaire,
      traitePar: userId,
      traiteAt: new Date()
    };

    switch (action) {
      case 'valider':
        nouveauStatut = STATUTS.VALIDEE;
        // Pour les heures sup, on peut ajuster le montant
        if (anomalie.type === ANOMALIE_TYPES.HEURES_SUP) {
          if (montantExtra !== undefined) updateData.montantExtra = parseFloat(montantExtra);
          if (heuresExtra !== undefined) updateData.heuresExtra = parseFloat(heuresExtra);
        }
        break;
      case 'refuser':
        nouveauStatut = STATUTS.REFUSEE;
        break;
      case 'corriger':
        nouveauStatut = STATUTS.CORRIGEE;
        break;
    }

    updateData.statut = nouveauStatut;

    const anomalieMAJ = await prisma.anomalie.update({
      where: { id: parseInt(id) },
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
    console.log(`🔧 Anomalie ${id} ${action}ée par admin ${userId} pour employé ${anomalie.employe.nom} ${anomalie.employe.prenom}`);

    res.json({
      success: true,
      anomalie: anomalieMAJ,
      message: `Anomalie ${action}ée avec succès`
    });

  } catch (error) {
    console.error("Erreur traitement anomalie:", error);
    res.status(500).json({ error: "Erreur lors du traitement de l'anomalie" });
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

module.exports = {
  syncAnomaliesFromComparison,
  getAnomalies,
  traiterAnomalie,
  getStatsAnomalies,
  marquerAnomaliesVues,
  ANOMALIE_TYPES,
  GRAVITE_LEVELS,
  STATUTS
};
