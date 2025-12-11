// client/src/components/AlertesTempsReel.jsx
// Widget d'alertes temps réel pour retards et absences

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, UserX, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AlertesTempsReel = () => {
  const [alertes, setAlertes] = useState([]);
  const [stats, setStats] = useState({ total: 0, absences: 0, retards: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAlertes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/alertes/retards-absences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAlertes(data.alertes || []);
        setStats(data.stats || { total: 0, absences: 0, retards: 0 });
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Erreur fetch alertes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertes();
    
    // Rafraîchir toutes les 2 minutes
    const interval = setInterval(fetchAlertes, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchAlertes]);

  const getGraviteStyle = (gravite) => {
    switch (gravite) {
      case 'critique':
        return 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300';
      case 'haute':
        return 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300';
      case 'moyenne':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'absence_confirmee':
        return <UserX className="w-5 h-5 text-red-600" />;
      case 'absence_probable':
        return <UserX className="w-5 h-5 text-orange-600" />;
      case 'retard_significatif':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'absence_confirmee':
        return 'Absence confirmée';
      case 'absence_probable':
        return 'Absence probable';
      case 'retard_significatif':
        return 'Retard';
      default:
        return type;
    }
  };

  // Si aucune alerte et pas en chargement, ne pas afficher le widget
  if (!loading && alertes.length === 0 && !error) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
      {/* Header */}
      <div 
        className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
          stats.total > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-700/50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${stats.total > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-200 dark:bg-slate-600'}`}>
            <AlertTriangle className={`w-5 h-5 ${stats.total > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Alertes Temps Réel
            </h3>
            {stats.total > 0 ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {stats.absences > 0 && `${stats.absences} absence${stats.absences > 1 ? 's' : ''}`}
                {stats.absences > 0 && stats.retards > 0 && ' • '}
                {stats.retards > 0 && `${stats.retards} retard${stats.retards > 1 ? 's' : ''}`}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Aucune alerte en cours
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchAlertes();
            }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          )}
        </div>
      </div>

      {/* Liste des alertes */}
      {expanded && (
        <div className="p-4">
          {loading && alertes.length === 0 ? (
            <div className="text-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Chargement des alertes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              <p>Erreur: {error}</p>
              <button 
                onClick={fetchAlertes}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Réessayer
              </button>
            </div>
          ) : alertes.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-slate-400">
              <p>✅ Aucune alerte - Tous les employés sont à jour</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertes.map((alerte, index) => (
                <div 
                  key={`${alerte.employeId}-${alerte.type}-${index}`}
                  className={`p-3 rounded-lg border-l-4 ${getGraviteStyle(alerte.gravite)}`}
                >
                  <div className="flex items-start gap-3">
                    {getTypeIcon(alerte.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{alerte.employe}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          alerte.gravite === 'critique' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                          alerte.gravite === 'haute' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                          'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                        }`}>
                          {getTypeLabel(alerte.type)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{alerte.message}</p>
                      {alerte.heuresPrevues && (
                        <p className="text-xs mt-1 opacity-75">
                          {alerte.heuresPrevues}h prévues
                          {alerte.anomalieCreee && ' • Anomalie créée automatiquement'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {lastUpdate && (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-right mt-3">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertesTempsReel;
