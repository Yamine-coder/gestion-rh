// client/src/components/EmployeScorePanel.jsx

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import axios from 'axios';
import { toLocalDateString } from '../utils/parisTimeUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EmployeScorePanel = ({ employeId, employeName, onClose }) => {
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnomaliesData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Récupérer les anomalies de l'employé (6 derniers mois)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const response = await axios.get(
          `${API_URL}/api/anomalies?employeId=${employeId}&dateDebut=${toLocalDateString(sixMonthsAgo)}&limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setAnomaliesData(response.data);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement anomalies:', err);
        setError('Impossible de charger l\'historique des anomalies');
      } finally {
        setLoading(false);
      }
    };

    if (employeId) {
      fetchAnomaliesData();
    }
  }, [employeId]);

  const getStatutIcon = (statut) => {
    switch(statut) {
      case 'validee': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'refusee': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'corrigee': return <Wrench className="w-5 h-5 text-blue-600" />;
      default: return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatutLabel = (statut) => {
    switch(statut) {
      case 'validee': return 'Validée';
      case 'refusee': return 'Refusée';
      case 'corrigee': return 'Corrigée';
      case 'en_attente': return 'En attente';
      default: return statut;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatutBadgeClass = (statut) => {
    switch (statut) {
      case 'validee': return 'bg-green-100 text-green-800 border-green-200';
      case 'refusee': return 'bg-red-100 text-red-800 border-red-200';
      case 'corrigee': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGraviteBadge = (gravite) => {
    switch (gravite) {
      case 'critique': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">🔴 Critique</span>;
      case 'attention': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">🟡 Attention</span>;
      case 'info': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">🔵 Info</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{gravite}</span>;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Chargement du score...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-semibold">Erreur</span>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!anomaliesData) return null;

  const anomalies = anomaliesData.anomalies || [];
  const validees = anomalies.filter(a => a.statut === 'validee').length;
  const refusees = anomalies.filter(a => a.statut === 'refusee').length;
  const corrigees = anomalies.filter(a => a.statut === 'corrigee').length;
  const enAttente = anomalies.filter(a => a.statut === 'en_attente').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Historique des anomalies - {employeName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Traçabilité complète des 6 derniers mois
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Statistiques simples */}
        <div className="p-6 border-b bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-800">{anomalies.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total anomalies</div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">{validees}</div>
              <div className="text-sm text-gray-600 mt-1">Validées</div>
              <div className="text-xs text-gray-500 mt-1">
                {anomalies.length > 0 ? Math.round((validees / anomalies.length) * 100) : 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-red-200">
              <div className="text-3xl font-bold text-red-600">{refusees}</div>
              <div className="text-sm text-gray-600 mt-1">Refusées</div>
              <div className="text-xs text-gray-500 mt-1">
                {anomalies.length > 0 ? Math.round((refusees / anomalies.length) * 100) : 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{corrigees}</div>
              <div className="text-sm text-gray-600 mt-1">Corrigées</div>
              <div className="text-xs text-gray-500 mt-1">
                {anomalies.length > 0 ? Math.round((corrigees / anomalies.length) * 100) : 0}%
              </div>
            </div>
          </div>
          
          {refusees >= 5 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                ⚠️ Attention: {refusees} anomalies refusées - Suivi RH recommandé
              </span>
            </div>
          )}
        </div>

        {/* Liste des anomalies */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historique chronologique
          </h3>

          {anomalies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">Aucune anomalie enregistrée</p>
              <p className="text-sm mt-1">Cet employé n'a pas d'anomalie sur les 6 derniers mois</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomalie) => (
                <div
                  key={anomalie.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getStatutBadgeClass(anomalie.statut)}`}>
                          {getStatutIcon(anomalie.statut)}
                          {getStatutLabel(anomalie.statut)}
                        </span>
                        {getGraviteBadge(anomalie.gravite)}
                      </div>
                      
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-semibold text-gray-800">{anomalie.type.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <div className="text-gray-600">
                          {anomalie.description}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📅 {formatDate(anomalie.date)}</span>
                          {anomalie.traiteAt && (
                            <span>✅ Traité le {formatDate(anomalie.traiteAt)}</span>
                          )}
                        </div>
                      </div>

                      {anomalie.commentaireManager && (
                        <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                          <span className="font-medium text-blue-900">💬 Manager:</span> {anomalie.commentaireManager}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500 space-y-1">
            <p>✅ <strong>Validée</strong> = Justification acceptée (certificat médical, etc.)</p>
            <p>❌ <strong>Refusée</strong> = Sans justificatif valable</p>
            <p>🔧 <strong>Corrigée</strong> = Erreur administrative (pas la faute de l'employé)</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeScorePanel;
