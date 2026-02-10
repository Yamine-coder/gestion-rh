// =====================================================
// SERVICE DE SCORING AUTOMATIQUE
// Attribue automatiquement les points basés sur les événements
// Migré de raw SQL (pg Pool) vers Prisma ORM
// =====================================================
require('dotenv').config();
const prisma = require('../prisma/client');
const { isEntree } = require('../utils/pointageTypeUtils');

/**
 * Attribue des points à un employé
 * @param {number} employeId - ID de l'employé
 * @param {string} ruleCode - Code de la règle (ex: 'RETARD_LEGER')
 * @param {string} motif - Description optionnelle
 * @param {string} dateEvenement - Date de l'événement
 * @param {string} referenceType - Type de référence (pointage, anomalie, etc.)
 * @param {number} referenceId - ID de la référence
 * @param {number} createdBy - ID du créateur (null si auto)
 */
async function attribuerPoints(employeId, ruleCode, motif = null, dateEvenement = null, referenceType = null, referenceId = null, createdBy = null) {
  try {
    // Récupérer la règle — Prisma
    const rule = await prisma.scoringRule.findFirst({
      where: { code: ruleCode, actif: true },
      select: { id: true, points: true, label: true }
    });
    
    if (!rule) {
      console.warn(`[SCORING] Règle inconnue: ${ruleCode}`);
      return null;
    }
    
    const date = dateEvenement ? new Date(dateEvenement) : new Date();
    
    // Vérifier si déjà attribué (éviter doublons pour la même référence)
    if (referenceType && referenceId) {
      const existing = await prisma.employePoint.findFirst({
        where: { employeId, ruleCode, referenceType, referenceId }
      });
      if (existing) return null;
    }
    
    // Insérer les points — Prisma
    const created = await prisma.employePoint.create({
      data: {
        employeId,
        ruleId: rule.id,
        ruleCode,
        points: rule.points,
        motif,
        dateEvenement: date,
        referenceType,
        referenceId,
        createdBy
      }
    });
    
    return created;
  } catch (error) {
    console.error('[SCORING] Erreur attribution:', error.message);
    return null;
  }
}

/**
 * Attribue des points personnalisés (bonus/malus custom)
 */
async function attribuerPointsCustom(employeId, points, motif, dateEvenement = null, createdBy = null) {
  try {
    const date = dateEvenement ? new Date(dateEvenement) : new Date();
    const ruleCode = points >= 0 ? 'BONUS_CUSTOM' : 'MALUS_CUSTOM';
    
    const created = await prisma.employePoint.create({
      data: {
        employeId,
        ruleCode,
        points,
        motif,
        dateEvenement: date,
        createdBy
      }
    });
    
    return created;
  } catch (error) {
    console.error('[SCORING] Erreur attribution custom:', error.message);
    return null;
  }
}

// =====================================================
// HOOKS AUTOMATIQUES
// =====================================================

/**
 * Hook appelé après un pointage
 * @param {object} pointage - Le pointage créé { id, employe_id, type, heure, shift_id }
 * @param {object} shift - Le shift associé (optionnel) { start, end }
 */
async function onPointage(pointage, shift = null) {
  if (!pointage || !pointage.employe_id) return;
  
  const employeId = pointage.employe_id;
  const date = pointage.date || new Date().toISOString().split('T')[0];
  
  // Si c'est un pointage d'arrivée et qu'on a le shift
  if (isEntree(pointage.type) && shift && shift.start) {
    const heurePointage = pointage.heure; // Format HH:mm ou HH:mm:ss
    const heureShift = shift.start;
    
    const minutesRetard = calculerRetardMinutes(heureShift, heurePointage);
    
    if (minutesRetard <= 0) {
      // Ponctuel ou en avance
      await attribuerPoints(employeId, 'POINTAGE_PONCTUEL', 
        'Arrivé à l\'heure', date, 'pointage', pointage.id);
    } else if (minutesRetard <= 15) {
      // Retard léger
      await attribuerPoints(employeId, 'RETARD_LEGER', 
        `Retard de ${minutesRetard} minutes`, date, 'pointage', pointage.id);
    } else if (minutesRetard <= 30) {
      // Retard modéré
      await attribuerPoints(employeId, 'RETARD_MODERE', 
        `Retard de ${minutesRetard} minutes`, date, 'pointage', pointage.id);
    } else {
      // Retard grave
      await attribuerPoints(employeId, 'RETARD_GRAVE', 
        `Retard de ${minutesRetard} minutes`, date, 'pointage', pointage.id);
    }
  }
}

/**
 * Hook appelé quand une anomalie est créée
 */
async function onAnomalieCreee(anomalie) {
  // On n'attribue pas de malus immédiatement
  // Les malus sont attribués si l'anomalie n'est pas résolue sous 48h
  // Voir le job checkAnomaliesNonResolues()
}

/**
 * Hook appelé quand une anomalie est résolue
 */
async function onAnomalieResolue(anomalie) {
  // Pas de malus si résolue à temps
}

/**
 * Hook appelé quand un remplacement est accepté
 */
async function onRemplacementAccepte(remplacement) {
  if (!remplacement || !remplacement.remplacant_id) return;
  
  await attribuerPoints(
    remplacement.remplacant_id, 
    'REMPLACEMENT_ACCEPTE',
    `Remplacement accepté pour ${remplacement.date || 'shift'}`,
    remplacement.date,
    'remplacement',
    remplacement.id
  );
}

/**
 * Hook appelé quand un extra est effectué (validé)
 */
async function onExtraValide(extra) {
  if (!extra || !extra.employe_id) return;
  
  await attribuerPoints(
    extra.employe_id,
    'EXTRA_EFFECTUE',
    `Extra effectué le ${extra.date || ''}`,
    extra.date,
    'extra',
    extra.id
  );
}

/**
 * Hook appelé quand un extra est annulé tardivement
 */
async function onExtraAnnuleTardif(extra) {
  if (!extra || !extra.employe_id) return;
  
  await attribuerPoints(
    extra.employe_id,
    'EXTRA_ANNULE_TARDIF',
    `Annulation tardive de l'extra du ${extra.date || ''}`,
    extra.date,
    'extra',
    extra.id
  );
}

/**
 * Hook appelé quand un congé est demandé
 */
async function onCongeDepose(conge) {
  if (!conge || !conge.employe_id) return;
  
  // Vérifier si la demande est dans les délais (>= 48h avant)
  const dateDebut = new Date(conge.date_debut);
  const dateCreation = new Date(conge.created_at || new Date());
  const heuresAvant = (dateDebut - dateCreation) / (1000 * 60 * 60);
  
  if (heuresAvant >= 48) {
    await attribuerPoints(
      conge.employe_id,
      'CONGE_DELAI_RESPECTE',
      'Demande de congé dans les délais',
      conge.created_at?.split('T')[0],
      'conge',
      conge.id
    );
  } else {
    await attribuerPoints(
      conge.employe_id,
      'CONGE_TARDIF',
      'Demande de congé tardive (< 48h)',
      conge.created_at?.split('T')[0],
      'conge',
      conge.id
    );
  }
}

// =====================================================
// JOBS PÉRIODIQUES
// =====================================================

/**
 * Vérifie les anomalies non résolues depuis plus de 48h
 * À exécuter quotidiennement
 * NOTE: NOT EXISTS subquery — doit rester en $queryRaw
 */
async function checkAnomaliesNonResolues() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT a.id, a."employeId" as employe_id, a.type, a."createdAt" as created_at
      FROM "Anomalie" a
      JOIN "User" u ON u.id = a."employeId" AND u.statut = 'actif'
      WHERE a.statut = 'en_attente'
      AND a."createdAt" <= NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM employe_points ep 
        WHERE ep.reference_type = 'anomalie' 
        AND ep.reference_id = a.id 
        AND ep.rule_code = 'ANOMALIE_NON_RESOLUE'
      )
    `;
    
    for (const anomalie of rows) {
      const dateStr = anomalie.created_at ? new Date(anomalie.created_at).toISOString().split('T')[0] : null;
      await attribuerPoints(
        anomalie.employe_id,
        'ANOMALIE_NON_RESOLUE',
        `Anomalie ${anomalie.type} non résolue depuis 48h`,
        dateStr,
        'anomalie',
        anomalie.id
      );
    }
    
  } catch (error) {
    console.error('[SCORING] Erreur check anomalies:', error.message);
  }
}

/**
 * Attribue les bonus de semaine complète
 * À exécuter le lundi matin
 * NOTE: Multi-CTE query — doit rester en $queryRaw
 */
async function attribuerBonusSemaineComplete() {
  try {
    const rows = await prisma.$queryRaw`
      WITH semaine_precedente AS (
        SELECT 
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') as debut,
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days' as fin
      ),
      employes_shifts AS (
        SELECT 
          s."employeId" as employe_id,
          COUNT(DISTINCT s.date) as jours_planifies
        FROM "Shift" s, semaine_precedente sp
        WHERE s.date BETWEEN sp.debut AND sp.fin
        GROUP BY s."employeId"
      ),
      employes_presents AS (
        SELECT 
          p."userId" as employe_id,
          COUNT(DISTINCT p.horodatage::date) as jours_pointes
        FROM "Pointage" p, semaine_precedente sp
        WHERE p.horodatage::date BETWEEN sp.debut AND sp.fin
        AND p.type IN ('arrivee', 'arrivée', 'ENTRÉE', 'entrée')
        GROUP BY p."userId"
      )
      SELECT es.employe_id
      FROM employes_shifts es
      JOIN employes_presents ep ON es.employe_id = ep.employe_id
      JOIN "User" u ON u.id = es.employe_id AND u.statut = 'actif'
      WHERE es.jours_planifies = ep.jours_pointes
      AND es.jours_planifies >= 3
    `;
    
    const dateBonus = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    for (const row of rows) {
      await attribuerPoints(
        row.employe_id,
        'SEMAINE_COMPLETE',
        'Présent tous les jours de la semaine',
        dateBonus,
        'semaine',
        null
      );
    }
    
  } catch (error) {
    console.error('[SCORING] Erreur bonus semaine:', error.message);
  }
}

/**
 * Attribue les bonus de semaine sans anomalie
 * À exécuter le lundi matin
 * NOTE: CTE + NOT EXISTS + EXISTS — doit rester en $queryRaw
 */
async function attribuerBonusSansAnomalie() {
  try {
    const rows = await prisma.$queryRaw`
      WITH semaine_precedente AS (
        SELECT 
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') as debut,
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days' as fin
      )
      SELECT DISTINCT u.id as employe_id
      FROM "User" u
      WHERE u.role = 'employee' AND u.statut = 'actif'
      AND NOT EXISTS (
        SELECT 1 FROM "Anomalie" a, semaine_precedente sp
        WHERE a."employeId" = u.id
        AND a."createdAt"::date BETWEEN sp.debut AND sp.fin
      )
      AND EXISTS (
        SELECT 1 FROM "Shift" s, semaine_precedente sp
        WHERE s."employeId" = u.id
        AND s.date BETWEEN sp.debut AND sp.fin
      )
    `;
    
    const dateBonus = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    for (const row of rows) {
      await attribuerPoints(
        row.employe_id,
        'SEMAINE_SANS_ANOMALIE',
        'Aucune anomalie cette semaine',
        dateBonus,
        'semaine',
        null
      );
    }
    
  } catch (error) {
    console.error('[SCORING] Erreur bonus sans anomalie:', error.message);
  }
}

// =====================================================
// UTILITAIRES
// =====================================================

/**
 * Calcule le retard en minutes entre l'heure prévue et l'heure réelle
 */
function calculerRetardMinutes(heurePrevue, heureReelle) {
  const [h1, m1] = heurePrevue.split(':').map(Number);
  const [h2, m2] = heureReelle.split(':').map(Number);
  
  const minutesPrevues = h1 * 60 + m1;
  const minutesReelles = h2 * 60 + m2;
  
  return minutesReelles - minutesPrevues;
}

/**
 * Récupère le score d'un employé
 * NOTE: employe_scores est une VIEW — doit rester en $queryRaw
 */
async function getScore(employeId) {
  const rows = await prisma.$queryRaw`
    SELECT * FROM employe_scores WHERE employe_id = ${employeId}
  `;
  return rows[0] || { score_total: 0, total_bonus: 0, total_malus: 0 };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  // Attribution manuelle
  attribuerPoints,
  attribuerPointsCustom,
  
  // Hooks automatiques
  onPointage,
  onAnomalieCreee,
  onAnomalieResolue,
  onRemplacementAccepte,
  onExtraValide,
  onExtraAnnuleTardif,
  onCongeDepose,
  
  // Jobs périodiques
  checkAnomaliesNonResolues,
  attribuerBonusSemaineComplete,
  attribuerBonusSansAnomalie,
  
  // Utilitaires
  getScore,
  calculerRetardMinutes
};
