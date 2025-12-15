import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, TrendingUp, TrendingDown, Users, Star, AlertTriangle, AlertCircle,
  Plus, Minus, Search, Filter, Calendar, Award, ChevronRight,
  ChevronDown, X, Check, Clock, UserCheck, RefreshCw, MessageSquare,
  Medal, Crown, Flame, Target, Zap, Gift, ThumbsUp, ThumbsDown,
  Heart, Sparkles, ShieldAlert, BookOpen, Smile, Frown, UserX, FileWarning
} from 'lucide-react';
import {
  getClassement, getScoringRules, getScoringDashboard, 
  getEmployeScore, attribuerPoints, CATEGORIES, getNiveau
} from '../services/scoringService';
import PeerFeedbackManager from './PeerFeedbackManager';
import { useToast } from './ui/Toast';

// =====================================================
// COMPOSANT PRINCIPAL - GESTION SCORING MANAGER
// =====================================================

// Configuration des onglets avec icônes et couleurs
const TABS_CONFIG = [
  { id: 'dashboard', label: 'Vue d\'ensemble', shortLabel: 'Aperçu', icon: TrendingUp, color: 'text-blue-600' },
  { id: 'classement', label: 'Classement', shortLabel: 'Top', icon: Trophy, color: 'text-yellow-600' },
  { id: 'attribuer', label: 'Attribuer', shortLabel: '+Pts', icon: Gift, color: 'text-green-600' },
  { id: 'feedbacks', label: 'Feedbacks', shortLabel: 'Avis', icon: MessageSquare, color: 'text-purple-600' }
];

export default function ScoringManager({ embedded = false }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data
  const [dashboard, setDashboard] = useState(null);
  const [classement, setClassement] = useState([]);
  const [rules, setRules] = useState({ parCategorie: {} });
  const [selectedEmploye, setSelectedEmploye] = useState(null);
  const [employeDetails, setEmployeDetails] = useState(null);
  
  // Filtres
  const [periode, setPeriode] = useState('3months');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal attribution
  const [showModal, setShowModal] = useState(false);
  const [modalEmploye, setModalEmploye] = useState(null);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, rulesData] = await Promise.all([
        getScoringDashboard(),
        getScoringRules()
      ]);
      setDashboard(dashData.data);
      setRules(rulesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClassement = useCallback(async () => {
    try {
      const data = await getClassement(periode);
      setClassement(data.data);
    } catch (err) {
      console.error('Erreur chargement classement:', err);
    }
  }, [periode]);

  useEffect(() => {
    if (activeTab === 'classement') {
      loadClassement();
    }
  }, [activeTab, loadClassement]);

  const loadEmployeDetails = async (employeId) => {
    try {
      const data = await getEmployeScore(employeId);
      setEmployeDetails(data.data);
      setSelectedEmploye(employeId);
    } catch (err) {
      console.error('Erreur chargement détails:', err);
    }
  };

  const openAttributionModal = (employe) => {
    setModalEmploye(employe);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-[#cf292c] border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-gray-500">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-700 font-medium">Une erreur est survenue</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header - Masqué si embedded */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Scoring Employés
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les points bonus/malus de votre équipe
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      )}

      {/* Tabs améliorés - Style cohérent avec l'app */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          {TABS_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium 
                  transition-all duration-200 whitespace-nowrap
                  ${isActive 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
        
        {/* Bouton actualiser */}
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualiser les données"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && <DashboardView data={dashboard} onEmployeClick={loadEmployeDetails} />}
      {activeTab === 'classement' && (
        <ClassementView 
          data={classement} 
          periode={periode}
          setPeriode={setPeriode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEmployeClick={loadEmployeDetails}
          onAttribuer={openAttributionModal}
        />
      )}
      {activeTab === 'attribuer' && (
        <AttribuerView 
          rules={rules} 
          onSuccess={() => { loadData(); loadClassement(); }}
        />
      )}
      {activeTab === 'feedbacks' && (
        <PeerFeedbackManager />
      )}

      {/* Modal détails employé */}
      {selectedEmploye && employeDetails && (
        <EmployeDetailsModal
          data={employeDetails}
          onClose={() => { setSelectedEmploye(null); setEmployeDetails(null); }}
          onAttribuer={() => openAttributionModal(employeDetails.employe)}
        />
      )}

      {/* Modal attribution rapide */}
      {showModal && modalEmploye && (
        <QuickAttributionModal
          employe={modalEmploye}
          rules={rules}
          onClose={() => { setShowModal(false); setModalEmploye(null); }}
          onSuccess={() => { loadData(); loadClassement(); setShowModal(false); setModalEmploye(null); }}
        />
      )}
    </div>
  );
}

// =====================================================
// DASHBOARD VIEW - Vue d'ensemble épurée et sobre
// =====================================================

function DashboardView({ data, onEmployeClick }) {
  if (!data) return null;

  // Top 3 pour affichage en vedette
  const top3 = data.top5?.slice(0, 3) || [];

  return (
    <div className="space-y-5">
      {/* Stats globales - Design épuré */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Employés notés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.stats?.nb_employes_notes || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bonus (30j)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">+{data.stats?.total_bonus_global || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Malus (30j)</p>
              <p className="text-2xl font-bold text-[#cf292c] mt-1">-{data.stats?.total_malus_global || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#cf292c]" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Attributions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.stats?.nb_attributions || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 - Design sobre avec médailles */}
      {top3.length >= 3 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Top 3 du mois</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {/* 1er */}
            <div 
              onClick={() => onEmployeClick(top3[0]?.id)}
              className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative"
            >
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#cf292c] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                1
              </div>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold mb-2 ${top3[0]?.niveau?.bg || 'bg-gray-100'}`}>
                <span className={top3[0]?.niveau?.iconColor || 'text-gray-700'}>{top3[0]?.prenom?.[0]}{top3[0]?.nom?.[0]}</span>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {top3[0]?.niveau?.label === 'À surveiller' 
                  ? <AlertTriangle className={`w-5 h-5 ${top3[0]?.niveau?.iconColor || 'text-gray-400'}`} />
                  : <Medal className={`w-5 h-5 ${top3[0]?.niveau?.iconColor || 'text-gray-400'}`} />
                }
                <span className="font-semibold text-gray-900 text-sm truncate">{top3[0]?.prenom}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{top3[0]?.score_total}</p>
              <p className="text-xs text-gray-500">{top3[0]?.niveau?.label}</p>
            </div>
            
            {/* 2ème */}
            <div 
              onClick={() => onEmployeClick(top3[1]?.id)}
              className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative"
            >
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gray-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                2
              </div>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold mb-2 ${top3[1]?.niveau?.bg || 'bg-gray-100'}`}>
                <span className={top3[1]?.niveau?.iconColor || 'text-gray-700'}>{top3[1]?.prenom?.[0]}{top3[1]?.nom?.[0]}</span>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {top3[1]?.niveau?.label === 'À surveiller' 
                  ? <AlertTriangle className={`w-5 h-5 ${top3[1]?.niveau?.iconColor || 'text-gray-400'}`} />
                  : <Medal className={`w-5 h-5 ${top3[1]?.niveau?.iconColor || 'text-gray-400'}`} />
                }
                <span className="font-semibold text-gray-900 text-sm truncate">{top3[1]?.prenom}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{top3[1]?.score_total}</p>
              <p className="text-xs text-gray-500">{top3[1]?.niveau?.label}</p>
            </div>
            
            {/* 3ème */}
            <div 
              onClick={() => onEmployeClick(top3[2]?.id)}
              className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative"
            >
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                3
              </div>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold mb-2 ${top3[2]?.niveau?.bg || 'bg-gray-100'}`}>
                <span className={top3[2]?.niveau?.iconColor || 'text-gray-700'}>{top3[2]?.prenom?.[0]}{top3[2]?.nom?.[0]}</span>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {top3[2]?.niveau?.label === 'À surveiller' 
                  ? <AlertTriangle className={`w-5 h-5 ${top3[2]?.niveau?.iconColor || 'text-gray-400'}`} />
                  : <Medal className={`w-5 h-5 ${top3[2]?.niveau?.iconColor || 'text-gray-400'}`} />
                }
                <span className="font-semibold text-gray-900 text-sm truncate">{top3[2]?.prenom}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{top3[2]?.score_total}</p>
              <p className="text-xs text-gray-500">{top3[2]?.niveau?.label}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top 5 complet */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Meilleurs scores
            </h3>
            <span className="text-xs text-gray-400">3 mois</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.top5?.map((emp, idx) => (
              <div
                key={emp.id}
                onClick={() => onEmployeClick(emp.id)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                  idx === 1 ? 'bg-gray-100 text-gray-600' :
                  idx === 2 ? 'bg-orange-50 text-orange-600' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {emp.rang}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{emp.prenom} {emp.nom}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Award className={`w-4 h-4 ${emp.niveau?.iconColor || 'text-gray-400'}`} />
                  <span className="font-bold text-gray-900">{emp.score_total}</span>
                </div>
              </div>
            ))}
            {(!data.top5 || data.top5.length === 0) && (
              <div className="p-6 text-center text-gray-500 text-sm">
                Aucun classement disponible
              </div>
            )}
          </div>
        </div>

        {/* À surveiller */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              À surveiller
            </h3>
            <span className="text-xs text-gray-400">Scores bas</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.bottom5?.map((emp) => (
              <div
                key={emp.id}
                onClick={() => onEmployeClick(emp.id)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                  <span className="text-[#cf292c] text-xs">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{emp.prenom} {emp.nom}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${emp.niveau?.iconColor || 'text-red-500'}`} />
                  <span className={`font-bold ${emp.score_total < 0 ? 'text-[#cf292c]' : 'text-gray-900'}`}>
                    {emp.score_total}
                  </span>
                </div>
              </div>
            ))}
            {(!data.bottom5 || data.bottom5.length === 0) && (
              <div className="p-6 text-center text-gray-500 text-sm">
                <Check className="w-5 h-5 mx-auto mb-1 text-green-500" />
                Aucun employé à surveiller
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activité récente - Design compact */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Activité récente
          </h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
          {data.recents?.slice(0, 8).map((point) => (
            <div key={point.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                point.points > 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {point.points > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#cf292c]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {point.prenom} {point.nom}
                </p>
                <p className="text-xs text-gray-500 truncate">{point.label || point.rule_code}</p>
              </div>
              <div className={`font-bold text-sm ${point.points > 0 ? 'text-green-600' : 'text-[#cf292c]'}`}>
                {point.points > 0 ? '+' : ''}{point.points}
              </div>
            </div>
          ))}
          {(!data.recents || data.recents.length === 0) && (
            <div className="p-6 text-center text-gray-500 text-sm">
              Aucune activité récente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CLASSEMENT VIEW - Tableau amélioré
// =====================================================

function ClassementView({ data, periode, setPeriode, searchTerm, setSearchTerm, onEmployeClick, onAttribuer }) {
  const filteredData = data.filter(emp => 
    `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filtres épurés */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-colors text-sm"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={periode}
              onChange={e => setPeriode(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
            >
              <option value="1month">1 mois</option>
              <option value="3months">3 mois</option>
              <option value="6months">6 mois</option>
              <option value="12months">12 mois</option>
            </select>
          </div>
        </div>
        
        {/* Compteur de résultats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {filteredData.length} employé{filteredData.length > 1 ? 's' : ''}
          </span>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-[#cf292c] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Tableau - Version Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rang</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Niveau</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Bonus</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Malus</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Score</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.map((emp) => {
              const niveau = getNiveau(emp.score_total);
              return (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      emp.rang === 1 ? 'bg-[#cf292c] text-white' :
                      emp.rang === 2 ? 'bg-gray-600 text-white' :
                      emp.rang === 3 ? 'bg-amber-600 text-white' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {emp.rang}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEmployeClick(emp.id)}
                      className="text-left hover:text-[#cf292c] transition-colors group"
                    >
                      <p className="font-medium text-gray-900 group-hover:text-[#cf292c]">{emp.prenom} {emp.nom}</p>
                      <p className="text-xs text-gray-500">{emp.poste || 'Employé'}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${niveau.bg}`}>
                        {niveau.label === 'À surveiller' 
                          ? <AlertTriangle className={`w-4 h-4 ${niveau.iconColor}`} />
                          : <Medal className={`w-4 h-4 ${niveau.iconColor}`} />
                        }
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5">{niveau.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                      <TrendingUp className="w-3 h-3" />
                      +{emp.total_bonus || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-[#cf292c] text-sm font-medium">
                      <TrendingDown className="w-3 h-3" />
                      -{emp.total_malus || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-lg ${
                      emp.score_total < 0 ? 'text-[#cf292c]' : 'text-gray-900'
                    }`}>
                      {emp.score_total}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onAttribuer(emp)}
                      className="p-2 text-gray-400 hover:text-[#cf292c] hover:bg-red-50 rounded-lg transition-colors"
                      title="Attribuer des points"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 text-sm">Aucun employé trouvé</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-2 text-[#cf292c] hover:underline text-sm"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </div>

      {/* Version Mobile - Cards */}
      <div className="md:hidden space-y-2">
        {filteredData.map((emp) => {
          const niveau = getNiveau(emp.score_total);
          return (
            <div 
              key={emp.id} 
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                {/* Rang */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  emp.rang === 1 ? 'bg-[#cf292c] text-white' :
                  emp.rang === 2 ? 'bg-gray-600 text-white' :
                  emp.rang === 3 ? 'bg-amber-600 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {emp.rang}
                </div>
                
                {/* Infos */}
                <div className="flex-1 min-w-0" onClick={() => onEmployeClick(emp.id)}>
                  <p className="font-medium text-gray-900 truncate">{emp.prenom} {emp.nom}</p>
                  <p className="text-xs text-gray-500">{emp.poste || 'Employé'}</p>
                </div>
                
                {/* Score & Niveau */}
                <div className="text-right flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${niveau.bg}`}>
                    {niveau.label === 'À surveiller' 
                      ? <AlertTriangle className={`w-3.5 h-3.5 ${niveau.iconColor}`} />
                      : <Medal className={`w-3.5 h-3.5 ${niveau.iconColor}`} />
                    }
                  </div>
                  <span className={`font-bold text-lg ${
                    emp.score_total < 0 ? 'text-[#cf292c]' : 'text-gray-900'
                  }`}>
                    {emp.score_total}
                  </span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-50">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">+{emp.total_bonus || 0}</span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50">
                  <TrendingDown className="w-3.5 h-3.5 text-[#cf292c]" />
                  <span className="text-sm font-medium text-[#cf292c]">-{emp.total_malus || 0}</span>
                </div>
                <button
                  onClick={() => onAttribuer(emp)}
                  className="p-2 bg-[#cf292c] text-white rounded-lg hover:bg-[#b82329] transition-colors"
                  title="Attribuer des points"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="p-10 text-center bg-white rounded-xl border border-gray-200">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 text-sm">Aucun employé trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
// =====================================================
// ATTRIBUER VIEW - Formulaire amélioré avec navigation par étapes
// =====================================================

function AttribuerView({ rules, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Employé, 2: Points, 3: Confirmation
  const [selectedEmploye, setSelectedEmploye] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [motif, setMotif] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [searchEmploye, setSearchEmploye] = useState('');
  const [ruleType, setRuleType] = useState('bonus'); // 'bonus', 'malus', 'custom'
  const toast = useToast();

  // Charger la liste des employés avec leurs scores
  useEffect(() => {
    const loadEmployes = async () => {
      try {
        const token = localStorage.getItem('token');
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const adminUrl = baseUrl.replace('/api', '');
        
        // Charger les employés
        const res = await fetch(`${adminUrl}/admin/employes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const employesData = await res.json();
        const employesActifs = employesData.filter(u => u.role === 'employee' && u.statut === 'actif');
        
        // Charger le classement pour avoir les scores
        const classementData = await getClassement('3months', 100);
        
        // Fusionner les données
        const employesAvecScores = employesActifs.map(emp => {
          const scoreInfo = classementData.data?.find(c => c.id === emp.id);
          return {
            ...emp,
            score_total: scoreInfo?.score_total ?? 0
          };
        });
        
        setEmployes(employesAvecScores);
      } catch (err) {
        console.error('Erreur chargement employés:', err);
      }
    };
    loadEmployes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmploye || (!selectedRule && !customPoints)) return;

    setLoading(true);
    setSuccess(null);

    try {
      const isCustom = !selectedRule && customPoints;
      const ruleCode = selectedRule || (parseInt(customPoints) >= 0 ? 'BONUS_CUSTOM' : 'MALUS_CUSTOM');
      
      await attribuerPoints(
        parseInt(selectedEmploye),
        ruleCode,
        motif || null,
        date,
        isCustom ? parseInt(customPoints) : null
      );
      
      setSuccess('Points attribués avec succès !');
      
      // Reset
      setTimeout(() => {
        setSuccess(null);
        setStep(1);
        setSelectedEmploye('');
        setSelectedRule('');
        setCustomPoints('');
        setMotif('');
        setRuleType('bonus');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      toast.error('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRuleData = rules.data?.find(r => r.code === selectedRule);
  const selectedEmployeData = employes.find(e => e.id === parseInt(selectedEmploye));
  const selectedEmployeNiveau = selectedEmployeData ? getNiveau(selectedEmployeData.score_total || 0) : null;
  
  const filteredEmployes = employes.filter(emp => 
    `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchEmploye.toLowerCase())
  );

  const manualRules = rules.data?.filter(r => r.type === 'manuel') || [];
  const bonusRules = manualRules.filter(r => r.points >= 0);
  const malusRules = manualRules.filter(r => r.points < 0);

  const getPointsValue = () => {
    if (selectedRule && selectedRuleData) return selectedRuleData.points;
    if (customPoints) return parseInt(customPoints);
    return 0;
  };

  const canProceedToStep2 = selectedEmploye;
  const canProceedToStep3 = selectedRule || customPoints;

  // Icons pour les règles
  const getRuleIcon = (code, isBonus) => {
    if (code.includes('ATTITUDE_CLIENT')) return isBonus ? Smile : Frown;
    if (code.includes('ESPRIT_EQUIPE')) return isBonus ? Heart : UserX;
    if (code.includes('INITIATIVE')) return Sparkles;
    if (code.includes('FELICITATIONS')) return Award;
    if (code.includes('FORMATION')) return BookOpen;
    if (code.includes('HYGIENE')) return ShieldAlert;
    if (code.includes('AVERTISSEMENT_VERBAL')) return AlertCircle;
    if (code.includes('AVERTISSEMENT_ECRIT')) return FileWarning;
    return isBonus ? Star : AlertTriangle;
  };

  return (
    <div className="w-full h-full">
      {/* Message succès */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* Layout compact tout-en-un */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Colonne 1 - Employés (3 cols) */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                <Users className="w-3.5 h-3.5 text-[#cf292c]" />
                Employé
              </h3>
            </div>
            
            <div className="p-2">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchEmploye}
                  onChange={e => setSearchEmploye(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/20 focus:border-[#cf292c] text-xs"
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-0.5">
                {filteredEmployes.map(emp => {
                  const empNiveau = getNiveau(emp.score_total || 0);
                  const isSelected = selectedEmploye === emp.id.toString();
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmploye(emp.id.toString())}
                      className={`w-full p-2 flex items-center gap-2 rounded-lg transition-colors text-left ${
                        isSelected ? 'bg-[#cf292c]/10 border border-[#cf292c]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${empNiveau.bg}`}>
                        <span className={empNiveau.iconColor}>{emp.prenom?.[0]}{emp.nom?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-xs truncate">{emp.prenom} {emp.nom}</p>
                        <p className="text-[10px] text-gray-400">{emp.score_total || 0} pts</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#cf292c]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Colonne 2 - Type + Règles (5 cols) */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Sélecteur de type */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5 flex-1">
                <button
                  type="button"
                  onClick={() => { setRuleType('bonus'); setSelectedRule(''); setCustomPoints(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    ruleType === 'bonus' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 hover:text-green-600'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Bonus
                </button>
                <button
                  type="button"
                  onClick={() => { setRuleType('malus'); setSelectedRule(''); setCustomPoints(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    ruleType === 'malus' ? 'bg-[#cf292c] text-white shadow-sm' : 'text-gray-600 hover:text-[#cf292c]'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Malus
                </button>
                <button
                  type="button"
                  onClick={() => { setRuleType('custom'); setSelectedRule(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    ruleType === 'custom' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Manuel
                </button>
              </div>
            </div>

            {/* Liste des règles */}
            <div className="flex-1 overflow-hidden">
              {ruleType !== 'custom' ? (
                <div className="p-2 h-full overflow-y-auto">
                  <div className="grid grid-cols-1 gap-1.5">
                    {(ruleType === 'bonus' ? bonusRules : malusRules).map(rule => {
                      const RuleIcon = getRuleIcon(rule.code, ruleType === 'bonus');
                      const isSelected = selectedRule === rule.code;
                      return (
                        <button
                          key={rule.code}
                          type="button"
                          onClick={() => { setSelectedRule(rule.code); setCustomPoints(''); }}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                            isSelected
                              ? ruleType === 'bonus' 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected 
                              ? ruleType === 'bonus' ? 'bg-green-500 text-white' : 'bg-[#cf292c] text-white'
                              : ruleType === 'bonus' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-[#cf292c]'
                          }`}>
                            <RuleIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-xs truncate">{rule.label}</p>
                          </div>
                          <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${
                            ruleType === 'bonus' 
                              ? isSelected ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'
                              : isSelected ? 'bg-[#cf292c] text-white' : 'bg-red-100 text-[#cf292c]'
                          }`}>
                            {rule.points > 0 ? '+' : ''}{rule.points}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 flex flex-col items-center justify-center h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setCustomPoints(String(Math.max(-100, parseInt(customPoints || 0) - 5)))}
                      className="w-10 h-10 rounded-lg bg-red-100 text-[#cf292c] flex items-center justify-center hover:bg-red-200"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={customPoints}
                      onChange={e => setCustomPoints(e.target.value)}
                      placeholder="0"
                      className={`w-24 px-3 py-2 text-center text-2xl font-bold border-2 rounded-lg ${
                        parseInt(customPoints) > 0 ? 'border-green-400 text-green-600 bg-green-50' :
                        parseInt(customPoints) < 0 ? 'border-red-400 text-[#cf292c] bg-red-50' :
                        'border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomPoints(String(Math.min(100, parseInt(customPoints || 0) + 5)))}
                      className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[-20, -10, -5, 5, 10, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCustomPoints(String(val))}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          customPoints === String(val)
                            ? val > 0 ? 'bg-green-500 text-white' : 'bg-[#cf292c] text-white'
                            : val > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#cf292c]'
                        }`}
                      >
                        {val > 0 ? '+' : ''}{val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne 3 - Résumé + Actions (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                <Check className="w-3.5 h-3.5 text-green-600" />
                Résumé
              </h3>
            </div>
            
            <div className="p-3 flex-1 flex flex-col gap-3">
              {/* Employé sélectionné */}
              {selectedEmployeData ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${selectedEmployeNiveau?.bg}`}>
                    <span className={selectedEmployeNiveau?.iconColor}>
                      {selectedEmployeData.prenom?.[0]}{selectedEmployeData.nom?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedEmployeData.prenom} {selectedEmployeData.nom}</p>
                    <p className="text-xs text-gray-500">{selectedEmployeData.score_total || 0} pts actuels</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-400 text-xs">
                  Sélectionnez un employé
                </div>
              )}

              {/* Points à attribuer */}
              {(selectedRule || customPoints) ? (
                <div className={`p-3 rounded-lg text-center ${
                  getPointsValue() >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">
                    {selectedRuleData ? selectedRuleData.label : 'Points personnalisés'}
                  </p>
                  <p className={`text-3xl font-bold ${getPointsValue() >= 0 ? 'text-green-600' : 'text-[#cf292c]'}`}>
                    {getPointsValue() > 0 ? '+' : ''}{getPointsValue()}
                  </p>
                  {selectedEmployeData && (
                    <p className="text-xs text-gray-500 mt-1">
                      → Nouveau score: <span className="font-semibold">{(selectedEmployeData.score_total || 0) + getPointsValue()}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-400 text-xs">
                  Sélectionnez une règle ou des points
                </div>
              )}

              {/* Commentaire compact */}
              <div>
                <input
                  type="text"
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  placeholder="Commentaire (optionnel)..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/20 focus:border-[#cf292c] text-xs"
                />
              </div>

              {/* Date */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/20 focus:border-[#cf292c] text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDate(new Date().toISOString().split('T')[0])}
                  className={`px-2 py-2 text-xs font-medium rounded-lg ${
                    date === new Date().toISOString().split('T')[0] 
                      ? 'bg-[#cf292c] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Auj.
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Bouton Submit */}
              <button
                type="submit"
                disabled={loading || !selectedEmploye || (!selectedRule && !customPoints)}
                className="w-full py-3 bg-[#cf292c] text-white font-semibold rounded-lg hover:bg-[#b82329] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Attribuer
                    {(selectedRule || customPoints) && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                        getPointsValue() >= 0 ? 'bg-green-600' : 'bg-red-700'
                      }`}>
                        {getPointsValue() > 0 ? '+' : ''}{getPointsValue()}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL DÉTAILS EMPLOYÉ - Design amélioré
// =====================================================

function EmployeDetailsModal({ data, onClose, onAttribuer }) {
  const niveau = getNiveau(data.score?.score_total || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header épuré */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${niveau.bg}`}>
                <span className={niveau.iconColor}>{data.employe?.prenom?.[0]}{data.employe?.nom?.[0]}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {data.employe?.prenom} {data.employe?.nom}
                </h2>
                <p className="text-sm text-gray-500">{data.employe?.poste || 'Employé'}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats cards - Design sobre */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-3">
            {/* Niveau */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${niveau.bg}`}>
                {niveau.label === 'À surveiller' 
                  ? <AlertTriangle className={`w-4 h-4 ${niveau.iconColor}`} />
                  : <Medal className={`w-4 h-4 ${niveau.iconColor}`} />
                }
              </div>
              <p className="text-xs font-medium text-gray-900">{niveau.label}</p>
            </div>
            
            {/* Score total */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center bg-gray-100">
                <Star className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.score?.score_total || 0}</p>
              <p className="text-xs text-gray-500">Score</p>
            </div>
            
            {/* Bonus */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center bg-green-50">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-600">+{data.score?.total_bonus || 0}</p>
              <p className="text-xs text-gray-500">Bonus</p>
            </div>
            
            {/* Malus */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center bg-red-50">
                <TrendingDown className="w-4 h-4 text-[#cf292c]" />
              </div>
              <p className="text-lg font-bold text-[#cf292c]">-{data.score?.total_malus || 0}</p>
              <p className="text-xs text-gray-500">Malus</p>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
          <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Historique des points
          </h3>
          <div className="space-y-2">
            {data.historique?.map(point => (
              <div key={point.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  point.points > 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {point.points > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#cf292c]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{point.label || point.rule_code}</p>
                  {point.motif && <p className="text-xs text-gray-500 truncate">{point.motif}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold ${point.points > 0 ? 'text-green-600' : 'text-[#cf292c]'}`}>
                    {point.points > 0 ? '+' : ''}{point.points}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(point.date_evenement).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
            {(!data.historique || data.historique.length === 0) && (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm">Aucun historique de points</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            Fermer
          </button>
          <button
            onClick={onAttribuer}
            className="px-4 py-2 bg-[#cf292c] text-white rounded-lg hover:bg-[#b82329] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Attribuer des points
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL ATTRIBUTION RAPIDE - Design épuré
// =====================================================

function QuickAttributionModal({ employe, rules, onClose, onSuccess }) {
  const [selectedRule, setSelectedRule] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const niveau = getNiveau(employe.score_total || 0);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!selectedRule) return;
    setLoading(true);
    try {
      await attribuerPoints(employe.id, selectedRule, motif || null);
      onSuccess();
    } catch (err) {
      toast.error('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const manualRules = rules.data?.filter(r => r.type === 'manuel') || [];
  const bonusRules = manualRules.filter(r => r.points >= 0);
  const malusRules = manualRules.filter(r => r.points < 0);
  const selectedRuleData = manualRules.find(r => r.code === selectedRule);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header épuré */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold ${niveau.bg}`}>
                <span className={niveau.iconColor}>{employe.prenom?.[0]}{employe.nom?.[0]}</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {employe.prenom} {employe.nom}
                </h2>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {niveau.label === 'À surveiller' 
                    ? <AlertTriangle className={`w-3 h-3 ${niveau.iconColor}`} />
                    : <Medal className={`w-3 h-3 ${niveau.iconColor}`} />
                  }
                  {niveau.label} • {employe.score_total || 0} pts
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Bonus */}
          {bonusRules.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                Bonus
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {bonusRules.map(rule => (
                  <button
                    key={rule.code}
                    onClick={() => setSelectedRule(rule.code)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedRule === rule.code
                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 truncate">{rule.label}</span>
                      <span className="font-bold text-green-600 text-sm">+{rule.points}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{rule.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Malus */}
          {malusRules.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-[#cf292c]" />
                Malus
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {malusRules.map(rule => (
                  <button
                    key={rule.code}
                    onClick={() => setSelectedRule(rule.code)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedRule === rule.code
                        ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 truncate">{rule.label}</span>
                      <span className="font-bold text-[#cf292c] text-sm">{rule.points}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{rule.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu sélection */}
          {selectedRuleData && (
            <div className={`p-3 rounded-lg border ${
              selectedRuleData.points >= 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {selectedRuleData.points >= 0 ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#cf292c]" />
                )}
                <span className="font-medium text-sm">{selectedRuleData.label}</span>
                <span className={`ml-auto font-bold ${
                  selectedRuleData.points >= 0 ? 'text-green-600' : 'text-[#cf292c]'
                }`}>
                  {selectedRuleData.points > 0 ? '+' : ''}{selectedRuleData.points} pts
                </span>
              </div>
              <p className="text-xs text-gray-600">{selectedRuleData.description}</p>
            </div>
          )}

          {/* Commentaire */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedRule || loading}
            className="px-4 py-2 bg-[#cf292c] text-white rounded-lg hover:bg-[#b82329] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
