import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Medal, Gem, TrendingUp, TrendingDown, Clock, Calendar, Filter, Star, Users, Zap, Plane, AlertTriangle, ThumbsUp, Award, CalendarCheck, ArrowLeft, History, RefreshCw, Trophy, ChevronDown, X, RotateCcw } from 'lucide-react';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import { getNiveau } from '../services/scoringService';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const brand = '#cf292c';

// Configuration des icônes de niveau
const NIVEAU_ICONS = {
  'À surveiller': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  Bronze: { icon: Medal, color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  Argent: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/50' },
  Or: { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  Diamant: { icon: Gem, color: 'text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' }
};

// Mapping des catégories vers icônes et couleurs - style MesConges
const CATEGORY_CONFIG = {
  all: { icon: Filter, label: 'Toutes catégories', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', color: 'slate' },
  pointage: { icon: Clock, label: 'Ponctualité', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', color: 'emerald' },
  presence: { icon: CalendarCheck, label: 'Assiduité', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', color: 'green' },
  comportement: { icon: Star, label: 'Comportement', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', color: 'amber' },
  remplacement: { icon: Users, label: 'Entraide', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', color: 'blue' },
  extra: { icon: Zap, label: 'Extras', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', color: 'orange' },
  conge: { icon: Plane, label: 'Congés', bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', color: 'cyan' },
  anomalie: { icon: AlertTriangle, label: 'Anomalies', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', color: 'red' },
  feedback: { icon: ThumbsUp, label: 'Feedbacks', bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', color: 'purple' },
  special: { icon: Award, label: 'Bonus', bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', color: 'pink' }
};

// Mapping rule_code vers catégorie
const getRuleCategory = (ruleCode) => {
  const code = ruleCode?.toUpperCase() || '';
  if (['PONCTUALITE', 'POINTAGE_PONCTUEL', 'RETARD', 'RETARD_LEGER', 'RETARD_MODERE', 'RETARD_GRAVE', 'OUBLI_POINTAGE'].includes(code)) return 'pointage';
  if (['MOIS_SANS_ABSENCE', 'SEMAINE_COMPLETE', 'ABSENCE_JUSTIFIEE', 'ABSENCE_NON_JUSTIFIEE'].includes(code)) return 'presence';
  if (['FORMATION', 'FORMATION_SUIVIE', 'POLYVALENCE', 'INITIATIVE', 'FELICITATIONS', 'ESPRIT_EQUIPE_POS', 'ESPRIT_EQUIPE_NEG', 'ATTITUDE_CLIENT_POS', 'ATTITUDE_CLIENT_NEG', 'AVERTISSEMENT_VERBAL', 'AVERTISSEMENT_ECRIT', 'HYGIENE_TENUE_NEG'].includes(code)) return 'comportement';
  if (['DISPONIBILITE', 'REMPLACEMENT', 'REMPLACEMENT_ACCEPTE', 'REMPLACEMENT_REFUSE', 'ENTRAIDE'].includes(code)) return 'remplacement';
  if (['EXTRA_EFFECTUE', 'EXTRA_ANNULE_TARDIF'].includes(code)) return 'extra';
  if (['CONGE_DELAI_RESPECTE', 'CONGE_TARDIF'].includes(code)) return 'conge';
  if (['SEMAINE_SANS_ANOMALIE', 'ANOMALIE_NON_RESOLUE', 'ANOMALIE_RECURRENTE'].includes(code)) return 'anomalie';
  if (['PEER_FEEDBACK', 'FEEDBACK'].includes(code)) return 'feedback';
  return 'special';
};

// Labels lisibles pour les codes
const RULE_LABELS = {
  'PONCTUALITE': 'Ponctualité',
  'POINTAGE_PONCTUEL': 'Pointage ponctuel',
  'RETARD': 'Retard',
  'RETARD_LEGER': 'Retard léger',
  'RETARD_MODERE': 'Retard modéré',
  'RETARD_GRAVE': 'Retard grave',
  'OUBLI_POINTAGE': 'Oubli de pointage',
  'MOIS_SANS_ABSENCE': 'Mois exemplaire',
  'SEMAINE_COMPLETE': 'Semaine complète',
  'ABSENCE_JUSTIFIEE': 'Absence justifiée',
  'ABSENCE_NON_JUSTIFIEE': 'Absence non justifiée',
  'FORMATION': 'Formation',
  'FORMATION_SUIVIE': 'Formation suivie',
  'POLYVALENCE': 'Polyvalence',
  'INITIATIVE': 'Initiative',
  'FELICITATIONS': 'Félicitations',
  'ESPRIT_EQUIPE_POS': 'Esprit d\'équipe',
  'ATTITUDE_CLIENT_POS': 'Excellente attitude',
  'DISPONIBILITE': 'Disponibilité',
  'REMPLACEMENT': 'Remplacement',
  'REMPLACEMENT_ACCEPTE': 'Remplacement accepté',
  'EXTRA_EFFECTUE': 'Extra effectué',
  'CONGE_DELAI_RESPECTE': 'Demande dans les délais',
  'CONGE_TARDIF': 'Demande tardive',
  'SEMAINE_SANS_ANOMALIE': 'Semaine sans anomalie',
  'BONUS_TEST': 'Bonus de test',
  'BONUS_CUSTOM': 'Bonus personnalisé'
};

const formatLabel = (item) => {
  // Priorité: label de la règle, puis nom lisible du code
  if (item.label && item.label !== item.category) return item.label;
  const code = item.category?.toUpperCase() || '';
  return RULE_LABELS[code] || code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
};

export default function MonScore() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const filterRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/scoring/mon-score`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScoreData(res.data?.data || null);
      setHistorique(res.data?.data?.historique || []);
    } catch (err) {
      console.error('Erreur chargement score:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredHistorique = filterCategory === 'all' 
    ? historique 
    : historique.filter(h => getRuleCategory(h.category) === filterCategory);

  // Grouper par date
  const groupedHistorique = useMemo(() => {
    const groups = {};
    filteredHistorique.forEach(item => {
      const date = new Date(item.created_at);
      const key = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredHistorique]);

  // Stats par catégorie
  const categoryStats = useMemo(() => {
    const stats = { all: { count: historique.length, points: 0 } };
    Object.keys(CATEGORY_CONFIG).forEach(key => { 
      if (key !== 'all') stats[key] = { count: 0, points: 0 }; 
    });
    historique.forEach(item => {
      const cat = getRuleCategory(item.category);
      if (stats[cat]) { stats[cat].count++; stats[cat].points += item.points; }
      stats.all.points += item.points;
    });
    return stats;
  }, [historique]);

  // Config du filtre sélectionné
  const selectedFilter = CATEGORY_CONFIG[filterCategory] || CATEGORY_CONFIG.all;
  const SelectedIcon = selectedFilter.icon;

  const niveau = getNiveau(scoreData?.score?.total_points || 0);
  const niveauConfig = NIVEAU_ICONS[niveau.label] || NIVEAU_ICONS.Bronze;
  const NiveauIcon = niveauConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pt-header">
      {/* Sous-header avec titre spécifique à la page */}
      <div className="sticky top-[calc(60px+env(safe-area-inset-top,0px))] z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#cf292c]" />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Feedback</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="pb-navbar lg:pb-8">
        
        {/* Card Score principale */}
        <div className="px-4 py-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
              </div>
            ) : (
              <>
                {/* Niveau actuel avec icône */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl ${niveauConfig.bg} flex items-center justify-center shadow-inner`}>
                    <NiveauIcon className={`w-8 h-8 ${niveauConfig.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Niveau actuel</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{niveau.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold" style={{ color: niveau.barColor }}>{scoreData?.score?.total_points || 0}</span>
                      <span className="text-sm text-gray-500">points</span>
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">{niveau.label} ({niveau.min} pts)</span>
                    <span className="font-medium">{niveau.nextLabel || 'Maximum'}</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${niveau.progress}%`,
                        backgroundColor: niveau.barColor || brand
                      }}
                    />
                  </div>
                  <p className={`text-xs mt-2 text-center font-medium ${
                    niveau.label === 'À surveiller' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {niveau.label === 'À surveiller'
                      ? `Gagnez ${niveau.remaining} pts pour atteindre Bronze`
                      : niveau.remaining > 0 
                        ? `Plus que ${niveau.remaining} pts pour atteindre ${niveau.nextLabel}` 
                        : 'Niveau maximum atteint !'
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section filtres - Style MesConges avec dropdown */}
        <div className="px-4 mt-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200/60 dark:border-gray-700/50">
            {/* Header des filtres */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Filter className="w-3.5 h-3.5 text-[#cf292c]" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Filtrer</span>
              </div>
              {filterCategory !== 'all' && (
                <button
                  onClick={() => { setFilterCategory('all'); setShowFilterPicker(false); }}
                  className="w-6 h-6 flex items-center justify-center text-[#cf292c] hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  title="Réinitialiser le filtre"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Dropdown filtre catégorie */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setShowFilterPicker(!showFilterPicker)}
                className={`w-full h-10 flex items-center gap-2 px-3 border rounded-xl bg-gray-50 dark:bg-gray-700/50 text-left text-sm transition-all duration-200 ${
                  showFilterPicker 
                    ? 'border-[#cf292c] ring-2 ring-[#cf292c]/20' 
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <SelectedIcon className={`w-4 h-4 ${selectedFilter.text} flex-shrink-0`} />
                <span className="flex-1 font-medium text-gray-700 dark:text-gray-300 truncate">{selectedFilter.label}</span>
                {filterCategory !== 'all' && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${selectedFilter.bg} ${selectedFilter.text}`}>
                    {categoryStats[filterCategory]?.count || 0}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilterPicker ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown list */}
              {showFilterPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowFilterPicker(false)}
                  />
                  <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="max-h-64 overflow-y-auto overscroll-contain py-1">
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const isSelected = key === filterCategory;
                        const count = categoryStats[key]?.count || 0;
                        // Masquer les catégories vides sauf "all"
                        if (key !== 'all' && count === 0) return null;
                        return (
                          <li
                            key={key}
                            onClick={() => { setFilterCategory(key); setShowFilterPicker(false); }}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-red-50 dark:bg-red-900/30' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${config.text}`} />
                            <span className={`flex-1 text-sm ${isSelected ? 'font-semibold text-[#cf292c]' : 'text-gray-700 dark:text-gray-300'}`}>
                              {config.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${config.bg} ${config.text}`}>
                              {count}
                            </span>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#cf292c]" />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
            
            {/* Badge filtre actif + résultats */}
            {filterCategory !== 'all' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${selectedFilter.bg} ${selectedFilter.text}`}>
                  <SelectedIcon className="w-3 h-3" />
                  {selectedFilter.label}
                  <button 
                    onClick={() => setFilterCategory('all')} 
                    className="ml-1 hover:opacity-70 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
                <span className="ml-auto text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  {filteredHistorique.length}/{historique.length} événements
                </span>
              </div>
            )}
          </div>
        </div>

      {/* Section Historique */}
      <div className="px-4 mt-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          {/* Header de la section */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#cf292c]" />
              Historique des points
            </h2>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
              {filteredHistorique.length} événements
            </span>
          </div>

          {/* Contenu */}
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                    <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : Object.keys(groupedHistorique).length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">Aucun événement</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {filterCategory !== 'all' ? 'Aucun point dans cette catégorie' : 'Votre historique est vide'}
                </p>
                {filterCategory !== 'all' && (
                  <button 
                    onClick={() => setFilterCategory('all')}
                    className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Voir tout l'historique
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedHistorique).map(([dateKey, items]) => (
                  <div key={dateKey}>
                    {/* Séparateur de date */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {dateKey}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                    </div>
                    
                    {/* Items du jour */}
                    <div className="space-y-2">
                      {items.map((item, idx) => {
                        const category = getRuleCategory(item.category);
                        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.special;
                        const Icon = config.icon;
                        const isPositive = item.points > 0;
                        // Le motif/commentaire du manager
                        const commentaire = item.description || item.motif;

                        return (
                          <div 
                            key={item.id || idx}
                            className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                          >
                            <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform mt-0.5`}>
                              <Icon className={`w-5 h-5 ${config.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {formatLabel(item)}
                              </p>
                              {/* Commentaire du manager */}
                              {commentaire && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 italic">
                                  "{commentaire}"
                                </p>
                              )}
                              <span className={`inline-flex items-center mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.text}`}>
                                {config.label}
                              </span>
                            </div>
                            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm flex-shrink-0 ${
                              isPositive 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}>
                              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              <span>{isPositive ? '+' : ''}{item.points}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <BottomNav />
    </div>
  );
}
