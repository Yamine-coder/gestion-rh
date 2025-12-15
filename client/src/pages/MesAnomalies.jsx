// client/src/pages/MesAnomalies.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  BellAlertIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  QuestionMarkCircleIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import BottomNav from '../components/BottomNav';
import { ThemeContext } from '../context/ThemeContext';
import useNotificationHighlight from '../hooks/useNotificationHighlight';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const brand = '#cf292c';

// Icônes de gravité avec heroicons
const GRAVITE_CONFIG = {
  critique: { 
    color: 'text-red-600 dark:text-red-400', 
    bg: 'bg-red-50 dark:bg-red-900/20', 
    bgSolid: 'bg-red-500',
    border: 'border-red-200 dark:border-red-800',
    ringColor: 'ring-red-500',
    label: 'Critique',
    dotColor: 'bg-red-500',
    icon: ExclamationCircleIcon
  },
  attention: { 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    bgSolid: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800',
    ringColor: 'ring-amber-500',
    label: 'Attention',
    dotColor: 'bg-amber-500',
    icon: ExclamationTriangleIcon
  },
  hors_plage: { 
    color: 'text-purple-600 dark:text-purple-400', 
    bg: 'bg-purple-50 dark:bg-purple-900/20', 
    bgSolid: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
    ringColor: 'ring-purple-500',
    label: 'Hors plage',
    dotColor: 'bg-purple-500',
    icon: NoSymbolIcon
  },
  a_valider: { 
    color: 'text-orange-600 dark:text-orange-400', 
    bg: 'bg-orange-50 dark:bg-orange-900/20', 
    bgSolid: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-800',
    ringColor: 'ring-orange-500',
    label: 'À valider',
    dotColor: 'bg-orange-500',
    icon: QuestionMarkCircleIcon
  },
  info: { 
    color: 'text-blue-600 dark:text-blue-400', 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    bgSolid: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-800',
    ringColor: 'ring-blue-500',
    label: 'Info',
    dotColor: 'bg-blue-500',
    icon: InformationCircleIcon
  },
  ok: { 
    color: 'text-green-600 dark:text-green-400', 
    bg: 'bg-green-50 dark:bg-green-900/20', 
    bgSolid: 'bg-green-500',
    border: 'border-green-200 dark:border-green-800',
    ringColor: 'ring-green-500',
    label: 'OK',
    dotColor: 'bg-green-500',
    icon: CheckCircleIcon
  }
};

const STATUT_CONFIG = {
  en_attente: { 
    color: 'text-blue-600 dark:text-blue-400', 
    bg: 'bg-blue-100 dark:bg-blue-900/40', 
    label: 'En attente',
    icon: ClockIcon
  },
  validee: { 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-100 dark:bg-emerald-900/40', 
    label: 'Validée',
    icon: CheckCircleIcon
  },
  refusee: { 
    color: 'text-red-600 dark:text-red-400', 
    bg: 'bg-red-100 dark:bg-red-900/40', 
    label: 'Refusée',
    icon: XCircleIcon
  },
  corrigee: { 
    color: 'text-purple-600 dark:text-purple-400', 
    bg: 'bg-purple-100 dark:bg-purple-900/40', 
    label: 'Corrigée',
    icon: CheckCircleIcon
  },
  obsolete: { 
    color: 'text-gray-500 dark:text-gray-400', 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    label: 'Obsolète',
    icon: InformationCircleIcon
  }
};

// Labels des types d'anomalies
const TYPE_LABELS = {
  'retard': 'Retard',
  'retard_modere': 'Retard modéré',
  'retard_critique': 'Retard critique',
  'absence_totale': 'Absence totale',
  'presence_non_prevue': 'Présence non prévue',
  'depart_anticipe': 'Départ anticipé',
  'depart_premature_critique': 'Départ prématuré',
  'heures_sup': 'Heures supplémentaires',
  'heures_sup_auto_validees': 'Heures sup (auto)',
  'heures_sup_a_valider': 'Heures sup (à valider)',
  'hors_plage_in': 'Arrivée hors plage',
  'hors_plage_out_critique': 'Départ hors plage',
  'missing_in': 'Arrivée manquante',
  'missing_out': 'Départ manquant',
  'segment_non_pointe': 'Segment non pointé',
  'pointage_hors_planning': 'Pointage hors planning',
  'absence_planifiee_avec_pointage': 'Pointage sur absence'
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

// Composant Toggle/Switch personnalisé - Responsive amélioré
const ToggleFilter = ({ options, value, onChange, label }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 gap-0.5 overflow-x-auto scrollbar-hide">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative flex-1 min-w-fit px-2.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap
                ${isActive 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-1">
                {option.icon && <option.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 hidden sm:block" />}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Composant Chip Filter (filtres horizontaux scrollables) - Responsive amélioré
const ChipFilter = ({ options, value, onChange }) => {
  return (
    <div className="relative">
      {/* Gradient fade gauche */}
      <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      {/* Gradient fade droite */}
      <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide scroll-smooth snap-x">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap
                transition-all duration-200 border-2 flex-shrink-0 active:scale-95
                ${isActive 
                  ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-md shadow-red-500/20' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#cf292c]/50 hover:bg-gray-50 dark:hover:bg-gray-750'
                }
              `}
            >
              {option.icon && (
                <option.icon className={`w-4 h-4 ${isActive ? 'text-white' : option.iconColor || 'text-gray-400'}`} />
              )}
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className={`
                  min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[10px] font-bold
                  ${isActive ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                `}>
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function MesAnomalies() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const { isHighlighted: isAnomaliesListHighlighted, highlightId } = useNotificationHighlight('anomalies-list');
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [periode, setPeriode] = useState('mois'); // semaine, mois, trimestre

  // Gérer la navigation depuis les notifications
  useEffect(() => {
    if (location.state?.fromNotification) {
      setTimeout(() => {
        const section = document.getElementById('anomalies-list');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      // Nettoyer le state pour éviter les boucles de redirection
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);

  const fetchMesAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Calculer les dates selon la période
      const now = new Date();
      let dateDebut;
      switch (periode) {
        case 'semaine':
          dateDebut = new Date(now);
          dateDebut.setDate(now.getDate() - 7);
          break;
        case 'trimestre':
          dateDebut = new Date(now);
          dateDebut.setMonth(now.getMonth() - 3);
          break;
        case 'mois':
        default:
          dateDebut = new Date(now);
          dateDebut.setMonth(now.getMonth() - 1);
      }

      const params = new URLSearchParams({
        dateDebut: dateDebut.toISOString().split('T')[0],
        dateFin: now.toISOString().split('T')[0],
        limit: '100'
      });
      
      if (filtreStatut) {
        params.set('statut', filtreStatut);
      }

      const response = await fetch(`${API_BASE}/api/anomalies?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      setAnomalies(data.anomalies || []);
      
    } catch (err) {
      console.error('Erreur récupération anomalies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periode, filtreStatut]);

  useEffect(() => {
    fetchMesAnomalies();
    
    // 🔄 Polling léger (60s) - temps réel gratuit
    const pollingInterval = setInterval(fetchMesAnomalies, 60 * 1000);
    
    return () => clearInterval(pollingInterval);
  }, [fetchMesAnomalies]);

  // Stats rapides
  const stats = {
    total: anomalies.length,
    enAttente: anomalies.filter(a => a.statut === 'en_attente').length,
    validees: anomalies.filter(a => a.statut === 'validee').length,
    refusees: anomalies.filter(a => a.statut === 'refusee').length
  };

  const getGraviteConfig = (gravite) => GRAVITE_CONFIG[gravite] || GRAVITE_CONFIG.info;
  const getStatutConfig = (statut) => STATUT_CONFIG[statut] || { color: 'text-gray-600', bg: 'bg-gray-100', label: statut, icon: ExclamationCircleIcon };

  // Options pour les filtres
  const periodeOptions = [
    { value: 'semaine', label: '7 jours', icon: CalendarDaysIcon },
    { value: 'mois', label: '30 jours', icon: CalendarDaysIcon },
    { value: 'trimestre', label: '3 mois', icon: CalendarDaysIcon }
  ];

  const statutOptions = [
    { value: '', label: 'Tous', icon: FunnelIcon, count: stats.total },
    { value: 'en_attente', label: 'En attente', icon: ClockIcon, iconColor: 'text-blue-500', count: stats.enAttente },
    { value: 'validee', label: 'Validées', icon: CheckCircleIcon, iconColor: 'text-emerald-500', count: stats.validees },
    { value: 'refusee', label: 'Refusées', icon: XCircleIcon, iconColor: 'text-red-500', count: stats.refusees }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header fixe avec bouton retour - safe-area pour iOS PWA */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="w-5 h-5 text-[#cf292c]" />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Mes Anomalies</h1>
          </div>
          <button
            onClick={fetchMesAnomalies}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
          >
            <ArrowPathIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Ligne accent rouge */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[#cf292c] via-[#cf292c] to-transparent" />
      </div>

      {/* Contenu avec padding top pour le header fixe + safe-area */}
      <div className="pb-navbar lg:pb-8 pt-header">
        
        {/* Section Stats améliorée */}
        <div className="px-4 py-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BellAlertIcon className="w-4 h-4 text-[#cf292c]" />
                Résumé
              </h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {periode === 'semaine' ? '7 derniers jours' : periode === 'mois' ? '30 derniers jours' : '3 derniers mois'}
              </span>
            </div>
            
            {/* Stats Grid avec design moderne */}
            <div className="grid grid-cols-4 gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-gray-500/5 rounded-xl" />
                <div className="relative p-3 text-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Total</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl" />
                <div className="relative p-3 text-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.enAttente}</span>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">En attente</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl" />
                <div className="relative p-3 text-center">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.validees}</span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Validées</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl" />
                <div className="relative p-3 text-center">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.refusees}</span>
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-medium">Refusées</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres Section */}
        <div className="px-4 pb-4 space-y-4">
          {/* Toggle Période */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <ToggleFilter
              label="Période"
              options={periodeOptions}
              value={periode}
              onChange={setPeriode}
            />
          </div>

          {/* Chips Statut - filtres scrollables */}
          <ChipFilter
            options={statutOptions}
            value={filtreStatut}
            onChange={setFiltreStatut}
          />
        </div>

        {/* Liste des anomalies */}
        <div className="px-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <ExclamationCircleIcon className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Erreur de chargement</p>
              <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-4">{error}</p>
              <button
                onClick={fetchMesAnomalies}
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: brand }}
              >
                <ArrowPathIcon className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 flex items-center justify-center">
                <CheckCircleSolid className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tout est en ordre ! 🎉</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Aucune anomalie détectée sur cette période. Continuez votre excellent travail !
              </p>
            </div>
          ) : (
            <div 
              id="anomalies-list"
              className={`space-y-4 scroll-mt-highlight transition-all duration-300 ${
                isAnomaliesListHighlighted ? 'ring-2 ring-[#cf292c] rounded-xl p-2 -m-2' : ''
              }`}
            >
              {/* Titre section */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''}
                </h3>
              </div>
              
              {anomalies.map(anomalie => {
                const graviteConfig = getGraviteConfig(anomalie.gravite);
                const statutConfig = getStatutConfig(anomalie.statut);
                const StatutIcon = statutConfig.icon;
                const GraviteIcon = graviteConfig.icon;
                
                return (
                  <div
                    key={anomalie.id}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Gradient background subtil basé sur la gravité */}
                    <div className={`absolute inset-0 opacity-[0.03] ${graviteConfig.bgSolid}`} />
                    
                    {/* Contenu principal */}
                    <div className="relative p-4">
                      {/* Header avec type et statut */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Icône + Type + Date */}
                        <div className="flex items-center gap-3">
                          <div className={`relative w-12 h-12 rounded-2xl ${graviteConfig.bg} flex items-center justify-center shadow-sm`}>
                            <GraviteIcon className={`w-6 h-6 ${graviteConfig.color}`} />
                            {/* Indicateur de gravité */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${graviteConfig.bgSolid} border-2 border-white dark:border-gray-800 flex items-center justify-center`}>
                              <span className="text-white text-[8px] font-bold">!</span>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                              {TYPE_LABELS[anomalie.type] || anomalie.type}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                {formatDate(anomalie.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Badge statut stylisé */}
                        <div className={`px-3 py-1.5 rounded-full ${statutConfig.bg} border ${
                          anomalie.statut === 'en_attente' ? 'border-blue-200 dark:border-blue-700' :
                          anomalie.statut === 'validee' ? 'border-emerald-200 dark:border-emerald-700' :
                          anomalie.statut === 'refusee' ? 'border-red-200 dark:border-red-700' :
                          'border-gray-200 dark:border-gray-600'
                        }`}>
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${statutConfig.color}`}>
                            <StatutIcon className="w-3.5 h-3.5" />
                            {statutConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Ligne de séparation stylisée */}
                      <div className="flex items-center gap-2 my-3">
                        <div className={`flex-1 h-px ${graviteConfig.bgSolid} opacity-20`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${graviteConfig.bgSolid} opacity-40`} />
                        <div className={`flex-1 h-px ${graviteConfig.bgSolid} opacity-20`} />
                      </div>

                      {/* Description dans une bulle */}
                      {anomalie.description && (
                        <div className="relative">
                          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 border border-gray-100 dark:border-gray-600/30">
                            <p className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed">
                              {anomalie.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Détails en tags */}
                      {anomalie.details && (anomalie.details.ecartMinutes || (anomalie.details.heurePrevu && anomalie.details.heureReelle)) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {anomalie.details.ecartMinutes && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              <ClockIcon className="w-3.5 h-3.5 text-gray-500" />
                              Écart: <strong className="text-gray-900 dark:text-white">{Math.abs(anomalie.details.ecartMinutes)} min</strong>
                            </span>
                          )}
                          {anomalie.details.heurePrevu && anomalie.details.heureReelle && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              <span className="text-gray-500">{anomalie.details.heurePrevu}</span>
                              <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-900 dark:text-white font-semibold">{anomalie.details.heureReelle}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Commentaire du manager si traité */}
                      {anomalie.commentaireManager && (
                        <div className="mt-4 relative">
                          <div className="absolute left-4 top-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-amber-200 dark:from-amber-500 dark:to-amber-700 rounded-full" />
                          <div className="ml-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/40">
                            <p className="text-[13px] text-gray-700 dark:text-gray-200 italic leading-relaxed">
                              "{anomalie.commentaireManager}"
                            </p>
                            {anomalie.traiteur && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-semibold flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center text-[8px] text-amber-700 dark:text-amber-200">M</span>
                                {anomalie.traiteur.prenom} {anomalie.traiteur.nom}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Légende améliorée */}
        <div className="px-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-[#cf292c]" />
              Comprendre les statuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">En attente</p>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">En cours de vérification</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Validée</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Justification acceptée</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">Refusée</p>
                  <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Non justifiée</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Corrigée</p>
                  <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">Erreur admin corrigée</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
