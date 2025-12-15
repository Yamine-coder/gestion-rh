// =====================================================
// SERVICE API SCORING - Côté client
// =====================================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Helper pour les requêtes authentifiées
 */
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || error.message || 'Erreur serveur');
  }
  
  return response.json();
};

// =====================================================
// ROUTES EMPLOYÉ
// =====================================================

/**
 * Récupère le score de l'employé connecté
 */
export const getMonScore = () => authFetch('/api/scoring/mon-score');

/**
 * Récupère l'historique des points de l'employé connecté
 */
export const getMonHistorique = (page = 1, limit = 50, categorie = null) => {
  let url = `/api/scoring/mon-historique?page=${page}&limit=${limit}`;
  if (categorie) url += `&categorie=${categorie}`;
  return authFetch(url);
};

// =====================================================
// ROUTES ADMIN/MANAGER
// =====================================================

/**
 * Récupère toutes les règles de scoring
 */
export const getScoringRules = () => authFetch('/api/scoring/rules');

/**
 * Récupère le classement des employés
 */
export const getClassement = (periode = '3months', limit = 50) => {
  return authFetch(`/api/scoring/classement?periode=${periode}&limit=${limit}`);
};

/**
 * Récupère le score détaillé d'un employé
 */
export const getEmployeScore = (employeId) => {
  return authFetch(`/api/scoring/employe/${employeId}`);
};

/**
 * Attribue des points à un employé
 */
export const attribuerPoints = (employeId, ruleCode, motif = null, dateEvenement = null, pointsCustom = null) => {
  return authFetch('/api/scoring/attribuer', {
    method: 'POST',
    body: JSON.stringify({
      employe_id: employeId,
      rule_code: ruleCode,
      motif,
      date_evenement: dateEvenement,
      points_custom: pointsCustom
    })
  });
};

/**
 * Supprime une attribution de points
 */
export const supprimerPoints = (pointId) => {
  return authFetch(`/api/scoring/points/${pointId}`, { method: 'DELETE' });
};

/**
 * Récupère les stats pour le dashboard manager
 */
export const getScoringDashboard = () => authFetch('/api/scoring/dashboard');

// =====================================================
// CONSTANTES
// =====================================================

export const CATEGORIES = {
  pointage: { label: 'Pointage', icon: '⏰', color: 'blue' },
  presence: { label: 'Présence', icon: '📅', color: 'green' },
  anomalie: { label: 'Anomalies', icon: '⚠️', color: 'orange' },
  remplacement: { label: 'Remplacements', icon: '🔄', color: 'purple' },
  extra: { label: 'Extras', icon: '⭐', color: 'yellow' },
  conge: { label: 'Congés', icon: '🏖️', color: 'cyan' },
  comportement: { label: 'Comportement', icon: '👤', color: 'red' },
  special: { label: 'Spécial', icon: '🎁', color: 'pink' }
};

export const NIVEAUX = {
  diamant: { label: 'Diamant', emoji: '💎', color: '#B9F2FF', min: 500, max: Infinity },
  or: { label: 'Or', emoji: '🥇', color: '#FFD700', min: 300, max: 500 },
  argent: { label: 'Argent', emoji: '🥈', color: '#C0C0C0', min: 100, max: 300 },
  bronze: { label: 'Bronze', emoji: '🥉', color: '#CD7F32', min: 0, max: 100 },
  alerte: { label: 'À surveiller', emoji: '⚠️', color: '#FF6B6B', min: -Infinity, max: 0 }
};

/**
 * Détermine le niveau selon le score avec infos de progression
 */
export const getNiveau = (score) => {
  let niveau, nextLabel, remaining, progress, barColor, bg, iconColor;
  
  if (score >= 500) {
    niveau = NIVEAUX.diamant;
    nextLabel = null;
    remaining = 0;
    progress = 100;
    barColor = '#06b6d4'; // cyan
    bg = 'bg-gradient-to-br from-cyan-100 to-blue-100';
    iconColor = 'text-cyan-500';
  } else if (score >= 300) {
    niveau = NIVEAUX.or;
    nextLabel = 'Diamant';
    remaining = 500 - score;
    progress = ((score - 300) / 200) * 100;
    barColor = '#eab308'; // yellow
    bg = 'bg-gradient-to-br from-yellow-100 to-amber-100';
    iconColor = 'text-yellow-500';
  } else if (score >= 100) {
    niveau = NIVEAUX.argent;
    nextLabel = 'Or';
    remaining = 300 - score;
    progress = ((score - 100) / 200) * 100;
    barColor = '#9ca3af'; // gray
    bg = 'bg-gradient-to-br from-gray-100 to-slate-200';
    iconColor = 'text-gray-400';
  } else if (score >= 0) {
    niveau = NIVEAUX.bronze;
    nextLabel = 'Argent';
    remaining = 100 - score;
    progress = (score / 100) * 100;
    barColor = '#d97706'; // amber
    bg = 'bg-gradient-to-br from-amber-100 to-orange-100';
    iconColor = 'text-amber-600';
  } else {
    niveau = NIVEAUX.alerte;
    nextLabel = 'Bronze';
    remaining = Math.abs(score);
    progress = 0;
    barColor = '#ef4444'; // red
    bg = 'bg-gradient-to-br from-red-100 to-orange-100';
    iconColor = 'text-red-500';
  }
  
  return {
    ...niveau,
    nextLabel,
    remaining,
    progress,
    barColor,
    bg,
    iconColor
  };
};

export default {
  getMonScore,
  getMonHistorique,
  getScoringRules,
  getClassement,
  getEmployeScore,
  attribuerPoints,
  supprimerPoints,
  getScoringDashboard,
  CATEGORIES,
  NIVEAUX,
  getNiveau
};
