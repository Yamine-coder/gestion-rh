import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Star, MessageCircle, AlertTriangle, TrendingUp, TrendingDown,
  ExternalLink, RefreshCw, ThumbsUp, ThumbsDown, User,
  BarChart3, Sparkles, AlertCircle, CheckCircle, Lightbulb,
  ArrowUp, ArrowDown, Zap, ChefHat, Target, Calendar, X, Hash,
  Users, Award, Wallet, Home, Truck, Clock, Trophy, Bell, BellRing, Flag,
  Check, Activity, MapPin, UtensilsCrossed
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Générer les périodes dynamiquement avec les mois passés
const generatePeriods = () => {
  const periods = [
    { key: '7d', label: '7 derniers jours', shortLabel: '7j', type: 'days', value: 7 },
    { key: '30d', label: '30 derniers jours', shortLabel: '30j', type: 'days', value: 30 },
    { key: '90d', label: '3 derniers mois', shortLabel: '90j', type: 'days', value: 90 },
  ];
  
  // Ajouter les mois passés (ce mois + 5 mois précédents)
  const now = new Date();
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const shortYear = year !== now.getFullYear() ? ` ${year.toString().slice(-2)}` : '';
    
    periods.push({
      key: `month-${i}`,
      label: i === 0 ? `${monthName} (ce mois)` : `${monthName}${shortYear}`,
      shortLabel: i === 0 ? 'Ce mois' : monthName.slice(0, 3) + shortYear,
      type: 'month',
      monthOffset: i,
      month: d.getMonth(),
      year: d.getFullYear()
    });
  }
  
  return periods;
};

const PERIODS = generatePeriods();

// Mots-clés à analyser dans les avis (catégorisés) - avec icônes Lucide
const KEYWORDS_CONFIG = {
  service: {
    label: 'Service',
    iconName: 'Users',
    positive: ['accueil', 'sympa', 'aimable', 'souriant', 'rapide', 'efficace', 'attentif', 'professionnel'],
    negative: ['lent', 'attente', 'long', 'impoli', 'désagréable', 'froid', 'ignoré', 'oublié']
  },
  qualite: {
    label: 'Qualité',
    iconName: 'Award',
    positive: ['délicieux', 'excellent', 'bon', 'frais', 'savoureux', 'copieux', 'généreux', 'maison'],
    negative: ['fade', 'sec', 'froid', 'tiède', 'industriel', 'surgelé', 'petit', 'insuffisant']
  },
  prix: {
    label: 'Prix',
    iconName: 'Wallet',
    positive: ['abordable', 'correct', 'raisonnable', 'rapport qualité', 'pas cher'],
    negative: ['cher', 'excessif', 'arnaque', 'prix', 'coûteux']
  },
  ambiance: {
    label: 'Ambiance',
    iconName: 'Home',
    positive: ['agréable', 'cadre', 'calme', 'propre', 'convivial', 'familial', 'chaleureux'],
    negative: ['bruyant', 'sale', 'étroit', 'sombre', 'inconfortable']
  },
  livraison: {
    label: 'Livraison',
    iconName: 'Truck',
    positive: ['livreur', 'livraison rapide', 'bien emballé', 'chaud', 'ponctuel'],
    negative: ['retard', 'livraison', 'froid', 'écrasé', 'manquant', 'erreur']
  }
};

// Map des icônes Lucide
const CATEGORY_ICONS = {
  Users: Users,
  Award: Award,
  Wallet: Wallet,
  Home: Home,
  Truck: Truck
};

/**
 * 💬 Widget Avis Google
 * Affiche les avis, note moyenne, alertes et analyse
 * Version 3.0 - Objectifs, Concurrents, Notifications temps réel
 * @param {boolean} compact - Mode compact pour affichage en sidebar
 * @param {function} onViewAll - Callback pour afficher tous les avis (optionnel)
 */
const AvisGoogle = ({ compact = false, onViewAll }) => {
  const [showFullView, setShowFullView] = useState(false); // État pour afficher la vue complète
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // insights | recent | analysis | alerts
  const [aiResponses, setAiResponses] = useState({}); // Cache des réponses IA par review
  const [loadingAI, setLoadingAI] = useState({}); // Loading state par review
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [periodAnalysis, setPeriodAnalysis] = useState(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // all | positive | negative
  const [reviewSort, setReviewSort] = useState('recent'); // recent | oldest | rating-high | rating-low
  
  // États pour le modal de réponse IA en mode compact
  const [showQuickResponse, setShowQuickResponse] = useState(false);
  const [quickResponseReview, setQuickResponseReview] = useState(null);
  const [quickResponseText, setQuickResponseText] = useState('');
  
  // 🆕 Nouveaux états pour les fonctionnalités avancées
  const [objectifData, setObjectifData] = useState(null);
  const [concurrentsData, setConcurrentsData] = useState(null);
  const [nouveauxAvis, setNouveauxAvis] = useState({ count: 0, negatifs: 0 });
  const [dernierCheck, setDernierCheck] = useState(() => {
    const saved = localStorage.getItem('avis_dernier_check');
    return saved ? parseInt(saved) : Date.now() - 24 * 3600 * 1000;
  });
  const [showNotification, setShowNotification] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // 📊 ANALYSE AVANCÉE - Hook placé avant les early returns
  // ═══════════════════════════════════════════════════════════════
  // Fonction de filtrage par période
  const filterByPeriod = useCallback((reviewsList, periodKey) => {
    const period = PERIODS.find(p => p.key === periodKey);
    if (!period) return reviewsList;
    
    if (period.type === 'days') {
      const cutoff = Date.now() - (period.value * 24 * 60 * 60 * 1000);
      return reviewsList.filter(r => r.time >= cutoff);
    } else if (period.type === 'month') {
      const targetMonth = period.month;
      const targetYear = period.year;
      return reviewsList.filter(r => {
        const reviewDate = new Date(r.time);
        return reviewDate.getMonth() === targetMonth && reviewDate.getFullYear() === targetYear;
      });
    }
    return reviewsList;
  }, []);

  // Calcul de l'analyse avancée
  const advancedAnalysis = useMemo(() => {
    const reviews = data?.reviews || [];
    const reviewsInPeriod = filterByPeriod(reviews, selectedPeriod);
    const positiveInPeriod = reviewsInPeriod.filter(r => r.rating >= 4);
    const negativeInPeriod = reviewsInPeriod.filter(r => r.isNegative || r.rating <= 3);
    
    if (!reviewsInPeriod.length) return null;
    
    const allText = reviewsInPeriod.map(r => (r.text || '').toLowerCase()).join(' ');
    
    // Analyse des catégories de mots-clés
    const categoryAnalysis = {};
    Object.entries(KEYWORDS_CONFIG).forEach(([catKey, catConfig]) => {
      const positiveCount = catConfig.positive.reduce((sum, kw) => {
        const regex = new RegExp(kw, 'gi');
        return sum + (allText.match(regex) || []).length;
      }, 0);
      
      const negativeCount = catConfig.negative.reduce((sum, kw) => {
        const regex = new RegExp(kw, 'gi');
        return sum + (allText.match(regex) || []).length;
      }, 0);
      
      categoryAnalysis[catKey] = {
        positive: positiveCount,
        negative: negativeCount,
        total: positiveCount + negativeCount,
        score: positiveCount - negativeCount,
        sentiment: positiveCount > negativeCount ? 'positive' : positiveCount < negativeCount ? 'negative' : 'neutral'
      };
    });
    
    // Mots-clés les plus fréquents
    const allKeywords = Object.values(KEYWORDS_CONFIG).flatMap(c => [...c.positive, ...c.negative]);
    const keywordCounts = allKeywords.map(kw => ({
      word: kw,
      count: (allText.match(new RegExp(kw, 'gi')) || []).length
    })).filter(k => k.count > 0).sort((a, b) => b.count - a.count);
    
    const topKeywords = keywordCounts.slice(0, 10);
    
    // Calcul note moyenne
    const avgRating = reviewsInPeriod.length > 0 
      ? reviewsInPeriod.reduce((sum, r) => sum + r.rating, 0) / reviewsInPeriod.length 
      : 0;
    
    // Tendance vs période précédente
    let previousPeriodReviews = [];
    const currentPeriod = PERIODS.find(p => p.key === selectedPeriod);
    
    if (currentPeriod?.type === 'days') {
      const prevCutoff = Date.now() - (currentPeriod.value * 2 * 24 * 60 * 60 * 1000);
      const currentCutoff = Date.now() - (currentPeriod.value * 24 * 60 * 60 * 1000);
      previousPeriodReviews = reviews.filter(r => r.time >= prevCutoff && r.time < currentCutoff);
    } else if (currentPeriod?.type === 'month') {
      const prevPeriodIdx = PERIODS.findIndex(p => p.key === selectedPeriod) + 1;
      const prevPeriod = PERIODS[prevPeriodIdx];
      if (prevPeriod?.type === 'month') {
        previousPeriodReviews = filterByPeriod(reviews, prevPeriod.key);
      }
    }
    
    const prevAvgRating = previousPeriodReviews.length > 0 
      ? previousPeriodReviews.reduce((sum, r) => sum + r.rating, 0) / previousPeriodReviews.length 
      : null;
    
    const ratingTrend = prevAvgRating ? avgRating - prevAvgRating : null;
    const volumeTrend = previousPeriodReviews.length 
      ? ((reviewsInPeriod.length - previousPeriodReviews.length) / previousPeriodReviews.length) * 100 
      : null;
    
    // Points forts et points faibles
    const strengths = Object.entries(categoryAnalysis)
      .filter(([_, cat]) => cat.sentiment === 'positive' && cat.total >= 2)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([key, cat]) => ({ key, ...cat }));
    
    const weaknesses = Object.entries(categoryAnalysis)
      .filter(([_, cat]) => cat.sentiment === 'negative' && cat.total >= 2)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3)
      .map(([key, cat]) => ({ key, ...cat }));
    
    // Répartition des notes
    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviewsInPeriod.filter(r => r.rating === rating).length,
      percent: (reviewsInPeriod.filter(r => r.rating === rating).length / reviewsInPeriod.length) * 100
    }));
    
    // Taux de réponse nécessaire
    const responseRate = negativeInPeriod.length > 0 
      ? Math.round((negativeInPeriod.filter(r => r.ownerResponse).length / negativeInPeriod.length) * 100)
      : 100;
    
    return {
      categoryAnalysis,
      topKeywords,
      avgRating,
      prevAvgRating,
      ratingTrend,
      volumeTrend,
      previousCount: previousPeriodReviews.length,
      strengths,
      weaknesses,
      ratingDistribution,
      responseRate,
      totalWithText: reviewsInPeriod.filter(r => r.text && r.text.length > 10).length,
      avgTextLength: Math.round(reviewsInPeriod.filter(r => r.text).reduce((sum, r) => sum + (r.text?.length || 0), 0) / (reviewsInPeriod.filter(r => r.text).length || 1))
    };
  }, [data, selectedPeriod, filterByPeriod]);

  const fetchAvis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/avis`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setError(null);
      } else {
        throw new Error('Erreur API');
      }
    } catch (err) {
      console.error('Erreur avis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🎯 Fetch objectif note
  const fetchObjectif = useCallback(async (objectif = 4.5) => {
    try {
      const res = await fetch(`${API_BASE}/api/avis/objectif?objectif=${objectif}`);
      if (res.ok) {
        const result = await res.json();
        setObjectifData(result);
      }
    } catch (err) {
      console.error('Erreur objectif:', err);
    }
  }, []);

  // 🏆 Fetch concurrents (avec option refresh forcé)
  const fetchConcurrents = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh 
        ? `${API_BASE}/api/avis/concurrents?refresh=true`
        : `${API_BASE}/api/avis/concurrents`;
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setConcurrentsData(result);
      }
    } catch (err) {
      console.error('Erreur concurrents:', err);
    }
  }, []);

  // 🔔 Fetch nouveaux avis (notifications)
  const fetchNouveauxAvis = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/avis/nouveaux?depuis=${dernierCheck}`);
      if (res.ok) {
        const result = await res.json();
        setNouveauxAvis(result);
        if (result.count > 0) {
          setShowNotification(true);
        }
      }
    } catch (err) {
      console.error('Erreur nouveaux avis:', err);
    }
  }, [dernierCheck]);

  // Marquer les avis comme lus
  const marquerCommeLu = () => {
    const now = Date.now();
    setDernierCheck(now);
    localStorage.setItem('avis_dernier_check', now.toString());
    setNouveauxAvis({ count: 0, negatifs: 0 });
    setShowNotification(false);
  };

  // Fetch analyse par période
  const fetchPeriodAnalysis = useCallback(async (period) => {
    try {
      setLoadingPeriod(true);
      const res = await fetch(`${API_BASE}/api/avis/analysis/${period}`);
      if (res.ok) {
        const result = await res.json();
        setPeriodAnalysis(result);
      }
    } catch (err) {
      console.error('Erreur analyse période:', err);
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  useEffect(() => {
    fetchAvis();
    fetchPeriodAnalysis(selectedPeriod);
    fetchObjectif(4.5); // Objectif par défaut
    fetchConcurrents();
    fetchNouveauxAvis();
    
    // Refresh toutes les 30 minutes pour les avis
    const interval = setInterval(fetchAvis, 30 * 60 * 1000);
    // Vérifier nouveaux avis toutes les 5 minutes
    const notifInterval = setInterval(fetchNouveauxAvis, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(notifInterval);
    };
  }, [fetchAvis, fetchPeriodAnalysis, fetchObjectif, fetchConcurrents, fetchNouveauxAvis, selectedPeriod]);

  // Changer la période
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchPeriodAnalysis(period);
  };

  // Générer une réponse via IA
  const generateAIResponseForReview = async (review, reviewId) => {
    setLoadingAI(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/avis/generate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review })
      });
      const result = await res.json();
      if (result.success && result.response) {
        setAiResponses(prev => ({ ...prev, [reviewId]: result.response }));
        // Mettre à jour le texte de réponse rapide si c'est la modale ouverte
        setQuickResponseText(result.response);
      } else {
        // Si IA pas dispo, utiliser le générateur local
        console.log('IA non disponible, utilisation du générateur local');
        const localResponse = generateSmartResponse(review);
        setAiResponses(prev => ({ ...prev, [reviewId]: localResponse }));
        setQuickResponseText(localResponse);
      }
    } catch (err) {
      console.error('Erreur génération IA:', err);
      // Fallback au générateur local en cas d'erreur
      const localResponse = generateSmartResponse(review);
      setAiResponses(prev => ({ ...prev, [reviewId]: localResponse }));
      setQuickResponseText(localResponse);
    } finally {
      setLoadingAI(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // Rendu étoiles
  const renderStars = (rating, size = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : star - 0.5 <= rating 
                  ? 'text-yellow-400 fill-yellow-400/50'
                  : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Temps relatif
  const getRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return new Date(timestamp).toLocaleDateString('fr-FR');
  };

  /**
   * 🎯 Générateur de réponses EXPERT - Community Manager Pro
   * 
   * IDENTITÉ CHEZ ANTOINE - Pizzeria depuis 1970 :
   * ═══════════════════════════════════════════════
   * Valeurs : Générosité, Prix accessibles, Convivialité, Fait maison
   * Ambiance : "La cantine des petits comme des grands"
   * 4 restaurants : Vincennes, L'Haÿ-les-Roses, Paris 12, Bondy (100% Halal)
   * 
   * LA CARTE (vraies infos) :
   * ──────────────────────────
   * 🍕 PIZZAS - 8,90€ à 11,90€
   *    - Base Tomate : Margherita 8,90€ | Reine, Fermière 9,90€ | Orientale, Mexicaine 10,90€
   *    - Base Crème : Savoyarde, Raclette, Truffe, Norvégienne 11,90€
   *    - Format 2 personnes : +2€ seulement
   *    - Pizza personnalisable avec garnitures au choix (+1,50€/garniture)
   * 
   * 🍝 PÂTES (avec parmesan regiano) - 8,90€ à 9,90€
   *    - Arrabiata, Napolitaine 8,90€
   *    - Carbonara, Bolognaise, Saumon, Truffe 9,90€
   * 
   * 🥗 SALADES - 10,90€ | BURRATAS - 6,90€ à 13,90€
   * 🥟 EMPANADAS - 3€ | PAINS - 2,50€ à 3€
   * 🍫 DESSERTS MAISON - Mi-cuit 3,50€ | Tiramisu Nutella 3,90€
   * 
   * ⚠️ PAS DE FORMULE MIDI/SOIR - Prix à la carte uniquement
   * ✓ Viandes halal (marquées *)
   */
  const generateSmartResponse = (review) => {
    const text = (review.text || '').toLowerCase();
    const fullName = review.author || 'Cher client';
    const firstName = fullName.split(' ')[0];
    const rating = review.rating;
    
    // === ANALYSE APPROFONDIE ===
    const detect = {
      // === PROBLÈMES GRAVES (priorité haute) ===
      ingredientManquant: /où est|miette|3 miette|ridicule|insuffisant|pas de|sans |manque|absent|invisible|introuvable/i.test(text) && 
                          /saumon|viande|poulet|boeuf|jambon|fromage|champignon|légume|garniture/i.test(text),
      reclamationMalGeree: /j'ai appelé|j'ai signalé|on m'a répondu|on me répond|ils m'ont dit|réponse.*habituel|c'est normal/i.test(text),
      arnaqueQuantite: /appellation.*mensong|arnaque|vol|tromperie|escroquerie|pas ce que|ne correspond pas/i.test(text),
      hygiene: /sale|cheveu|mouche|cafard|dégoûtant|hygiène|poil/i.test(text),
      erreurCommande: /erreur|oublié|trompé|pas commandé|mauvaise commande|pas le bon/i.test(text),
      
      // === PROBLÈMES MOYENS ===
      attenteLongue: /(\d{2,})\s*(min|minute)|très long|interminable|éternité/i.test(text),
      attenteSimple: /attente|attendre|lent|long|temps/i.test(text),
      serviceMauvais: /impoli|désagréable|arrogant|mal reçu|ignoré|attitude|froid|serveur|accueil/i.test(text),
      platFroid: /froid|tiède|réchauffé/i.test(text),
      
      // === CRITIQUES SUBJECTIVES (défendre avec tact) ===
      prixCher: /trop cher|prix élevé|addition salée|hors de prix/i.test(text) && !/prix bas|pas cher/i.test(text),
      portionPetite: /portion|petit|léger|quantité faible/i.test(text),
      goutMoyen: /pas aimé|fade|sans goût|moyen|bof|ordinaire|banal|insipide/i.test(text),
      tropBruyant: /bruit|bruyant|musique|fort|ambiance/i.test(text),
      
      // === CONTEXTE ===
      commandeBorne: /borne|comptoir/i.test(text),
      emporter: /emporter|livr|à emporter/i.test(text),
      weekend: /samedi|dimanche|week.?end/i.test(text),
      serviceSoir: /soir|20h|21h|dîner/i.test(text),
      premiere: /première fois|premier|découvert|jamais venu|testé.*première/i.test(text),
      nePlusRevenir: /n'y retournerai|plus jamais|dernière fois|fini pour moi/i.test(text),
      
      // === EXAGÉRATION / MAUVAISE FOI ===
      exageration: /pire|jamais vu|scandale|honte|0 étoile|fuyez|évitez à tout prix/i.test(text),
      comparaisonNegative: /mcdo|mcdonald|surgelé|supermarché|cantine scolaire|picard/i.test(text),
      
      // === POINTS POSITIFS ===
      positifMentionne: /mais.*(bon|bien|correct|sympa|délicieux)|quand même.*(bon|bien)|plat.*(bon|excellent)/i.test(text),
      reconnaîtQualite: /bon|délicieux|excellent|savoureux|frais/i.test(text) && rating <= 3,
      
      // === PLATS SPÉCIFIQUES ===
      pizza: /pizza/i.test(text),
      pates: /pâte|pasta|penne|spaghetti|carbonara|bolognaise|arrabiata/i.test(text),
      saumon: /saumon|norvégienne/i.test(text),
      tiramisu: /tiramisu/i.test(text),
      burrata: /burrata/i.test(text),
      salade: /salade|césar/i.test(text),
      truffe: /truffe/i.test(text),
      raclette: /raclette|savoyarde/i.test(text),
      dessert: /dessert|mi.?cuit|nutella/i.test(text),
      empanada: /empanada/i.test(text),
      
      // === ÉLÉMENTS FACTUELS ===
      mentionOrganisation: /organisation|désorganisé|chaos|aléatoire|n'importe quoi|au compte.?goutte/i.test(text),
      mentionCuisson: /cuit|cuisson|cru|pas assez|trop cuit/i.test(text),
      mentionFromage: /fromage|mozzarella/i.test(text),
      mentionHalal: /halal|porc/i.test(text),
      mentionQualite: /qualité|côté commerçant/i.test(text),
    };
    
    // Extraire le temps d'attente mentionné
    const tempsAttente = text.match(/(\d{2,})\s*(min|minute)/i)?.[1];
    
    // Extraire l'ingrédient problématique
    const ingredientProbleme = text.match(/saumon|viande|poulet|boeuf|jambon|fromage|champignon/i)?.[0];
    
    // Calculer la légitimité (1=mauvaise foi, 5=critique très légitime)
    let legitimite = 3;
    if (detect.hygiene || detect.ingredientManquant || detect.arnaqueQuantite) legitimite = 5;
    else if (detect.erreurCommande || detect.serviceMauvais || detect.reclamationMalGeree) legitimite = 4;
    else if (detect.attenteLongue && tempsAttente > 30) legitimite = 4;
    else if (detect.goutMoyen && !detect.ingredientManquant) legitimite = 2;
    if (detect.exageration && !detect.ingredientManquant) legitimite = Math.max(1, legitimite - 1);
    if (detect.positifMentionne || detect.reconnaîtQualite) legitimite = Math.min(4, legitimite);
    
    // === CONSTRUCTION DE LA RÉPONSE ===
    let parts = [];
    
    // --- 1. ACCROCHE PERSONNALISÉE ---
    if (detect.premiere && detect.nePlusRevenir) {
      parts.push(`Bonjour ${firstName}, nous sommes sincèrement désolés que votre première visite chez Antoine se soit si mal passée.`);
    } else if (detect.premiere) {
      parts.push(`Bonjour ${firstName}, merci d'avoir choisi Chez Antoine pour votre première visite.`);
    } else if (rating === 1 && (detect.ingredientManquant || detect.arnaqueQuantite)) {
      parts.push(`Bonjour ${firstName}, nous avons lu votre avis avec attention et comprenons votre déception.`);
    } else if (rating === 1 && detect.exageration && !detect.ingredientManquant) {
      parts.push(`Bonjour ${firstName}, nous avons lu votre avis avec attention.`);
    } else if (rating === 1) {
      parts.push(`Bonjour ${firstName}, merci pour ce retour franc.`);
    } else if (rating === 2) {
      parts.push(`Bonjour ${firstName}, merci d'avoir partagé votre expérience.`);
    } else {
      parts.push(`Bonjour ${firstName}, merci pour votre retour.`);
    }
    
    // --- 2. RÉPONSE AU PROBLÈME PRINCIPAL (UN SEUL, LE PLUS GRAVE) ---
    let problemePrincipalTraite = false;
    
    // PRIORITÉ 1 : Ingrédient manquant / Arnaque quantité (cas Victoria)
    if ((detect.ingredientManquant || detect.arnaqueQuantite) && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      const ingredient = ingredientProbleme || 'l\'ingrédient principal';
      parts.push(`Votre remarque sur la quantité de ${ingredient} dans votre plat est tout à fait légitime. Ce que vous décrivez ne correspond pas à notre standard et nous en sommes vraiment navrés.`);
      
      // Si en plus réclamation mal gérée
      if (detect.reclamationMalGeree) {
        parts.push(`De plus, la réponse que vous avez reçue au téléphone n'était pas appropriée. "C'est la quantité habituelle" n'est pas une réponse acceptable face à un client déçu. Nous allons revoir ce point avec l'équipe.`);
      }
    }
    
    // PRIORITÉ 2 : Hygiène
    if (detect.hygiene && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      parts.push(`Votre remarque concernant l'hygiène est prise très au sérieux. Nous avons procédé à une vérification immédiate de nos installations.`);
    }
    
    // PRIORITÉ 3 : Erreur de commande
    if (detect.erreurCommande && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      parts.push(`Une erreur de commande est inacceptable et nous vous prions de nous excuser. Nous avons revu nos procédures.`);
    }
    
    // PRIORITÉ 4 : Service désagréable / Réclamation mal gérée
    if ((detect.serviceMauvais || detect.reclamationMalGeree) && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      if (detect.reclamationMalGeree) {
        parts.push(`La façon dont votre réclamation a été gérée n'est pas à la hauteur de nos valeurs. L'équipe sera sensibilisée sur l'importance d'écouter et de prendre en charge les retours clients.`);
      } else {
        parts.push(`L'accueil chaleureux est dans l'ADN de Chez Antoine depuis 1970. Si un membre de notre équipe n'a pas été à la hauteur, nous le regrettons sincèrement.`);
      }
    }
    
    // PRIORITÉ 5 : Plat froid
    if (detect.platFroid && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      if (detect.emporter) {
        parts.push(`Pour l'emporter, le transport peut affecter la température. Nous vous conseillons de déguster rapidement.`);
      } else {
        parts.push(`Un plat servi froid n'est pas acceptable. Nous aurions immédiatement refait votre commande si vous l'aviez signalé.`);
      }
    }
    
    // PRIORITÉ 6 : Attente
    if ((detect.attenteLongue || detect.attenteSimple) && !problemePrincipalTraite) {
      problemePrincipalTraite = true;
      if (tempsAttente && parseInt(tempsAttente) > 30) {
        parts.push(`Un délai de ${tempsAttente} minutes est effectivement trop long et nous le regrettons.`);
      } else if (detect.weekend || detect.serviceSoir) {
        parts.push(`Les ${detect.weekend ? 'week-ends' : 'soirées'} sont nos moments d'affluence. Tout est préparé à la minute, ce qui peut allonger l'attente.`);
      } else {
        parts.push(`Nous préparons tout à la minute pour garantir la fraîcheur. Cela peut parfois allonger le service.`);
      }
    }
    
    // --- 3. PROBLÈMES SECONDAIRES (seulement si pertinents et non redondants) ---
    
    // Goût moyen (seulement si pas de problème d'ingrédient)
    if (detect.goutMoyen && !detect.ingredientManquant && !detect.arnaqueQuantite) {
      if (detect.pates) {
        parts.push(`Concernant le goût, nos pâtes sont préparées à la minute avec du parmesan regiano. N'hésitez pas à nous signaler vos préférences, nous pouvons ajuster.`);
      } else if (detect.pizza) {
        parts.push(`Nos pizzas sont préparées avec notre pâte maison. Avec plus de 20 recettes, il y en a forcément une qui vous plaira.`);
      }
    }
    
    // Cuisson
    if (detect.mentionCuisson && !problemePrincipalTraite) {
      parts.push(`La cuisson peut être ajustée sur demande : pizza bien cuite, pâtes al dente...`);
    }
    
    // Halal (info correcte)
    if (detect.mentionHalal) {
      parts.push(`Concernant le halal : nos viandes (bœuf, poulet, merguez) sont halal. Seuls le jambon blanc, jambon de Parme et soubressade ne le sont pas - c'est indiqué sur la carte avec des astérisques.`);
    }
    
    // --- 4. NE PAS PARLER DE PRIX si le problème est la qualité/quantité ---
    if (detect.prixCher && !detect.ingredientManquant && !detect.arnaqueQuantite) {
      parts.push(`Nos pizzas démarrent à 8,90€, nos pâtes à 8,90€ - des tarifs justes pour du fait-minute avec des ingrédients de qualité.`);
    }
    
    // --- 5. VALORISER LE POSITIF (si mentionné) ---
    if (detect.positifMentionne || detect.reconnaîtQualite) {
      parts.push(`Nous notons que certains éléments vous ont plu. C'est sur cette base que nous aimerions vous convaincre de retenter l'expérience.`);
    }
    
    // --- 6. CONCLUSION ADAPTÉE ---
    if (legitimite >= 4 || detect.ingredientManquant || detect.arnaqueQuantite) {
      parts.push(`Nous aimerions sincèrement nous rattraper. Appelez-nous au 01 41 74 10 71, nous trouverons une solution.`);
    } else if (detect.nePlusRevenir) {
      parts.push(`Nous comprenons votre déception et espérons malgré tout pouvoir vous faire changer d'avis un jour.`);
    } else if (detect.premiere) {
      parts.push(`Nous serions heureux de vous montrer le vrai Chez Antoine lors d'une prochaine visite.`);
    } else if (legitimite <= 2) {
      parts.push(`Nous restons à votre disposition pour en discuter.`);
    } else {
      parts.push(`À bientôt chez Antoine !`);
    }
    
    // --- SIGNATURE ---
    parts.push(`\n— L'équipe Chez Antoine 🍕`);
    
    return `"${parts.join(' ')}"`;
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const restaurant = data?.restaurant || {};
  const reviews = data?.reviews || [];
  const analysis = data?.analysis || {};
  const negativeReviews = reviews.filter(r => r.isNegative);
  const isDemo = data?.isDemo || !data?.configured;

  // Utiliser la fonction de filtrage du hook
  const reviewsInPeriod = filterByPeriod(reviews, selectedPeriod);
  const negativeInPeriod = reviewsInPeriod.filter(r => r.isNegative || r.rating <= 3);
  const positiveInPeriod = reviewsInPeriod.filter(r => r.rating >= 4);

  // Ouvrir le modal de réponse rapide
  const openQuickResponse = (review) => {
    setQuickResponseReview(review);
    const response = aiResponses[review.time] || generateSmartResponse(review);
    setQuickResponseText(response);
    setShowQuickResponse(true);
  };

  // Copier la réponse
  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(quickResponseText);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🎯 MODE COMPACT - Widget Avis Google élégant pour header
  // ═══════════════════════════════════════════════════════════════
  if (compact) {
    const lastNegative = negativeInPeriod[0];
    
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-amber-50/30 rounded-xl border border-slate-200 relative">
          
          {/* 🔔 Notification nouveaux avis */}
          {nouveauxAvis.count > 0 && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse">
              <BellRing className="w-3 h-3" />
              <span>{nouveauxAvis.count} nouveau{nouveauxAvis.count > 1 ? 'x' : ''}</span>
              <button 
                onClick={marquerCommeLu}
                className="ml-1 hover:bg-red-600 rounded-full p-0.5"
                title="Marquer comme lu"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
          
          {/* Logo Google + Score */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-gray-900">{restaurant.rating?.toFixed(1) || '—'}</span>
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= (restaurant.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-500">{restaurant.totalReviews || 0} avis Google</p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="w-px h-10 bg-slate-200" />
          
          {/* 🎯 Objectif Note */}
          {objectifData && (
            <>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <Target className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-amber-700">Objectif {objectifData.objectif}⭐</span>
                  </div>
                  <p className="text-[9px] text-amber-600">
                    {objectifData.avis5EtoilesNecessaires > 0 
                      ? `${objectifData.avis5EtoilesNecessaires} avis 5⭐ restants`
                      : '🎉 Atteint !'}
                  </p>
                </div>
                {/* Barre de progression mini */}
                <div className="w-12 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${objectifData.progression}%` }}
                  />
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
            </>
          )}
          
          {/* 🏆 Classement vs Concurrents (Pizzerias) */}
          {concurrentsData && (
            <>
              <div 
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                  concurrentsData.classementPizzerias === 1 
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-300' 
                    : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setShowFullView(true)}
                title={`Comparaison avec ${concurrentsData.proximite?.length || 0} restaurants à proximité et ${concurrentsData.pizzerias?.length || 0} pizzerias`}
              >
                <Trophy className={`w-4 h-4 ${concurrentsData.classement === 1 ? 'text-yellow-500' : 'text-slate-500'}`} />
                <div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${concurrentsData.classement === 1 ? 'text-yellow-700' : 'text-gray-700'}`}>
                      #{concurrentsData.classement}/{concurrentsData.total}
                    </span>
                    {concurrentsData.classement === 1 && <span className="text-[10px]">🏆</span>}
                  </div>
                  <p className="text-[9px] text-gray-500 flex items-center gap-0.5">
                    {(concurrentsData.ecartProximite ?? concurrentsData.ecartTous ?? 0) >= 0 
                      ? <span className="text-emerald-600 flex items-center gap-0.5">+{(concurrentsData.ecartProximite ?? concurrentsData.ecartTous ?? 0).toFixed(2)} <MapPin className="w-2.5 h-2.5" /></span>
                      : <span className="text-red-600 flex items-center gap-0.5">{(concurrentsData.ecartProximite ?? concurrentsData.ecartTous ?? 0).toFixed(2)} <MapPin className="w-2.5 h-2.5" /></span>
                    }
                  </p>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
            </>
          )}
          
          {/* Stats 30j */}
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-1.5 rounded-lg ${negativeInPeriod.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
              <p className={`text-lg font-bold ${negativeInPeriod.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {negativeInPeriod.length}
              </p>
              <p className="text-[9px] text-gray-500 text-center">négatif</p>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-100">
              <p className="text-lg font-bold text-gray-700">{reviewsInPeriod.length}</p>
              <p className="text-[9px] text-gray-500 text-center">ce mois</p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="w-px h-10 bg-slate-200" />

          {/* Alerte dernier avis négatif OU statut OK */}
          {loading ? (
            <div className="h-12 w-40 bg-slate-100 rounded-lg animate-pulse" />
          ) : lastNegative ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[280px]">
              <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-[11px] font-semibold text-red-700">{lastNegative.author?.split(' ')[0]}</span>
                  <span className="text-[10px] text-red-500">{lastNegative.rating}★</span>
                </div>
                <p className="text-[10px] text-gray-600 truncate">{lastNegative.text || 'Sans commentaire'}</p>
              </div>
              <button
                onClick={() => openQuickResponse(lastNegative)}
                className="flex flex-col items-center gap-0.5 px-3 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Répondre</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">Tout va bien !</p>
                <p className="text-[10px] text-emerald-600">Aucun avis négatif ce mois</p>
              </div>
            </div>
          )}

          {/* Lien voir tout - Ouvre la vue complète */}
          <button
            onClick={() => setShowFullView(true)}
            className='flex flex-col items-center gap-0.5 px-2 py-1.5 text-gray-400 hover:text-[#cf292c] hover:bg-red-50 rounded-lg transition-colors'
            title='Voir tous les avis'
          >
            <ExternalLink className='w-4 h-4' />
            <span className="text-[9px]">Voir</span>
          </button>
        </div>

        {/* Modal réponse rapide IA */}
        {showQuickResponse && quickResponseReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowQuickResponse(false)}>
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-gray-900">Réponse générée par IA</span>
                </div>
                <button
                  onClick={() => setShowQuickResponse(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-gray-500"
                >
                  ✕
                </button>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto">
                {/* Avis original */}
                <div className="px-5 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{quickResponseReview.author}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= quickResponseReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 italic max-h-32 overflow-y-auto">"{quickResponseReview.text}"</p>
                </div>

                {/* Réponse IA */}
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-gray-700">Réponse suggérée :</span>
                  </div>
                  <textarea
                    value={quickResponseText}
                    onChange={(e) => setQuickResponseText(e.target.value)}
                    className="w-full h-40 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
                  />
                </div>
              </div>
                
              {/* Actions - Footer fixe */}
              <div className="px-5 py-4 border-t bg-slate-50 flex items-center justify-between flex-shrink-0">
                <button
                  onClick={() => generateAIResponseForReview(quickResponseReview, quickResponseReview.time)}
                  disabled={loadingAI[quickResponseReview.time]}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAI[quickResponseReview.time] ? 'animate-spin' : ''}`} />
                  {loadingAI[quickResponseReview.time] ? 'Génération...' : 'Régénérer'}
                </button>
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Copier la réponse
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Vue Complète des Avis - Style Widget Header */}
        {showFullView && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 z-50" 
              onClick={() => setShowFullView(false)} 
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
              <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] border border-slate-200 overflow-hidden flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Même style que le widget compact */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logo étoile comme dans le widget */}
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">{restaurant.rating?.toFixed(1) || '—'}</span>
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= (restaurant.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{restaurant.totalReviews || 0} avis Google</p>
                      </div>
                    </div>
                    
                    {/* Stats rapides comme dans le widget */}
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-2 rounded-xl ${negativeInPeriod.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                        <p className={`text-xl font-bold text-center ${negativeInPeriod.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {negativeInPeriod.length}
                        </p>
                        <p className="text-[10px] text-gray-500 text-center">négatif</p>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-white border border-slate-100">
                        <p className="text-xl font-bold text-gray-700 text-center">{reviewsInPeriod.length}</p>
                        <p className="text-[10px] text-gray-500 text-center">ce mois</p>
                      </div>
                    </div>
                    
                    {/* Fermer */}
                    <button
                      onClick={() => setShowFullView(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Onglets de navigation */}
                <div className="flex border-b border-gray-100 px-2">
                  {[
                    { id: 'insights', label: 'Insights', icon: Lightbulb },
                    { id: 'concurrents', label: 'Ranking', icon: Trophy },
                    { id: 'objectif', label: 'Objectif', icon: Target },
                    { id: 'stats', label: 'Stats', icon: BarChart3 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        activeTab === tab.id
                          ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto">
                  
                  {/* Tab: Insights */}
                  {activeTab === 'insights' && (
                  <>
                  {/* Sélecteur de période - Compact & Smart */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Périodes rapides */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        {PERIODS.filter(p => p.type === 'days').map(p => (
                          <button
                            key={p.key}
                            onClick={() => handlePeriodChange(p.key)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                              selectedPeriod === p.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {p.shortLabel}
                          </button>
                        ))}
                      </div>
                      
                      {/* Séparateur */}
                      <div className="h-4 w-px bg-slate-200" />
                      
                      {/* Mois - Dropdown style */}
                      <div className="flex items-center gap-1 bg-amber-50 rounded-lg p-0.5">
                        {PERIODS.filter(p => p.type === 'month').slice(0, 3).map(p => (
                          <button
                            key={p.key}
                            onClick={() => handlePeriodChange(p.key)}
                            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                              selectedPeriod === p.key
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {p.shortLabel}
                          </button>
                        ))}
                        {/* Plus de mois */}
                        <div className="relative group">
                          <button className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                            PERIODS.filter(p => p.type === 'month').slice(3).some(p => p.key === selectedPeriod)
                              ? 'bg-amber-500 text-white'
                              : 'text-amber-600 hover:bg-amber-100'
                          }`}>
                            {PERIODS.filter(p => p.type === 'month').slice(3).some(p => p.key === selectedPeriod)
                              ? PERIODS.find(p => p.key === selectedPeriod)?.shortLabel
                              : '...'}
                          </button>
                          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[100px]">
                            {PERIODS.filter(p => p.type === 'month').slice(3).map(p => (
                              <button
                                key={p.key}
                                onClick={() => handlePeriodChange(p.key)}
                                className={`w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-amber-50 first:rounded-t-lg last:rounded-b-lg ${
                                  selectedPeriod === p.key ? 'bg-amber-50 text-amber-700' : 'text-gray-600'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Section Insights - Analytics avancées */}
                  {advancedAnalysis && reviewsInPeriod.length > 0 && (
                    <div className="px-4 py-3 border-b border-slate-100">
                      {/* KPIs de tendance */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                          <p className="text-lg font-bold text-gray-900">{reviewsInPeriod.length}</p>
                          <p className="text-[10px] text-gray-500">Avis</p>
                          {advancedAnalysis.volumeTrend !== null && (
                            <div className={`flex items-center justify-center gap-0.5 text-[10px] mt-0.5 ${advancedAnalysis.volumeTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {advancedAnalysis.volumeTrend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              <span>{advancedAnalysis.volumeTrend > 0 ? '+' : ''}{advancedAnalysis.volumeTrend.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-amber-50 rounded-xl text-center">
                          <p className="text-lg font-bold text-amber-600">{advancedAnalysis.avgRating?.toFixed(1) || '—'}</p>
                          <p className="text-[10px] text-gray-500">Note moy.</p>
                          {advancedAnalysis.ratingTrend !== null && advancedAnalysis.ratingTrend !== 0 && (
                            <div className={`flex items-center justify-center gap-0.5 text-[10px] mt-0.5 ${advancedAnalysis.ratingTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {advancedAnalysis.ratingTrend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              <span>{advancedAnalysis.ratingTrend > 0 ? '+' : ''}{advancedAnalysis.ratingTrend.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-emerald-50 rounded-xl text-center">
                          <p className="text-lg font-bold text-emerald-600">{positiveInPeriod.length}</p>
                          <p className="text-[10px] text-gray-500">Positifs</p>
                          <p className="text-[10px] text-emerald-600">{reviewsInPeriod.length > 0 ? Math.round(positiveInPeriod.length / reviewsInPeriod.length * 100) : 0}%</p>
                        </div>
                        <div className="p-2.5 bg-red-50 rounded-xl text-center">
                          <p className="text-lg font-bold text-red-600">{negativeInPeriod.length}</p>
                          <p className="text-[10px] text-gray-500">Négatifs</p>
                          <p className="text-[10px] text-red-600">{advancedAnalysis.responseRate || 0}% répondus</p>
                        </div>
                      </div>
                      
                      {/* Mots-clés les plus mentionnés */}
                      {advancedAnalysis.topKeywords && advancedAnalysis.topKeywords.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-700">Mots-clés récurrents</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {advancedAnalysis.topKeywords.slice(0, 8).map((kw, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-gray-700 rounded-full text-xs"
                              >
                                {kw.word}
                                <span className="text-gray-400">({kw.count})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Points forts et faibles */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Points forts */}
                        {advancedAnalysis.strengths && advancedAnalysis.strengths.length > 0 && (
                          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-700">Points forts</span>
                            </div>
                            <div className="space-y-1.5">
                              {advancedAnalysis.strengths.map((s, idx) => {
                                const IconComponent = CATEGORY_ICONS[KEYWORDS_CONFIG[s.key]?.iconName];
                                return (
                                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-emerald-100">
                                    <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                      {IconComponent ? <IconComponent className="w-3 h-3 text-emerald-600" /> : <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                    </div>
                                    <span className="text-xs text-gray-700 flex-1">{KEYWORDS_CONFIG[s.key]?.label || s.key}</span>
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+{s.positive}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Points à améliorer */}
                        {advancedAnalysis.weaknesses && advancedAnalysis.weaknesses.length > 0 && (
                          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-xs font-semibold text-red-700">À améliorer</span>
                            </div>
                            <div className="space-y-1.5">
                              {advancedAnalysis.weaknesses.map((w, idx) => {
                                const IconComponent = CATEGORY_ICONS[KEYWORDS_CONFIG[w.key]?.iconName];
                                return (
                                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-red-100">
                                    <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                                      {IconComponent ? <IconComponent className="w-3 h-3 text-red-600" /> : <AlertCircle className="w-3 h-3 text-red-600" />}
                                    </div>
                                    <span className="text-xs text-gray-700 flex-1">{KEYWORDS_CONFIG[w.key]?.label || w.key}</span>
                                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">-{w.negative}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Si aucun point faible */}
                        {(!advancedAnalysis.weaknesses || advancedAnalysis.weaknesses.length === 0) && advancedAnalysis.strengths && advancedAnalysis.strengths.length > 0 && (
                          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center">
                            <div className="text-center">
                              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                              <span className="text-xs text-gray-500">Pas de critique majeure</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Section : Avis négatifs à traiter (prioritaire) */}
                  {negativeInPeriod.length > 0 && (
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">À répondre en priorité</h3>
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">{negativeInPeriod.length}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {negativeInPeriod.slice(0, 3).map((review, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{review.author?.split(' ')[0]}</span>
                                <span className="text-xs text-red-600 font-semibold">{review.rating}★</span>
                                <span className="text-xs text-gray-400">{getRelativeTime(review.time)}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-1">{review.text || 'Sans commentaire'}</p>
                            </div>
                            <button
                              onClick={() => {
                                openQuickResponse(review);
                                setShowFullView(false);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm flex-shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Répondre
                            </button>
                          </div>
                        ))}
                        {negativeInPeriod.length > 3 && (
                          <p className="text-xs text-center text-gray-500">+{negativeInPeriod.length - 3} autres avis négatifs</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Section : Tous les avis récents */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                          <MessageCircle className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Avis récents</h3>
                        <span className="text-xs text-gray-400">({reviewsInPeriod.length})</span>
                      </div>
                    </div>
                    
                    {reviewsInPeriod.length > 0 ? (
                      <div className="space-y-2">
                        {reviewsInPeriod.slice(0, 8).map((review, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border transition-all ${
                            review.rating >= 4 
                              ? 'bg-white border-slate-100 hover:border-slate-200' 
                              : 'bg-red-50/50 border-red-100'
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                review.rating >= 4 ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'
                              }`}>
                                {review.author?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-medium text-gray-900">{review.author}</span>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(i => (
                                      <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-400">{getRelativeTime(review.time)}</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {review.text || <span className="italic text-gray-400">Pas de commentaire</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {reviewsInPeriod.length > 8 && (
                          <p className="text-xs text-center text-gray-500 py-1">
                            +{reviewsInPeriod.length - 8} autres avis
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-500">Aucun avis sur cette période</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Section : Répartition (collapsée par défaut) */}
                  <div className="px-4 pb-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                        Répartition des notes
                      </h4>
                      <div className="space-y-1.5">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = reviewsInPeriod.filter(r => r.rating === star).length;
                          const percent = reviewsInPeriod.length > 0 ? (count / reviewsInPeriod.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-4">{star}★</span>
                              <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600 w-6 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  </>
                  )}

                  {/* Tab: Concurrents / Ranking */}
                  {activeTab === 'concurrents' && (
                    <div className="p-4 space-y-4">
                      {/* Header simple */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-gray-700">Classement local</span>
                        </div>
                        <button 
                          onClick={() => fetchConcurrents(true)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                          title="Actualiser"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Position actuelle - sobre */}
                      {concurrentsData && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                                concurrentsData.classement === 1 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : concurrentsData.classement <= 3
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-slate-50 text-slate-500'
                              }`}>
                                #{concurrentsData.classement}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">Votre position</p>
                                <p className="text-xs text-gray-400">sur {concurrentsData.total} restaurants</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-xl font-bold text-gray-900">
                                  {concurrentsData.monRestaurant?.rating?.toFixed(1)}
                                </span>
                              </div>
                              <p className={`text-xs font-medium ${
                                (concurrentsData.ecartProximite ?? concurrentsData.ecartTous) >= 0 
                                  ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {(concurrentsData.ecartProximite ?? concurrentsData.ecartTous) >= 0 ? '+' : ''}
                                {(concurrentsData.ecartProximite ?? concurrentsData.ecartTous)?.toFixed(2)} vs moy.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stats rapides */}
                      {concurrentsData && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-gray-900">{concurrentsData.monRestaurant?.rating?.toFixed(1)}</p>
                            <p className="text-[10px] text-gray-500">Votre note</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-gray-700">{(concurrentsData.moyenneProximite || concurrentsData.moyenneTous)?.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-500">Moy. quartier</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className={`text-lg font-bold ${(concurrentsData.ecartProximite ?? concurrentsData.ecartTous) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(concurrentsData.ecartProximite ?? concurrentsData.ecartTous) >= 0 ? '+' : ''}{(concurrentsData.ecartProximite ?? concurrentsData.ecartTous)?.toFixed(2)}
                            </p>
                            <p className="text-[10px] text-gray-500">Écart</p>
                          </div>
                        </div>
                      )}

                      {/* Liste des restaurants à proximité */}
                      {concurrentsData?.proximite?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200">
                          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" /> 
                              À proximité
                            </p>
                            <span className="text-[10px] text-gray-400">
                                {concurrentsData.proximite.length + 1} établissements
                              </span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {/* Votre restaurant */}
                            {concurrentsData.monRestaurant && (
                              <div className="px-3 py-2 bg-red-50/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#cf292c]">#{concurrentsData.classement}</span>
                                    <span className="text-xs font-medium text-gray-700">{concurrentsData.monRestaurant.name}</span>
                                    <span className="text-[9px] bg-[#cf292c] text-white px-1.5 py-0.5 rounded font-medium">Vous</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs font-bold text-gray-800">{concurrentsData.monRestaurant.rating?.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Concurrents */}
                            {concurrentsData.proximite.map((resto, idx) => {
                              const diff = resto.rating - concurrentsData.monRestaurant?.rating;
                              return (
                                <div key={resto.placeId || idx} className="px-3 py-2 hover:bg-slate-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 w-4">#{idx + (concurrentsData.classement <= idx + 1 ? 2 : 1)}</span>
                                      <span className="text-xs text-gray-700 truncate max-w-[140px]">{resto.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-medium ${diff > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                      </span>
                                      <div className="flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span className="text-xs font-medium text-gray-700">{resto.rating?.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Pizzerias - sobre */}
                      {concurrentsData?.pizzerias?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200">
                          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                              <UtensilsCrossed className="w-3 h-3 text-slate-400" /> 
                              Pizzerias
                            </p>
                            <span className="text-[10px] text-gray-400">{concurrentsData.pizzerias.length}</span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                            {concurrentsData.pizzerias.map((resto, idx) => {
                              const diff = resto.rating - concurrentsData.monRestaurant?.rating;
                              return (
                                <div key={resto.placeId || idx} className="px-3 py-2 hover:bg-slate-50">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-700 truncate max-w-[160px]">{resto.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-medium ${diff > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                      </span>
                                      <div className="flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span className="text-xs font-medium text-gray-700">{resto.rating?.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* État de chargement */}
                      {!concurrentsData && (
                        <div className="text-center py-8">
                          <RefreshCw className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
                          <p className="text-xs text-gray-500">Chargement...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Objectif */}
                  {activeTab === 'objectif' && (
                    <div className="p-4 space-y-4">
                      {/* Header simple */}
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-gray-700">Objectif de note</span>
                      </div>
                      
                      {/* Card objectif - sobre */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Objectif</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-bold text-[#cf292c]">
                                {objectifData?.objectif?.toFixed(1) || '4.5'}
                              </span>
                              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Actuel</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-bold text-gray-800">
                                {data?.restaurant?.rating?.toFixed(1) || '4.3'}
                              </span>
                              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Barre de progression simple */}
                        <div className="mb-3">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#cf292c] to-amber-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ((data?.restaurant?.rating || 4.3) / (objectifData?.objectif || 4.5)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {Math.round(((data?.restaurant?.rating || 4.3) / (objectifData?.objectif || 4.5)) * 100)}% atteint
                          </span>
                          {(objectifData?.ecart || 0.2) > 0 ? (
                            <span className="text-amber-600 font-medium">
                              -{(objectifData?.ecart || 0.2).toFixed(2)} pour l'objectif
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Objectif atteint
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats pour atteindre l'objectif */}
                      {objectifData && (objectifData.ecart || 0) > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-medium text-gray-600 mb-3">Pour atteindre l'objectif</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-gray-900">{objectifData.avis5EtoilesNecessaires || 3}</p>
                              <p className="text-[10px] text-gray-500">avis 5⭐ nécessaires</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-gray-700">{data?.restaurant?.totalReviews?.toLocaleString() || 847}</p>
                              <p className="text-[10px] text-gray-500">avis actuels</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions recommandées */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-medium text-gray-600 mb-3">Actions recommandées</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <p className="text-xs text-gray-600">Répondre aux avis négatifs sous 24h</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-500">2</span>
                            </div>
                            <p className="text-xs text-gray-600">Solliciter les clients satisfaits</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-500">3</span>
                            </div>
                            <p className="text-xs text-gray-600">Améliorer les points faibles identifiés</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Stats détaillées */}
                  {activeTab === 'stats' && (
                    <div className="p-4 space-y-4">
                      {/* Header simple */}
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-gray-700">Statistiques</span>
                      </div>

                      {/* KPIs principaux */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500 mb-1">Total avis</p>
                          <p className="text-xl font-bold text-gray-900">{data?.restaurant?.totalReviews?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500 mb-1">Note moyenne</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xl font-bold text-amber-600">{data?.restaurant?.rating?.toFixed(1) || '—'}</p>
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          </div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500 mb-1">Avis positifs</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {Math.round(((data?.reviews?.filter(r => r.rating >= 4).length || 0) / (data?.reviews?.length || 1)) * 100)}%
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500 mb-1">À améliorer</p>
                          <p className="text-xl font-bold text-red-600">
                            {data?.reviews?.filter(r => r.rating <= 2).length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Tendances */}
                      {advancedAnalysis && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">Tendances</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">Volume d'avis</span>
                              <span className={`font-medium ${advancedAnalysis.volumeTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {advancedAnalysis.volumeTrend > 0 ? '+' : ''}{advancedAnalysis.volumeTrend?.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">Évolution note</span>
                              <span className={`font-medium ${advancedAnalysis.ratingTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {advancedAnalysis.ratingTrend > 0 ? '+' : ''}{advancedAnalysis.ratingTrend?.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">Taux de réponse</span>
                              <span className="font-medium text-gray-700">{advancedAnalysis.responseRate}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Points forts / faibles */}
                      {advancedAnalysis?.strengths?.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-50 rounded-lg p-3">
                            <p className="text-[10px] font-medium text-emerald-700 mb-1.5">Points forts</p>
                            <div className="space-y-1">
                              {advancedAnalysis.strengths.slice(0, 3).map((s, idx) => (
                                <p key={idx} className="text-xs text-emerald-600">
                                  ✓ {KEYWORDS_CONFIG[s.key]?.label || s.key}
                                </p>
                              ))}
                            </div>
                          </div>
                          {advancedAnalysis.weaknesses?.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-3">
                              <p className="text-[10px] font-medium text-red-700 mb-1.5">À améliorer</p>
                              <div className="space-y-1">
                                {advancedAnalysis.weaknesses.slice(0, 3).map((w, idx) => (
                                  <p key={idx} className="text-xs text-red-600">
                                    ✗ {KEYWORDS_CONFIG[w.key]?.label || w.key}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
                
                {/* Footer avec lien Google */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir sur Google Maps
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 MODE COMPLET - Affichage avec tous les onglets
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <MessageCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Avis Google</h3>
              {isDemo && (
                <span className="text-[10px] text-amber-600 font-medium">Mode démo</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Note globale */}
            <div className="flex items-center gap-1.5">
              {renderStars(restaurant.rating, 'lg')}
              <span className="font-bold text-gray-900">{restaurant.rating?.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({restaurant.totalReviews} avis)</span>
            </div>
            
            <button
              onClick={fetchAvis}
              disabled={loading}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerte avis négatif */}
        {negativeInPeriod.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-600 font-medium">
              {negativeInPeriod.length} avis négatif{negativeInPeriod.length > 1 ? 's' : ''} ({PERIODS.find(p => p.key === selectedPeriod)?.shortLabel})
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'insights', label: 'Insights', icon: Lightbulb },
          { id: 'reviews', label: 'Avis', icon: MessageCircle, count: reviewsInPeriod.length },
          { id: 'respond', label: 'À répondre', icon: AlertCircle, count: negativeInPeriod.length, alert: negativeInPeriod.length > 0 },
          { id: 'concurrents', label: 'Ranking', icon: Trophy },
          { id: 'stats', label: 'Stats', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === tab.id
                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count > 0 && tab.alert && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-80 overflow-y-auto">
        {/* Tab: Insights - ANALYSE AVANCÉE AVEC SÉLECTEUR DE PÉRIODE */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* Sélecteur de période */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Période :</span>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      selectedPeriod === p.key
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs Cards */}
            {periodAnalysis?.kpis && (
              <div className="grid grid-cols-2 gap-2">
                {/* Note moyenne */}
                <div className={`p-3 rounded-lg border ${
                  periodAnalysis.kpis.rating.status === 'good' ? 'bg-green-50 border-green-200' :
                  periodAnalysis.kpis.rating.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-medium">NOTE MOYENNE</span>
                    {periodAnalysis.kpis.rating.change !== null && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        periodAnalysis.kpis.rating.change > 0 ? 'text-green-600' : 
                        periodAnalysis.kpis.rating.change < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {periodAnalysis.kpis.rating.change > 0 ? '+' : ''}{periodAnalysis.kpis.rating.change}
                        {periodAnalysis.kpis.rating.change > 0 ? <ArrowUp className="w-3 h-3" /> : 
                         periodAnalysis.kpis.rating.change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {periodAnalysis.kpis.rating.current?.toFixed(1) || '—'}
                    </span>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="mt-1 text-[9px] text-gray-400">
                    Objectif: {periodAnalysis.kpis.rating.target}★
                  </div>
                </div>

                {/* Volume d'avis */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-medium">VOLUME</span>
                    {periodAnalysis.kpis.volume.change !== null && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        periodAnalysis.kpis.volume.change > 0 ? 'text-green-600' : 
                        periodAnalysis.kpis.volume.change < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {periodAnalysis.kpis.volume.change > 0 ? '+' : ''}{periodAnalysis.kpis.volume.change}%
                        {periodAnalysis.kpis.volume.change > 0 ? <ArrowUp className="w-3 h-3" /> : 
                         periodAnalysis.kpis.volume.change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {periodAnalysis.kpis.volume.current}
                    </span>
                    <span className="text-xs text-gray-500">avis</span>
                  </div>
                  <div className="mt-1 text-[9px] text-gray-400">
                    {periodAnalysis.kpis.volume.perDay ? `~${periodAnalysis.kpis.volume.perDay}/jour` : ''}
                    {periodAnalysis.kpis.volume.previous > 0 && ` • vs ${periodAnalysis.kpis.volume.previous} avant`}
                  </div>
                </div>

                {/* Taux d'avis négatifs */}
                <div className={`p-3 rounded-lg border ${
                  periodAnalysis.kpis.negativeRate.status === 'good' ? 'bg-green-50 border-green-200' :
                  periodAnalysis.kpis.negativeRate.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-medium">NÉGATIFS</span>
                    {periodAnalysis.kpis.negativeRate.change !== null && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        periodAnalysis.kpis.negativeRate.change < 0 ? 'text-green-600' : 
                        periodAnalysis.kpis.negativeRate.change > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {periodAnalysis.kpis.negativeRate.change > 0 ? '+' : ''}{periodAnalysis.kpis.negativeRate.change}pt
                        {periodAnalysis.kpis.negativeRate.change < 0 ? <ArrowDown className="w-3 h-3" /> : 
                         periodAnalysis.kpis.negativeRate.change > 0 ? <ArrowUp className="w-3 h-3" /> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {periodAnalysis.kpis.negativeRate.current}%
                    </span>
                    <span className="text-xs text-gray-500">({periodAnalysis.kpis.negativeRate.count})</span>
                  </div>
                  <div className="mt-1 text-[9px] text-gray-400">
                    Objectif: &lt;{periodAnalysis.kpis.negativeRate.target}%
                  </div>
                </div>

                {/* Satisfaction */}
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-medium">SATISFACTION</span>
                    <ThumbsUp className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {periodAnalysis.kpis.satisfaction.current ?? '—'}%
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] text-gray-400">
                    4★ et 5★ combinés
                  </div>
                </div>
              </div>
            )}

            {/* Insights générés par période */}
            {periodAnalysis?.insights && periodAnalysis.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Insights ({PERIODS.find(p => p.key === selectedPeriod)?.label})
                </h4>
                {periodAnalysis.insights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'warning' 
                        ? 'bg-amber-50 border-amber-200' 
                        : insight.type === 'success'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1 rounded ${
                        insight.type === 'warning' ? 'bg-amber-100' : insight.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {insight.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        ) : insight.type === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${
                            insight.type === 'warning' ? 'text-amber-800' : insight.type === 'success' ? 'text-green-800' : 'text-blue-800'
                          }`}>
                            {insight.title}
                          </p>
                          {insight.priority === 'high' && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold">
                              URGENT
                            </span>
                          )}
                        </div>
                        {insight.detail && (
                          <p className="text-xs text-gray-500 mt-0.5">{insight.detail}</p>
                        )}
                        {insight.action && (
                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback si pas d'insights */}
            {(!periodAnalysis?.insights || periodAnalysis.insights.length === 0) && !loadingPeriod && (
              <div className="text-center py-4 text-gray-400 text-sm">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Pas assez de données pour générer des insights
              </div>
            )}

            {/* Loading */}
            {loadingPeriod && (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Tab: Avis - Liste avec filtres */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {/* Ligne 1: Filtre par note */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'all', label: 'Tous', count: reviews.length },
                { key: 'positive', label: '4-5★', count: reviews.filter(r => r.rating >= 4).length },
                { key: 'negative', label: '1-3★', count: reviews.filter(r => r.rating <= 3).length }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setReviewFilter(f.key)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    reviewFilter === f.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] ${reviewFilter === f.key ? 'text-amber-600' : 'text-gray-400'}`}>
                    ({f.count})
                  </span>
                </button>
              ))}
            </div>

            {/* Ligne 2: Période + Tri */}
            <div className="flex items-center justify-between gap-2">
              {/* Filtre par période - synchronisé avec le sélecteur global */}
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                      selectedPeriod === p.key
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>

              {/* Tri */}
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                className="text-[10px] text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none"
              >
                <option value="recent">Plus récent</option>
                <option value="oldest">Plus ancien</option>
                <option value="rating-high">Note ↓</option>
                <option value="rating-low">Note ↑</option>
              </select>
            </div>

            {/* Liste des avis filtrés et triés */}
            {(() => {
              // Filtrer par note
              let filtered = reviews.filter(r => {
                if (reviewFilter === 'positive') return r.rating >= 4;
                if (reviewFilter === 'negative') return r.rating <= 3;
                return true;
              });

              // Filtrer par période
              // Filtrer par période (utilise selectedPeriod global)
              const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'month': 30 };
              const days = daysMap[selectedPeriod] || 30;
              const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
              filtered = filtered.filter(r => r.time >= cutoff);

              // Trier
              filtered = [...filtered].sort((a, b) => {
                switch (reviewSort) {
                  case 'oldest': return a.time - b.time;
                  case 'rating-high': return b.rating - a.rating;
                  case 'rating-low': return a.rating - b.rating;
                  default: return b.time - a.time; // recent
                }
              });

              return filtered.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun avis sur cette période</p>
                </div>
              ) : (
                filtered.slice(0, 10).map((review, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  review.rating >= 4 
                    ? 'bg-green-50 border-green-200' 
                    : review.rating <= 2
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      review.rating >= 4 ? 'bg-green-500' : review.rating <= 2 ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      {review.author?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{review.author}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-[10px] text-gray-500">{getRelativeTime(review.time)}</span>
                      </div>
                    </div>
                  </div>
                  {review.rating >= 5 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full flex items-center gap-0.5">
                      <ThumbsUp className="w-3 h-3" /> Top
                    </span>
                  )}
                </div>
                {review.text && (
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{review.text}</p>
                )}
              </div>
                ))
              );
            })()}
          </div>
        )}

        {/* Tab: À répondre - Avis négatifs avec outils */}
        {activeTab === 'respond' && (
          <div className="space-y-3">
            {/* Sélecteur de période */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-700">Avis négatifs à traiter</h4>
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                      selectedPeriod === p.key
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            
            {(() => {
              // Filtrer par période
              const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'month': 30 };
              const days = daysMap[selectedPeriod] || 30;
              const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
              const filteredNegative = negativeReviews.filter(r => r.time >= cutoff);
              
              return filteredNegative.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Aucun avis négatif sur cette période</p>
                <p className="text-xs text-gray-500">Continuez comme ça ! 🎉</p>
              </div>
            ) : (
              filteredNegative.map((review, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-lg bg-red-50 border border-red-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{review.author}</span>
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-[10px] text-gray-500">{getRelativeTime(review.time)}</p>
                    </div>
                    <a
                      href={restaurant.googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      Répondre <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{review.text}</p>
                  
                  {/* Suggestion de réponse intelligente */}
                  <div className="mt-3 p-2 bg-white rounded border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                        <Sparkles className="w-3 h-3" />
                        {aiResponses[review.time] ? 'Réponse IA' : 'Suggestion de réponse'}
                        {aiResponses[review.time] && (
                          <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-600 rounded text-[8px]">Groq</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateAIResponseForReview(review, review.time)}
                          disabled={loadingAI[review.time]}
                          className="text-[10px] text-purple-600 hover:text-purple-700 flex items-center gap-0.5 disabled:opacity-50"
                          title="Générer avec l'IA"
                        >
                          {loadingAI[review.time] ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              {aiResponses[review.time] ? 'Régénérer' : 'IA'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const response = aiResponses[review.time] || generateSmartResponse(review);
                            navigator.clipboard.writeText(response.replace(/^"|"$/g, ''));
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                        >
                          Copier
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 italic leading-relaxed">
                      {aiResponses[review.time] || generateSmartResponse(review)}
                    </p>
                  </div>
                </div>
              ))
            );
            })()}
          </div>
        )}

        {/* Tab: Concurrents - Ranking local */}
        {activeTab === 'concurrents' && (
          <div className="space-y-4">
            {concurrentsData ? (
              <>
                {/* Header - Mon restaurant avec classement visuel amélioré */}
                <div className="relative overflow-hidden p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  {/* Background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#cf292c]/5 via-transparent to-amber-50/50" />
                  
                  <div className="relative flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Médaille classement */}
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                          concurrentsData.classement === 1 
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500' 
                            : concurrentsData.classement === 2 
                              ? 'bg-gradient-to-br from-slate-300 to-slate-400'
                              : concurrentsData.classement === 3
                                ? 'bg-gradient-to-br from-amber-600 to-amber-700'
                                : 'bg-gradient-to-br from-slate-500 to-slate-600'
                        }`}>
                          <span className="text-2xl font-black text-white">#{concurrentsData.classement || 1}</span>
                        </div>
                        {concurrentsData.classement <= 3 && (
                          <div className="absolute -bottom-1 -right-1">
                            <Trophy className={`w-5 h-5 ${
                              concurrentsData.classement === 1 ? 'text-yellow-500' : 
                              concurrentsData.classement === 2 ? 'text-slate-400' : 'text-amber-600'
                            }`} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{concurrentsData.monRestaurant?.name || 'Mon Restaurant'}</p>
                        <p className="text-sm text-gray-500">sur {concurrentsData.total} restaurants du quartier</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= Math.round(concurrentsData.monRestaurant?.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <span className="text-lg font-bold text-gray-800">{concurrentsData.monRestaurant?.rating?.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({concurrentsData.monRestaurant?.totalReviews?.toLocaleString()} avis)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats comparatives en grille redesignée */}
                  <div className="relative grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Pizzerias</span>
                      </div>
                      <p className="text-2xl font-bold text-[#cf292c]">#{concurrentsData.classementPizzerias || 1}<span className="text-sm font-normal text-gray-400">/{concurrentsData.totalPizzerias || 1}</span></p>
                      <p className={`text-xs font-medium mt-0.5 ${(concurrentsData.ecartPizzerias || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {(concurrentsData.ecartPizzerias || 0) >= 0 ? '↑' : '↓'} {Math.abs(concurrentsData.ecartPizzerias || 0).toFixed(2)} vs moyenne
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Proximité</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-700">#{concurrentsData.classement || 1}<span className="text-sm font-normal text-gray-400">/{concurrentsData.total}</span></p>
                      <p className={`text-xs font-medium mt-0.5 ${(concurrentsData.ecartTous || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {(concurrentsData.ecartTous || 0) >= 0 ? '↑' : '↓'} {Math.abs(concurrentsData.ecartTous || 0).toFixed(2)} vs moyenne
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pizzerias concurrentes - Vue détaillée */}
                {concurrentsData.pizzerias && concurrentsData.pizzerias.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-orange-500" /> Pizzerias concurrentes 
                        <span className="text-xs font-normal text-gray-500">({concurrentsData.pizzerias.length} dans un rayon de 1.5km)</span>
                      </h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {concurrentsData.pizzerias.map((c, idx) => {
                        const ecart = (concurrentsData.monRestaurant?.rating || 0) - c.rating;
                        const isBetter = c.rating > (concurrentsData.monRestaurant?.rating || 0);
                        const isWorse = c.rating < (concurrentsData.monRestaurant?.rating || 0);
                        
                        return (
                          <div 
                            key={c.placeId}
                            className={`p-3 transition-colors ${isBetter ? 'bg-red-50/50' : isWorse ? 'bg-emerald-50/30' : 'bg-white'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                  isBetter ? 'bg-red-100 text-red-600' : isWorse ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  #{idx + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{c.vicinity}</p>
                                  
                                  {/* Barre de comparaison visuelle */}
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${isBetter ? 'bg-red-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${(c.rating / 5) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-400 w-8">{((c.rating / 5) * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right ml-3">
                                <div className="flex items-center gap-1 justify-end">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(c.rating) ? (isBetter ? 'text-red-400 fill-red-400' : 'text-amber-400 fill-amber-400') : 'text-gray-200'}`} />
                                  ))}
                                </div>
                                <p className={`text-lg font-bold mt-0.5 ${isBetter ? 'text-red-600' : 'text-gray-700'}`}>
                                  {c.rating.toFixed(1)}
                                </p>
                                <p className="text-[10px] text-gray-500">{c.totalReviews?.toLocaleString()} avis</p>
                                
                                {/* Écart */}
                                <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium inline-block ${
                                  isBetter ? 'bg-red-100 text-red-600' : isWorse ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {ecart >= 0 ? '+' : ''}{ecart.toFixed(2)} vs vous
                                </div>
                              </div>
                            </div>
                            
                            {/* Lien Google Maps */}
                            <div className="mt-2 flex justify-end">
                              <a
                                href={`https://www.google.com/maps/place/?q=place_id:${c.placeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Voir sur Google Maps
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Moyenne des pizzerias</span>
                        <span className="font-semibold text-gray-700">{(concurrentsData.moyennePizzerias || 0).toFixed(2)} ⭐</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Autres restaurants proches */}
                {concurrentsData.autresRestaurants && concurrentsData.autresRestaurants.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span>🍽️</span> Autres restaurants 
                        <span className="text-xs font-normal text-gray-500">({concurrentsData.autresRestaurants.length} dans un rayon de 500m)</span>
                      </h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {concurrentsData.autresRestaurants.map((c, idx) => {
                        const ecart = (concurrentsData.monRestaurant?.rating || 0) - c.rating;
                        const isBetter = c.rating > (concurrentsData.monRestaurant?.rating || 0);
                        
                        return (
                          <div 
                            key={c.placeId}
                            className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs font-medium text-gray-500">
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-700">{c.name}</p>
                                <p className="text-[10px] text-gray-400">{c.vicinity}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isBetter ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {ecart >= 0 ? '+' : ''}{ecart.toFixed(1)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className={`w-3.5 h-3.5 ${isBetter ? 'text-red-400 fill-red-400' : 'text-amber-400 fill-amber-400'}`} />
                                <span className={`text-sm font-bold ${isBetter ? 'text-red-600' : 'text-gray-700'}`}>
                                  {c.rating.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-gray-400">({c.totalReviews})</span>
                              </div>
                              <a
                                href={`https://www.google.com/maps/place/?q=place_id:${c.placeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-blue-500"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Moyenne tous restaurants</span>
                        <span className="font-semibold text-gray-700">{(concurrentsData.moyenneTous || 0).toFixed(2)} ⭐</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Objectif - Design amélioré */}
                {objectifData && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Header avec gradient */}
                    <div className="p-4 bg-gradient-to-r from-[#cf292c]/5 via-amber-50/50 to-emerald-50/50 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#cf292c] to-[#a01e21] flex items-center justify-center shadow-lg">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-800">Objectif : atteindre {objectifData.objectif?.toFixed(1)} ⭐</h4>
                            <p className="text-xs text-gray-500">Pour dépasser le meilleur concurrent</p>
                          </div>
                        </div>
                        {objectifData.atteint && (
                          <div className="px-3 py-1.5 bg-emerald-100 rounded-full flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">Atteint !</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Barre de progression visuelle */}
                      <div className="relative">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Votre note</span>
                            <span className="px-2 py-0.5 bg-amber-100 rounded-full font-semibold text-amber-700">
                              {concurrentsData?.monRestaurant?.rating?.toFixed(1)} ⭐
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Objectif</span>
                            <span className="px-2 py-0.5 bg-emerald-100 rounded-full font-semibold text-emerald-700">
                              {objectifData.objectif?.toFixed(1)} ⭐
                            </span>
                          </div>
                        </div>
                        
                        {/* Barre avec marqueurs */}
                        <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              objectifData.atteint 
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                                : 'bg-gradient-to-r from-amber-400 to-orange-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, ((concurrentsData?.monRestaurant?.rating || 0) / (objectifData.objectif || 5)) * 100)}%` 
                            }}
                          />
                          {/* Marqueur objectif */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-emerald-600"
                            style={{ left: '100%', transform: 'translateX(-2px)' }}
                          />
                        </div>
                        
                        {/* Écart restant */}
                        {!objectifData.atteint && objectifData.ecart > 0 && (
                          <p className="text-center text-xs text-gray-500 mt-2">
                            Il vous manque <span className="font-semibold text-[#cf292c]">{objectifData.ecart.toFixed(2)} points</span> pour atteindre l'objectif
                          </p>
                        )}
                      </div>
                      
                      {/* Actions recommandées */}
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 mb-1">Pour atteindre l'objectif</p>
                            {objectifData.atteint ? (
                              <p className="text-xs text-gray-600">
                                🎉 Félicitations ! Vous êtes au-dessus de votre objectif. Continuez à collecter des avis positifs pour maintenir votre avance !
                              </p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">1</span>
                                  Collectez <span className="font-semibold text-blue-700">{objectifData.avisNecessaires || 0} avis 5⭐</span> supplémentaires
                                </p>
                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">2</span>
                                  Répondez aux avis négatifs pour montrer votre réactivité
                                </p>
                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">3</span>
                                  Encouragez les clients satisfaits à laisser un avis
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats rapides */}
                      {!objectifData.atteint && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-xl text-center">
                            <p className="text-2xl font-bold text-[#cf292c]">{objectifData.avisNecessaires || 0}</p>
                            <p className="text-[10px] text-gray-500">avis 5⭐ nécessaires</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl text-center">
                            <p className="text-2xl font-bold text-gray-700">{Math.round((concurrentsData?.monRestaurant?.rating / objectifData.objectif) * 100)}%</p>
                            <p className="text-[10px] text-gray-500">de l'objectif atteint</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Info sur les données */}
                <div className="text-center text-[10px] text-gray-400 py-2">
                  Données récupérées via Google Places API • Mise à jour en temps réel
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium">Chargement des données concurrentielles...</p>
                <p className="text-xs text-gray-400 mt-1">Analyse des restaurants à proximité</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Stats - Distribution et mots-clés */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Sélecteur de période pour Stats */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-700">Période d'analyse</h4>
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                      selectedPeriod === p.key
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Distribution des notes */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Distribution des notes</h4>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(rating => {
                  const distribution = periodAnalysis?.ratingDistribution || analysis.ratingDistribution || {};
                  const count = distribution[rating] || 0;
                  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
                  const percent = (count / total) * 100;
                  
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs w-4">{rating}</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mots-clés thématiques améliorés */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-700 mb-2">
                  <ThumbsUp className="w-3 h-3" />
                  Ce qui plaît
                </div>
                <div className="space-y-1.5">
                  {(periodAnalysis?.themeAnalysis?.positive || analysis.keywords?.positive || []).slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-green-50 px-2 py-1 rounded">
                      <div className="flex items-center gap-1.5">
                        {item.emoji && <span className="text-sm">{item.emoji}</span>}
                        <span className="text-gray-700">{item.display || item.word}</span>
                      </div>
                      <span className="text-green-600 font-semibold">{item.count}x</span>
                    </div>
                  ))}
                  {(!periodAnalysis?.themeAnalysis?.positive?.length && !analysis.keywords?.positive?.length) && (
                    <p className="text-xs text-gray-400 italic">Aucune donnée</p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-red-700 mb-2">
                  <ThumbsDown className="w-3 h-3" />
                  À améliorer
                </div>
                <div className="space-y-1.5">
                  {(periodAnalysis?.themeAnalysis?.negative || analysis.keywords?.negative || []).slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-red-50 px-2 py-1 rounded">
                      <div className="flex items-center gap-1.5">
                        {item.emoji && <span className="text-sm">{item.emoji}</span>}
                        <span className="text-gray-700">{item.display || item.word}</span>
                      </div>
                      <span className="text-red-600 font-semibold">{item.count}x</span>
                    </div>
                  ))}
                  {(!periodAnalysis?.themeAnalysis?.negative?.length && !analysis.keywords?.negative?.length) && (
                    <p className="text-xs text-gray-400 italic">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>

            {/* 🍕 Analyse par plat */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-orange-500" />
                Satisfaction par plat
              </h4>
              
            {periodAnalysis?.platAnalysis?.plats?.length > 0 ? (
              <>
                
                <div className="space-y-2">
                  {periodAnalysis.platAnalysis.plats.slice(0, 6).map((plat, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-lg border ${
                        plat.avgRating >= 4 ? 'bg-green-50 border-green-200' :
                        plat.avgRating >= 3 ? 'bg-amber-50 border-amber-200' :
                        'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{plat.emoji}</span>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{plat.name}</span>
                            <span className="text-[10px] text-gray-500 ml-1">({plat.mentions} avis)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-lg font-bold ${
                            plat.avgRating >= 4 ? 'text-green-600' :
                            plat.avgRating >= 3 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {plat.avgRating}
                          </span>
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        </div>
                      </div>
                      
                      {/* Barre de satisfaction */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              plat.avgRating >= 4 ? 'bg-green-500' :
                              plat.avgRating >= 3 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(plat.avgRating / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-500">
                          {plat.positive > 0 && `${plat.positive} 👍`}
                          {plat.negative > 0 && ` ${plat.negative} 👎`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alerte plats à surveiller */}
                {periodAnalysis.platAnalysis.needsAttention?.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Plats à surveiller
                    </div>
                    <div className="mt-1 text-[11px] text-red-600">
                      {periodAnalysis.platAnalysis.needsAttention.map(p => 
                        `${p.emoji} ${p.name} (${p.avgRating}★)`
                      ).join(' • ')}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500 italic">
                {loadingPeriod ? 'Chargement...' : 'Aucun plat mentionné dans les avis de cette période'}
              </p>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {restaurant.googleUrl && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <a
            href={restaurant.googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Voir tous les avis sur Google <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Banner config si démo */}
      {isDemo && (
        <div className="px-4 py-2 bg-amber-100 border-t border-amber-200">
          <p className="text-[10px] text-amber-800">
            💡 Pour activer les vrais avis, ajoutez <code className="bg-amber-200 px-1 rounded">GOOGLE_PLACES_API_KEY</code> et <code className="bg-amber-200 px-1 rounded">GOOGLE_PLACE_ID</code> dans votre .env
          </p>
        </div>
      )}
    </div>
  );
};

export default AvisGoogle;
