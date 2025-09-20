import { useEffect, useState } from "react";
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
} from "recharts";
import { HiUsers, HiClock, HiCalendar, HiChartPie, HiDocumentReport, HiTrendingUp } from "react-icons/hi";
import axios from "axios";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import { saveNavigation, restoreNavigation, getSessionDuration } from "../utils/navigationUtils";

// Composant pour les cartes statistiques
const StatCard = ({ icon, label, value, color = "text-[#cf292c]", bgColor = "bg-[#ffd6d6]/20" }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-50 p-4 flex items-center gap-4">
    <div className={`${bgColor} ${color} p-3 rounded-md text-xl`}>{icon}</div>
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  </div>
);

// Composant pour les sections de graphiques
const ChartSection = ({ title, icon, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-50 p-5">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <div className="flex items-center justify-center w-7 h-7 bg-[#ffd6d6]/20 rounded-md text-[#cf292c]">
        {icon}
      </div>
      <h2 className="text-lg font-medium text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const StatsRH = () => {
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

  // Sécurisation des données pour éviter les erreurs
  const repartitionConges = Array.isArray(stats.repartitionConges) ? stats.repartitionConges : [];
  const statutsDemandes = Array.isArray(stats.statutsDemandes) ? stats.statutsDemandes : [];
  const evolutionPresence = Array.isArray(stats.evolutionPresence) ? stats.evolutionPresence : [];

  return (
    <div className="p-6 space-y-8">
      {/* En-tête avec sélecteur de période */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 bg-[#ffd6d6]/20 rounded-md text-[#cf292c] shadow-sm">
            <HiChartPie size={18} />
          </span>
          Tableau de bord RH
          {stats.demo && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
              DEMO
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Période :</span>
          <select 
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#cf292c] focus:border-[#cf292c]"
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
                // Nettoyer la notification si elle est affichée
                if (showRestoreNotification) {
                  setShowRestoreNotification(false);
                }
              }}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition"
              title="Revenir à la période par défaut"
            >
              Par défaut
            </button>
          )}
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<HiUsers />} 
          label="Employés" 
          value={stats.employes || 0} 
        />
        <StatCard 
          icon={<HiClock />} 
          label="Demandes en attente" 
          value={stats.demandesAttente || 0} 
          color="text-amber-500"
          bgColor="bg-amber-50"
        />
        <StatCard 
          icon={<HiCalendar />} 
          label="Congés ce mois" 
          value={stats.congesCeMois || 0} 
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard 
          icon={<HiTrendingUp />} 
          label="Temps de présence" 
          value={stats.tempsPresence || "0h00"} 
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition des congés */}
        <ChartSection title="Répartition des congés par type" icon={<HiDocumentReport size={16} />}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={repartitionConges} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <XAxis dataKey="type" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0' 
                }} 
              />
              <Bar 
                dataKey="jours" 
                fill="#cf292c" 
                radius={[4, 4, 0, 0]} 
                barSize={30} 
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* Statuts des demandes */}
        <ChartSection title="Statuts des demandes" icon={<HiChartPie size={16} />}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statutsDemandes}
                dataKey="value"
                nameKey="statut"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={60}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                animationDuration={1500}
              >
                {statutsDemandes.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || ["#cf292c", "#FBBF24", "#10B981"][index % 3]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} demandes`, '']}
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0' 
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* Évolution du taux de présence */}
        <ChartSection title="Évolution du taux de présence" icon={<HiTrendingUp size={16} />}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolutionPresence} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Taux de présence']}
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0' 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="taux" 
                stroke="#cf292c" 
                strokeWidth={2} 
                dot={{ stroke: '#cf292c', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, fill: '#cf292c' }}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>

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
    </div>
  );
};

export default StatsRH;
