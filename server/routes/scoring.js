// =====================================================
// API SCORING - Routes pour le système de points
// Migré de raw SQL (pg Pool) vers Prisma ORM
// =====================================================
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { Prisma } = require('@prisma/client');
const { TYPES_ENTREE } = require('../utils/pointageTypeUtils');

// Middleware d'authentification
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Utilitaire: convertit les BigInt en Number dans les résultats $queryRaw
function convertBigInts(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigInts);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return result;
  }
  return obj;
}

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
    
    // Score total depuis la vue employe_scores (Prisma $queryRaw car c'est une VIEW)
    let scoreRows = [];
    try {
      const scoreRowsRaw = await prisma.$queryRaw`
        SELECT employe_id as employee_id, score_total::int as total_points, total_bonus::int as bonus_points, total_malus::int as malus_points 
        FROM employe_scores WHERE employe_id = ${employeId}
      `;
      scoreRows = convertBigInts(scoreRowsRaw);
    } catch (e) { /* table/vue scoring absente — score par défaut */ }
    
    // Détail des points par catégorie (complex GROUP BY + CASE — garder en raw)
    let categoriesRows = [];
    try {
    const categoriesRowsRaw = await prisma.$queryRaw`
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
      WHERE ep.employe_id = ${employeId}
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
    `;
    categoriesRows = convertBigInts(categoriesRowsRaw);
    } catch (e) { /* table/vue scoring absente */ }
    
    // Construire les points par catégorie
    const categoriePoints = {
      pointage_points: 0, presence_points: 0, comportement_points: 0,
      remplacement_points: 0, extra_points: 0, conge_points: 0,
      anomalie_points: 0, feedback_points: 0, special_points: 0
    };
    
    categoriesRows.forEach(row => {
      const total = Number(row.points_bonus || 0) + Number(row.points_malus || 0);
      const key = `${row.categorie}_points`;
      if (categoriePoints.hasOwnProperty(key)) {
        categoriePoints[key] = total;
      }
    });
    
    // Historique récent (30 jours) — Prisma with include
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let historiqueRaw = [];
    try {
      historiqueRaw = await prisma.employePoint.findMany({
        where: {
          employeId: employeId,
          dateEvenement: { gte: thirtyDaysAgo }
        },
        include: { rule: { select: { label: true } } },
        orderBy: { dateEvenement: 'desc' },
        take: 20
      });
    } catch (e) { /* table scoring absente */ }
    
    const historique = historiqueRaw.map(ep => ({
      id: ep.id,
      employee_id: ep.employeId,
      category: ep.ruleCode,
      points: ep.points,
      description: ep.motif,
      created_at: ep.dateEvenement,
      label: ep.rule?.label || ep.ruleCode
    }));
    
    // Calcul du niveau
    const score = Number(scoreRows[0]?.total_points || 0);
    const niveau = calculerNiveau(score);

    // Stats ponctualité
    let arrivees_heure = 0;
    let remplacements = 0;
    
    try {
      arrivees_heure = await prisma.pointage.count({
        where: { userId: employeId, type: { in: TYPES_ENTREE } }
      });
    } catch (e) { /* non bloquant */ }

    try {
      remplacements = await prisma.candidatureRemplacement.count({
        where: { employeId: employeId, statut: 'acceptee' }
      });
    } catch (e) { /* non bloquant */ }

    const stats = {
      arrivees_heure,
      mois_sans_absence: 1,
      remplacements,
      score_total: score,
      extras: 0,
      bonus_comportement: Math.floor(Number(scoreRows[0]?.bonus_points || 0) / 5),
      mois_sans_malus_comportement: 6,
      semaines_completes: 1,
      streak_parfait: 0,
      rang: 999
    };

    // Rang dans le classement
    try {
      const rangCount = await prisma.employeeScore.count({
        where: { totalPoints: { gt: score } }
      });
      stats.rang = rangCount + 1;
    } catch (e) { /* table scoring absente */ stats.rang = 1; }
    
    // Plafond mensuel feedbacks
    const PLAFOND_MENSUEL_FEEDBACK = 50;
    let feedbackMoisUtilise = 0;
    try {
      const feedbackAggRaw = await prisma.$queryRaw`
        SELECT COALESCE(SUM(points), 0)::int as points_mois
        FROM score_history
        WHERE employee_id = ${employeId} 
          AND source = 'peer_feedback'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `;
      const feedbackAgg = convertBigInts(feedbackAggRaw);
      feedbackMoisUtilise = Number(feedbackAgg[0]?.points_mois || 0);
    } catch (e) { /* non bloquant */ }
    
    res.json({
      success: true,
      data: {
        score: {
          total_points: score,
          ...categoriePoints,
          total_bonus: Number(scoreRows[0]?.bonus_points || 0),
          total_malus: Number(scoreRows[0]?.malus_points || 0)
        },
        niveau,
        historique,
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const { categorie } = req.query;
    const offset = (page - 1) * limit;
    
    // Prisma with include + pagination (safe — no SQL injection)
    const where = { employeId };
    if (categorie) {
      where.rule = { categorie };
    }

    const data = await prisma.employePoint.findMany({
      where,
      include: {
        rule: { select: { label: true, categorie: true, description: true } }
      },
      orderBy: [{ dateEvenement: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset
    });
    
    // Map to original format for API compat
    const rows = data.map(ep => ({
      id: ep.id, employe_id: ep.employeId, rule_id: ep.ruleId,
      rule_code: ep.ruleCode, points: ep.points, motif: ep.motif,
      date_evenement: ep.dateEvenement, reference_type: ep.referenceType,
      reference_id: ep.referenceId, created_at: ep.createdAt, created_by: ep.createdBy,
      label: ep.rule?.label, categorie: ep.rule?.categorie, description: ep.rule?.description
    }));
    
    res.json({
      success: true,
      data: rows,
      pagination: { page, limit }
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
    const rules = await prisma.scoringRule.findMany({
      where: { actif: true },
      orderBy: [{ categorie: 'asc' }, { points: 'desc' }]
    });
    
    // Grouper par catégorie
    const parCategorie = rules.reduce((acc, rule) => {
      if (!acc[rule.categorie]) acc[rule.categorie] = [];
      acc[rule.categorie].push(rule);
      return acc;
    }, {});
    
    res.json({ success: true, data: rules, parCategorie });
  } catch (error) {
    console.error('Erreur règles:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/classement
 * Classement des employés par score
 * 🔒 FIX: intervalClause était interpolé — maintenant paramétrisé
 */
router.get('/classement', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { periode = '12months' } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    
    // Map période vers un nombre de jours (élimine l'injection SQL)
    const periodeJours = {
      '1month': 30, '3months': 90, '6months': 180, '12months': 365
    };
    const jours = periodeJours[periode] || 365;
    
    const resultRaw = await prisma.$queryRaw`
      SELECT 
        u.id, u.nom, u.prenom, u.email, u.categorie as poste, u."photoProfil",
        COALESCE(SUM(ep.points), 0)::int as score_total,
        COALESCE(SUM(CASE WHEN ep.points > 0 THEN ep.points ELSE 0 END), 0)::int as total_bonus,
        ABS(COALESCE(SUM(CASE WHEN ep.points < 0 THEN ep.points ELSE 0 END), 0))::int as total_malus,
        COUNT(ep.id)::int as nb_evenements
      FROM "User" u
      LEFT JOIN employe_points ep ON u.id = ep.employe_id 
        AND ep.date_evenement >= CURRENT_DATE - make_interval(days => ${jours}::int)
      WHERE u.role = 'employee' AND u.statut = 'actif'
      GROUP BY u.id, u.nom, u.prenom, u.email, u.categorie, u."photoProfil"
      ORDER BY score_total DESC
      LIMIT ${limit}
    `;
    const result = convertBigInts(resultRaw);
    
    const classement = result.map((emp, index) => ({
      ...emp,
      rang: index + 1,
      niveau: calculerNiveau(Number(emp.score_total))
    }));
    
    res.json({ success: true, data: classement, periode });
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
    if (isNaN(employeId)) return res.status(400).json({ success: false, error: 'ID invalide' });
    
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: { id: true, nom: true, prenom: true, email: true, categorie: true, photoProfil: true }
    });
    
    if (!employe) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }
    
    // Score (VIEW)
    const scoreRowsRaw = await prisma.$queryRaw`
      SELECT * FROM employe_scores WHERE employe_id = ${employeId}
    `;
    const scoreRows = convertBigInts(scoreRowsRaw);
    
    // Historique — Prisma
    const historiqueRaw = await prisma.employePoint.findMany({
      where: { employeId },
      include: { rule: { select: { label: true, categorie: true, description: true } } },
      orderBy: [{ dateEvenement: 'desc' }, { createdAt: 'desc' }],
      take: 100
    });
    
    const historique = historiqueRaw.map(ep => ({
      id: ep.id, employe_id: ep.employeId, rule_id: ep.ruleId,
      rule_code: ep.ruleCode, points: ep.points, motif: ep.motif,
      date_evenement: ep.dateEvenement, created_at: ep.createdAt,
      label: ep.rule?.label, categorie: ep.rule?.categorie, description: ep.rule?.description
    }));
    
    // Stats par catégorie (12 mois)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const statsRowsRaw = await prisma.$queryRaw`
      SELECT sr.categorie, SUM(ep.points)::int as total, COUNT(*)::int as nb
      FROM employe_points ep
      LEFT JOIN scoring_rules sr ON ep.rule_id = sr.id
      WHERE ep.employe_id = ${employeId}
      AND ep.date_evenement >= ${twelveMonthsAgo}
      GROUP BY sr.categorie
    `;
    const statsRows = convertBigInts(statsRowsRaw);
    
    const scoreTotal = Number(scoreRows[0]?.score_total || 0);
    
    res.json({
      success: true,
      data: {
        employe: { ...employe, poste: employe.categorie },
        score: scoreRows[0] || { score_total: 0, total_bonus: 0, total_malus: 0 },
        niveau: calculerNiveau(scoreTotal),
        historique,
        statsParCategorie: statsRows
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
    
    const employe = await prisma.user.findUnique({ where: { id: employe_id } });
    if (!employe) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }
    
    let points = points_custom;
    let ruleId = null;
    let ruleCode = rule_code;
    
    // Si une règle est spécifiée, récupérer ses points
    if (rule_code && rule_code !== 'BONUS_CUSTOM' && rule_code !== 'MALUS_CUSTOM') {
      const rule = await prisma.scoringRule.findUnique({ where: { code: rule_code } });
      if (rule) {
        ruleId = rule.id;
        points = rule.points;
      }
    }
    
    if (points === undefined || points === null) {
      return res.status(400).json({ success: false, error: 'points requis' });
    }
    
    const created = await prisma.employePoint.create({
      data: {
        employeId: employe_id,
        ruleId,
        ruleCode: ruleCode,
        points,
        motif: motif || null,
        dateEvenement: date_evenement ? new Date(date_evenement) : new Date(),
        createdBy
      }
    });
    
    res.json({
      success: true,
      message: `${points > 0 ? '+' : ''}${points} points attribués`,
      data: created
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
    if (isNaN(pointId)) return res.status(400).json({ success: false, error: 'ID invalide' });
    
    const existing = await prisma.employePoint.findUnique({ where: { id: pointId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Point non trouvé' });
    }
    
    await prisma.employePoint.delete({ where: { id: pointId } });
    
    res.json({ success: true, message: 'Points supprimés', data: existing });
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
    // Top 5 (complex aggregate — keep raw)
    const top5Raw = await prisma.$queryRaw`
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
    `;
    const top5 = convertBigInts(top5Raw);
    
    // Bottom 5
    const bottom5Raw = await prisma.$queryRaw`
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
    `;
    const bottom5 = convertBigInts(bottom5Raw);
    
    // Dernières attributions — Prisma
    const recentsRaw = await prisma.employePoint.findMany({
      include: {
        rule: { select: { label: true, categorie: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Fetch user names for recents
    const userIds = [...new Set(recentsRaw.map(r => r.employeId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nom: true, prenom: true }
    });
    const usersMap = new Map(users.map(u => [u.id, u]));
    
    const recents = recentsRaw.map(ep => ({
      id: ep.id, employe_id: ep.employeId, rule_code: ep.ruleCode,
      points: ep.points, motif: ep.motif, date_evenement: ep.dateEvenement,
      created_at: ep.createdAt,
      nom: usersMap.get(ep.employeId)?.nom,
      prenom: usersMap.get(ep.employeId)?.prenom,
      label: ep.rule?.label, categorie: ep.rule?.categorie
    }));
    
    // Stats globales (30 jours)
    const statsRowsRaw = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT employe_id)::int as nb_employes_notes,
        COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)::int as total_bonus_global,
        ABS(COALESCE(SUM(CASE WHEN points < 0 THEN points ELSE 0 END), 0))::int as total_malus_global,
        COUNT(*)::int as nb_attributions
      FROM employe_points
      WHERE date_evenement >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const statsRows = convertBigInts(statsRowsRaw);
    
    res.json({
      success: true,
      data: {
        top5: top5.map((e, i) => ({ ...e, rang: i + 1, niveau: calculerNiveau(Number(e.score_total)) })),
        bottom5: bottom5.map(e => ({ ...e, niveau: calculerNiveau(Number(e.score_total)) })),
        recents,
        stats: statsRows[0]
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

function calculerNiveau(score) {
  if (score >= 500) return { code: 'diamant', label: 'Diamant', emoji: '💎', color: '#B9F2FF' };
  if (score >= 300) return { code: 'or', label: 'Or', emoji: '🥇', color: '#FFD700' };
  if (score >= 100) return { code: 'argent', label: 'Argent', emoji: '🥈', color: '#C0C0C0' };
  if (score >= 0) return { code: 'bronze', label: 'Bronze', emoji: '🥉', color: '#CD7F32' };
  return { code: 'alerte', label: 'À surveiller', emoji: '⚠️', color: '#FF6B6B' };
}

// =====================================================
// ROUTES PEER FEEDBACK
// =====================================================

/**
 * GET /api/scoring/peer-feedback/colleagues
 */
router.get('/peer-feedback/colleagues', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    const colleagues = await prisma.user.findMany({
      where: {
        statut: 'actif',
        id: { not: currentUserId },
        role: { in: ['employee', 'manager', 'admin', 'rh'] }
      },
      select: { id: true, prenom: true, nom: true, categorie: true, photoProfil: true },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }]
    });
    
    // Map to original format
    res.json(colleagues.map(c => ({
      id: c.id, prenom: c.prenom, nom: c.nom, poste: c.categorie, photo: c.photoProfil
    })));
  } catch (err) {
    console.error('❌ [COLLEAGUES] Erreur récupération collègues:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/categories
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
 * Envoyer un feedback (limité à 2/semaine)
 */
router.post('/peer-feedback', authMiddleware, async (req, res) => {
  try {
    const fromEmployeeId = req.user.userId || req.user.id;
    const { toEmployeeId, message, category } = req.body;
    
    if (!toEmployeeId || !message || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Message requis (minimum 10 caractères)' });
    }
    if (fromEmployeeId === toEmployeeId) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas vous auto-évaluer' });
    }
    
    // Limite 2/semaine
    const weeklyCountRowsRaw = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM peer_feedbacks 
      WHERE from_employee_id = ${fromEmployeeId} 
      AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `;
    const weeklyCountRows = convertBigInts(weeklyCountRowsRaw);
    
    if (Number(weeklyCountRows[0].count) >= 2) {
      return res.status(400).json({ success: false, error: 'Limite atteinte: vous avez déjà envoyé 2 feedbacks cette semaine' });
    }
    
    const pointsMap = { entraide: 3, rush: 5, formation: 4, attitude: 3, initiative: 4, polyvalence: 4 };
    const points = pointsMap[category] || 3;
    
    const created = await prisma.peerFeedback.create({
      data: {
        fromEmployeeId,
        toEmployeeId,
        message: message.trim(),
        category: category || 'entraide',
        pointsProposed: points
      }
    });
    
    // Noms des employés
    const employees = await prisma.user.findMany({
      where: { id: { in: [fromEmployeeId, toEmployeeId] } },
      select: { id: true, nom: true, prenom: true }
    });
    
    const fromEmp = employees.find(e => e.id === fromEmployeeId);
    const toEmp = employees.find(e => e.id === toEmployeeId);
    
    res.json({ 
      success: true, 
      message: 'Feedback envoyé ! Il sera validé par un manager.',
      data: { ...created, from: fromEmp, to: toEmp }
    });
  } catch (error) {
    console.error('Erreur création peer feedback:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/mes-recus
 */
router.get('/peer-feedback/mes-recus', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.userId || req.user.id;
    
    const feedbacksRaw = await prisma.peerFeedback.findMany({
      where: { toEmployeeId: employeId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Fetch sender names
    const senderIds = [...new Set(feedbacksRaw.map(f => f.fromEmployeeId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, nom: true, prenom: true }
    });
    const sendersMap = new Map(senders.map(s => [s.id, s]));
    
    const data = feedbacksRaw.map(pf => ({
      ...pf,
      from_nom: sendersMap.get(pf.fromEmployeeId)?.nom,
      from_prenom: sendersMap.get(pf.fromEmployeeId)?.prenom
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur liste feedbacks reçus:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/mes-envois
 */
router.get('/peer-feedback/mes-envois', authMiddleware, async (req, res) => {
  try {
    const employeId = req.user.userId || req.user.id;
    
    const feedbacksRaw = await prisma.peerFeedback.findMany({
      where: { fromEmployeeId: employeId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Fetch receiver names
    const receiverIds = [...new Set(feedbacksRaw.map(f => f.toEmployeeId))];
    const receivers = await prisma.user.findMany({
      where: { id: { in: receiverIds } },
      select: { id: true, nom: true, prenom: true }
    });
    const receiversMap = new Map(receivers.map(r => [r.id, r]));
    
    const data = feedbacksRaw.map(pf => ({
      ...pf,
      to_nom: receiversMap.get(pf.toEmployeeId)?.nom,
      to_prenom: receiversMap.get(pf.toEmployeeId)?.prenom
    }));
    
    // Feedbacks cette semaine
    const weekCountRowsRaw = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM peer_feedbacks
      WHERE from_employee_id = ${employeId}
      AND created_at >= date_trunc('week', CURRENT_DATE)
    `;
    const weekCountRows = convertBigInts(weekCountRowsRaw);
    const feedbacksRestants = Math.max(0, 2 - Number(weekCountRows[0].count));
    
    res.json({ success: true, data, feedbacksRestants });
  } catch (error) {
    console.error('Erreur liste feedbacks envoyés:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/pending
 * Feedbacks en attente de validation (admin)
 */
router.get('/peer-feedback/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const feedbacksRaw = await prisma.peerFeedback.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });
    
    // Fetch all user names involved
    const userIds = [...new Set([
      ...feedbacksRaw.map(f => f.fromEmployeeId),
      ...feedbacksRaw.map(f => f.toEmployeeId)
    ])];
    const usersArr = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nom: true, prenom: true, categorie: true }
    });
    const usersMap = new Map(usersArr.map(u => [u.id, u]));
    
    const data = feedbacksRaw.map(pf => ({
      ...pf,
      from_nom: usersMap.get(pf.fromEmployeeId)?.nom,
      from_prenom: usersMap.get(pf.fromEmployeeId)?.prenom,
      from_poste: usersMap.get(pf.fromEmployeeId)?.categorie,
      to_nom: usersMap.get(pf.toEmployeeId)?.nom,
      to_prenom: usersMap.get(pf.toEmployeeId)?.prenom,
      to_poste: usersMap.get(pf.toEmployeeId)?.categorie
    }));
    
    res.json({ success: true, data });
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
    
    const fb = await prisma.peerFeedback.findFirst({
      where: { id: parseInt(id), status: 'pending' }
    });
    
    if (!fb) {
      return res.status(404).json({ success: false, error: 'Feedback non trouvé ou déjà traité' });
    }
    
    if (approved) {
      // Plafond mensuel
      const PLAFOND_MENSUEL_FEEDBACK = 50;
      
      const pointsMoisRowsRaw = await prisma.$queryRaw`
        SELECT COALESCE(SUM(points), 0)::int as points_mois
        FROM score_history
        WHERE employee_id = ${fb.toEmployeeId} 
          AND source = 'peer_feedback'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `;
      const pointsMoisRows = convertBigInts(pointsMoisRowsRaw);
      
      const pointsMois = Number(pointsMoisRows[0]?.points_mois || 0);
      const pointsRestants = Math.max(0, PLAFOND_MENSUEL_FEEDBACK - pointsMois);
      
      let finalPoints = pointsAdjusted || fb.pointsProposed;
      if (pointsRestants === 0) {
        finalPoints = 0;
      } else if (finalPoints > pointsRestants) {
        finalPoints = pointsRestants;
      }
      
      // Approuver le feedback
      await prisma.peerFeedback.update({
        where: { id: parseInt(id) },
        data: { status: 'approved', validatedBy: validatorId, validatedAt: new Date(), pointsProposed: finalPoints }
      });
      
      // Écrire les points dans employe_points
      if (finalPoints > 0) {
        await prisma.employePoint.create({
          data: {
            employeId: fb.toEmployeeId,
            ruleCode: 'PEER_FEEDBACK',
            points: finalPoints,
            motif: `Feedback collègue (${fb.category}): ${fb.message.substring(0, 100)}`,
            dateEvenement: new Date(),
            createdBy: validatorId
          }
        });
      }
      
      // Historique pour traçabilité plafond
      await prisma.scoreHistory.create({
        data: {
          employeeId: fb.toEmployeeId,
          points: finalPoints,
          reason: finalPoints === 0 
            ? `Feedback collègue (plafond mensuel atteint): ${fb.message.substring(0, 80)}`
            : `Feedback collègue: ${fb.message.substring(0, 100)}`,
          category: fb.category,
          source: 'peer_feedback',
          createdBy: validatorId
        }
      });
      
      let message = `Feedback approuvé ! +${finalPoints} points attribués.`;
      if (finalPoints === 0) {
        message = `Feedback approuvé mais plafond mensuel atteint (50 pts max/mois). 0 points attribués.`;
      } else if (finalPoints < (pointsAdjusted || fb.pointsProposed)) {
        message = `Feedback approuvé ! +${finalPoints} points (réduits pour respecter le plafond mensuel de 50 pts).`;
      }
      
      res.json({ 
        success: true, message,
        pointsAttribues: finalPoints,
        plafondInfo: {
          plafond: PLAFOND_MENSUEL_FEEDBACK,
          utilise: pointsMois + finalPoints,
          restant: Math.max(0, PLAFOND_MENSUEL_FEEDBACK - pointsMois - finalPoints)
        }
      });
    } else {
      // Rejeter
      await prisma.peerFeedback.update({
        where: { id: parseInt(id) },
        data: { status: 'rejected', validatedBy: validatorId, validatedAt: new Date(), rejectionReason: rejectionReason || 'Non approuvé' }
      });
      
      res.json({ success: true, message: 'Feedback rejeté.' });
    }
  } catch (error) {
    console.error('Erreur validation feedback:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/scoring/peer-feedback/stats (admin)
 */
router.get('/peer-feedback/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // PostgreSQL FILTER syntax — keep as raw
    const statsRowsRaw = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE))::int as this_week
      FROM peer_feedbacks
    `;
    const statsRows = convertBigInts(statsRowsRaw);
    
    // Top receveurs (aggregate)
    const topReceiversRaw = await prisma.$queryRaw`
      SELECT 
        u.id, u.nom, u.prenom,
        COUNT(*)::int as nb_feedbacks,
        SUM(pf.points_proposed)::int as total_points
      FROM peer_feedbacks pf
      JOIN "User" u ON pf.to_employee_id = u.id
      WHERE pf.status = 'approved'
      GROUP BY u.id, u.nom, u.prenom
      ORDER BY nb_feedbacks DESC
      LIMIT 5
    `;
    const topReceivers = convertBigInts(topReceiversRaw);
    
    res.json({ 
      success: true, 
      data: { ...statsRows[0], topReceivers } 
    });
  } catch (error) {
    console.error('Erreur stats feedbacks:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
