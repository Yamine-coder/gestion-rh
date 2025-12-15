// client/src/hooks/useAnomalies.js
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Hook principal pour la gestion des anomalies
 */
export function useAnomalies({
  employeId = null,
  dateDebut = null,
  dateFin = null,
  statut = null,
  type = null,
  gravite = null,
  limit = null,
  offset = null,
  autoRefresh = false,
  refreshInterval = 30000
} = {}) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  const fetchAnomalies = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const searchParams = new URLSearchParams();
      
      // Paramètres de base
      if (employeId) searchParams.set('employeId', employeId);
      if (dateDebut) searchParams.set('dateDebut', dateDebut);
      if (dateFin) searchParams.set('dateFin', dateFin);
      if (statut) searchParams.set('statut', statut);
      if (type) searchParams.set('type', type);
      if (gravite) searchParams.set('gravite', gravite);
      if (limit !== null && limit !== undefined) searchParams.set('limit', String(limit));
      if (offset !== null && offset !== undefined) searchParams.set('offset', String(offset));
      
      // Paramètres additionnels passés
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.set(key, value);
        }
      });

      const response = await fetch(`${API_BASE}/api/anomalies?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAnomalies(data.anomalies || []);
        setPagination(data.pagination || {});
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }

    } catch (err) {
      console.error('Erreur récupération anomalies:', err);
      setError(err.message);
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  }, [employeId, dateDebut, dateFin, statut, type, gravite, limit, offset]);

  // Fetch initial et rafraîchissement
  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnomalies();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnomalies]);

  const refresh = useCallback(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return {
    anomalies,
    loading,
    error,
    pagination,
    refresh,
    fetchAnomalies
  };
}

/**
 * Hook pour les statistiques d'anomalies (dashboard)
 */
export function useAnomaliesStats({
  employeId = null,
  periode = 'semaine',
  autoRefresh = true,
  refreshInterval = 60000
} = {}) {
  const [stats, setStats] = useState({
    total: 0,
    enAttente: 0,
    validees: 0,
    refusees: 0,
    parType: {},
    parGravite: {}
  });
  const [anomaliesRecentes, setAnomaliesRecentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const searchParams = new URLSearchParams();
      if (employeId) searchParams.set('employeId', employeId);
      searchParams.set('periode', periode);

      const response = await fetch(`${API_BASE}/api/anomalies/stats?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats || {});
        setAnomaliesRecentes(data.anomaliesRecentes || []);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }

    } catch (err) {
      console.error('Erreur récupération stats anomalies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [employeId, periode]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    anomaliesRecentes,
    loading,
    error,
    refresh
  };
}

/**
 * Hook pour traiter une anomalie (admin)
 */
export function useTraiterAnomalie() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const traiterAnomalie = useCallback(async (anomalieId, action, options = {}) => {
    const { commentaire, montantExtra, heuresExtra, shiftCorrection, tauxHoraire, methodePaiement, questionVerification, notifierEmploye } = options;

    // Actions supportées
    const actionsValides = ['valider', 'refuser', 'corriger', 'payer_extra', 'reporter', 'convertir_extra'];
    if (!actionsValides.includes(action)) {
      throw new Error(`Action invalide: ${action}. Actions valides: ${actionsValides.join(', ')}`);
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const body = {
        action,
        commentaire,
        montantExtra,
        heuresExtra,
        tauxHoraire,
        methodePaiement
      };

      // Ajouter shiftCorrection uniquement pour l'action "corriger"
      if (action === 'corriger' && shiftCorrection) {
        body.shiftCorrection = shiftCorrection;
      }

      // Ajouter les options pour l'action "reporter"
      if (action === 'reporter') {
        body.questionVerification = questionVerification;
        body.notifierEmploye = notifierEmploye;
      }

      const response = await fetch(`${API_BASE}/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('📡 Réponse serveur traitement anomalie:', {
        success: data.success,
        statut: data.anomalie?.statut,
        impactScore: data.impactScore,
        shiftModifie: data.shiftModifie,
        message: data.message
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      // Enrichir l'anomalie avec les infos du traitement
      if (data.anomalie) {
        data.anomalie._impactScore = data.impactScore;
        data.anomalie._shiftModifie = data.shiftModifie;
        data.anomalie._message = data.message;
      }

      return data.anomalie;

    } catch (err) {
      console.error('Erreur traitement anomalie:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    traiterAnomalie,
    loading,
    error
  };
}

/**
 * Hook pour synchroniser les anomalies depuis la comparaison (admin)
 */
export function useSyncAnomalies() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const syncAnomaliesFromComparison = useCallback(async (employeId, date, ecarts) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const response = await fetch(`${API_BASE}/api/anomalies/sync-from-comparison`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeId,
          date,
          ecarts
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      return {
        success: true,
        anomaliesCreees: data.anomaliesCreees,
        anomalies: data.anomalies
      };

    } catch (err) {
      console.error('Erreur sync anomalies:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    syncAnomaliesFromComparison,
    loading,
    error
  };
}

/**
 * 🆕 Hook pour récupérer les alertes d'anomalies non traitées (admin)
 */
export function useAlertesAnomalies({ jours = 7, autoRefresh = true, refreshInterval = 300000 } = {}) {
  const [alertes, setAlertes] = useState({ total: 0, anomalies: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const response = await fetch(`${API_BASE}/api/anomalies/alertes-non-traitees?jours=${jours}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          // Pas admin, pas d'alertes
          setAlertes({ total: 0, anomalies: [], stats: {} });
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAlertes({
          total: data.total,
          anomalies: data.anomalies || [],
          stats: data.stats || {},
          alerte: data.alerte,
          message: data.message
        });
      }

    } catch (err) {
      console.error('Erreur récupération alertes anomalies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jours]);

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAlertes();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAlertes]);

  return {
    alertes,
    loading,
    error,
    refresh: fetchAlertes
  };
}

/**
 * Utilitaires pour les anomalies
 */
export const anomaliesUtils = {
  // Couleurs et icônes selon la gravité
  getGraviteStyle: (gravite) => {
    switch (gravite) {
      case 'critique':
        return { 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          icon: '🔴' 
        };
      case 'attention':
        return { 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-50', 
          border: 'border-yellow-200',
          icon: '🟡' 
        };
      case 'hors_plage':
        return { 
          color: 'text-purple-600', 
          bg: 'bg-purple-50', 
          border: 'border-purple-200',
          icon: '🟣' 
        };
      case 'a_valider':
        return { 
          color: 'text-orange-600', 
          bg: 'bg-orange-50', 
          border: 'border-orange-200',
          icon: '⚠️' 
        };
      case 'info':
      case 'ok':
      default:
        return { 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          border: 'border-green-200',
          icon: '🟢' 
        };
    }
  },

  // Couleurs selon le statut
  getStatutStyle: (statut) => {
    switch (statut) {
      case 'en_attente':
        return { color: 'text-blue-600', bg: 'bg-blue-50', label: 'En attente' };
      case 'validee':
        return { color: 'text-green-600', bg: 'bg-green-50', label: 'Validée' };
      case 'refusee':
        return { color: 'text-red-600', bg: 'bg-red-50', label: 'Refusée' };
      case 'corrigee':
        return { color: 'text-purple-600', bg: 'bg-purple-50', label: 'Corrigée' };
      case 'obsolete':
        return { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Obsolète', icon: '🔄' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', label: statut };
    }
  },

  // Labels lisibles pour les types
  getTypeLabel: (type) => {
    switch (type) {
      case 'retard': return 'Retard';
      case 'retard_modere': return 'Retard modéré';
      case 'retard_critique': return 'Retard critique';
      case 'hors_plage': return 'Hors plage';
      case 'hors_plage_in': return 'Hors plage (arrivée)';
      case 'hors_plage_out_critique': return 'Hors plage (départ)';
      case 'absence_totale': return 'Absence totale';
      case 'presence_non_prevue': return 'Présence non prévue';
      case 'depart_anticipe': return 'Départ anticipé';
      case 'depart_premature_critique': return 'Départ prématuré';
      case 'heures_sup': return 'Heures supplémentaires';
      case 'heures_sup_auto_validees': return 'Heures sup (auto)';
      case 'heures_sup_a_valider': return 'Heures sup (à valider)';
      case 'absence_planifiee_avec_pointage': return 'Pointage sur absence';
      case 'segment_non_pointe': return 'Segment non pointé';
      case 'missing_in': return 'Arrivée manquante';
      case 'missing_out': return 'Départ manquant';
      case 'pointage_hors_planning': return 'Pointage hors planning';
      default: return type;
    }
  },

  // Formater la date
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  // Formater l'heure
  formatTime: (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
