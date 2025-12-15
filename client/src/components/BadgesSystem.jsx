import React, { useState, useEffect } from 'react';
import { 
  Trophy, Star, Clock, Calendar, Users, Shield, 
  Flame, Target, Award, Zap, Heart, Crown,
  Sparkles, Medal, TrendingUp, Check,
  Timer, AlarmClock, Hourglass,
  CalendarCheck, CalendarDays, CalendarHeart,
  UserPlus, UsersRound, HandHeart,
  Rocket, Gem, Diamond,
  BatteryCharging, Bolt, CircleDot,
  ThumbsUp, Smile, BadgeCheck,
  Gift, PartyPopper, Cake
} from 'lucide-react';
import { getMonScore } from '../services/scoringService';

// =====================================================
// DÉFINITION DES BADGES
// =====================================================

export const BADGES = [
  // === PONCTUALITÉ === (Timer → AlarmClock → Hourglass)
  {
    id: 'ponctuel_bronze',
    name: 'Ponctuel Bronze',
    description: '10 arrivées à l\'heure consécutives',
    icon: Timer,
    color: 'orange',
    category: 'ponctualite',
    condition: (stats) => stats.arrivees_heure >= 10,
    rarity: 'common'
  },
  {
    id: 'ponctuel_argent',
    name: 'Ponctuel Argent',
    description: '30 arrivées à l\'heure consécutives',
    icon: AlarmClock,
    color: 'gray',
    category: 'ponctualite',
    condition: (stats) => stats.arrivees_heure >= 30,
    rarity: 'rare'
  },
  {
    id: 'ponctuel_or',
    name: 'Ponctuel Or',
    description: '100 arrivées à l\'heure consécutives',
    icon: Hourglass,
    color: 'amber',
    category: 'ponctualite',
    condition: (stats) => stats.arrivees_heure >= 100,
    rarity: 'epic'
  },
  
  // === PRÉSENCE === (CalendarCheck → CalendarDays → CalendarHeart)
  {
    id: 'assidu_bronze',
    name: 'Assidu Bronze',
    description: '1 mois sans absence',
    icon: CalendarCheck,
    color: 'orange',
    category: 'presence',
    condition: (stats) => stats.mois_sans_absence >= 1,
    rarity: 'common'
  },
  {
    id: 'assidu_argent',
    name: 'Assidu Argent',
    description: '3 mois sans absence',
    icon: CalendarDays,
    color: 'gray',
    category: 'presence',
    condition: (stats) => stats.mois_sans_absence >= 3,
    rarity: 'rare'
  },
  {
    id: 'assidu_or',
    name: 'Assidu Or',
    description: '6 mois sans absence imprévu',
    icon: CalendarHeart,
    color: 'amber',
    category: 'presence',
    condition: (stats) => stats.mois_sans_absence >= 6,
    rarity: 'epic'
  },
  
  // === ENTRAIDE === (UserPlus → UsersRound → HandHeart)
  {
    id: 'solidaire_bronze',
    name: 'Solidaire Bronze',
    description: '5 remplacements effectués',
    icon: UserPlus,
    color: 'orange',
    category: 'entraide',
    condition: (stats) => stats.remplacements >= 5,
    rarity: 'common'
  },
  {
    id: 'solidaire_argent',
    name: 'Solidaire Argent',
    description: '15 remplacements effectués',
    icon: UsersRound,
    color: 'gray',
    category: 'entraide',
    condition: (stats) => stats.remplacements >= 15,
    rarity: 'rare'
  },
  {
    id: 'solidaire_or',
    name: 'Solidaire Or',
    description: '30 remplacements effectués',
    icon: HandHeart,
    color: 'amber',
    category: 'entraide',
    condition: (stats) => stats.remplacements >= 30,
    rarity: 'epic'
  },
  
  // === PERFORMANCE === (Rocket → Gem → Diamond)
  {
    id: 'performer',
    name: 'Performer',
    description: 'Atteindre 100 points',
    icon: Rocket,
    color: 'orange',
    category: 'performance',
    condition: (stats) => stats.score_total >= 100,
    rarity: 'common'
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Atteindre 300 points',
    icon: Gem,
    color: 'gray',
    category: 'performance',
    condition: (stats) => stats.score_total >= 300,
    rarity: 'rare'
  },
  {
    id: 'legend',
    name: 'Légende',
    description: 'Atteindre 500 points',
    icon: Diamond,
    color: 'amber',
    category: 'performance',
    condition: (stats) => stats.score_total >= 500,
    rarity: 'legendary'
  },
  
  // === EXTRAS === (BatteryCharging → Bolt)
  {
    id: 'volontaire',
    name: 'Volontaire',
    description: '10 shifts extras effectués',
    icon: BatteryCharging,
    color: 'orange',
    category: 'extras',
    condition: (stats) => stats.extras >= 10,
    rarity: 'common'
  },
  {
    id: 'superman',
    name: 'Superman',
    description: '30 shifts extras effectués',
    icon: Bolt,
    color: 'amber',
    category: 'extras',
    condition: (stats) => stats.extras >= 30,
    rarity: 'rare'
  },
  
  // === COMPORTEMENT === (ThumbsUp → Smile → BadgeCheck)
  {
    id: 'exemplaire',
    name: 'Exemplaire',
    description: 'Recevoir 5 bonus comportement',
    icon: ThumbsUp,
    color: 'pink',
    category: 'comportement',
    condition: (stats) => stats.bonus_comportement >= 5,
    rarity: 'rare'
  },
  {
    id: 'model',
    name: 'Modèle',
    description: 'Aucun malus comportement sur 6 mois',
    icon: BadgeCheck,
    color: 'amber',
    category: 'comportement',
    condition: (stats) => stats.mois_sans_malus_comportement >= 6,
    rarity: 'epic'
  },
  
  // === SPÉCIAUX === (Gift → PartyPopper → Flame → Target)
  {
    id: 'first_week',
    name: 'Première semaine',
    description: 'Compléter sa première semaine complète',
    icon: Gift,
    color: 'cyan',
    category: 'special',
    condition: (stats) => stats.semaines_completes >= 1,
    rarity: 'common'
  },
  {
    id: 'fire_streak',
    name: 'En feu',
    description: '10 jours consécutifs de travail parfait',
    icon: Flame,
    color: 'orange',
    category: 'special',
    condition: (stats) => stats.streak_parfait >= 10,
    rarity: 'rare'
  },
  {
    id: 'top3',
    name: 'Podium',
    description: 'Faire partie du Top 3 du classement',
    icon: Trophy,
    color: 'yellow',
    category: 'special',
    condition: (stats) => stats.rang <= 3,
    rarity: 'epic'
  },
];

// Couleurs et styles par rareté
const RARITY_STYLES = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-300',
    glow: ''
  },
  rare: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-200 dark:shadow-blue-900'
  },
  epic: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-200 dark:shadow-purple-900'
  },
  legendary: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30',
    border: 'border-amber-400 dark:border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-200 dark:shadow-amber-800 shadow-lg'
  }
};

// Couleurs d'icônes
const ICON_COLORS = {
  amber: 'text-amber-500',
  gray: 'text-gray-400',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  red: 'text-red-500',
  pink: 'text-pink-500',
  gold: 'text-amber-600',
  cyan: 'text-cyan-500'
};

// =====================================================
// COMPOSANT BADGE INDIVIDUEL
// =====================================================

export function Badge({ badge, unlocked = false, size = 'md', showTooltip = true }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = badge.icon;
  const rarityStyle = RARITY_STYLES[badge.rarity];
  const iconColor = ICON_COLORS[badge.color];
  
  const sizes = {
    sm: { container: 'w-10 h-10', icon: 'w-4 h-4' },
    md: { container: 'w-14 h-14', icon: 'w-6 h-6' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10' }
  };
  
  const sizeStyle = sizes[size];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`${sizeStyle.container} rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
          unlocked 
            ? `${rarityStyle.bg} ${rarityStyle.border} ${rarityStyle.glow} hover:scale-110` 
            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-40 grayscale'
        }`}
      >
        <Icon className={`${sizeStyle.icon} ${unlocked ? iconColor : 'text-gray-400'}`} />
        {unlocked && badge.rarity === 'legendary' && (
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-pulse" />
        )}
      </button>
      
      {/* Tooltip au clic */}
      {showDetails && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${unlocked ? iconColor : 'text-gray-400'}`} />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{badge.name}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-xs font-medium ${rarityStyle.text}`}>
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </span>
            {unlocked && (
              <Check className="w-3 h-3 text-green-500 ml-auto" />
            )}
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

// =====================================================
// LISTE DES BADGES DÉBLOQUÉS/À DÉBLOQUER
// =====================================================

export function BadgesList({ stats, compact = false }) {
  // Calculer les badges débloqués
  const unlockedBadges = BADGES.filter(b => b.condition(stats));
  const lockedBadges = BADGES.filter(b => !b.condition(stats));
  
  // Grouper par catégorie
  const categories = ['ponctualite', 'presence', 'entraide', 'performance', 'extras', 'comportement', 'special'];
  const categoryIcons = {
    ponctualite: Clock,
    presence: Calendar,
    entraide: Users,
    performance: TrendingUp,
    extras: Zap,
    comportement: Heart,
    special: Sparkles
  };
  const categoryLabels = {
    ponctualite: 'Ponctualité',
    presence: 'Présence',
    entraide: 'Entraide',
    performance: 'Performance',
    extras: 'Extras',
    comportement: 'Comportement',
    special: 'Spéciaux'
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {unlockedBadges.slice(0, 5).map(badge => (
          <Badge key={badge.id} badge={badge} unlocked size="sm" />
        ))}
        {unlockedBadges.length > 5 && (
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
            +{unlockedBadges.length - 5}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progression globale */}
      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progression</span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {unlockedBadges.length}/{BADGES.length}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedBadges.length / BADGES.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Grille par catégorie - Design épuré */}
      <div className="space-y-4">
        {categories.map(cat => {
          const catBadges = BADGES.filter(b => b.category === cat);
          const catUnlocked = catBadges.filter(b => unlockedBadges.some(u => u.id === b.id));
          const CatIcon = categoryIcons[cat];
          
          // Ne pas afficher les catégories vides
          if (catBadges.length === 0) return null;
          
          // Styles de niveau pour différencier Bronze/Argent/Or
          const getLevelStyle = (badge) => {
            if (badge.id.includes('_or') || badge.rarity === 'epic' || badge.rarity === 'legendary') {
              return {
                bg: 'bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/30',
                border: 'border-amber-400 dark:border-amber-500',
                iconColor: 'text-amber-500',
                label: 'Or'
              };
            } else if (badge.id.includes('_argent') || badge.rarity === 'rare') {
              return {
                bg: 'bg-gradient-to-br from-gray-100 to-slate-50 dark:from-gray-700/50 dark:to-slate-800/50',
                border: 'border-gray-400 dark:border-gray-500',
                iconColor: 'text-gray-500',
                label: 'Argent'
              };
            } else {
              return {
                bg: 'bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20',
                border: 'border-orange-400 dark:border-orange-500',
                iconColor: 'text-orange-500',
                label: 'Bronze'
              };
            }
          };
          
          return (
            <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Header catégorie */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CatIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{categoryLabels[cat]}</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {catUnlocked.length}/{catBadges.length}
                </span>
              </div>
              
              {/* Badges en grille responsive */}
              <div className="p-2 sm:p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {catBadges.map(badge => {
                    const isUnlocked = unlockedBadges.some(b => b.id === badge.id);
                    const Icon = badge.icon;
                    const levelStyle = getLevelStyle(badge);
                    const iconColor = ICON_COLORS[badge.color] || 'text-gray-500';
                    
                    return (
                      <div 
                        key={badge.id}
                        className={`relative p-2 sm:p-3 rounded-xl transition-all ${
                          isUnlocked 
                            ? 'bg-white dark:bg-gray-700/30 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700' 
                            : 'opacity-40 bg-gray-50/50 dark:bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Icône du badge avec style de niveau */}
                          <div className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 ${
                            isUnlocked 
                              ? `${levelStyle.bg} ${levelStyle.border}`
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isUnlocked ? iconColor : 'text-gray-400'}`} />
                          </div>
                          
                          {/* Texte */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] sm:text-xs font-semibold ${
                              isUnlocked ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'
                            }`}>
                              {badge.name}
                            </p>
                            <p className={`text-[9px] sm:text-[10px] mt-0.5 line-clamp-2 leading-tight ${
                              isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400/70'
                            }`}>
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// COMPOSANT PRINCIPAL - VUE BADGES EMPLOYÉ
// =====================================================

export default function BadgesView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    try {
      const data = await getMonScore();
      // Construire les stats pour les conditions de badges
      // En attendant des vraies stats, on utilise ce qu'on a
      const score = data.data?.score || {};
      const historique = data.data?.historique || [];
      
      // Compter les événements par type
      const countByCode = (code) => historique.filter(h => h.rule_code?.includes(code)).length;
      
      setStats({
        score_total: score.score_total || 0,
        rang: score.rang || 999,
        arrivees_heure: countByCode('ARRIVEE_HEURE'),
        mois_sans_absence: Math.floor(countByCode('SEMAINE_COMPLETE') / 4), // Approximation
        remplacements: countByCode('REMPLACEMENT'),
        extras: countByCode('EXTRA'),
        bonus_comportement: countByCode('BONUS'),
        mois_sans_malus_comportement: score.total_malus === 0 ? 6 : 0,
        semaines_completes: countByCode('SEMAINE_COMPLETE'),
        streak_parfait: countByCode('ARRIVEE_HEURE') // Simplification
      });
    } catch (err) {
      console.error('Erreur chargement stats badges:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-500">
        Impossible de charger les badges
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <BadgesList stats={stats} />
    </div>
  );
}

// =====================================================
// WIDGET COMPACT POUR LA HOME
// =====================================================

export function BadgesPreview({ className = '' }) {
  const [loading, setLoading] = useState(true);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [recentBadges, setRecentBadges] = useState([]);
  
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const data = await getMonScore();
        const score = data.data?.score || {};
        const historique = data.data?.historique || [];
        
        // Stats simplifiées
        const stats = {
          score_total: score.score_total || 0,
          rang: score.rang || 999,
          arrivees_heure: historique.filter(h => h.rule_code?.includes('ARRIVEE_HEURE')).length,
          mois_sans_absence: 1,
          remplacements: historique.filter(h => h.rule_code?.includes('REMPLACEMENT')).length,
          extras: historique.filter(h => h.rule_code?.includes('EXTRA')).length,
          bonus_comportement: 0,
          mois_sans_malus_comportement: 0,
          semaines_completes: historique.filter(h => h.rule_code?.includes('SEMAINE')).length,
          streak_parfait: 0
        };
        
        const unlocked = BADGES.filter(b => b.condition(stats));
        setUnlockedCount(unlocked.length);
        setRecentBadges(unlocked.slice(0, 3));
      } catch (err) {
        // Silencieux
      } finally {
        setLoading(false);
      }
    };
    loadBadges();
  }, []);
  
  if (loading || unlockedCount === 0) return null;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          Mes badges
        </h4>
        <span className="text-xs text-gray-500">{unlockedCount}/{BADGES.length}</span>
      </div>
      <div className="flex gap-2">
        {recentBadges.map(badge => (
          <Badge key={badge.id} badge={badge} unlocked size="sm" />
        ))}
      </div>
    </div>
  );
}
