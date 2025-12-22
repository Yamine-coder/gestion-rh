import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, TrendingUp, TrendingDown, Sun, CloudRain, Snowflake,
  AlertTriangle, CheckCircle, Calendar, Users, ChefHat,
  ArrowRight, RefreshCw, Sparkles
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * 🎯 Briefing du Jour - Widget Principal
 * Score d'intensité + Message contextuel + Actions rapides
 * 
 * Le widget qui répond à : "C'est quoi le programme aujourd'hui ?"
 */
const BriefingDuJour = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch toutes les données nécessaires
  const fetchData = useCallback(async () => {
    try {
      const [analysisRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE}/api/external/smart-analysis`),
        fetch(`${API_BASE}/api/external/matches`)
      ]);
      
      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        setData(analysis);
      }
      
      if (matchesRes.ok) {
        const m = await matchesRes.json();
        setMatches(m.matches || []);
      }
    } catch (err) {
      console.error('Erreur briefing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // Refresh 15min
    return () => clearInterval(interval);
  }, [fetchData]);

  // Mise à jour de l'heure
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🧠 CALCUL DU SCORE D'INTENSITÉ (0-100)
  // ═══════════════════════════════════════════════════════════════
  const calculateIntensityScore = useCallback(() => {
    let score = 50; // Base neutre
    let factors = [];
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const hour = today.getHours();
    
    // ═══ FACTEUR 1: Jour de la semaine ═══
    // Vendredi/Samedi = +20, Dimanche = +10, Lundi = -10
    if (dayOfWeek === 5) { score += 15; factors.push({ text: 'Vendredi soir', impact: '+15' }); }
    else if (dayOfWeek === 6) { score += 20; factors.push({ text: 'Samedi', impact: '+20' }); }
    else if (dayOfWeek === 0) { score += 10; factors.push({ text: 'Dimanche', impact: '+10' }); }
    else if (dayOfWeek === 1) { score -= 10; factors.push({ text: 'Lundi calme', impact: '-10' }); }
    
    // ═══ FACTEUR 2: Météo ═══
    if (data?.weather) {
      const temp = data.weather.temperature;
      const condition = data.weather.condition;
      const terrasse = data.weather.terrasseConfort?.niveau;
      
      if (condition === 'soleil' && temp >= 18 && temp <= 28) {
        score += 15;
        factors.push({ text: 'Météo idéale', impact: '+15' });
      } else if (condition === 'pluie' || condition === 'orage') {
        score -= 15;
        factors.push({ text: 'Mauvais temps', impact: '-15' });
      } else if (temp < 5 || temp > 35) {
        score -= 10;
        factors.push({ text: 'Température extrême', impact: '-10' });
      }
      
      if (terrasse === 'bon' && (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0)) {
        score += 5;
        factors.push({ text: 'Terrasse ouvrable', impact: '+5' });
      }
    }
    
    // ═══ FACTEUR 3: Matchs du jour ═══
    const todayMatches = matches.filter(m => {
      const matchDate = new Date(m.date);
      return matchDate.toDateString() === today.toDateString();
    });
    
    if (todayMatches.length > 0) {
      const topMatch = todayMatches.reduce((a, b) => (a.importance || 0) > (b.importance || 0) ? a : b);
      if (topMatch.importance >= 5) {
        score += 25;
        factors.push({ text: `Match ${topMatch.homeTeam?.split(' ')[0] || 'important'}`, impact: '+25' });
      } else if (topMatch.importance >= 4) {
        score += 15;
        factors.push({ text: 'Match ce soir', impact: '+15' });
      }
    }
    
    // ═══ FACTEUR 4: Vacances scolaires ═══
    const vacancesNoelDebut = new Date('2025-12-21');
    const vacancesNoelFin = new Date('2026-01-05');
    if (today >= vacancesNoelDebut && today <= vacancesNoelFin) {
      score += 10;
      factors.push({ text: 'Vacances Noël', impact: '+10' });
    }
    
    // ═══ FACTEUR 5: Dates spéciales ═══
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // Réveillons
    if (month === 12 && day === 24) {
      score += 30;
      factors.push({ text: 'Réveillon Noël', impact: '+30' });
    } else if (month === 12 && day === 31) {
      score += 35;
      factors.push({ text: 'Réveillon Nouvel An', impact: '+35' });
    } else if (month === 2 && day === 14) {
      score += 25;
      factors.push({ text: 'Saint-Valentin', impact: '+25' });
    } else if (month === 5 && dayOfWeek === 0 && day >= 25) {
      score += 20;
      factors.push({ text: 'Fête des Mères', impact: '+20' });
    }
    
    // ═══ FACTEUR 6: Heure du service ═══
    // Pendant le rush, on booste légèrement
    if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
      score += 5;
    }
    
    // Clamp entre 0 et 100
    score = Math.max(0, Math.min(100, score));
    
    return { score, factors: factors.slice(0, 3) }; // Max 3 facteurs affichés
  }, [data, matches]);

  // ═══════════════════════════════════════════════════════════════
  // 📝 GÉNÉRATION DU MESSAGE CONTEXTUEL
  // ═══════════════════════════════════════════════════════════════
  const generateMessage = useCallback((score, factors) => {
    const today = new Date();
    const hour = today.getHours();
    
    // Messages selon le score
    if (score >= 85) {
      return {
        title: "Soirée exceptionnelle prévue",
        subtitle: "Renforcez l'équipe et anticipez les stocks",
        emoji: "🔥",
        urgency: "critical"
      };
    } else if (score >= 70) {
      return {
        title: "Journée chargée en vue",
        subtitle: "Préparez-vous pour un bon rush",
        emoji: "⚡",
        urgency: "high"
      };
    } else if (score >= 55) {
      return {
        title: "Activité normale attendue",
        subtitle: "Service standard prévu",
        emoji: "👍",
        urgency: "normal"
      };
    } else if (score >= 40) {
      return {
        title: "Journée plutôt calme",
        subtitle: "Bon moment pour la mise en place",
        emoji: "😊",
        urgency: "low"
      };
    } else {
      return {
        title: "Faible affluence prévue",
        subtitle: "Optimisez les effectifs",
        emoji: "💤",
        urgency: "minimal"
      };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🎬 ACTIONS CONTEXTUELLES
  // ═══════════════════════════════════════════════════════════════
  const getActions = useCallback((score, factors) => {
    const actions = [];
    
    // Action planning si score élevé
    if (score >= 70) {
      actions.push({
        label: "Voir le planning",
        icon: Calendar,
        onClick: () => onNavigate?.('/planning'),
        variant: "primary"
      });
    }
    
    // Action terrasse si météo favorable
    const hasTerrasse = factors.some(f => f.text.includes('Terrasse'));
    if (hasTerrasse) {
      actions.push({
        label: "Météo détaillée",
        icon: Sun,
        onClick: () => {},
        variant: "secondary"
      });
    }
    
    // Par défaut, toujours proposer le planning
    if (actions.length === 0) {
      actions.push({
        label: "Planning du jour",
        icon: Calendar,
        onClick: () => onNavigate?.('/planning'),
        variant: "secondary"
      });
    }
    
    return actions.slice(0, 2); // Max 2 actions
  }, [onNavigate]);

  // ═══════════════════════════════════════════════════════════════
  // 🎨 RENDU
  // ═══════════════════════════════════════════════════════════════
  
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-700 rounded-2xl"></div>
          <div className="flex-1">
            <div className="h-6 bg-slate-700 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const { score, factors } = calculateIntensityScore();
  const message = generateMessage(score, factors);
  const actions = getActions(score, factors);
  
  // Couleurs selon urgence
  const getGradient = () => {
    if (score >= 85) return 'from-red-600 via-orange-600 to-amber-500';
    if (score >= 70) return 'from-orange-500 via-amber-500 to-yellow-400';
    if (score >= 55) return 'from-blue-600 via-indigo-600 to-purple-600';
    if (score >= 40) return 'from-emerald-600 via-teal-600 to-cyan-600';
    return 'from-slate-600 via-slate-700 to-slate-800';
  };
  
  const getScoreColor = () => {
    if (score >= 85) return 'text-red-400';
    if (score >= 70) return 'text-orange-400';
    if (score >= 55) return 'text-blue-400';
    if (score >= 40) return 'text-emerald-400';
    return 'text-slate-400';
  };

  // Format date
  const formatDate = () => {
    return currentTime.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className={`bg-gradient-to-br ${getGradient()} rounded-2xl p-4 lg:p-6 text-white shadow-lg relative overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header : Date + Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="capitalize">{formatDate()}</span>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Corps principal */}
        <div className="flex items-start gap-4 lg:gap-6">
          {/* Score circulaire */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24">
              {/* Cercle de fond */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${score * 2.83} 283`}
                  className="transition-all duration-1000"
                />
              </svg>
              {/* Score au centre */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl lg:text-3xl font-bold">{score}</span>
                <span className="text-[10px] text-white/70 uppercase tracking-wider">intensité</span>
              </div>
            </div>
          </div>
          
          {/* Message + Facteurs */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{message.emoji}</span>
              <h2 className="text-lg lg:text-xl font-bold truncate">{message.title}</h2>
            </div>
            <p className="text-white/80 text-sm mb-3">{message.subtitle}</p>
            
            {/* Facteurs */}
            <div className="flex flex-wrap gap-2">
              {factors.map((factor, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white/15 rounded-lg text-xs"
                >
                  <span className={factor.impact.startsWith('+') ? 'text-green-300' : 'text-red-300'}>
                    {factor.impact}
                  </span>
                  <span className="text-white/90">{factor.text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  action.variant === 'primary'
                    ? 'bg-white text-slate-900 hover:bg-white/90'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BriefingDuJour;
