import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { 
  Wallet, Calculator, TrendingUp as TrendUp, Clock, Calendar, 
  Euro, Users as UsersIcon, FileText, BarChart3, PieChart as PieChartIcon,
  Sparkles, Rocket, Construction, Banknote, Receipt, CreditCard,
  Trophy, Medal, Award, Crown, Star, AlertTriangle, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Eye, ArrowUpRight, ArrowDownRight, Zap, Target, Users2, Activity
} from 'lucide-react';
import { 
  HiUsers, 
  HiClock, 
  HiCalendar, 
  HiChartPie, 
  HiDocumentReport, 
  HiTrendingUp,
  HiTrendingDown,
  HiExclamationCircle,
  HiCheckCircle,
  HiStar,
  HiLightningBolt,
  HiShieldExclamation,
  HiArrowsExpand,
  HiAcademicCap,
  HiChartBar,
  HiDownload,
  HiPrinter,
  HiRefresh,
  HiUserAdd,
  HiUserRemove,
  HiArrowUp,
  HiArrowDown,
} from "react-icons/hi";
import axios from "axios";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import { saveNavigation, restoreNavigation, getSessionDuration } from "../utils/navigationUtils";
import { API_BASE } from '../config/api';

// Composant pour les cartes statistiques - Style Dashboard
const StatCard = ({ icon, label, value, color = "text-[#cf292c]", bgColor = "bg-gray-50", alert, trend }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
        <span className={`${color} text-lg`}>{icon}</span>
      </div>
      {alert && (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          alert === 'critical' ? 'bg-red-100 text-red-600' :
          alert === 'warning' ? 'bg-amber-100 text-amber-600' :
          'bg-emerald-100 text-emerald-600'
        }`}>
          {alert === 'critical' ? 'Critique' : alert === 'warning' ? 'Attention' : 'OK'}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            trend > 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {trend > 0 ? <HiTrendingUp size={12} /> : <HiTrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  </div>
);

// Composant pour les sections de graphiques - Style Dashboard
const ChartSection = ({ title, icon, children, badge }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      {badge && (
        <span className="text-xs text-gray-400">{badge}</span>
      )}
    </div>
    {children}
  </div>
);

const StatsRH = ({ embedded = false }) => {
  // Restaurer la période sauvegardée
  const getInitialPeriode = () => {
    const restored = restoreNavigation('statsRH');
    return restored.periode || 'mois';
  };

  const [stats, setStats] = useState(null);
  const [periode, setPeriode] = useState(getInitialPeriode());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour la notification de restauration
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [restoreNotificationData, setRestoreNotificationData] = useState(null);

  // État pour le modal de détails employé
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // État pour les onglets et filtres
  const [activeTab, setActiveTab] = useState('synthese'); // synthese, absenteisme, masse, turnover
  const [serviceFilter, setServiceFilter] = useState('tous'); // tous, cuisine, salle, bar, encadrement

  // Vérifier si la position a été restaurée (seulement au premier rendu)
  useEffect(() => {
    const checkNavigationRestore = () => {
      const restored = restoreNavigation('statsRH');
      
      // Si la période restaurée est différente de la période par défaut et qu'il y a une dernière visite
      if (restored.wasRestored && restored.periode !== 'mois' && restored.lastVisit) {
        const sessionDuration = getSessionDuration(restored.lastVisit);
        
        // Afficher la notification si la session est récente (moins de 7 jours)
        if (sessionDuration && sessionDuration < 10080) { // 7 jours en minutes
          setRestoreNotificationData({
            date: new Date().toISOString(),
            viewType: `statistiques ${restored.periode}`,
            sessionDuration
          });
          setShowRestoreNotification(true);
        }
      }
    };

    checkNavigationRestore();
  }, []); // Exécuter seulement au montage

  // Sauvegarde automatique de la période
  useEffect(() => {
    saveNavigation('statsRH', { periode });
  }, [periode]);

  // Récupération des données depuis l'API
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Token d'authentification manquant");
        }

        const response = await axios.get(`${API_BASE}/admin/stats?periode=${periode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setStats(response.data);
      } catch (err) {
        console.error("Erreur lors du chargement des statistiques:", err);
        setError("Impossible de charger les statistiques");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [periode]);

  // 📊 Sécurisation et calcul de toutes les données dérivées avec useMemo
  const repartitionConges = useMemo(() => {
    return Array.isArray(stats?.repartitionConges) ? stats.repartitionConges : [];
  }, [stats]);

  const statutsDemandes = useMemo(() => {
    return Array.isArray(stats?.statutsDemandes) ? stats.statutsDemandes : [];
  }, [stats]);

  // 📊 KPI 1: Taux d'absentéisme (données réelles de l'API)
  const tauxAbsenteisme = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 0, estCritique: false };
    const taux = parseFloat(stats.kpis.tauxAbsenteisme || 0);
    return {
      valeur: taux.toFixed(1),
      estCritique: taux > 10
    };
  }, [stats]);

  // 📊 KPI 2: Durée moyenne de travail par jour (données réelles de l'API)
  const dureeMoyenneTravail = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: "0h00", heures: 0, alerte: false };
    const heuresParJour = parseFloat(stats.kpis.dureeMoyenneJour || 0);
    const heures = Math.floor(heuresParJour);
    const minutes = Math.round((heuresParJour - heures) * 60);
    return {
      valeur: `${heures}h${minutes.toString().padStart(2, '0')}`,
      heures: heuresParJour,
      alerte: heuresParJour < 7
    };
  }, [stats]);

  // 📊 KPI 3: Top 3 employés les plus assidus (données réelles de l'API)
  const topEmployes = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.topEmployes)) {
      return [];
    }
    return stats.kpis.topEmployes;
  }, [stats]);

  // 📊 KPI 4: Employés avec problèmes (données réelles de l'API)
  const employesProblematiques = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.employesProblematiques)) {
      return [];
    }
    return stats.kpis.employesProblematiques;
  }, [stats]);

  // 📊 KPI 5: Évolution du taux de présence hebdomadaire (NOUVEAU - remplace heures sup)
  const evolutionPresenceHebdo = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.evolutionPresenceHebdo)) {
      return [];
    }
    return stats.kpis.evolutionPresenceHebdo;
  }, [stats]);

  // 📊 KPI 6: Taux de retards (données réelles de l'API)
  const tauxRetards = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 0, alerte: false, tendance: 0 };
    const taux = parseFloat(stats.kpis.tauxRetards || 0);
    // Calculer la tendance (simulation basée sur les données actuelles)
    const tendance = taux > 5 ? 1.2 : -0.8;
    return {
      valeur: taux.toFixed(1),
      alerte: taux > 5,
      tendance: tendance
    };
  }, [stats]);

  // 📊 KPI 7: Taux de rotation (Turnover) (données réelles de l'API)
  const tauxRotation = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 0, alerte: false };
    const taux = parseFloat(stats.kpis.tauxRotation || 0);
    return {
      valeur: taux.toFixed(1),
      alerte: taux > 15 // Turnover > 15% considéré comme élevé
    };
  }, [stats]);

  // 📊 KPI 8: Ancienneté moyenne (données réelles de l'API)
  const ancienneteMoyenne = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 0, annees: 0, mois: 0 };
    const annees = parseFloat(stats.kpis.ancienneteMoyenne || 0);
    const anneesEntier = Math.floor(annees);
    const mois = Math.round((annees - anneesEntier) * 12);
    return {
      valeur: mois > 0 ? `${anneesEntier}a ${mois}m` : `${anneesEntier} ans`,
      annees: annees,
      alerte: annees < 1 // Ancienneté < 1 an = turnover élevé potentiel
    };
  }, [stats]);

  // 📊 KPI 9: Taux d'utilisation (données réelles de l'API)
  const tauxUtilisation = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 0, alerte: false, type: 'ok' };
    const taux = parseFloat(stats.kpis.tauxUtilisation || 0);
    return {
      valeur: taux.toFixed(1),
      alerte: taux < 90 || taux > 110, // En dehors de 90-110% = problème
      type: taux < 90 ? 'sous' : taux > 110 ? 'sur' : 'ok'
    };
  }, [stats]);

  // 📊 KPI 10: Taux d'assiduité (heures réelles / heures planifiées)
  // Différent de la ponctualité : un employé en retard qui rattrape = bonne assiduité
  const tauxAssiduite = useMemo(() => {
    if (!stats || !stats.kpis) return { valeur: 100, alerte: false };
    const taux = parseFloat(stats.kpis.tauxAssiduite || 100);
    return {
      valeur: taux.toFixed(1),
      alerte: taux < 95,
      type: taux >= 98 ? 'excellent' : taux >= 95 ? 'bon' : 'attention'
    };
  }, [stats]);

  // 📊 KPI 7: Évolution de l'effectif (données réelles de l'API)
  const evolutionEffectif = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.evolutionEffectif)) {
      return [];
    }
    return stats.kpis.evolutionEffectif;
  }, [stats]);

  // 📊 KPI 11: Répartition par service/catégorie (données réelles de l'API)
  const repartitionParService = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.repartitionParService)) {
      return [];
    }
    return stats.kpis.repartitionParService;
  }, [stats]);

  // 📊 KPI 12: Absences par motif (données réelles de l'API)
  const absencesParMotif = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.absencesParMotif)) {
      return [];
    }
    return stats.kpis.absencesParMotif;
  }, [stats]);

  // 📊 KPI 13: Absences par durée (données réelles de l'API)
  const absencesParDuree = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.absencesParDuree)) {
      return [];
    }
    return stats.kpis.absencesParDuree;
  }, [stats]);

  // 📊 KPI 14: Absentéisme par équipe (données réelles de l'API)
  const absenteismeParEquipe = useMemo(() => {
    if (!stats || !stats.kpis || !Array.isArray(stats.kpis.absenteismeParEquipe)) {
      return [];
    }
    return stats.kpis.absenteismeParEquipe;
  }, [stats]);

  // Couleurs pour les catégories
  const categorieColors = useMemo(() => ({
    // Catégories Employés
    'Pizzaiolo': { bg: 'from-red-50 to-red-100/50', border: 'border-red-200', text: 'text-red-600', bar: 'bg-red-600', barBg: 'bg-red-200' },
    'Pastaiolo': { bg: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', text: 'text-orange-600', bar: 'bg-orange-600', barBg: 'bg-orange-200' },
    'Caisse/Service': { bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', text: 'text-blue-600', bar: 'bg-blue-600', barBg: 'bg-blue-200' },
    'Entretien': { bg: 'from-green-50 to-green-100/50', border: 'border-green-200', text: 'text-green-600', bar: 'bg-green-600', barBg: 'bg-green-200' },
    'Securite': { bg: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', text: 'text-purple-600', bar: 'bg-purple-600', barBg: 'bg-purple-200' },
    'Assistant Direction': { bg: 'from-teal-50 to-teal-100/50', border: 'border-teal-200', text: 'text-teal-600', bar: 'bg-teal-600', barBg: 'bg-teal-200' },
    // Catégories Admins
    'Direction': { bg: 'from-amber-50 to-amber-100/50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-600', barBg: 'bg-amber-200' },
    'RH': { bg: 'from-pink-50 to-pink-100/50', border: 'border-pink-200', text: 'text-pink-600', bar: 'bg-pink-600', barBg: 'bg-pink-200' },
    'Informatique': { bg: 'from-cyan-50 to-cyan-100/50', border: 'border-cyan-200', text: 'text-cyan-600', bar: 'bg-cyan-600', barBg: 'bg-cyan-200' },
    'default': { bg: 'from-slate-50 to-slate-100/50', border: 'border-slate-200', text: 'text-slate-600', bar: 'bg-slate-600', barBg: 'bg-slate-200' }
  }), []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-[#ffd6d6]/50"></div>
        <p className="mt-3 text-[#cf292c]/70 font-medium">Chargement des statistiques...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <div className="text-red-500 text-sm mb-2">{error}</div>
      <button 
        onClick={() => window.location.reload()} 
        className="text-[#cf292c] text-sm underline hover:no-underline"
      >
        Réessayer
      </button>
    </div>
  );

  if (!stats) return (
    <div className="p-6 text-center text-gray-500">
      Aucune donnée statistique disponible
    </div>
  );

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gray-50 p-6 space-y-6"}>
      {/* En-tête - Masqué si embedded */}
      {!embedded && (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 bg-[#cf292c] rounded-lg text-white">
                <HiChartPie size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Statistiques RH</h1>
                <p className="text-xs text-gray-500 mt-0.5">Analyses et indicateurs de performance - Restaurant</p>
              </div>
              {stats.demo && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                  DEMO
                </span>
              )}
            </div>
          </div>
        
        <div className="flex items-center gap-3">
          {/* Sélecteur de période */}
          <div className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-xs font-medium text-gray-600">Période</span>
            <div className="w-px h-4 bg-gray-200"></div>
            <select 
              className="bg-transparent border-none text-xs font-medium text-gray-900 focus:outline-none focus:ring-0 cursor-pointer"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
            >
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois</option>
              <option value="trimestre">Ce trimestre</option>
              <option value="annee">Cette année</option>
            </select>

            {periode !== 'mois' && (
              <button
                onClick={() => {
                  setPeriode('mois');
                  if (showRestoreNotification) {
                    setShowRestoreNotification(false);
                  }
                }}
                className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="Revenir à la période par défaut"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Bouton Export PDF */}
          <button
            onClick={() => {
              // Fonction d'export PDF
              window.print();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#cf292c] text-white rounded-lg hover:bg-[#b82329] transition-colors text-sm font-medium"
            title="Exporter en PDF"
          >
            <HiDownload size={16} />
            <span className="hidden sm:inline">Exporter PDF</span>
          </button>

          {/* Bouton Imprimer */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            title="Imprimer"
          >
            <HiPrinter size={16} />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>
        </div>
      </div>
      )}

      {/* Barre d'outils compacte si embedded */}
      {embedded && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-xs font-medium text-gray-600">Période</span>
            <div className="w-px h-4 bg-gray-200"></div>
            <select 
              className="bg-transparent border-none text-xs font-medium text-gray-900 focus:outline-none focus:ring-0 cursor-pointer"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
            >
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois</option>
              <option value="trimestre">Ce trimestre</option>
              <option value="annee">Cette année</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <HiDownload size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation par onglets - Simple et sobre */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
        <button
          onClick={() => setActiveTab('synthese')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'synthese'
              ? 'bg-[#cf292c] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Synthèse
        </button>
          
        <button
          onClick={() => setActiveTab('absenteisme')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'absenteisme'
              ? 'bg-[#cf292c] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Absentéisme
        </button>
          
        <button
          onClick={() => setActiveTab('turnover')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'turnover'
              ? 'bg-[#cf292c] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Turn-over
        </button>
          
        <button
          onClick={() => setActiveTab('masse')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'masse'
              ? 'bg-[#cf292c] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="hidden sm:inline">Masse Salariale</span>
          <span className="sm:hidden">Masse Sal.</span>
        </button>
      </div>

      {/* ONGLET SYNTHÈSE */}
      {activeTab === 'synthese' && (
        <div className="space-y-4">
          {/* 📊 KPIs Critiques - Style Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card Santé RH */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-gray-700">Santé RH</span>
                </div>
                <span className={`text-lg font-semibold ${
                  parseFloat(tauxAbsenteisme.valeur) < 5 ? 'text-emerald-600' : 
                  parseFloat(tauxAbsenteisme.valeur) < 10 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {(100 - parseFloat(tauxAbsenteisme.valeur)).toFixed(0)}%
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Absentéisme</span>
                  <span className="text-gray-900 font-medium">{tauxAbsenteisme.valeur}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Retards</span>
                  <span className="text-gray-900 font-medium">{tauxRetards.valeur}%</span>
                </div>
              </div>
            </div>

            {/* Card Effectif */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-gray-700">Effectif</span>
                </div>
                <span className="text-lg font-semibold text-gray-800">{stats.employes || 0}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Pointés aujourd'hui</span>
                  <span className="text-emerald-600 font-medium">{stats.pointes || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Taux présence</span>
                  <span className="text-gray-900 font-medium">{tauxUtilisation.valeur}%</span>
                </div>
              </div>
            </div>

            {/* Card Turn-over */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendUp className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-gray-700">Turn-over</span>
                </div>
                <span className={`text-lg font-semibold ${
                  parseFloat(tauxRotation.valeur) < 10 ? 'text-emerald-600' : 
                  parseFloat(tauxRotation.valeur) < 20 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {tauxRotation.valeur}%
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-500">Entrées</span>
                  </div>
                  <span className="text-emerald-600 font-medium">
                    {evolutionEffectif.reduce((acc, curr) => acc + curr.entrees, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <span className="text-gray-500">Sorties</span>
                  </div>
                  <span className="text-red-600 font-medium">
                    {evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Assiduité */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-gray-700">Assiduité</span>
                </div>
                <span className={`text-lg font-semibold ${
                  tauxAssiduite.type === 'excellent' ? 'text-emerald-600' : 
                  tauxAssiduite.type === 'bon' ? 'text-gray-800' : 'text-amber-600'
                }`}>
                  {tauxAssiduite.valeur}%
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Temps moy./jour</span>
                  <span className="text-gray-900 font-medium">{dureeMoyenneTravail.valeur}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Ancienneté moy.</span>
                  <span className="text-gray-900 font-medium">{ancienneteMoyenne.valeur}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 Performance Employés - Style Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Top Performers */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-gray-700">Top Performers</span>
                </div>
                <span className="text-xs text-gray-400">{topEmployes.length} employés</span>
              </div>
              
              {topEmployes.length > 0 ? (
                <div className="space-y-2">
                  {topEmployes.map((emp, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                          index === 0 ? 'bg-[#cf292c] text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{emp.nom}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{emp.presence}%</span>
                        <span className="font-semibold text-gray-900">{emp.score} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-gray-400">
                  Pas assez de données
                </div>
              )}
            </div>

            {/* Alertes Performance */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {employesProblematiques.length > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Alertes</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  employesProblematiques.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {employesProblematiques.length > 0 ? `${employesProblematiques.length} signalements` : 'RAS'}
                </span>
              </div>
              
              {employesProblematiques.length > 0 ? (
                <div className="space-y-2">
                  {employesProblematiques.slice(0, 4).map((emp, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${emp.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <span className="text-gray-700">{emp.nom}</span>
                      </div>
                      <span className="text-gray-400">{emp.absences} abs. • {emp.retards} ret.</span>
                    </div>
                  ))}
                  {employesProblematiques.length > 4 && (
                    <button className="text-xs text-gray-400 hover:text-gray-600">
                      +{employesProblematiques.length - 4} autres →
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aucun problème détecté</span>
                </div>
              )}
            </div>
          </div>

      {/* 📈 Tendances - Style Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graphique Évolution effectif */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-gray-700">Évolution effectif</span>
            </div>
            <span className="text-xs text-gray-400">{periode === 'annee' ? '12 derniers mois' : periode === 'trimestre' ? '6 derniers mois' : '5 derniers mois'}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolutionEffectif} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mois" 
                axisLine={false} 
                tickLine={false}
                style={{ fontSize: '10px', fill: '#94a3b8' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                style={{ fontSize: '10px', fill: '#94a3b8' }}
                width={25}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '8px',
                  fontSize: '11px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="effectif" 
                stroke="#cf292c" 
                strokeWidth={2} 
                name="Effectif"
                dot={{ stroke: '#cf292c', strokeWidth: 1.5, r: 3, fill: 'white' }}
              />
              <Line 
                type="monotone" 
                dataKey="entrees" 
                stroke="#10b981" 
                strokeWidth={1.5} 
                name="Entrées"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="sorties" 
                stroke="#ef4444" 
                strokeWidth={1.5} 
                name="Sorties"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique Répartition congés */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-gray-700">Répartition congés</span>
            </div>
            <span className="text-xs text-gray-400">
              {repartitionConges.length > 0 
                ? `${repartitionConges.reduce((a, c) => a + (Number(c.value) || 0), 0)} total`
                : ''}
            </span>
          </div>
          {repartitionConges.length > 0 && repartitionConges.some(c => Number(c.value) > 0) ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={repartitionConges}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {repartitionConges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#cf292c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'][index % 9]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} jours`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto">
                {repartitionConges.filter(c => Number(c.value) > 0).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ['#cf292c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'][index % 9] }}></div>
                      <span className="text-gray-600 truncate">{item.name || 'N/A'}</span>
                    </div>
                    <span className="font-medium text-gray-900 ml-2">{Number(item.value) || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-xs text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>
        </div>
      )}

      {/* ONGLET ABSENTÉISME */}
      {activeTab === 'absenteisme' && (
        <div className="space-y-5">
          {/* KPIs Absentéisme - Style Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              icon={<HiShieldExclamation />} 
              label="Taux d'absentéisme" 
              value={`${tauxAbsenteisme.valeur}%`}
              color={tauxAbsenteisme.estCritique ? "text-red-600" : "text-green-600"}
              bgColor={tauxAbsenteisme.estCritique ? "bg-red-50" : "bg-green-50"}
              alert={tauxAbsenteisme.estCritique ? "critical" : "ok"}
            />
            <StatCard 
              icon={<HiUsers />} 
              label="Effectif moyen" 
              value={(stats.employes || 0).toFixed(1)}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard 
              icon={<HiCalendar />} 
              label="Durée moyenne abs." 
              value={stats.kpis?.totalAbsences > 0 
                ? `${(stats.kpis?.totalJoursAbsence / stats.kpis?.totalAbsences).toFixed(1)}j`
                : '-'}
              color="text-gray-700"
              bgColor="bg-gray-50"
            />
            <StatCard 
              icon={<HiChartBar />} 
              label="Nombre total abs." 
              value={stats.kpis?.totalAbsences || 0}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
          </div>

          {/* Graphiques Absentéisme */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSection 
              title="Absences par motif" 
              icon={<HiChartBar size={14} />}
            >
              {absencesParMotif.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={absencesParMotif} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="motif" type="category" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value) => [`${value} jour(s)`, 'Durée']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Bar dataKey="jours" fill="#cf292c" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <HiCheckCircle className="mx-auto mb-2 text-emerald-400" size={32} />
                    <p className="text-xs text-gray-500">Aucune absence sur la période</p>
                  </div>
                </div>
              )}
            </ChartSection>

            <ChartSection 
              title="Absences par durée" 
              icon={<HiCalendar size={14} />}
            >
              {absencesParDuree.some(d => d.count > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={absencesParDuree} margin={{ top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="duree" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value) => [`${value} absence(s)`, 'Nombre']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <HiCheckCircle className="mx-auto mb-2 text-emerald-400" size={32} />
                    <p className="text-xs text-gray-500">Aucune absence sur la période</p>
                  </div>
                </div>
              )}
            </ChartSection>
          </div>

          {/* Taux de présence par équipe */}
          <ChartSection 
            title="Taux de présence par équipe" 
            icon={<HiUsers size={14} />}
          >
            {absenteismeParEquipe.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={absenteismeParEquipe} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="equipe" type="category" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}%`, 
                        name === 'tauxPresence' ? 'Présence' : 'Absence'
                      ]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="tauxPresence" name="Présence" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="tauxAbsence" name="Absence" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg">
                <div className="text-center">
                  <HiUsers className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-xs text-gray-500">Données insuffisantes</p>
                </div>
              </div>
            )}
          </ChartSection>
        </div>
      )}

      {/* ONGLET TURN-OVER */}
      {activeTab === 'turnover' && (
        <div className="space-y-5">
          {/* KPIs Turn-over - Style Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              icon={<HiRefresh />} 
              label="Taux de rotation" 
              value={`${tauxRotation.valeur}%`}
              color={tauxRotation.alerte ? "text-orange-600" : "text-green-600"}
              bgColor={tauxRotation.alerte ? "bg-orange-50" : "bg-green-50"}
              alert={tauxRotation.alerte ? "warning" : "ok"}
            />
            <StatCard 
              icon={<HiUserAdd />} 
              label="Entrées (période)" 
              value={evolutionEffectif.reduce((acc, curr) => acc + curr.entrees, 0)}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatCard 
              icon={<HiUserRemove />} 
              label="Sorties (période)" 
              value={evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0)}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatCard 
              icon={<HiClock />} 
              label="Ancienneté moyenne" 
              value={ancienneteMoyenne.valeur}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
          </div>

          {/* Graphique Évolution Effectif - Style Dashboard */}
          <ChartSection title={`Évolution de l'effectif sur ${periode === 'annee' ? '12' : periode === 'trimestre' ? '6' : '5'} mois`} icon={<HiUsers size={14} />}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionEffectif} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} width={25} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    fontSize: '11px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="effectif" 
                  stroke="#cf292c" 
                  strokeWidth={2}
                  dot={{ stroke: '#cf292c', strokeWidth: 1.5, r: 3, fill: 'white' }}
                  name="Effectif"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>
        </div>
      )}

      {/* ONGLET MASSE SALARIALE */}
      {activeTab === 'masse' && (
        <div className="space-y-5">
          {/* Card principale - Style Dashboard */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#cf292c]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#cf292c]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Masse Salariale</h3>
                <p className="text-xs text-gray-500">Module financier</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 mb-5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600">
                Les indicateurs financiers détaillés seront disponibles dans une prochaine mise à jour.
              </p>
            </div>

            {/* Fonctionnalités à venir */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Euro, label: 'Salaires bruts' },
                { icon: Calculator, label: 'Charges sociales' },
                { icon: Clock, label: 'Heures sup.' },
                { icon: Receipt, label: 'Primes & bonus' },
                { icon: TrendUp, label: 'Évolution' },
                { icon: PieChartIcon, label: 'Répartition' },
                { icon: FileText, label: 'Rapports' },
                { icon: Banknote, label: 'Prévisionnel' },
              ].map((item, i) => {
                const IconComp = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <IconComp className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Badge */}
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#cf292c]/10 text-[#cf292c] rounded-lg text-xs font-medium">
                <Rocket className="w-3.5 h-3.5" />
                Prévu pour la V2
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notification de restauration de navigation */}
      {showRestoreNotification && restoreNotificationData && (
        <NavigationRestoreNotification
          show={showRestoreNotification}
          onDismiss={() => setShowRestoreNotification(false)}
          restoredDate={restoreNotificationData.date}
          restoredViewType={restoreNotificationData.viewType}
          sessionDuration={restoreNotificationData.sessionDuration}
        />
      )}

      {/* Modal de détails employé */}
      {selectedEmployee && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEmployee(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                  selectedEmployee.type === 'critical' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  <span className="text-2xl">{selectedEmployee.type === 'critical' ? '!' : '⚠'}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedEmployee.nom}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                    selectedEmployee.type === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedEmployee.type === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Statistiques */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">📊 Statistiques</h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">📅 Absences</span>
                  <span className="text-lg font-semibold text-gray-900">{selectedEmployee.absences}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">⏰ Retards</span>
                  <span className="text-lg font-semibold text-gray-900">{selectedEmployee.retards}</span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total incidents</span>
                    <span className="text-xl font-bold text-[#cf292c]">
                      {selectedEmployee.absences + selectedEmployee.retards}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div className={`rounded-lg p-4 ${
                selectedEmployee.type === 'critical' 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Recommandation</h4>
                <p className="text-sm text-gray-700">
                  {selectedEmployee.type === 'critical' 
                    ? '🔴 Situation critique : Un entretien urgent avec le manager est recommandé pour comprendre les causes et mettre en place un plan d\'action.'
                    : '🟠 Attention requise : Un suivi rapproché est conseillé. Envisager un entretien informel pour identifier d\'éventuelles difficultés.'
                  }
                </p>
              </div>

              {/* Seuils d'alerte */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">ℹ️ Seuils d'alerte</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• ⚠️ Attention : ≥ 5 absences OU ≥ 10 retards</li>
                  <li>• 🔴 Critique : ≥ 8 absences OU ≥ 12 retards</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Fermer
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[#cf292c] text-white rounded-lg hover:bg-[#b82329] transition-colors font-medium text-sm"
                onClick={() => {
                  alert('Fonctionnalité "Voir le profil" à venir...');
                }}
              >
                Voir le profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsRH;
