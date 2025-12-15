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
  Sparkles, Rocket, Construction, Banknote, Receipt, CreditCard
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

// Composant pour les cartes statistiques avec badge d'alerte
const StatCard = ({ icon, label, value, color = "text-[#cf292c]", bgColor = "bg-gray-50", alert, trend }) => (
  <div className="group relative bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200">
    {/* Barre indicatrice de statut */}
    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-lg ${
      alert === 'critical' ? 'bg-red-500' :
      alert === 'warning' ? 'bg-amber-500' :
      alert === 'ok' ? 'bg-green-500' :
      'bg-gray-300'
    }`}></div>
    
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend > 0 ? <HiTrendingUp size={12} /> : <HiTrendingDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {alert && (
          <div className="mt-2">
            <span className={`text-xs font-medium ${
              alert === 'critical' ? 'text-red-600' :
              alert === 'warning' ? 'text-amber-600' :
              'text-green-600'
            }`}>
              {alert === 'critical' ? '● Critique' : 
               alert === 'warning' ? '● Attention' : 
               '● Normal'}
            </span>
          </div>
        )}
      </div>
      <div className={`${bgColor} ${color} p-3 rounded-lg text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

// Composant pour les sections de graphiques
const ChartSection = ({ title, icon, children, badge }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-700">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {badge && (
        <span className="text-xs text-gray-500">
          {badge}
        </span>
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

        const response = await axios.get(`http://localhost:5000/admin/stats?periode=${periode}`, {
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
        <div className="space-y-6">
          {/* 📊 KPIs Critiques - Vue Globale */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KPI 1: Santé RH Globale */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <HiCheckCircle className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Santé RH</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(100 - parseFloat(tauxAbsenteisme.valeur)).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  parseFloat(tauxAbsenteisme.valeur) < 5 
                    ? 'bg-green-100 text-green-700' 
                    : parseFloat(tauxAbsenteisme.valeur) < 10 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {parseFloat(tauxAbsenteisme.valeur) < 5 ? 'Excellent' : 
                   parseFloat(tauxAbsenteisme.valeur) < 10 ? 'Correct' : 'Critique'}
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Absentéisme</span>
                  <span className="font-semibold text-gray-900">{tauxAbsenteisme.valeur}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retards</span>
                  <span className="font-semibold text-gray-900">{tauxRetards.valeur}%</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Effectif & Présence */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <HiUsers className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Effectif</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.employes || 0}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Pointés aujourd'hui</p>
                  <p className="text-lg font-semibold text-green-600">
                    {stats.pointes || 0}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux d'utilisation</span>
                  <span className={`font-semibold ${parseFloat(tauxUtilisation.valeur) >= 90 ? 'text-green-600' : parseFloat(tauxUtilisation.valeur) >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {tauxUtilisation.valeur}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ancienneté moy.</span>
                  <span className="font-semibold text-gray-900">{ancienneteMoyenne.valeur}</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Stabilité & Rotation */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <HiRefresh className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Turn-over</p>
                    <p className="text-2xl font-bold text-gray-900">{tauxRotation.valeur}%</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  parseFloat(tauxRotation.valeur) < 10 
                    ? 'bg-green-100 text-green-700' 
                    : parseFloat(tauxRotation.valeur) < 20 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {parseFloat(tauxRotation.valeur) < 10 ? 'Stable' : 
                   parseFloat(tauxRotation.valeur) < 20 ? 'Modéré' : 'Élevé'}
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrées</span>
                  <span className="font-semibold text-green-600">
                    {evolutionEffectif.reduce((acc, curr) => acc + curr.entrees, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sorties</span>
                  <span className="font-semibold text-red-600">
                    {evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 📊 Répartition par Catégorie (données réelles) */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Répartition par Catégorie</h3>
              <span className="text-xs text-gray-500">{stats.employes || 0} employés actifs</span>
            </div>
            
            {repartitionParService.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {repartitionParService.slice(0, 8).map((item, index) => {
                  const colors = categorieColors[item.categorie] || categorieColors['default'];
                  const displayName = item.categorie
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                  
                  return (
                    <div key={index} className={`relative p-4 bg-gradient-to-br ${colors.bg} rounded-lg border ${colors.border}`}>
                      <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                        {item.count}
                      </div>
                      <div className="text-xs text-gray-700 font-medium mb-2 truncate" title={displayName}>
                        {displayName}
                      </div>
                      <div className={`w-full ${colors.barBg} rounded-full h-1.5`}>
                        <div className={`${colors.bar} h-1.5 rounded-full`} style={{ width: `${item.pourcentage}%` }}></div>
                      </div>
                      <div className={`text-xs ${colors.text} font-medium mt-1`}>{item.pourcentage}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Aucune donnée de répartition disponible
              </div>
            )}
          </div>

          {/* 📊 Indicateurs de Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg mb-2">
                <HiClock className="text-blue-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{dureeMoyenneTravail.valeur}</div>
              <div className="text-xs text-gray-500 mt-1">Temps moyen / jour</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg mb-2">
                <HiCheckCircle className="text-green-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(100 - parseFloat(tauxRetards.valeur)).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Ponctualité</div>
              <div className="text-[10px] text-gray-400">Respect horaires arrivée</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-50 rounded-lg mb-2">
                <HiTrendingUp className="text-teal-600" size={20} />
              </div>
              <div className={`text-2xl font-bold ${
                tauxAssiduite.type === 'excellent' ? 'text-green-600' : 
                tauxAssiduite.type === 'bon' ? 'text-teal-600' : 'text-orange-600'
              }`}>
                {tauxAssiduite.valeur}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Assiduité</div>
              <div className="text-[10px] text-gray-400">Heures faites / planifiées</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg mb-2">
                <HiChartBar className="text-purple-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{tauxUtilisation.valeur}%</div>
              <div className="text-xs text-gray-500 mt-1">Taux d'utilisation</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg mb-2">
                <HiStar className="text-amber-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{topEmployes.length}</div>
              <div className="text-xs text-gray-500 mt-1">Top Performers</div>
            </div>
          </div>

          {/* 🎯 Performance Employés */}
          <div>
        {/* Titre de section sobre */}
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
          <h2 className="text-base font-semibold text-gray-900">Performance Équipe</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 3 Performers */}
          <ChartSection 
            title="Top Performers" 
            icon={<HiStar size={14} />}
            badge={`${topEmployes.length} employés`}
          >
            <div className="space-y-2">
              {topEmployes.map((emp, index) => (
                <div 
                  key={index}
                  className="relative flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border-2 border-gray-300 text-gray-700 font-semibold text-xs">
                      {index + 1}
                      {index === 0 && <span className="ml-0.5 text-xs">🏆</span>}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{emp.nom}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-green-600">
                          {emp.presence}%
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-blue-600">
                          {emp.ponctualite}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {emp.score}
                    </p>
                    <p className="text-xs text-gray-500">score</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartSection>

          {/* Alertes Performance */}
          <ChartSection 
            title="Alertes Performance" 
            icon={<HiExclamationCircle size={14} />}
            badge={employesProblematiques.length > 0 ? `${employesProblematiques.length} signalements` : "Aucune alerte"}
          >
            <div className="space-y-2">
              {employesProblematiques.length > 0 ? (
                employesProblematiques.map((emp, index) => (
                  <div 
                    key={index}
                    className={`relative flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-all ${
                      emp.type === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      emp.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                    }`}></div>
                    
                    <div className="flex items-center gap-2.5 ml-2">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                        emp.type === 'critical' 
                          ? 'bg-white text-red-600' 
                          : 'bg-white text-amber-600'
                      }`}>
                        <span className="text-sm font-bold">{emp.type === 'critical' ? '!' : '⚠'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{emp.nom}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-600">
                            {emp.absences} abs.
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-600">
                            {emp.retards} ret.
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedEmployee(emp)}
                      className="px-2.5 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-all"
                    >
                      Voir
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-2">
                    <HiCheckCircle className="text-green-500" size={24} />
                  </div>
                  <p className="font-medium text-gray-900 text-sm mb-0.5">Tout va bien</p>
                  <p className="text-xs text-gray-500">Aucun problème détecté</p>
                </div>
              )}
            </div>
          </ChartSection>
        </div>
      </div>

      {/* 📈 Tendances - Version compacte */}
      <div>
        {/* Titre de section sobre */}
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
          <h2 className="text-base font-semibold text-gray-900">Tendances</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Vue rapide</span>
        </div>
        
        {/* Graphiques côte à côte - Version compacte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Graphique Évolution effectif - Compact */}
          <ChartSection 
            title="Évolution de l'effectif" 
            icon={<HiUsers size={14} />} 
            badge={`${evolutionEffectif.reduce((acc, curr) => acc + curr.entrees, 0)} entrées · ${evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0)} sorties`}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolutionEffectif} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mois" 
                  axisLine={false} 
                  tickLine={false}
                  style={{ fontSize: '11px', fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  style={{ fontSize: '11px', fill: '#6B7280' }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    padding: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="entrees" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  name="Entrées"
                  dot={{ stroke: '#10B981', strokeWidth: 1.5, r: 3, fill: 'white' }}
                  activeDot={{ r: 5, fill: '#10B981' }}
                  animationDuration={1200}
                />
                <Line 
                  type="monotone" 
                  dataKey="sorties" 
                  stroke="#EF4444" 
                  strokeWidth={2} 
                  name="Sorties"
                  dot={{ stroke: '#EF4444', strokeWidth: 1.5, r: 3, fill: 'white' }}
                  activeDot={{ r: 5, fill: '#EF4444' }}
                  animationDuration={1200}
                />
                <Line 
                  type="monotone" 
                  dataKey="effectif" 
                  stroke="#cf292c" 
                  strokeWidth={2.5} 
                  name="Effectif"
                  dot={{ stroke: '#cf292c', strokeWidth: 1.5, r: 4, fill: 'white' }}
                  activeDot={{ r: 6, fill: '#cf292c' }}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Turnover</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(() => {
                    const effectifDebut = evolutionEffectif.length > 0 ? evolutionEffectif[0].effectif : stats.employes;
                    const effectifFin = evolutionEffectif.length > 0 ? evolutionEffectif[evolutionEffectif.length - 1].effectif : stats.employes;
                    const effectifMoyen = (effectifDebut + effectifFin) / 2;
                    const sorties = evolutionEffectif.reduce((acc, curr) => acc + curr.sorties, 0);
                    return effectifMoyen > 0 ? ((sorties / effectifMoyen) * 100).toFixed(1) : 0;
                  })()}%
                </p>
              </div>
              <div className="text-center border-l border-gray-200">
                <p className="text-xs text-gray-500">Variation</p>
                <p className={`text-lg font-semibold ${
                  evolutionEffectif.length > 0 && 
                  evolutionEffectif[evolutionEffectif.length - 1].effectif > evolutionEffectif[0].effectif
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {evolutionEffectif.length > 0 
                    ? (evolutionEffectif[evolutionEffectif.length - 1].effectif > evolutionEffectif[0].effectif ? '+' : '')
                    : ''}
                  {evolutionEffectif.length > 0 
                    ? evolutionEffectif[evolutionEffectif.length - 1].effectif - evolutionEffectif[0].effectif
                    : 0}
                </p>
              </div>
            </div>
          </ChartSection>

          {/* Graphique Assiduité - Compact */}
          <ChartSection 
            title="Assiduité hebdomadaire" 
            icon={<HiCheckCircle size={14} />}
            badge={`Moy. ${evolutionPresenceHebdo.length > 0 ? (evolutionPresenceHebdo.reduce((acc, curr) => acc + curr.taux, 0) / evolutionPresenceHebdo.length).toFixed(1) : 0}%`}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={evolutionPresenceHebdo} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="semaine" 
                  axisLine={false} 
                  tickLine={false} 
                  style={{ fontSize: '11px', fill: '#6B7280' }} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  style={{ fontSize: '11px', fill: '#6B7280' }}
                  width={30}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Présence']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    padding: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="taux" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPresence)"
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Meilleur</p>
                <p className="text-lg font-semibold text-green-600">
                  {evolutionPresenceHebdo.length > 0 
                    ? Math.max(...evolutionPresenceHebdo.map(s => s.taux))
                    : 0}%
                </p>
              </div>
              <div className="text-center border-l border-gray-200">
                <p className="text-xs text-gray-500">Plus faible</p>
                <p className="text-lg font-semibold text-amber-600">
                  {evolutionPresenceHebdo.length > 0 
                    ? Math.min(...evolutionPresenceHebdo.map(s => s.taux))
                    : 0}%
                </p>
              </div>
            </div>
          </ChartSection>
        </div>
      </div>
    </div>
      )}

      {/* ONGLET ABSENTÉISME */}
      {activeTab === 'absenteisme' && (
        <div className="space-y-6">
          {/* KPIs Absentéisme */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
              <h2 className="text-base font-semibold text-gray-900">Indicateurs d'Absentéisme</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                value="2.3j"
                color="text-gray-700"
                bgColor="bg-gray-50"
              />
              <StatCard 
                icon={<HiChartBar />} 
                label="Nombre total abs." 
                value={stats.absences || 0}
                color="text-purple-600"
                bgColor="bg-purple-50"
              />
            </div>
          </div>

          {/* Graphiques Absentéisme - Données réelles */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
              <h2 className="text-base font-semibold text-gray-900">Analyses Détaillées</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartSection 
                title="Absences par motif" 
                icon={<HiChartBar size={14} />}
              >
                {absencesParMotif.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={absencesParMotif} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="motif" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => [`${value} jour(s)`, 'Durée']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="jours" fill="#cf292c" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <HiCheckCircle className="mx-auto mb-3 text-green-400" size={48} />
                      <p className="text-sm text-gray-500">Aucune absence sur la période</p>
                    </div>
                  </div>
                )}
              </ChartSection>

              <ChartSection 
                title="Absences par durée" 
                icon={<HiCalendar size={14} />}
              >
                {absencesParDuree.some(d => d.count > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={absencesParDuree} margin={{ top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="duree" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => [`${value} absence(s)`, 'Nombre']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <HiCheckCircle className="mx-auto mb-3 text-green-400" size={48} />
                      <p className="text-sm text-gray-500">Aucune absence sur la période</p>
                    </div>
                  </div>
                )}
              </ChartSection>
            </div>

            <ChartSection 
              title="Taux de présence par équipe" 
              icon={<HiUsers size={14} />}
            >
              {absenteismeParEquipe.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={absenteismeParEquipe} layout="vertical" margin={{ left: 30, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="equipe" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}%`, 
                          name === 'tauxPresence' ? 'Présence' : 'Absence'
                        ]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Bar dataKey="tauxPresence" name="Présence" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="tauxAbsence" name="Absence" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <HiUsers className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="text-sm text-gray-500">Données insuffisantes</p>
                  </div>
                </div>
              )}
            </ChartSection>
          </div>
        </div>
      )}

      {/* ONGLET TURN-OVER */}
      {activeTab === 'turnover' && (
        <div className="space-y-6">
          {/* KPIs Turn-over */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
              <h2 className="text-base font-semibold text-gray-900">Indicateurs de Rotation</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Graphique Évolution Effectif */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#cf292c] rounded"></div>
              <h2 className="text-base font-semibold text-gray-900">Évolution de l'Effectif</h2>
            </div>
            
            <ChartSection title="Évolution de l'effectif sur 6 mois" icon={<HiUsers size={14} />}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolutionEffectif} margin={{ top: 20, right: 40, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '10px', 
                      boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.1)',
                      border: 'none',
                      padding: '10px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="effectif" 
                    stroke="#cf292c" 
                    strokeWidth={2.5}
                    dot={{ fill: '#cf292c', r: 4 }}
                    animationDuration={1500}
                    name="Effectif"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </div>
        </div>
      )}

      {/* ONGLET MASSE SALARIALE */}
      {activeTab === 'masse' && (
        <div className="space-y-6">
          {/* Card principale */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header sobre */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#cf292c]/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#cf292c]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Masse Salariale</h3>
                  <p className="text-sm text-gray-500">Module financier · Version 2.0</p>
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Les indicateurs financiers détaillés (salaires, charges, heures supplémentaires) 
                    seront disponibles dans une prochaine mise à jour.
                  </p>
                </div>
              </div>

              {/* Fonctionnalités à venir - grille sobre */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <IconComp className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Badge */}
              <div className="mt-6 flex justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#cf292c]/10 text-[#cf292c] rounded-lg text-sm font-medium">
                  <Rocket className="w-4 h-4" />
                  Prévu pour la V2
                </span>
              </div>
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
