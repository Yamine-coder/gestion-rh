import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Train, Clock, Check, X, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { toLocalDateString } from '../utils/parisTimeUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Widget Navigo pour le Dashboard
 * Affiche les justificatifs en attente de validation
 */
function NavigoWidget({ onEmployeClick }) {
  const [justificatifs, setJustificatifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingJustificatifs();
  }, []);

  const fetchPendingJustificatifs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/navigo/mensuel/admin/en-attente`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJustificatifs(res.data || []);
    } catch (err) {
      console.error('Erreur chargement justificatifs Navigo:', err);
      setJustificatifs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingJustificatifs();
  };

  const handleValidate = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/navigo/mensuel/admin/${id}/statut`, 
        { statut: 'valide' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Retirer de la liste
      setJustificatifs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error('Erreur validation:', err);
    }
  };

  const handleRefuse = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/navigo/mensuel/admin/${id}/statut`, 
        { statut: 'refuse' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Retirer de la liste
      setJustificatifs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error('Erreur refus:', err);
    }
  };

  const formatMois = (mois, annee) => {
    if (!mois || !annee) return '-';
    const date = new Date(annee, mois - 1, 1);
    const moisStr = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return moisStr.charAt(0).toUpperCase() + moisStr.slice(1);
  };

  // Si pas de justificatifs en attente, ne pas afficher le widget
  if (!loading && justificatifs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Train className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Justificatifs Navigo</h3>
              <p className="text-xs text-gray-500">
                {justificatifs.length} en attente de validation
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          justificatifs.slice(0, 5).map((justif) => (
            <div 
              key={justif.id}
              className="px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {justif.user?.prenom?.[0]}{justif.user?.nom?.[0]}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onEmployeClick?.(justif.user)}
                    className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors text-left truncate block w-full"
                  >
                    {justif.user?.prenom} {justif.user?.nom}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatMois(justif.mois, justif.annee)}</span>
                    <span className="text-gray-300">•</span>
                    <span>Envoyé {toLocalDateString(justif.dateUpload)}</span>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleValidate(justif.id)}
                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="Valider"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRefuse(justif.id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Refuser"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer si plus de 5 */}
      {justificatifs.length > 5 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <button 
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 w-full justify-center"
            onClick={() => {/* Navigation vers liste complète */}}
          >
            Voir tous les justificatifs ({justificatifs.length})
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default NavigoWidget;
