// client/src/components/anomalies/AnomaliesManager.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Filter, RefreshCw, Search, Eye, Calendar, User, 
  X, Check, Clock, ChevronDown, AlertCircle
} from 'lucide-react';
import ModalTraiterAnomalie from './ModalTraiterAnomalie';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Utilitaires pour les anomalies
const anomaliesUtils = {
  getTypeLabel: (type) => {
    const types = {
      'retard': 'Retard',
      'hors_plage': 'Hors plage',
      'absence_totale': 'Absence totale',
      'presence_non_prevue': 'Présence non prévue',
      'depart_anticipe': 'Départ anticipé',
      'heures_sup': 'Heures supplémentaires',
      'pointage_manquant': 'Pointage manquant'
    };
    return types[type] || type;
  },
  
  getGraviteStyle: (gravite) => {
    const styles = {
      'critique': { bg: 'bg-red-100', color: 'text-red-700', icon: '🔴' },
      'hors_plage': { bg: 'bg-orange-100', color: 'text-orange-700', icon: '🟠' },
      'attention': { bg: 'bg-yellow-100', color: 'text-yellow-700', icon: '🟡' },
      'a_valider': { bg: 'bg-blue-100', color: 'text-blue-700', icon: '🔵' },
      'info': { bg: 'bg-gray-100', color: 'text-gray-700', icon: '⚪' }
    };
    return styles[gravite] || styles['info'];
  },
  
  getStatutStyle: (statut) => {
    const styles = {
      'en_attente': { bg: 'bg-amber-100', color: 'text-amber-700', label: 'En attente' },
      'validee': { bg: 'bg-green-100', color: 'text-green-700', label: 'Validée' },
      'refusee': { bg: 'bg-red-100', color: 'text-red-700', label: 'Refusée' },
      'corrigee': { bg: 'bg-blue-100', color: 'text-blue-700', label: 'Corrigée' }
    };
    return styles[statut] || { bg: 'bg-gray-100', color: 'text-gray-700', label: statut };
  },
  
  formatDate: (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
};

/**
 * Gestionnaire d'anomalies intégrable dans le Planning
 * @param {boolean} embedded - Mode intégré (dans modale) ou standalone
 * @param {function} onClose - Callback pour fermer le panneau
 * @param {function} showToast - Fonction pour afficher des notifications
 */
export default function AnomaliesManager({ embedded = false, onClose, showToast }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtres, setFiltres] = useState({
    statut: 'en_attente',
    gravite: '',
    type: '',
    dateDebut: '',
    dateFin: ''
  });
  const [recherche, setRecherche] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [anomalieSelectionnee, setAnomalieSelectionnee] = useState(null);
  const [processing, setProcessing] = useState(new Set());

  // Charger les anomalies
  const loadAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const params = new URLSearchParams();
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.gravite) params.append('gravite', filtres.gravite);
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.dateDebut) params.append('dateDebut', filtres.dateDebut);
      if (filtres.dateFin) params.append('dateFin', filtres.dateFin);
      params.append('limit', '100');

      const response = await fetch(`${API_URL}/api/anomalies?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      setAnomalies(data.anomalies || []);
    } catch (err) {
      console.error('Erreur chargement anomalies:', err);
      setError(err.message);
      if (showToast) showToast('Erreur de chargement des anomalies', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtres, showToast]);

  // Action rapide (validation/refus)
  const handleQuickAction = useCallback(async (anomalieId, action) => {
    if (processing.has(anomalieId)) return;
    
    setProcessing(prev => new Set(prev).add(anomalieId));
    
    try {
      const token = localStorage.getItem('token');
      const commentaire = action === 'valider' 
        ? 'Validation rapide' 
        : 'Refus rapide';

      const response = await fetch(`${API_URL}/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, commentaire })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur traitement');
      }

      const emoji = action === 'valider' ? '✅' : '❌';
      const label = action === 'valider' ? 'validée' : 'refusée';
      
      if (showToast) showToast(`${emoji} Anomalie ${label}`, action === 'valider' ? 'success' : 'warning');
      await loadAnomalies();
    } catch (err) {
      console.error('Erreur action rapide:', err);
      if (showToast) showToast(err.message, 'error');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(anomalieId);
        return next;
      });
    }
  }, [processing, loadAnomalies, showToast]);

  // Filtrer les anomalies localement
  const anomaliesFiltrees = useMemo(() => {
    return anomalies.filter(anomalie => {
      if (!recherche) return true;
      const searchTerm = recherche.toLowerCase();
      return (
        anomalie.description?.toLowerCase().includes(searchTerm) ||
        anomalie.employe?.nom?.toLowerCase().includes(searchTerm) ||
        anomalie.employe?.prenom?.toLowerCase().includes(searchTerm) ||
        anomaliesUtils.getTypeLabel(anomalie.type).toLowerCase().includes(searchTerm)
      );
    });
  }, [anomalies, recherche]);

  // Statistiques
  const stats = useMemo(() => ({
    total: anomaliesFiltrees.length,
    enAttente: anomaliesFiltrees.filter(a => a.statut === 'en_attente').length,
    validees: anomaliesFiltrees.filter(a => a.statut === 'validee').length,
    refusees: anomaliesFiltrees.filter(a => a.statut === 'refusee').length,
    critiques: anomaliesFiltrees.filter(a => a.gravite === 'critique').length
  }), [anomaliesFiltrees]);

  // Charger au montage
  useEffect(() => {
    loadAnomalies();
  }, [loadAnomalies]);

  // Raccourci Escape pour fermer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && embedded && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [embedded, onClose]);

  const handleFilterChange = (key, value) => {
    setFiltres(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFiltres({
      statut: 'en_attente',
      gravite: '',
      type: '',
      dateDebut: '',
      dateFin: ''
    });
    setRecherche('');
  };

  // Contenu principal
  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gestion des Anomalies</h2>
                <p className="text-sm text-gray-600">Suivi et validation des écarts de pointage</p>
              </div>
            </div>
            {embedded && onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 shadow-sm border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{stats.enAttente}</div>
              <div className="text-xs text-amber-600">En attente</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.validees}</div>
              <div className="text-xs text-green-600">Validées</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.refusees}</div>
              <div className="text-xs text-red-600">Refusées</div>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 shadow-sm border border-rose-200">
              <div className="text-2xl font-bold text-rose-700">{stats.critiques}</div>
              <div className="text-xs text-rose-600">Critiques</div>
            </div>
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="px-6 py-3 bg-white border-t flex items-center gap-3 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Filtre statut rapide */}
          <select
            value={filtres.statut}
            onChange={(e) => handleFilterChange('statut', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">Tous statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="validee">✅ Validées</option>
            <option value="refusee">❌ Refusées</option>
            <option value="corrigee">🔧 Corrigées</option>
          </select>

          {/* Filtre gravité */}
          <select
            value={filtres.gravite}
            onChange={(e) => handleFilterChange('gravite', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">Toutes gravités</option>
            <option value="critique">🔴 Critique</option>
            <option value="hors_plage">🟠 Hors plage</option>
            <option value="attention">🟡 Attention</option>
            <option value="a_valider">🔵 À valider</option>
          </select>

          {/* Bouton filtres avancés */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 transition ${
              showFilters 
                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Actualiser */}
          <button
            onClick={loadAnomalies}
            disabled={loading}
            className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type d'anomalie</label>
                <select
                  value={filtres.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                  <option value="">Tous types</option>
                  <option value="retard">Retard</option>
                  <option value="hors_plage">Hors plage</option>
                  <option value="absence_totale">Absence totale</option>
                  <option value="presence_non_prevue">Présence non prévue</option>
                  <option value="depart_anticipe">Départ anticipé</option>
                  <option value="heures_sup">Heures supplémentaires</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
                <input
                  type="date"
                  value={filtres.dateDebut}
                  onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filtres.dateFin}
                  onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={resetFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste des anomalies */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des anomalies...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-2">Erreur: {error}</p>
              <button onClick={loadAnomalies} className="text-blue-600 hover:underline">
                Réessayer
              </button>
            </div>
          </div>
        ) : anomaliesFiltrees.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune anomalie trouvée</p>
              {(recherche || filtres.statut || filtres.gravite) && (
                <button onClick={resetFilters} className="mt-2 text-sm text-orange-600 hover:underline">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {anomaliesFiltrees.map((anomalie) => {
              const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
              const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
              const isProcessing = processing.has(anomalie.id);

              return (
                <div 
                  key={anomalie.id} 
                  className={`p-4 hover:bg-gray-50 transition ${isProcessing ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Info employé */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {anomalie.employe?.prenom} {anomalie.employe?.nom}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${graviteStyle.bg} ${graviteStyle.color}`}>
                          {graviteStyle.icon} {anomalie.gravite}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                          {statutStyle.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {anomaliesUtils.formatDate(anomalie.date)}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {anomaliesUtils.getTypeLabel(anomalie.type)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-2">
                        {anomalie.description}
                      </p>

                      {anomalie.commentaire && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          💬 {anomalie.commentaire}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {anomalie.statut === 'en_attente' ? (
                        <>
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'valider')}
                            disabled={isProcessing}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Valider"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'refuser')}
                            disabled={isProcessing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Refuser"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setAnomalieSelectionnee(anomalie)}
                            disabled={isProcessing}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                            title="Voir détails"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500 text-right">
                          {anomalie.traiteur && (
                            <p>Par {anomalie.traiteur.prenom}</p>
                          )}
                          {anomalie.traiteAt && (
                            <p>{anomaliesUtils.formatDate(anomalie.traiteAt)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale de traitement détaillé */}
      {anomalieSelectionnee && (
        <ModalTraiterAnomalie
          anomalie={anomalieSelectionnee}
          onClose={() => setAnomalieSelectionnee(null)}
          onTraited={() => {
            loadAnomalies();
            setAnomalieSelectionnee(null);
          }}
        />
      )}
    </div>
  );

  // Mode embedded = dans une modale
  if (embedded) {
    return content;
  }

  // Mode standalone = page complète
  return (
    <div className="h-full bg-gray-50">
      {content}
    </div>
  );
}
