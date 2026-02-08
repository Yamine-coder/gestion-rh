/**
 * 📊 Service d'analyse des avis Google
 * Stocke les avis, calcule les tendances et génère des insights
 * Version 2.0 - Support multi-périodes (7j, 30j, 90j)
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/avis-historique.json');

// Périodes d'analyse supportées
const PERIODS = {
  '7d': { days: 7, label: '7 derniers jours', compareTo: 7 },
  '30d': { days: 30, label: '30 derniers jours', compareTo: 30 },
  '90d': { days: 90, label: '3 derniers mois', compareTo: 90 },
  'month': { days: null, label: 'Mois en cours', compareTo: 'lastMonth' }
};

// Mots-clés à tracker pour la restauration
// Mots-clés thématiques pour l'analyse des avis
const KEYWORDS_THEMES = {
  // 🍴 NOURRITURE
  food: {
    label: 'Cuisine',
    emoji: '🍴',
    positive: [
      { words: ['délicieux', 'savoureux', 'succulent', 'goûteux', 'exquis'], display: 'Plats délicieux' },
      { words: ['frais', 'fraîcheur', 'produits frais'], display: 'Produits frais' },
      { words: ['copieux', 'généreu', 'bien servi', 'grosse portion'], display: 'Portions généreuses' },
      { words: ['fait maison', 'artisan', 'authentique'], display: 'Fait maison' },
      { words: ['présentation', 'bien présenté', 'joli', 'belle assiette'], display: 'Belle présentation' },
      { words: ['cuisson parfaite', 'bien cuit', 'à point'], display: 'Cuisson parfaite' }
    ],
    negative: [
      { words: ['froid', 'tiède', 'pas chaud', 'réchauffé'], display: 'Plats froids' },
      { words: ['petit', 'petite portion', 'pas assez', 'chiche'], display: 'Portions petites' },
      { words: ['sans goût', 'fade', 'insipide', 'banal'], display: 'Manque de goût' },
      { words: ['trop salé', 'trop cuit', 'brûlé', 'sec'], display: 'Cuisson ratée' },
      { words: ['pas frais', 'surgelé', 'industriel'], display: 'Pas frais' }
    ]
  },
  // 👨‍🍳 SERVICE
  service: {
    label: 'Service',
    emoji: '👨‍🍳',
    positive: [
      { words: ['accueil', 'accueillant', 'bien reçu', 'bienvenue'], display: 'Bon accueil' },
      { words: ['serveur', 'serveuse', 'personnel', 'équipe'].map(w => [`${w} sympa`, `${w} aimable`, `${w} souriant`, `${w} agréable`]).flat(), display: 'Personnel sympathique' },
      { words: ['rapide', 'efficace', 'pas attendu'], display: 'Service rapide' },
      { words: ['attentif', 'attentionné', 'aux petits soins', 'prévenant'], display: 'Service attentionné' },
      { words: ['professionnel', 'impeccable', 'irréprochable'], display: 'Professionnalisme' },
      { words: ['conseil', 'conseillé', 'recommandation'], display: 'Bons conseils' }
    ],
    negative: [
      { words: ['attente', 'attendu', 'long', 'lent', '30 min', '45 min', '1h', 'une heure'], display: 'Attente longue' },
      { words: ['serveur désagréable', 'mal reçu', 'froid', 'hautain', 'impoli'], display: 'Personnel désagréable' },
      { words: ['oublié', 'erreur commande', 'pas ce que', 'trompé'], display: 'Erreurs de commande' },
      { words: ['négligé', 'délaissé', 'ignoré', 'invisible'], display: 'Service négligent' },
      { words: ['débordé', 'sous-effectif', 'pas assez de personnel'], display: 'Sous-effectif' }
    ]
  },
  // 🏠 AMBIANCE / CADRE
  ambiance: {
    label: 'Ambiance',
    emoji: '🏠',
    positive: [
      { words: ['ambiance', 'atmosphère', 'convivial', 'chaleureux'], display: 'Ambiance agréable' },
      { words: ['terrasse', 'belle terrasse', 'dehors'], display: 'Belle terrasse' },
      { words: ['décor', 'déco', 'cadre', 'joli', 'beau'], display: 'Beau cadre' },
      { words: ['calme', 'tranquille', 'paisible', 'intime'], display: 'Calme et intime' },
      { words: ['propre', 'clean', 'impeccable', 'nickel'], display: 'Propreté' },
      { words: ['musique', 'fond musical', 'playlist'], display: 'Bonne musique' }
    ],
    negative: [
      { words: ['bruit', 'bruyant', 'sonore', 'trop fort'], display: 'Trop bruyant' },
      { words: ['sale', 'pas propre', 'collant', 'dégueulasse'], display: 'Manque propreté' },
      { words: ['serré', 'étroit', 'entassé', 'petite table'], display: 'Espace restreint' },
      { words: ['parking', 'garer', 'stationnement', 'place'], display: 'Parking difficile' },
      { words: ['froid dehors', 'courant d\'air', 'climatisation'], display: 'Température' }
    ]
  },
  // 💰 PRIX / RAPPORT QUALITÉ-PRIX
  price: {
    label: 'Prix',
    emoji: '💰',
    positive: [
      { words: ['bon rapport', 'rapport qualité', 'prix correct', 'bien pour le prix'], display: 'Bon rapport Q/P' },
      { words: ['pas cher', 'abordable', 'raisonnable', 'accessible'], display: 'Prix abordables' },
      { words: ['menu', 'formule', 'offre', 'promotion'], display: 'Bonnes formules' }
    ],
    negative: [
      { words: ['cher', 'onéreux', 'excessif', 'abusé', 'arnaque'], display: 'Trop cher' },
      { words: ['addition salée', 'note élevée', 'facture'], display: 'Addition salée' },
      { words: ['pas rentable', 'ne vaut pas', 'déçu du prix'], display: 'Mauvais rapport Q/P' }
    ]
  },
  // ⭐ GÉNÉRAL
  general: {
    label: 'Général',
    emoji: '⭐',
    positive: [
      { words: ['excellent', 'parfait', 'super', 'génial', 'top', 'magnifique', 'incroyable'], display: 'Excellent' },
      { words: ['recommande', 'conseille', 'à faire', 'foncez', 'allez-y'], display: 'Recommandé' },
      { words: ['revenir', 'reviendrai', 'retourner', 'y retournerai', 'habitué'], display: 'Fidélisation' },
      { words: ['découverte', 'surprise', 'bonne adresse', 'pépite'], display: 'Bonne découverte' }
    ],
    negative: [
      { words: ['décevant', 'déçu', 'déception', 'dommage', 'malheureusement'], display: 'Décevant' },
      { words: ['jamais', 'plus jamais', 'dernière fois', 'pas revenir'], display: 'Ne reviendra pas' },
      { words: ['éviter', 'déconseille', 'fuyez', 'à fuir'], display: 'Déconseillé' },
      { words: ['moyen', 'bof', 'sans plus', 'ordinaire'], display: 'Sans plus' }
    ]
  }
};

// Anciens mots-clés (gardés pour compatibilité)
const KEYWORDS = {
  positive: [
    'excellent', 'délicieux', 'parfait', 'super', 'génial', 'magnifique', 'top',
    'accueil', 'chaleureux', 'souriant', 'aimable', 'sympathique', 'agréable',
    'rapide', 'efficace', 'attentif', 'professionnel',
    'frais', 'copieux', 'savoureux', 'goûteux', 'succulent',
    'terrasse', 'ambiance', 'cadre', 'décor', 'vue',
    'qualité', 'rapport', 'prix', 'recommande', 'revenir'
  ],
  negative: [
    'attente', 'lent', 'long', 'temps', 'minutes',
    'froid', 'tiède', 'réchauffé',
    'cher', 'prix', 'addition', 'note',
    'petit', 'portion', 'quantité',
    'bruit', 'bruyant', 'sonore',
    'décevant', 'déçu', 'dommage', 'malheureusement',
    'service', 'serveur', 'serveuse',
    'sale', 'propre', 'hygiène',
    'parking', 'place', 'stationnement',
    'réservation', 'table', 'attendre'
  ]
};

// Plats spécifiques à tracker pour Chez Antoine
const PLATS = {
  // Pizzas
  'pizza': { category: 'Pizza', emoji: '🍕' },
  'margherita': { category: 'Pizza', emoji: '🍕' },
  'reine': { category: 'Pizza', emoji: '🍕' },
  'orientale': { category: 'Pizza', emoji: '🍕' },
  'mexicaine': { category: 'Pizza', emoji: '🍕' },
  'savoyarde': { category: 'Pizza', emoji: '🍕' },
  'raclette': { category: 'Pizza', emoji: '🍕' },
  'truffe': { category: 'Pizza', emoji: '🍕' },
  'norvégienne': { category: 'Pizza', emoji: '🍕' },
  'calzone': { category: 'Pizza', emoji: '🍕' },
  // Pâtes
  'pâtes': { category: 'Pâtes', emoji: '🍝' },
  'carbonara': { category: 'Pâtes', emoji: '🍝' },
  'bolognaise': { category: 'Pâtes', emoji: '🍝' },
  'saumon': { category: 'Pâtes', emoji: '🍝' },
  'arrabiata': { category: 'Pâtes', emoji: '🍝' },
  'napolitaine': { category: 'Pâtes', emoji: '🍝' },
  // Autres
  'salade': { category: 'Salade', emoji: '🥗' },
  'burrata': { category: 'Entrée', emoji: '🧀' },
  'empanada': { category: 'Entrée', emoji: '🥟' },
  'tiramisu': { category: 'Dessert', emoji: '🍰' },
  'mi-cuit': { category: 'Dessert', emoji: '🍫' },
  'nutella': { category: 'Dessert', emoji: '🍫' },
  'dessert': { category: 'Dessert', emoji: '🍰' }
};

// Liste simple pour la recherche
const PLATS_LIST = Object.keys(PLATS);

/**
 * Charge l'historique des avis
 */
function loadHistory() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Erreur chargement historique avis:', e.message);
  }
  return {
    reviews: [],
    snapshots: [], // Snapshots mensuels pour comparaison
    lastUpdate: null
  };
}

/**
 * Sauvegarde l'historique
 */
function saveHistory(history) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Erreur sauvegarde historique:', e.message);
  }
}

/**
 * Ajoute de nouveaux avis à l'historique (évite les doublons)
 */
function addReviews(newReviews) {
  const history = loadHistory();
  
  newReviews.forEach(review => {
    // Vérifie si l'avis existe déjà (par auteur + timestamp)
    const exists = history.reviews.some(r => 
      r.author === review.author && r.time === review.time
    );
    
    if (!exists) {
      history.reviews.push({
        ...review,
        addedAt: Date.now(),
        month: new Date(review.time).toISOString().substring(0, 7) // YYYY-MM
      });
    }
  });
  
  // Garde les 500 derniers avis max
  history.reviews = history.reviews
    .sort((a, b) => b.time - a.time)
    .slice(0, 500);
  
  history.lastUpdate = Date.now();
  saveHistory(history);
  
  return history;
}

/**
 * Analyse les mots-clés dans un texte
 */
function analyzeText(text) {
  const lowerText = (text || '').toLowerCase();
  const found = { positive: {}, negative: {}, plats: {} };
  
  KEYWORDS.positive.forEach(kw => {
    if (lowerText.includes(kw)) {
      found.positive[kw] = (found.positive[kw] || 0) + 1;
    }
  });
  
  KEYWORDS.negative.forEach(kw => {
    if (lowerText.includes(kw)) {
      found.negative[kw] = (found.negative[kw] || 0) + 1;
    }
  });
  
  PLATS_LIST.forEach(plat => {
    if (lowerText.includes(plat)) {
      found.plats[plat] = (found.plats[plat] || 0) + 1;
    }
  });
  
  return found;
}

/**
 * 🎯 Analyse thématique améliorée des avis
 * Regroupe les retours par catégorie (Cuisine, Service, Ambiance, Prix)
 * @param {Array} reviews - Liste des avis à analyser
 * @returns {Object} Analyse par thème avec compteurs
 */
function analyzeThemes(reviews) {
  const themes = {};
  
  // Initialise les compteurs par thème
  Object.keys(KEYWORDS_THEMES).forEach(themeKey => {
    const theme = KEYWORDS_THEMES[themeKey];
    themes[themeKey] = {
      label: theme.label,
      emoji: theme.emoji,
      positive: {},
      negative: {}
    };
    
    // Initialise chaque expression
    theme.positive.forEach(expr => {
      themes[themeKey].positive[expr.display] = 0;
    });
    theme.negative.forEach(expr => {
      themes[themeKey].negative[expr.display] = 0;
    });
  });
  
  // Analyse chaque avis
  reviews.forEach(review => {
    const text = (review.text || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Enlève accents pour recherche
    
    Object.keys(KEYWORDS_THEMES).forEach(themeKey => {
      const theme = KEYWORDS_THEMES[themeKey];
      
      // Vérifie les expressions positives
      theme.positive.forEach(expr => {
        const words = Array.isArray(expr.words) ? expr.words : [expr.words];
        const found = words.some(word => {
          const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return text.includes(normalizedWord);
        });
        if (found) {
          themes[themeKey].positive[expr.display]++;
        }
      });
      
      // Vérifie les expressions négatives
      theme.negative.forEach(expr => {
        const words = Array.isArray(expr.words) ? expr.words : [expr.words];
        const found = words.some(word => {
          const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return text.includes(normalizedWord);
        });
        if (found) {
          themes[themeKey].negative[expr.display]++;
        }
      });
    });
  });
  
  // Formate le résultat avec uniquement les éléments trouvés
  const result = {
    positive: [],
    negative: [],
    byTheme: {}
  };
  
  Object.keys(themes).forEach(themeKey => {
    const theme = themes[themeKey];
    
    // Positifs trouvés pour ce thème
    const posFound = Object.entries(theme.positive)
      .filter(([_, count]) => count > 0)
      .map(([display, count]) => ({
        theme: theme.label,
        emoji: theme.emoji,
        display,
        count
      }))
      .sort((a, b) => b.count - a.count);
    
    // Négatifs trouvés pour ce thème
    const negFound = Object.entries(theme.negative)
      .filter(([_, count]) => count > 0)
      .map(([display, count]) => ({
        theme: theme.label,
        emoji: theme.emoji,
        display,
        count
      }))
      .sort((a, b) => b.count - a.count);
    
    result.positive.push(...posFound);
    result.negative.push(...negFound);
    
    if (posFound.length > 0 || negFound.length > 0) {
      result.byTheme[themeKey] = {
        label: theme.label,
        emoji: theme.emoji,
        positive: posFound,
        negative: negFound,
        score: posFound.reduce((s, p) => s + p.count, 0) - negFound.reduce((s, n) => s + n.count, 0)
      };
    }
  });
  
  // Trie par nombre d'occurrences
  result.positive.sort((a, b) => b.count - a.count);
  result.negative.sort((a, b) => b.count - a.count);
  
  return result;
}

/**
 * 🍕 Analyse des plats avec score de satisfaction
 * @param {Array} reviews - Liste des avis
 * @returns {Object} Analyse par plat avec note moyenne
 */
function analyzePlats(reviews) {
  const platStats = {};
  
  reviews.forEach(review => {
    const text = (review.text || '').toLowerCase();
    const rating = review.rating;
    
    PLATS_LIST.forEach(plat => {
      if (text.includes(plat)) {
        if (!platStats[plat]) {
          platStats[plat] = {
            name: plat.charAt(0).toUpperCase() + plat.slice(1),
            ...PLATS[plat],
            mentions: 0,
            totalRating: 0,
            ratings: [],
            positive: 0,
            negative: 0
          };
        }
        platStats[plat].mentions++;
        platStats[plat].totalRating += rating;
        platStats[plat].ratings.push(rating);
        if (rating >= 4) platStats[plat].positive++;
        if (rating <= 2) platStats[plat].negative++;
      }
    });
  });
  
  // Calculer les moyennes et trier
  const result = Object.values(platStats)
    .map(p => ({
      ...p,
      avgRating: p.mentions > 0 ? parseFloat((p.totalRating / p.mentions).toFixed(1)) : null,
      satisfactionRate: p.mentions > 0 ? Math.round((p.positive / p.mentions) * 100) : null,
      trend: p.negative > p.positive ? 'down' : p.positive > p.negative ? 'up' : 'stable'
    }))
    .filter(p => p.mentions >= 1) // Au moins 1 mention
    .sort((a, b) => b.mentions - a.mentions); // Trier par popularité
  
  return {
    plats: result,
    topRated: [...result].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0)).slice(0, 3),
    needsAttention: result.filter(p => p.avgRating && p.avgRating < 3.5 && p.mentions >= 2),
    mostPopular: result.slice(0, 5)
  };
}

/**
 * 🆕 Analyse par période flexible (7j, 30j, 90j)
 * @param {Array} reviews - Tous les avis
 * @param {string} periodKey - '7d', '30d', '90d', 'month'
 */
function analyzeByPeriod(reviews, periodKey = '30d') {
  if (!reviews || reviews.length === 0) {
    return getEmptyAnalysis();
  }

  const period = PERIODS[periodKey] || PERIODS['30d'];
  const now = new Date();
  
  let currentReviews, compareReviews, periodLabel, compareLabel;
  
  if (periodKey === 'month') {
    // Mode mois : mois courant vs mois précédent
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    const getMonth = (ts) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    
    currentReviews = reviews.filter(r => getMonth(r.time) === currentMonth);
    compareReviews = reviews.filter(r => getMonth(r.time) === lastMonth);
    periodLabel = 'Ce mois';
    compareLabel = 'Mois dernier';
  } else {
    // Mode jours : X derniers jours vs X jours précédents
    const daysAgo = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    
    const startCurrent = daysAgo(period.days);
    const startCompare = daysAgo(period.days * 2);
    
    currentReviews = reviews.filter(r => r.time >= startCurrent);
    compareReviews = reviews.filter(r => r.time >= startCompare && r.time < startCurrent);
    periodLabel = period.label;
    compareLabel = `${period.days}j précédents`;
  }
  
  // Analyse des mots-clés
  const currentKeywords = { positive: {}, negative: {}, plats: {} };
  const compareKeywords = { positive: {}, negative: {}, plats: {} };
  
  currentReviews.forEach(r => mergeKeywords(currentKeywords, analyzeText(r.text)));
  compareReviews.forEach(r => mergeKeywords(compareKeywords, analyzeText(r.text)));
  
  // Calcul des KPIs
  const currentAvg = currentReviews.length > 0 
    ? currentReviews.reduce((acc, r) => acc + r.rating, 0) / currentReviews.length 
    : null;
  const compareAvg = compareReviews.length > 0 
    ? compareReviews.reduce((acc, r) => acc + r.rating, 0) / compareReviews.length 
    : null;
  
  const currentNegative = currentReviews.filter(r => r.rating <= 3).length;
  const compareNegative = compareReviews.filter(r => r.rating <= 3).length;
  
  const negativeRate = currentReviews.length > 0 
    ? Math.round((currentNegative / currentReviews.length) * 100) 
    : 0;
  const compareNegativeRate = compareReviews.length > 0 
    ? Math.round((compareNegative / compareReviews.length) * 100) 
    : 0;
  
  // Tendances
  const trends = calculateTrends(currentKeywords, compareKeywords, currentReviews.length, compareReviews.length);
  
  // Insights contextuels
  const insights = generatePeriodInsights(currentKeywords, trends, currentReviews, periodKey);
  
  // Distribution des notes (période courante)
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  currentReviews.forEach(r => {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating]++;
    }
  });
  
  // Top keywords (ancienne méthode)
  const sortByCount = obj => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
  
  // 🎯 Analyse thématique améliorée
  const themeAnalysis = analyzeThemes(currentReviews);
  
  return {
    period: {
      key: periodKey,
      label: periodLabel,
      compareLabel,
      days: period.days
    },
    // Nouvelle analyse thématique (avec emoji et catégories)
    themeAnalysis,
    // Ancienne analyse (pour compatibilité)
    keywords: {
      positive: sortByCount(currentKeywords.positive),
      negative: sortByCount(currentKeywords.negative),
      plats: sortByCount(currentKeywords.plats)
    },
    trends,
    insights,
    ratingDistribution,
    kpis: {
      // Note moyenne
      rating: {
        current: currentAvg ? parseFloat(currentAvg.toFixed(2)) : null,
        previous: compareAvg ? parseFloat(compareAvg.toFixed(2)) : null,
        change: (currentAvg && compareAvg) ? parseFloat((currentAvg - compareAvg).toFixed(2)) : null,
        target: 4.2,
        status: currentAvg >= 4.2 ? 'good' : currentAvg >= 3.8 ? 'warning' : 'bad'
      },
      // Volume d'avis
      volume: {
        current: currentReviews.length,
        previous: compareReviews.length,
        change: compareReviews.length > 0 
          ? Math.round(((currentReviews.length - compareReviews.length) / compareReviews.length) * 100)
          : null,
        perDay: period.days ? parseFloat((currentReviews.length / period.days).toFixed(1)) : null
      },
      // Taux d'avis négatifs
      negativeRate: {
        current: negativeRate,
        previous: compareNegativeRate,
        change: compareNegativeRate > 0 ? negativeRate - compareNegativeRate : null,
        target: 15,
        status: negativeRate <= 15 ? 'good' : negativeRate <= 25 ? 'warning' : 'bad',
        count: currentNegative
      },
      // Score de satisfaction (5★ + 4★) / total
      satisfaction: {
        current: currentReviews.length > 0 
          ? Math.round(((ratingDistribution[5] + ratingDistribution[4]) / currentReviews.length) * 100)
          : null,
        status: null
      }
    },
    // 🍕 Analyse par plat
    platAnalysis: analyzePlats(currentReviews),
    stats: {
      totalAnalyzed: reviews.length,
      periodCount: currentReviews.length,
      compareCount: compareReviews.length
    }
  };
}

/**
 * Génère des insights adaptés à la période
 */
function generatePeriodInsights(keywords, trends, reviews, periodKey) {
  const insights = [];
  const isShortTerm = periodKey === '7d';
  
  // Insight 1: Alerte si trop de négatifs sur période courte
  const negativeCount = reviews.filter(r => r.rating <= 3).length;
  const negativeRate = reviews.length > 0 ? (negativeCount / reviews.length) * 100 : 0;
  
  if (isShortTerm && negativeCount >= 2) {
    insights.push({
      type: 'warning',
      title: `${negativeCount} avis négatifs cette semaine`,
      detail: `${Math.round(negativeRate)}% des avis - Réagir rapidement`,
      action: 'Répondre à ces avis dans les 24h',
      priority: 'high'
    });
  }
  
  // Insight 2: Problème récurrent
  const topNegative = Object.entries(keywords.negative).sort((a, b) => b[1] - a[1])[0];
  if (topNegative && topNegative[1] >= 2) {
    const alertTrend = trends.find(t => t.word === topNegative[0] && t.alert);
    let detail = 'Point d\'attention récurrent';
    let priority = 'medium';
    
    if (alertTrend) {
      if (alertTrend.change !== null && alertTrend.change !== undefined) {
        detail = `En hausse de +${alertTrend.change}% vs période précédente`;
      } else if (alertTrend.direction === 'new') {
        detail = 'Nouveau problème détecté cette période';
      }
      priority = 'high';
    }
    
    insights.push({
      type: 'warning',
      title: `"${topNegative[0]}" mentionné ${topNegative[1]} fois`,
      detail,
      action: getActionForKeyword(topNegative[0]),
      priority
    });
  }
  
  // Insight 3: Point positif
  const topPositive = Object.entries(keywords.positive).sort((a, b) => b[1] - a[1])[0];
  if (topPositive && topPositive[1] >= 2) {
    insights.push({
      type: 'success',
      title: `"${topPositive[0]}" apprécié (${topPositive[1]}x)`,
      detail: 'Point fort à maintenir',
      action: null,
      priority: 'low'
    });
  }
  
  // Insight 4: Tendance en hausse inquiétante
  const alertTrend = trends.find(t => t.alert && t.type === 'negative');
  if (alertTrend && !insights.some(i => i.title.includes(alertTrend.word))) {
    let detail = 'Nouveau problème détecté';
    if (alertTrend.change !== null && alertTrend.change !== undefined) {
      detail = `+${alertTrend.change}% vs période précédente`;
    } else if (alertTrend.direction === 'new') {
      detail = 'Apparu récemment';
    }
    
    insights.push({
      type: 'warning',
      title: `⚠️ "${alertTrend.word}" en hausse`,
      detail,
      action: getActionForKeyword(alertTrend.word),
      priority: 'high'
    });
  }
  
  // Insight 5: Plat populaire
  const topPlat = Object.entries(keywords.plats).sort((a, b) => b[1] - a[1])[0];
  if (topPlat && topPlat[1] >= 2) {
    insights.push({
      type: 'info',
      title: `Le ${topPlat[0]} fait parler`,
      detail: `Mentionné ${topPlat[1]} fois`,
      action: null,
      priority: 'low'
    });
  }
  
  // Trier par priorité et limiter
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 4);
}

/**
 * Retourne une analyse vide
 */
function getEmptyAnalysis() {
  return {
    period: { key: '30d', label: '30 derniers jours' },
    keywords: { positive: [], negative: [], plats: [] },
    trends: [],
    insights: [],
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    kpis: {
      rating: { current: null, previous: null, change: null },
      volume: { current: 0, previous: 0, change: null },
      negativeRate: { current: 0, previous: 0, change: null },
      satisfaction: { current: null }
    },
    stats: { totalAnalyzed: 0, periodCount: 0, compareCount: 0 }
  };
}

/**
 * Analyse complète des avis avec tendances
 */
function analyzeReviews(reviews, previousMonth = null) {
  if (!reviews || reviews.length === 0) {
    return { keywords: { positive: [], negative: [] }, trends: [], insights: [] };
  }
  
  // Séparer avis du mois courant vs mois précédent (en local, pas UTC)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth(); // 0-11
  
  // Format YYYY-MM pour comparaison
  const currentMonth = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(currentYear, currentMonthNum - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  const getReviewMonth = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const currentReviews = reviews.filter(r => getReviewMonth(r.time) === currentMonth);
  const lastMonthReviews = reviews.filter(r => getReviewMonth(r.time) === lastMonth);
  
  // Compter les mots-clés
  const currentKeywords = { positive: {}, negative: {}, plats: {} };
  const lastKeywords = { positive: {}, negative: {}, plats: {} };
  
  currentReviews.forEach(r => {
    const analysis = analyzeText(r.text);
    mergeKeywords(currentKeywords, analysis);
  });
  
  lastMonthReviews.forEach(r => {
    const analysis = analyzeText(r.text);
    mergeKeywords(lastKeywords, analysis);
  });
  
  // Calculer les tendances
  const trends = calculateTrends(currentKeywords, lastKeywords, currentReviews.length, lastMonthReviews.length);
  
  // Générer les insights
  const insights = generateInsights(currentKeywords, trends, reviews);
  
  // Distribution des notes
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating]++;
    }
  });
  
  // Top keywords triés
  const sortByCount = obj => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
  
  // Calculer les moyennes par mois
  const currentMonthAvg = currentReviews.length > 0 
    ? currentReviews.reduce((acc, r) => acc + r.rating, 0) / currentReviews.length 
    : null;
  const lastMonthAvg = lastMonthReviews.length > 0 
    ? lastMonthReviews.reduce((acc, r) => acc + r.rating, 0) / lastMonthReviews.length 
    : null;
  
  // Calcul de l'évolution réelle
  const ratingChange = (currentMonthAvg !== null && lastMonthAvg !== null)
    ? parseFloat((currentMonthAvg - lastMonthAvg).toFixed(1))
    : null;
  const volumeChange = (lastMonthReviews.length > 0)
    ? Math.round(((currentReviews.length - lastMonthReviews.length) / lastMonthReviews.length) * 100)
    : null;
  
  return {
    keywords: {
      positive: sortByCount(currentKeywords.positive),
      negative: sortByCount(currentKeywords.negative),
      plats: sortByCount(currentKeywords.plats)
    },
    trends,
    insights,
    ratingDistribution,
    stats: {
      totalAnalyzed: reviews.length,
      currentMonth: currentReviews.length,
      lastMonth: lastMonthReviews.length,
      currentMonthAvg,
      lastMonthAvg,
      ratingChange,
      volumeChange,
      averageRating: reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0,
      negativeCount: reviews.filter(r => r.rating <= 3).length
    }
  };
}

/**
 * Fusionne les compteurs de mots-clés
 */
function mergeKeywords(target, source) {
  ['positive', 'negative', 'plats'].forEach(type => {
    Object.entries(source[type] || {}).forEach(([word, count]) => {
      target[type][word] = (target[type][word] || 0) + count;
    });
  });
}

/**
 * Calcule les tendances entre deux périodes
 */
function calculateTrends(current, previous, currentCount, prevCount) {
  const trends = [];
  
  // Normaliser par nombre d'avis
  const normalize = (count, total) => total > 0 ? (count / total) * 100 : 0;
  
  // Analyser les mots négatifs qui augmentent
  Object.entries(current.negative).forEach(([word, count]) => {
    const currentRate = normalize(count, currentCount);
    const prevRate = normalize(previous.negative[word] || 0, prevCount);
    
    if (prevRate > 0) {
      const change = ((currentRate - prevRate) / prevRate) * 100;
      if (Math.abs(change) > 20) { // Changement significatif > 20%
        trends.push({
          word,
          type: 'negative',
          currentCount: count,
          change: Math.round(change),
          direction: change > 0 ? 'up' : 'down',
          alert: change > 30 // Alerte si +30%
        });
      }
    } else if (count >= 2) {
      // Nouveau problème qui n'existait pas avant
      trends.push({
        word,
        type: 'negative',
        currentCount: count,
        change: null,
        direction: 'new',
        alert: true
      });
    }
  });
  
  // Analyser les mots positifs qui augmentent
  Object.entries(current.positive).forEach(([word, count]) => {
    const currentRate = normalize(count, currentCount);
    const prevRate = normalize(previous.positive[word] || 0, prevCount);
    
    if (prevRate > 0) {
      const change = ((currentRate - prevRate) / prevRate) * 100;
      if (change > 20) { // Amélioration significative
        trends.push({
          word,
          type: 'positive',
          currentCount: count,
          change: Math.round(change),
          direction: 'up',
          alert: false
        });
      }
    }
  });
  
  // Trier par importance (alertes d'abord, puis par changement)
  return trends.sort((a, b) => {
    if (a.alert !== b.alert) return b.alert - a.alert;
    return Math.abs(b.change || 0) - Math.abs(a.change || 0);
  }).slice(0, 5);
}

/**
 * Génère des insights automatiques
 */
function generateInsights(keywords, trends, reviews) {
  const insights = [];
  
  // Insight 1: Problème principal
  const topNegative = Object.entries(keywords.negative)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topNegative && topNegative[1] >= 3) {
    const alertTrend = trends.find(t => t.word === topNegative[0] && t.alert);
    insights.push({
      type: 'warning',
      title: `"${topNegative[0]}" mentionné ${topNegative[1]} fois`,
      detail: alertTrend 
        ? `En hausse de ${alertTrend.change}% vs mois dernier`
        : 'Point d\'attention récurrent',
      action: getActionForKeyword(topNegative[0])
    });
  }
  
  // Insight 2: Point fort
  const topPositive = Object.entries(keywords.positive)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topPositive && topPositive[1] >= 3) {
    insights.push({
      type: 'success',
      title: `"${topPositive[0]}" apprécié (${topPositive[1]} mentions)`,
      detail: 'Continuez sur cette lancée !',
      action: null
    });
  }
  
  // Insight 3: Plat populaire
  const topPlat = Object.entries(keywords.plats)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topPlat && topPlat[1] >= 2) {
    insights.push({
      type: 'info',
      title: `Le ${topPlat[0]} fait parler`,
      detail: `Mentionné ${topPlat[1]} fois dans les avis récents`,
      action: null
    });
  }
  
  // Insight 4: Tendance inquiétante
  const alertTrend = trends.find(t => t.alert && t.type === 'negative');
  if (alertTrend && !insights.some(i => i.title.includes(alertTrend.word))) {
    insights.push({
      type: 'warning',
      title: `⚠️ "${alertTrend.word}" en hausse`,
      detail: alertTrend.change 
        ? `+${alertTrend.change}% vs mois dernier`
        : 'Nouveau problème détecté',
      action: getActionForKeyword(alertTrend.word)
    });
  }
  
  return insights.slice(0, 3);
}

/**
 * Suggestions d'actions par mot-clé
 */
function getActionForKeyword(keyword) {
  const actions = {
    'attente': 'Vérifier le staffing aux heures de pointe',
    'lent': 'Former l\'équipe sur la rapidité de service',
    'long': 'Optimiser le temps entre les plats',
    'froid': 'Vérifier le pass et la coordination cuisine-salle',
    'cher': 'Revoir le rapport qualité-prix ou la communication',
    'petit': 'Ajuster les portions ou améliorer la présentation',
    'bruit': 'Envisager une isolation acoustique',
    'bruyant': 'Réduire la musique aux heures de pointe',
    'service': 'Formation équipe sur l\'accueil client',
    'réservation': 'Améliorer le système de réservation'
  };
  
  return actions[keyword] || 'Analyser les avis concernés';
}

/**
 * Détecte les pics de problèmes par jour/heure
 */
function detectPeakProblems(reviews) {
  const problemsByTime = {};
  
  reviews.filter(r => r.rating <= 3).forEach(r => {
    const date = new Date(r.time);
    const dayHour = `${date.toLocaleDateString('fr-FR', { weekday: 'long' })} ${date.getHours()}h`;
    problemsByTime[dayHour] = (problemsByTime[dayHour] || 0) + 1;
  });
  
  return Object.entries(problemsByTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([time, count]) => ({ time, count }));
}

module.exports = {
  loadHistory,
  saveHistory,
  addReviews,
  analyzeReviews,
  analyzeByPeriod,
  analyzePlats,
  analyzeText,
  detectPeakProblems,
  KEYWORDS,
  PLATS,
  PLATS_LIST,
  PERIODS
};
