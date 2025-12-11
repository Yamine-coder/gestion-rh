// client/src/components/anomalies/AnomaliesDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, 
  CheckCircle, XCircle, Users, Calendar, DollarSign,
  BarChart3, PieChart, Activity
} from 'lucide-react';

/**
 * DASHBOARD ANALYTICS POUR LES ANOMALIES
 * Inspiré de Workday Analytics et SAP SuccessFactors
 * 
 * Fonctionnalités:
 * - KPIs temps réel
 * - Graphiques de tendances
 * - Comparaisons périodes
 * - Top employés problématiques
 * - Coûts associés
 * - Prédictions (ML basique)
 */

export default function AnomaliesDashboard({ periode = 'mois', departement = 'all' }) {
  const [kpis, setKpis] = useState(null);
  const [tendances, setTendances] = useState([]);
  const [topEmployes, setTopEmployes] = useState([]);
  const [couts, setCouts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [periode, departement]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/anomalies/analytics?periode=${periode}&dept=${departement}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setKpis(data.kpis);
        setTendances(data.tendances);
        setTopEmployes(data.topEmployes);
        setCouts(data.couts);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📊 Analytics Anomalies</h2>
        <div className="flex gap-2">
          <select
            value={periode}
            onChange={(e) => loadDashboardData()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="jour">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Taux de ponctualité"
          value={`${kpis?.tauxPonctualite || 0}%`}
          evolution={kpis?.tauxPonctualiteEvolution || 0}
          icon={<Clock className="h-6 w-6" />}
          color="blue"
        />
        
        <KPICard
          title="Anomalies en attente"
          value={kpis?.enAttente || 0}
          evolution={kpis?.enAttenteEvolution || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="yellow"
          urgent={kpis?.enAttente > 10}
        />
        
        <KPICard
          title="Taux de validation"
          value={`${kpis?.tauxValidation || 0}%`}
          evolution={kpis?.tauxValidationEvolution || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
        />
        
        <KPICard
          title="Coût heures sup"
          value={`${kpis?.coutHeuresSup || 0}€`}
          evolution={kpis?.coutHeuresSupEvolution || 0}
          icon={<DollarSign className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendances */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Évolution des anomalies
          </h3>
          <TendancesChart data={tendances} />
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Répartition par type
          </h3>
          <TypeRepartitionChart data={kpis?.repartitionTypes || []} />
        </div>
      </div>

      {/* Top employés à surveiller */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Employés à surveiller
        </h3>
        <TopEmployesTable employes={topEmployes} />
      </div>

      {/* Insights et recommandations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Insights et Recommandations
        </h3>
        <InsightsList insights={kpis?.insights || []} />
      </div>
    </div>
  );
}

/**
 * Composant de carte KPI
 */
function KPICard({ title, value, evolution, icon, color, urgent = false }) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
  };

  const colorScheme = urgent ? colors.red : colors[color];

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg p-6 transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${colorScheme.text} mt-2`}>{value}</p>
          
          {evolution !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {evolution > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+{evolution}%</span>
                </>
              ) : evolution < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{evolution}%</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Stable</span>
              )}
              <span className="text-xs text-gray-500 ml-1">vs période précédente</span>
            </div>
          )}
        </div>
        
        <div className={`${colorScheme.text} p-3 rounded-lg bg-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Graphique de tendances (simplifié - à remplacer par Recharts/Chart.js)
 */
function TendancesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>;
  }

  const maxValue = Math.max(...data.map(d => d.count));

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.count}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(item.count / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Graphique de répartition par type
 */
function TypeRepartitionChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">Aucune donnée disponible</div>;
  }

  const colors = [
    { bg: 'bg-red-500', label: 'text-red-700' },
    { bg: 'bg-yellow-500', label: 'text-yellow-700' },
    { bg: 'bg-blue-500', label: 'text-blue-700' },
    { bg: 'bg-green-500', label: 'text-green-700' },
    { bg: 'bg-purple-500', label: 'text-purple-700' }
  ];

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4">
      {/* Barres horizontales */}
      {data.map((item, idx) => {
        const percentage = ((item.count / total) * 100).toFixed(1);
        const color = colors[idx % colors.length];
        
        return (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">{item.type}</span>
              <span className="text-gray-600">{item.count} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${color.bg} h-3 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Table des employés à surveiller
 */
function TopEmployesTable({ employes }) {
  if (!employes || employes.length === 0) {
    return <div className="text-center text-gray-500 py-8">Aucun employé à signaler</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employé</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Anomalies</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tendance</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {employes.map((employe, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="font-medium text-gray-900">{employe.nom}</div>
                <div className="text-sm text-gray-500">{employe.poste}</div>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {employe.nbAnomalies}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <div className={`font-bold ${
                  employe.score >= 70 ? 'text-green-600' :
                  employe.score >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {employe.score}/100
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                {employe.tendance === 'degradation' ? (
                  <TrendingDown className="h-5 w-5 text-red-600 mx-auto" />
                ) : employe.tendance === 'amelioration' ? (
                  <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <div className="w-5 h-0.5 bg-gray-400 mx-auto" />
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Entretien →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Liste des insights et recommandations
 */
function InsightsList({ insights }) {
  if (!insights || insights.length === 0) {
    return <div className="text-gray-600">Aucun insight disponible pour le moment</div>;
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
          <div className={`p-2 rounded-lg ${
            insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            insight.type === 'success' ? 'bg-green-100 text-green-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {insight.type === 'warning' ? <AlertTriangle className="h-5 w-5" /> :
             insight.type === 'success' ? <CheckCircle className="h-5 w-5" /> :
             <TrendingUp className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{insight.titre}</h4>
            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            {insight.action && (
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2">
                {insight.action} →
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
