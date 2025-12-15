// =====================================================
// API SCORING - Routes pour le système de points
// =====================================================
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Pool } = require('pg');

// Pool pour les requêtes directes (vue, agrégations)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware d'authentification
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// =====================================================
// ROUTES PUBLIQUES (employé connecté)
// =====================================================

/**
 * GET /api/scoring/mon-score
 * Récupère le score de l'employé connecté
 */
router.get('/mon-score', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.userId || req.user.id;
    console.log('📊 [MON-SCORE] Récupération score pour employé', employeId);
    
    // Score total depuis la vue employe_scores (qui agrège employe_points)
    const scoreResult = await pool.query(
      'SELECT employe_id as employee_id, score_total::int as total_points, total_bonus::int as bonus_points, total_malus::int as malus_points FROM employe_scores WHERE employe_id = $1',
      [employeId]
    );
    
    // Détail des points par catégorie depuis employe_points + scoring_rules
    const categoriesResult = await pool.query(`
      SELECT 
        COALESCE(sr.categorie, 
          CASE 
            WHEN ep.rule_code IN ('PONCTUALITE', 'POINTAGE_PONCTUEL', 'RETARD', 'RETARD_LEGER', 'RETARD_MODERE', 'RETARD_GRAVE', 'OUBLI_POINTAGE') THEN 'pointage'
            WHEN ep.rule_code IN ('DISPONIBILITE', 'REMPLACEMENT', 'REMPLACEMENT_ACCEPTE', 'REMPLACEMENT_REFUSE', 'ENTRAIDE') THEN 'remplacement'
            WHEN ep.rule_code IN ('PEER_FEEDBACK', 'FEEDBACK') THEN 'feedback'
            WHEN ep.rule_code IN ('FORMATION', 'FORMATION_SUIVIE', 'POLYVALENCE', 'INITIATIVE', 'FELICITATIONS', 'ESPRIT_EQUIPE_POS', 'ATTITUDE_CLIENT_POS') THEN 'comportement'
            WHEN ep.rule_code IN ('MOIS_SANS_ABSENCE', 'SEMAINE_COMPLETE', 'ABSENCE_JUSTIFIEE', 'ABSENCE_NON_JUSTIFIEE') THEN 'presence'
            WHEN ep.rule_code IN ('EXTRA_EFFECTUE', 'EXTRA_ANNULE_TARDIF') THEN 'extra'
            WHEN ep.rule_code IN ('CONGE_DELAI_RESPECTE', 'CONGE_TARDIF') THEN 'conge'
            WHEN ep.rule_code IN ('SEMAINE_SANS_ANOMALIE', 'ANOMALIE_NON_RESOLUE', 'ANOMALIE_RECURRENTE') THEN 'anomalie'
            ELSE 'special'
          END
        ) as categorie,
        SUM(CASE WHEN ep.points > 0 THEN ep.points ELSE 0 END) as points_bonus,
        SUM(CASE WHEN ep.points < 0 THEN ep.points ELSE 0 END) as points_malus
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON sr.code = ep.rule_code
      WHERE ep.employe_id = $1
      GROUP BY COALESCE(sr.categorie, 
          CASE 
            WHEN ep.rule_code IN ('PONCTUALITE', 'POINTAGE_PONCTUEL', 'RETARD', 'RETARD_LEGER', 'RETARD_MODERE', 'RETARD_GRAVE', 'OUBLI_POINTAGE') THEN 'pointage'
            WHEN ep.rule_code IN ('DISPONIBILITE', 'REMPLACEMENT', 'REMPLACEMENT_ACCEPTE', 'REMPLACEMENT_REFUSE', 'ENTRAIDE') THEN 'remplacement'
            WHEN ep.rule_code IN ('PEER_FEEDBACK', 'FEEDBACK') THEN 'feedback'
            WHEN ep.rule_code IN ('FORMATION', 'FORMATION_SUIVIE', 'POLYVALENCE', 'INITIATIVE', 'FELICITATIONS', 'ESPRIT_EQUIPE_POS', 'ATTITUDE_CLIENT_POS') THEN 'comportement'
            WHEN ep.rule_code IN ('MOIS_SANS_ABSENCE', 'SEMAINE_COMPLETE', 'ABSENCE_JUSTIFIEE', 'ABSENCE_NON_JUSTIFIEE') THEN 'presence'
            WHEN ep.rule_code IN ('EXTRA_EFFECTUE', 'EXTRA_ANNULE_TARDIF') THEN 'extra'
            WHEN ep.rule_code IN ('CONGE_DELAI_RESPECTE', 'CONGE_TARDIF') THEN 'conge'
            WHEN ep.rule_code IN ('SEMAINE_SANS_ANOMALIE', 'ANOMALIE_NON_RESOLUE', 'ANOMALIE_RECURRENTE') THEN 'anomalie'
            ELSE 'special'
          END
        )
    `, [employeId]);
    
    // Construire les points par catégorie (toutes les catégories du système)
    const categoriePoints = {
      pointage_points: 0,      // Ponctualité, retards
      presence_points: 0,      // Assiduité, absences
      comportement_points: 0,  // Attitude, initiative, formation
      remplacement_points: 0,  // Remplacements, entraide
      extra_points: 0,         // Extras effectués
      conge_points: 0,         // Demandes de congé
      anomalie_points: 0,      // Anomalies
      feedback_points: 0,      // Feedbacks peer-to-peer
      special_points: 0        // Bonus/malus manuels
    };
    
    categoriesResult.rows.forEach(row => {
      const total = parseInt(row.points_bonus || 0) + parseInt(row.points_malus || 0);
      const key = `${row.categorie}_points`;
      if (categoriePoints.hasOwnProperty(key)) {
        categoriePoints[key] = total;
      }
    });
    
    // Historique récent depuis employe_points (30 derniers jours)
    const historiqueResult = await pool.query(`
      SELECT ep.id, ep.employe_id as employee_id, ep.rule_code as category, ep.points, ep.motif as description, ep.date_evenement as created_at,
             COALESCE(sr.label, ep.rule_code) as label
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON sr.code = ep.rule_code
      WHERE ep.employe_id = $1
      AND ep.date_evenement >= NOW() - INTERVAL '30 days'
      ORDER BY ep.date_evenement DESC
      LIMIT 20
    `, [employeId]);
    
    // Calcul du niveau/badge
    const score = scoreResult.rows[0]?.total_points || 0;
    const niveau = calculerNiveau(score);

    // Calculer les stats pour les badges
    // Pour l'instant, on utilise des stats simplifiées basées sur le score
    // TODO: Implémenter les vraies stats de ponctualité, remplacements, etc.
    
    let arrivees_heure = 0;
    let remplacements = 0;
    
    try {
      // Stats de ponctualité (compter les pointages "entrée" pour avoir une approximation)
      const ponctualiteResult = await pool.query(`
        SELECT COUNT(*) as arrivees_heure
        FROM "Pointage" p
        WHERE p."userId" = $1
        AND p.type = 'entree'
      `, [employeId]);
      arrivees_heure = parseInt(ponctualiteResult.rows[0]?.arrivees_heure || 0);
    } catch (e) {
      console.log('Stats ponctualité non disponibles:', e.message);
    }

    try {
      // Stats de remplacements (candidatures acceptées aux demandes de remplacement)
      const remplacementsResult = await pool.query(`
        SELECT COUNT(*) as remplacements
        FROM "CandidatureRemplacement" cr
        WHERE cr."employeId" = $1
        AND cr.statut = 'acceptee'
      `, [employeId]);
      remplacements = parseInt(remplacementsResult.rows[0]?.remplacements || 0);
    } catch (e) {
      console.log('Stats remplacements non disponibles:', e.message);
    }

    // Calculer les stats pour les badges
    const stats = {
      arrivees_heure,
      mois_sans_absence: 1, // Par défaut, actif depuis 1 mois
      remplacements,
      score_total: score,
      extras: 0, // À implémenter
      bonus_comportement: Math.floor((scoreResult.rows[0]?.bonus_points || 0) / 5),
      mois_sans_malus_comportement: 6, // Par défaut
      semaines_completes: 1, // Par défaut
      streak_parfait: 0, // À implémenter
      rang: 999 // Par défaut, à calculer depuis le classement
    };

    // Obtenir le rang dans le classement
    const rangResult = await pool.query(`
      SELECT COUNT(*) + 1 as rang
      FROM employee_scores
      WHERE total_points > $1
    `, [score]);
    stats.rang = parseInt(rangResult.rows[0]?.rang || 999);
    
    // Calculer le plafond mensuel de feedbacks
    const PLAFOND_MENSUEL_FEEDBACK = 50;
    let feedbackMoisUtilise = 0;
    try {
      const feedbackMoisResult = await pool.query(`
        SELECT COALESCE(SUM(points), 0) as points_mois
        FROM score_history
        WHERE employee_id = $1 
          AND source = 'peer_feedback'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `, [employeId]);
      feedbackMoisUtilise = parseInt(feedbackMoisResult.rows[0]?.points_mois || 0);
    } catch (e) {
      console.log('Stats plafond feedback non disponibles:', e.message);
    }
    
    res.json({
      success: true,
      data: {
        score: {
          total_points: scoreResult.rows[0]?.total_points || 0,
          // Toutes les catégories
          pointage_points: categoriePoints.pointage_points,
          presence_points: categoriePoints.presence_points,
          comportement_points: categoriePoints.comportement_points,
          remplacement_points: categoriePoints.remplacement_points,
          extra_points: categoriePoints.extra_points,
          conge_points: categoriePoints.conge_points,
          anomalie_points: categoriePoints.anomalie_points,
          feedback_points: categoriePoints.feedback_points,
          special_points: categoriePoints.special_points,
          // Totaux bonus/malus
          total_bonus: scoreResult.rows[0]?.bonus_points || 0,
          total_malus: scoreResult.rows[0]?.malus_points || 0
        },
        niveau,
        historique: historiqueResult.rows,
        stats,
        plafondFeedback: {
          plafond: PLAFOND_MENSUEL_FEEDBACK,
          utilise: feedbackMoisUtilise,
          restant: Math.max(0, PLAFOND_MENSUEL_FEEDBACK - feedbackMoisUtilise)
        }
      }
    });
  } catch (error) {
    console.error('Erreur récupération score:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/mon-historique
 * Historique complet des points de l'employé connecté
 */
router.get('/mon-historique', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.id;
    const { page = 1, limit = 50, categorie } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE ep.employe_id = $1';
    const params = [employeId];
    
    if (categorie) {
      whereClause += ' AND sr.categorie = $2';
      params.push(categorie);
    }
    
    const result = await pool.query(`
      SELECT ep.*, sr.label, sr.categorie, sr.description,
             u.nom as created_by_nom, u.prenom as created_by_prenom
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON ep.rule_id = sr.id
      LEFT JOIN "User" u ON ep.created_by = u.id
      ${whereClause}
      ORDER BY ep.date_evenement DESC, ep.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Erreur historique:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// =====================================================
// ROUTES ADMIN/MANAGER
// =====================================================

/**
 * GET /api/scoring/rules
 * Liste toutes les règles de scoring
 */
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM scoring_rules 
      WHERE actif = true 
      ORDER BY categorie, points DESC
    `);
    
    // Grouper par catégorie
    const parCategorie = result.rows.reduce((acc, rule) => {
      if (!acc[rule.categorie]) acc[rule.categorie] = [];
      acc[rule.categorie].push(rule);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: result.rows,
      parCategorie
    });
  } catch (error) {
    console.error('Erreur règles:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/classement
 * Classement des employés par score
 */
router.get('/classement', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { periode = '12months', limit = 50 } = req.query;
    
    // Calcul de la date de début selon la période
    let intervalClause = '12 months';
    if (periode === '1month') intervalClause = '1 month';
    else if (periode === '3months') intervalClause = '3 months';
    else if (periode === '6months') intervalClause = '6 months';
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.categorie as poste,
        u."photoProfil",
        COALESCE(SUM(ep.points), 0)::int as score_total,
        COALESCE(SUM(CASE WHEN ep.points > 0 THEN ep.points ELSE 0 END), 0)::int as total_bonus,
        ABS(COALESCE(SUM(CASE WHEN ep.points < 0 THEN ep.points ELSE 0 END), 0))::int as total_malus,
        COUNT(ep.id)::int as nb_evenements
      FROM "User" u
      LEFT JOIN employe_points ep ON u.id = ep.employe_id 
        AND ep.date_evenement >= CURRENT_DATE - INTERVAL '${intervalClause}'
      WHERE u.role = 'employee' AND u.statut = 'actif'
      GROUP BY u.id, u.nom, u.prenom, u.email, u.categorie, u."photoProfil"
      ORDER BY score_total DESC
      LIMIT ${parseInt(limit)}
    `);
    
    // Ajouter rang et niveau
    const classement = result.rows.map((emp, index) => ({
      ...emp,
      rang: index + 1,
      niveau: calculerNiveau(emp.score_total)
    }));
    
    res.json({
      success: true,
      data: classement,
      periode
    });
  } catch (error) {
    console.error('Erreur classement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/employe/:id
 * Score détaillé d'un employé spécifique (admin)
 */
router.get('/employe/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const employeId = parseInt(req.params.id);
    
    // Infos employé
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: { id: true, nom: true, prenom: true, email: true, categorie: true, photoProfil: true }
    });
    
    if (!employe) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }
    
    // Score
    const scoreResult = await pool.query(
      'SELECT * FROM employe_scores WHERE employe_id = $1',
      [employeId]
    );
    
    // Historique complet
    const historiqueResult = await pool.query(`
      SELECT ep.*, sr.label, sr.categorie, sr.description,
             u.nom as created_by_nom, u.prenom as created_by_prenom
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON ep.rule_id = sr.id
      LEFT JOIN "User" u ON ep.created_by = u.id
      WHERE ep.employe_id = $1
      ORDER BY ep.date_evenement DESC, ep.created_at DESC
      LIMIT 100
    `, [employeId]);
    
    // Stats par catégorie
    const statsResult = await pool.query(`
      SELECT 
        sr.categorie,
        SUM(ep.points) as total,
        COUNT(*) as nb
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON ep.rule_id = sr.id
      WHERE ep.employe_id = $1
      AND ep.date_evenement >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY sr.categorie
    `, [employeId]);
    
    const score = scoreResult.rows[0]?.score_total || 0;
    
    res.json({
      success: true,
      data: {
        employe: { ...employe, poste: employe.categorie },
        score: scoreResult.rows[0] || { score_total: 0, total_bonus: 0, total_malus: 0 },
        niveau: calculerNiveau(score),
        historique: historiqueResult.rows,
        statsParCategorie: statsResult.rows
      }
    });
  } catch (error) {
    console.error('Erreur score employé:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/scoring/attribuer
 * Attribuer des points manuellement (manager)
 */
router.post('/attribuer', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { employe_id, rule_code, points_custom, motif, date_evenement } = req.body;
    const createdBy = req.user.id;
    
    if (!employe_id) {
      return res.status(400).json({ success: false, error: 'employe_id requis' });
    }
    
    // Vérifier que l'employé existe
    const employe = await prisma.user.findUnique({ where: { id: employe_id } });
    if (!employe) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }
    
    let points = points_custom;
    let ruleId = null;
    let ruleCode = rule_code;
    
    // Si une règle est spécifiée, récupérer ses points
    if (rule_code && rule_code !== 'BONUS_CUSTOM' && rule_code !== 'MALUS_CUSTOM') {
      const ruleResult = await pool.query(
        'SELECT id, points FROM scoring_rules WHERE code = $1',
        [rule_code]
      );
      if (ruleResult.rows.length > 0) {
        ruleId = ruleResult.rows[0].id;
        points = ruleResult.rows[0].points;
      }
    }
    
    if (points === undefined || points === null) {
      return res.status(400).json({ success: false, error: 'points requis' });
    }
    
    // Insérer les points
    const result = await pool.query(`
      INSERT INTO employe_points (employe_id, rule_id, rule_code, points, motif, date_evenement, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      employe_id,
      ruleId,
      ruleCode,
      points,
      motif || null,
      date_evenement || new Date().toISOString().split('T')[0],
      createdBy
    ]);
    
    // Log
    console.log(`[SCORING] ${createdBy} a attribué ${points} pts à employé ${employe_id} (${rule_code || 'custom'})`);
    
    res.json({
      success: true,
      message: `${points > 0 ? '+' : ''}${points} points attribués`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur attribution points:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/scoring/points/:id
 * Supprimer une attribution de points (admin)
 */
router.delete('/points/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pointId = parseInt(req.params.id);
    
    const result = await pool.query(
      'DELETE FROM employe_points WHERE id = $1 RETURNING *',
      [pointId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Point non trouvé' });
    }
    
    res.json({
      success: true,
      message: 'Points supprimés',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur suppression points:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/dashboard
 * Stats globales pour le dashboard manager
 */
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Top 5 meilleurs scores
    const top5 = await pool.query(`
      SELECT 
        u.id, u.nom, u.prenom, u."photoProfil", u.categorie as poste,
        COALESCE(SUM(ep.points), 0)::int as score_total
      FROM "User" u
      LEFT JOIN employe_points ep ON u.id = ep.employe_id 
        AND ep.date_evenement >= CURRENT_DATE - INTERVAL '3 months'
      WHERE u.role = 'employee' AND u.statut = 'actif'
      GROUP BY u.id, u.nom, u.prenom, u."photoProfil", u.categorie
      ORDER BY score_total DESC
      LIMIT 5
    `);
    
    // 5 scores les plus bas (à surveiller)
    const bottom5 = await pool.query(`
      SELECT 
        u.id, u.nom, u.prenom, u."photoProfil", u.categorie as poste,
        COALESCE(SUM(ep.points), 0)::int as score_total
      FROM "User" u
      LEFT JOIN employe_points ep ON u.id = ep.employe_id 
        AND ep.date_evenement >= CURRENT_DATE - INTERVAL '3 months'
      WHERE u.role = 'employee' AND u.statut = 'actif'
      GROUP BY u.id, u.nom, u.prenom, u."photoProfil", u.categorie
      ORDER BY score_total ASC
      LIMIT 5
    `);
    
    // Dernières attributions
    const recents = await pool.query(`
      SELECT ep.*, u.nom, u.prenom, sr.label, sr.categorie
      FROM employe_points ep
      JOIN "User" u ON ep.employe_id = u.id
      LEFT JOIN scoring_rules sr ON ep.rule_id = sr.id
      ORDER BY ep.created_at DESC
      LIMIT 10
    `);
    
    // Stats globales
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT employe_id)::int as nb_employes_notes,
        COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)::int as total_bonus_global,
        ABS(COALESCE(SUM(CASE WHEN points < 0 THEN points ELSE 0 END), 0))::int as total_malus_global,
        COUNT(*)::int as nb_attributions
      FROM employe_points
      WHERE date_evenement >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    res.json({
      success: true,
      data: {
        top5: top5.rows.map((e, i) => ({ ...e, rang: i + 1, niveau: calculerNiveau(e.score_total) })),
        bottom5: bottom5.rows.map(e => ({ ...e, niveau: calculerNiveau(e.score_total) })),
        recents: recents.rows,
        stats: stats.rows[0]
      }
    });
  } catch (error) {
    console.error('Erreur dashboard scoring:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Calcule le niveau/badge selon le score
 */
function calculerNiveau(score) {
  if (score >= 500) return { code: 'diamant', label: 'Diamant', emoji: '💎', color: '#B9F2FF' };
  if (score >= 300) return { code: 'or', label: 'Or', emoji: '🥇', color: '#FFD700' };
  if (score >= 100) return { code: 'argent', label: 'Argent', emoji: '🥈', color: '#C0C0C0' };
  if (score >= 0) return { code: 'bronze', label: 'Bronze', emoji: '🥉', color: '#CD7F32' };
  return { code: 'alerte', label: 'À surveiller', emoji: '⚠️', color: '#FF6B6B' };
}

// =====================================================
// ROUTES PEER FEEDBACK (Feedback entre collègues)
// =====================================================

/**
 * GET /api/scoring/peer-feedback/colleagues
 * Liste des collègues actifs pour envoyer un feedback
 */
router.get('/peer-feedback/colleagues', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    console.log('📋 [COLLEAGUES] Récupération collègues pour userId:', currentUserId);
    
    const result = await pool.query(`
      SELECT id, prenom, nom, categorie as poste, "photoProfil" as photo
      FROM "User" 
      WHERE statut = 'actif' 
        AND id != $1
        AND role IN ('employee', 'manager', 'admin', 'rh')
      ORDER BY prenom, nom
    `, [currentUserId]);
    
    console.log('📋 [COLLEAGUES] Trouvés:', result.rows.length, 'collègues');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ [COLLEAGUES] Erreur récupération collègues:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/categories
 * Liste des catégories de feedback possibles
 */
router.get('/peer-feedback/categories', authMiddleware, (req, res) => {
  const categories = [
    { code: 'entraide', label: 'Entraide', points: 3, emoji: '🤝', description: 'A aidé un collègue' },
    { code: 'rush', label: 'Efficace en rush', points: 5, emoji: '⚡', description: 'Excellent pendant le coup de feu' },
    { code: 'formation', label: 'Formation', points: 4, emoji: '📚', description: 'A formé ou guidé un collègue' },
    { code: 'attitude', label: 'Bonne attitude', points: 3, emoji: '😊', description: 'Attitude positive et motivante' },
    { code: 'initiative', label: 'Initiative', points: 4, emoji: '💡', description: 'A pris une initiative utile' },
    { code: 'polyvalence', label: 'Polyvalence', points: 4, emoji: '🔄', description: 'A aidé sur un autre poste' },
  ];
  res.json({ success: true, data: categories });
});

/**
 * POST /api/scoring/peer-feedback
 * Envoyer un feedback à un collègue (employé)
 * Limité à 2 feedbacks par semaine par employé
 */
router.post('/peer-feedback', authMiddleware, async (req, res) => {
  try {
    const fromEmployeeId = req.user.userId || req.user.id;
    const { toEmployeeId, message, category } = req.body;
    
    console.log('📤 [PEER-FEEDBACK] Création feedback de', fromEmployeeId, 'vers', toEmployeeId);
    
    // Validation
    if (!toEmployeeId || !message || message.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message requis (minimum 10 caractères)' 
      });
    }
    
    if (fromEmployeeId === toEmployeeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vous ne pouvez pas vous auto-évaluer' 
      });
    }
    
    // Vérifier la limite de 2 feedbacks par semaine
    const weeklyCount = await pool.query(`
      SELECT COUNT(*) as count FROM peer_feedbacks 
      WHERE from_employee_id = $1 
      AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `, [fromEmployeeId]);
    
    if (parseInt(weeklyCount.rows[0].count) >= 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Limite atteinte: vous avez déjà envoyé 2 feedbacks cette semaine' 
      });
    }
    
    // Déterminer les points selon la catégorie
    const pointsMap = {
      entraide: 3, rush: 5, formation: 4, 
      attitude: 3, initiative: 4, polyvalence: 4
    };
    const points = pointsMap[category] || 3;
    
    // Créer le feedback
    const result = await pool.query(`
      INSERT INTO peer_feedbacks (from_employee_id, to_employee_id, message, category, points_proposed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [fromEmployeeId, toEmployeeId, message.trim(), category || 'entraide', points]);
    
    // Récupérer les infos des employés pour la notif
    const employees = await pool.query(`
      SELECT id, nom, prenom FROM "User" WHERE id IN ($1, $2)
    `, [fromEmployeeId, toEmployeeId]);
    
    const fromEmp = employees.rows.find(e => e.id === fromEmployeeId);
    const toEmp = employees.rows.find(e => e.id === toEmployeeId);
    
    res.json({ 
      success: true, 
      message: `Feedback envoyé ! Il sera validé par un manager.`,
      data: {
        ...result.rows[0],
        from: fromEmp,
        to: toEmp
      }
    });
  } catch (error) {
    console.error('Erreur création peer feedback:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/mes-recus
 * Liste des feedbacks reçus par l'employé connecté
 */
router.get('/peer-feedback/mes-recus', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.userId || req.user.id;
    const result = await pool.query(`
      SELECT 
        pf.*,
        u.nom as from_nom, u.prenom as from_prenom
      FROM peer_feedbacks pf
      JOIN "User" u ON pf.from_employee_id = u.id
      WHERE pf.to_employee_id = $1 AND pf.status = 'approved'
      ORDER BY pf.created_at DESC
      LIMIT 20
    `, [employeId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur liste feedbacks reçus:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/mes-envois
 * Liste des feedbacks envoyés par l'employé connecté
 */
router.get('/peer-feedback/mes-envois', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.userId || req.user.id;
    console.log('📤 [MES-ENVOIS] Récupération feedbacks envoyés par', employeId);
    
    // Récupérer les feedbacks envoyés
    const result = await pool.query(`
      SELECT 
        pf.*,
        u.nom as to_nom, u.prenom as to_prenom
      FROM peer_feedbacks pf
      JOIN "User" u ON pf.to_employee_id = u.id
      WHERE pf.from_employee_id = $1
      ORDER BY pf.created_at DESC
      LIMIT 20
    `, [employeId]);
    
    // Compter combien de feedbacks cette semaine pour calculer le reste
    const weekCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM peer_feedbacks
      WHERE from_employee_id = $1
      AND created_at >= date_trunc('week', CURRENT_DATE)
    `, [employeId]);
    
    const feedbacksRestants = Math.max(0, 2 - parseInt(weekCount.rows[0].count));
    
    console.log('📤 [MES-ENVOIS]', result.rows.length, 'feedbacks trouvés,', feedbacksRestants, 'restants cette semaine');
    
    res.json({ 
      success: true, 
      data: result.rows,
      feedbacksRestants
    });
  } catch (error) {
    console.error('Erreur liste feedbacks envoyés:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/pending
 * Liste des feedbacks en attente de validation (manager/admin)
 */
router.get('/peer-feedback/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pf.*,
        uf.nom as from_nom, uf.prenom as from_prenom, uf.categorie as from_poste,
        ut.nom as to_nom, ut.prenom as to_prenom, ut.categorie as to_poste
      FROM peer_feedbacks pf
      JOIN "User" uf ON pf.from_employee_id = uf.id
      JOIN "User" ut ON pf.to_employee_id = ut.id
      WHERE pf.status = 'pending'
      ORDER BY pf.created_at ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur liste feedbacks pending:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/scoring/peer-feedback/:id/validate
 * Valider ou rejeter un feedback (manager/admin)
 */
router.put('/peer-feedback/:id/validate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, rejectionReason, pointsAdjusted } = req.body;
    const validatorId = req.user.userId || req.user.id;
    
    console.log('📋 [VALIDATE] Validation feedback', id, 'par', validatorId, 'approved:', approved);
    
    // Récupérer le feedback
    const feedback = await pool.query(
      'SELECT * FROM peer_feedbacks WHERE id = $1 AND status = $2',
      [id, 'pending']
    );
    
    if (feedback.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Feedback non trouvé ou déjà traité' 
      });
    }
    
    const fb = feedback.rows[0];
    
    if (approved) {
      // PLAFOND MENSUEL: Vérifier les points feedback déjà accumulés ce mois
      const PLAFOND_MENSUEL_FEEDBACK = 50; // Max 50 pts/mois via feedbacks
      
      const pointsMoisResult = await pool.query(`
        SELECT COALESCE(SUM(points), 0) as points_mois
        FROM score_history
        WHERE employee_id = $1 
          AND source = 'peer_feedback'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `, [fb.to_employee_id]);
      
      const pointsMois = parseInt(pointsMoisResult.rows[0]?.points_mois || 0);
      const pointsRestants = Math.max(0, PLAFOND_MENSUEL_FEEDBACK - pointsMois);
      
      console.log(`📊 [PLAFOND] Employé ${fb.to_employee_id}: ${pointsMois}/${PLAFOND_MENSUEL_FEEDBACK} pts feedback ce mois, reste ${pointsRestants} pts`);
      
      // Approuver: mettre à jour le feedback et attribuer les points
      let finalPoints = pointsAdjusted || fb.points_proposed;
      
      // Appliquer le plafond
      if (pointsRestants === 0) {
        // Plafond atteint: approuver mais 0 points
        console.log(`⚠️ [PLAFOND] Plafond mensuel atteint pour employé ${fb.to_employee_id}, feedback approuvé avec 0 pts`);
        finalPoints = 0;
      } else if (finalPoints > pointsRestants) {
        // Réduire les points pour respecter le plafond
        console.log(`⚠️ [PLAFOND] Points réduits de ${finalPoints} à ${pointsRestants} pour respecter le plafond`);
        finalPoints = pointsRestants;
      }
      
      await pool.query(`
        UPDATE peer_feedbacks 
        SET status = 'approved', validated_by = $1, validated_at = NOW(), points_proposed = $2
        WHERE id = $3
      `, [validatorId, finalPoints, id]);
      
      // Mettre à jour employee_scores (seulement si points > 0)
      if (finalPoints > 0) {
        await pool.query(`
          INSERT INTO employee_scores (employee_id, peer_feedback_points, total_points)
          VALUES ($1, $2, $2)
          ON CONFLICT (employee_id) DO UPDATE 
          SET peer_feedback_points = employee_scores.peer_feedback_points + $2,
              total_points = employee_scores.total_points + $2,
              updated_at = NOW()
        `, [fb.to_employee_id, finalPoints]);
      }
      
      // Ajouter dans l'historique (même si 0 pts pour traçabilité)
      await pool.query(`
        INSERT INTO score_history (employee_id, points, reason, category, source, created_by)
        VALUES ($1, $2, $3, $4, 'peer_feedback', $5)
      `, [
        fb.to_employee_id,
        finalPoints,
        finalPoints === 0 
          ? `Feedback collègue (plafond mensuel atteint): ${fb.message.substring(0, 80)}`
          : `Feedback collègue: ${fb.message.substring(0, 100)}`,
        fb.category,
        validatorId
      ]);
      
      console.log('✅ [VALIDATE] Points attribués:', finalPoints, 'à employé', fb.to_employee_id);
      
      // Message adapté selon le plafond
      let message = `Feedback approuvé ! +${finalPoints} points attribués.`;
      if (finalPoints === 0) {
        message = `Feedback approuvé mais plafond mensuel atteint (50 pts max/mois). 0 points attribués.`;
      } else if (finalPoints < (pointsAdjusted || fb.points_proposed)) {
        message = `Feedback approuvé ! +${finalPoints} points (réduits pour respecter le plafond mensuel de 50 pts).`;
      }
      
      res.json({ 
        success: true, 
        message,
        pointsAttribues: finalPoints,
        plafondInfo: {
          plafond: PLAFOND_MENSUEL_FEEDBACK,
          utilise: pointsMois + finalPoints,
          restant: Math.max(0, PLAFOND_MENSUEL_FEEDBACK - pointsMois - finalPoints)
        }
      });
    } else {
      // Rejeter
      await pool.query(`
        UPDATE peer_feedbacks 
        SET status = 'rejected', validated_by = $1, validated_at = NOW(), rejection_reason = $2
        WHERE id = $3
      `, [validatorId, rejectionReason || 'Non approuvé', id]);
      
      res.json({ success: true, message: 'Feedback rejeté.' });
    }
  } catch (error) {
    console.error('Erreur validation feedback:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/stats
 * Statistiques des feedbacks (manager)
 */
router.get('/peer-feedback/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)) as this_week
      FROM peer_feedbacks
    `);
    
    // Top receveurs de feedbacks
    const topReceivers = await pool.query(`
      SELECT 
        u.id, u.nom, u.prenom,
        COUNT(*) as nb_feedbacks,
        SUM(pf.points_proposed) as total_points
      FROM peer_feedbacks pf
      JOIN "User" u ON pf.to_employee_id = u.id
      WHERE pf.status = 'approved'
      GROUP BY u.id, u.nom, u.prenom
      ORDER BY nb_feedbacks DESC
      LIMIT 5
    `);
    
    res.json({ 
      success: true, 
      data: { 
        ...stats.rows[0],
        topReceivers: topReceivers.rows 
      } 
    });
  } catch (error) {
    console.error('Erreur stats feedbacks:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
