// =====================================================
// SERVICE DE SCORING AUTOMATIQUE
// Attribue automatiquement les points basés sur les événements
// =====================================================
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
    // Récupérer la règle
    const ruleResult = await pool.query(
      'SELECT id, points, label FROM scoring_rules WHERE code = $1 AND actif = true',
      [ruleCode]
    );
    
    if (ruleResult.rows.length === 0) {
      console.warn(`[SCORING] Règle inconnue: ${ruleCode}`);
      return null;
    }
    
    const rule = ruleResult.rows[0];
    const date = dateEvenement || new Date().toISOString().split('T')[0];
    
    // Vérifier si déjà attribué (éviter doublons pour la même référence)
    if (referenceType && referenceId) {
      const existing = await pool.query(
        'SELECT id FROM employe_points WHERE employe_id = $1 AND rule_code = $2 AND reference_type = $3 AND reference_id = $4',
        [employeId, ruleCode, referenceType, referenceId]
      );
      if (existing.rows.length > 0) {
        console.log(`[SCORING] Points déjà attribués pour ${ruleCode} ref:${referenceType}/${referenceId}`);
        return null;
      }
    }
    
    // Insérer les points
    const result = await pool.query(`
      INSERT INTO employe_points (employe_id, rule_id, rule_code, points, motif, date_evenement, reference_type, reference_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [employeId, rule.id, ruleCode, rule.points, motif, date, referenceType, referenceId, createdBy]);
    
    console.log(`[SCORING] ${rule.points > 0 ? '+' : ''}${rule.points} pts → Employé ${employeId} (${rule.label})`);
    
    return result.rows[0];
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
    const date = dateEvenement || new Date().toISOString().split('T')[0];
    const ruleCode = points >= 0 ? 'BONUS_CUSTOM' : 'MALUS_CUSTOM';
    
    const result = await pool.query(`
      INSERT INTO employe_points (employe_id, rule_code, points, motif, date_evenement, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [employeId, ruleCode, points, motif, date, createdBy]);
    
    console.log(`[SCORING] ${points > 0 ? '+' : ''}${points} pts (custom) → Employé ${employeId}`);
    
    return result.rows[0];
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
  if (pointage.type === 'arrivee' && shift && shift.start) {
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
  console.log(`[SCORING] Anomalie ${anomalie.id} créée - surveillance activée`);
}

/**
 * Hook appelé quand une anomalie est résolue
 */
async function onAnomalieResolue(anomalie) {
  // Pas de malus si résolue à temps
  console.log(`[SCORING] Anomalie ${anomalie.id} résolue à temps`);
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
 */
async function checkAnomaliesNonResolues() {
  try {
    const result = await pool.query(`
      SELECT a.id, a.employe_id, a.type, a.created_at
      FROM "Anomalie" a
      WHERE a.statut = 'en_attente'
      AND a.created_at <= NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM employe_points ep 
        WHERE ep.reference_type = 'anomalie' 
        AND ep.reference_id = a.id 
        AND ep.rule_code = 'ANOMALIE_NON_RESOLUE'
      )
    `);
    
    for (const anomalie of result.rows) {
      await attribuerPoints(
        anomalie.employe_id,
        'ANOMALIE_NON_RESOLUE',
        `Anomalie ${anomalie.type} non résolue depuis 48h`,
        anomalie.created_at?.split('T')[0],
        'anomalie',
        anomalie.id
      );
    }
    
    console.log(`[SCORING] ${result.rows.length} anomalies non résolues traitées`);
  } catch (error) {
    console.error('[SCORING] Erreur check anomalies:', error.message);
  }
}

/**
 * Attribue les bonus de semaine complète
 * À exécuter le lundi matin
 */
async function attribuerBonusSemaineComplete() {
  try {
    // Récupérer la semaine précédente
    const result = await pool.query(`
      WITH semaine_precedente AS (
        SELECT 
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') as debut,
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days' as fin
      ),
      employes_shifts AS (
        SELECT 
          s.employe_id,
          COUNT(DISTINCT s.date) as jours_planifies
        FROM "Shift" s, semaine_precedente sp
        WHERE s.date BETWEEN sp.debut AND sp.fin
        GROUP BY s.employe_id
      ),
      employes_presents AS (
        SELECT 
          p.employe_id,
          COUNT(DISTINCT p.date) as jours_pointes
        FROM "Pointage" p, semaine_precedente sp
        WHERE p.date BETWEEN sp.debut AND sp.fin
        AND p.type = 'arrivee'
        GROUP BY p.employe_id
      )
      SELECT es.employe_id
      FROM employes_shifts es
      JOIN employes_presents ep ON es.employe_id = ep.employe_id
      WHERE es.jours_planifies = ep.jours_pointes
      AND es.jours_planifies >= 3
    `);
    
    const dateBonus = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    for (const row of result.rows) {
      await attribuerPoints(
        row.employe_id,
        'SEMAINE_COMPLETE',
        'Présent tous les jours de la semaine',
        dateBonus,
        'semaine',
        null
      );
    }
    
    console.log(`[SCORING] ${result.rows.length} bonus semaine complète attribués`);
  } catch (error) {
    console.error('[SCORING] Erreur bonus semaine:', error.message);
  }
}

/**
 * Attribue les bonus de semaine sans anomalie
 * À exécuter le lundi matin
 */
async function attribuerBonusSansAnomalie() {
  try {
    const result = await pool.query(`
      WITH semaine_precedente AS (
        SELECT 
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') as debut,
          date_trunc('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days' as fin
      )
      SELECT DISTINCT u.id as employe_id
      FROM "User" u
      WHERE u.role = 'employe' AND u.actif = true
      AND NOT EXISTS (
        SELECT 1 FROM "Anomalie" a, semaine_precedente sp
        WHERE a.employe_id = u.id
        AND a.created_at::date BETWEEN sp.debut AND sp.fin
      )
      AND EXISTS (
        SELECT 1 FROM "Shift" s, semaine_precedente sp
        WHERE s.employe_id = u.id
        AND s.date BETWEEN sp.debut AND sp.fin
      )
    `);
    
    const dateBonus = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    for (const row of result.rows) {
      await attribuerPoints(
        row.employe_id,
        'SEMAINE_SANS_ANOMALIE',
        'Aucune anomalie cette semaine',
        dateBonus,
        'semaine',
        null
      );
    }
    
    console.log(`[SCORING] ${result.rows.length} bonus sans anomalie attribués`);
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
 */
async function getScore(employeId) {
  const result = await pool.query(
    'SELECT * FROM employe_scores WHERE employe_id = $1',
    [employeId]
  );
  return result.rows[0] || { score_total: 0, total_bonus: 0, total_malus: 0 };
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
