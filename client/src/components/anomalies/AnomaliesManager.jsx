// client/src/components/anomalies/AnomaliesManager.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Filter, RefreshCw, Search, Calendar, User, 
  X, Check, Clock, ChevronDown, AlertCircle, ChevronRight, Zap,
  ClipboardList, Timer, Ban, UserX, HelpCircle, LogOut, Plus, MapPin, CheckCircle, XCircle, Wrench, AlertOctagon
} from 'lucide-react';
import ModalTraiterAnomalie from './ModalTraiterAnomalie';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Couleur brand
const BRAND_COLOR = '#cf292c';

// Utilitaires pour les anomalies
const anomaliesUtils = {
  getTypeLabel: (type) => {
    const types = {
      'retard': 'Retard',
      'retard_critique': 'Retard critique',
      'retard_attention': 'Retard',
      'hors_plage': 'Hors plage',
      'absence_totale': 'Absence totale',
      'presence_non_prevue': 'Présence non prévue',
      'pointage_hors_planning': 'Pointage hors planning',
      'depart_anticipe': 'Départ anticipé',
      'heures_sup': 'Heures supplémentaires',
      'pointage_manquant': 'Pointage manquant'
    };
    return types[type] || type;
  },
  
  getTypeIcon: (type) => {
    const IconMap = {
      'retard': Clock,
      'retard_critique': AlertOctagon,
      'retard_attention': Clock,
      'hors_plage': MapPin,
      'absence_totale': Ban,
      'presence_non_prevue': HelpCircle,
      'pointage_hors_planning': AlertCircle,
      'depart_anticipe': LogOut,
      'heures_sup': Plus,
      'pointage_manquant': XCircle
    };
    return IconMap[type] || AlertTriangle;
  },
  
  getGraviteStyle: (gravite) => {
    const styles = {
      'critique': { bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500', badge: 'bg-red-100' },
      'hors_plage': { bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-200', dotColor: 'bg-orange-500', badge: 'bg-orange-100' },
      'attention': { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500', badge: 'bg-amber-100' },
      'a_valider': { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200', dotColor: 'bg-blue-500', badge: 'bg-blue-100' },
      'info': { bg: 'bg-slate-50', color: 'text-slate-700', border: 'border-slate-200', dotColor: 'bg-slate-400', badge: 'bg-slate-100' }
    };
    return styles[gravite] || styles['info'];
  },
  
  getStatutStyle: (statut) => {
    const styles = {
      'en_attente': { bg: 'bg-amber-100', color: 'text-amber-800', label: 'En attente', dot: 'bg-amber-500' },
      'validee': { bg: 'bg-emerald-100', color: 'text-emerald-800', label: 'Validée', dot: 'bg-emerald-500' },
      'refusee': { bg: 'bg-red-100', color: 'text-red-800', label: 'Refusée', dot: 'bg-red-500' },
      'corrigee': { bg: 'bg-blue-100', color: 'text-blue-800', label: 'Corrigée', dot: 'bg-blue-500' },
      'a_verifier': { bg: 'bg-purple-100', color: 'text-purple-800', label: 'À vérifier', dot: 'bg-purple-500' }
    };
    return styles[statut] || { bg: 'bg-slate-100', color: 'text-slate-700', label: statut, dot: 'bg-slate-500' };
  },
  
  formatDate: (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },
  
  formatDateShort: (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header moderne avec gradient brand */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-xl shadow-lg"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Gestion des Anomalies</h2>
                <p className="text-sm text-slate-500 mt-0.5">Suivi et validation des écarts de pointage</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Bouton actualiser */}
              <button
                onClick={loadAnomalies}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              {embedded && onClose && (
                <button
                  onClick={onClose}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'slate', Icon: ClipboardList },
              { label: 'En attente', value: stats.enAttente, color: 'amber', Icon: Timer },
              { label: 'Validées', value: stats.validees, color: 'emerald', Icon: CheckCircle },
              { label: 'Refusées', value: stats.refusees, color: 'red', Icon: XCircle },
              { label: 'Critiques', value: stats.critiques, color: 'rose', Icon: AlertOctagon }
            ].map((stat, idx) => (
              <div 
                key={idx}
                className={`relative overflow-hidden rounded-xl p-4 border transition-all hover:shadow-md cursor-default
                  ${stat.color === 'slate' ? 'bg-white border-slate-200' : ''}
                  ${stat.color === 'amber' ? 'bg-amber-50 border-amber-200' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : ''}
                  ${stat.color === 'red' ? 'bg-red-50 border-red-200' : ''}
                  ${stat.color === 'rose' ? 'bg-rose-50 border-rose-200' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-2xl font-bold
                      ${stat.color === 'slate' ? 'text-slate-900' : ''}
                      ${stat.color === 'amber' ? 'text-amber-700' : ''}
                      ${stat.color === 'emerald' ? 'text-emerald-700' : ''}
                      ${stat.color === 'red' ? 'text-red-700' : ''}
                      ${stat.color === 'rose' ? 'text-rose-700' : ''}
                    `}>
                      {stat.value}
                    </div>
                    <div className={`text-xs font-medium mt-0.5
                      ${stat.color === 'slate' ? 'text-slate-500' : ''}
                      ${stat.color === 'amber' ? 'text-amber-600' : ''}
                      ${stat.color === 'emerald' ? 'text-emerald-600' : ''}
                      ${stat.color === 'red' ? 'text-red-600' : ''}
                      ${stat.color === 'rose' ? 'text-rose-600' : ''}
                    `}>
                      {stat.label}
                    </div>
                  </div>
                  <stat.Icon className={`w-5 h-5 opacity-60
                    ${stat.color === 'slate' ? 'text-slate-500' : ''}
                    ${stat.color === 'amber' ? 'text-amber-600' : ''}
                    ${stat.color === 'emerald' ? 'text-emerald-600' : ''}
                    ${stat.color === 'red' ? 'text-red-600' : ''}
                    ${stat.color === 'rose' ? 'text-rose-600' : ''}
                  `} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barre d'outils redesignée */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-4 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom, type..."
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
          </div>

          {/* Filtres pills */}
          <div className="flex items-center gap-2">
            <select
              value={filtres.statut}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 cursor-pointer"
            >
              <option value="">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
              <option value="refusee">Refusées</option>
              <option value="corrigee">Corrigées</option>
            </select>

            <select
              value={filtres.gravite}
              onChange={(e) => handleFilterChange('gravite', e.target.value)}
              className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 cursor-pointer"
            >
              <option value="">Toutes gravités</option>
              <option value="critique">Critique</option>
              <option value="hors_plage">Hors plage</option>
              <option value="attention">Attention</option>
              <option value="a_valider">À valider</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 text-sm rounded-xl border flex items-center gap-2 transition-all ${
                showFilters 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Plus de filtres
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="px-6 py-4 bg-white border-t border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Type d'anomalie</label>
                <select
                  value={filtres.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
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
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Date début</label>
                <input
                  type="date"
                  value={filtres.dateDebut}
                  onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Date fin</label>
                <input
                  type="date"
                  value={filtres.dateFin}
                  onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste des anomalies redesignée */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div 
                className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-4"
                style={{ borderTopColor: BRAND_COLOR }}
              ></div>
              <p className="text-slate-500 font-medium">Chargement des anomalies...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center bg-red-50 rounded-2xl p-8 max-w-md">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-700 font-medium mb-2">Erreur de chargement</p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button 
                onClick={loadAnomalies} 
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : anomaliesFiltrees.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Aucune anomalie trouvée</p>
              <p className="text-slate-400 text-sm mt-1">Modifiez les filtres ou actualisez</p>
              {(recherche || filtres.statut || filtres.gravite) && (
                <button 
                  onClick={resetFilters} 
                  className="mt-4 text-sm font-medium hover:underline"
                  style={{ color: BRAND_COLOR }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {anomaliesFiltrees.map((anomalie) => {
              const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
              const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
              const TypeIcon = anomaliesUtils.getTypeIcon(anomalie.type);
              const isProcessing = processing.has(anomalie.id);

              return (
                <div 
                  key={anomalie.id} 
                  className={`bg-white rounded-xl border border-slate-200 p-4 transition-all hover:shadow-lg hover:border-slate-300 ${
                    isProcessing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar employé */}
                    <div 
                      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {anomalie.employe?.prenom?.[0]}{anomalie.employe?.nom?.[0]}
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-slate-900">
                          {anomalie.employe?.prenom} {anomalie.employe?.nom}
                        </span>
                        
                        {/* Badge gravité */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${graviteStyle.badge} ${graviteStyle.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${graviteStyle.dotColor}`}></span>
                          {anomalie.gravite}
                        </span>
                        
                        {/* Badge statut avec dot */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statutStyle.dot}`}></span>
                          {statutStyle.label}
                        </span>
                      </div>
                      
                      {/* Meta infos */}
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {anomaliesUtils.formatDate(anomalie.date)}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                          <TypeIcon className="w-3.5 h-3.5" />
                          {anomaliesUtils.getTypeLabel(anomalie.type)}
                        </span>
                        {anomalie.details?.ecartMinutes && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                            anomalie.details.ecartMinutes > 0 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {anomalie.details.ecartMinutes > 0 ? '+' : ''}{anomalie.details.ecartMinutes} min
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {anomalie.description}
                      </p>

                      {/* Commentaire */}
                      {anomalie.commentaire && (
                        <p className="text-xs text-slate-400 mt-2 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" /> {anomalie.commentaire}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      {anomalie.statut === 'en_attente' ? (
                        <div className="flex items-center gap-2">
                          {/* Bouton valider */}
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'valider')}
                            disabled={isProcessing}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                            title="Valider rapidement"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          
                          {/* Bouton refuser */}
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'refuser')}
                            disabled={isProcessing}
                            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                            title="Refuser rapidement"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          
                          {/* Bouton détails */}
                          <button
                            onClick={() => setAnomalieSelectionnee(anomalie)}
                            disabled={isProcessing}
                            className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1"
                            title="Voir les détails et options avancées"
                          >
                            <Zap className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          {anomalie.traiteur && (
                            <p className="text-xs text-slate-500">
                              Par <span className="font-medium">{anomalie.traiteur.prenom}</span>
                            </p>
                          )}
                          {anomalie.traiteAt && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {anomaliesUtils.formatDateShort(anomalie.traiteAt)}
                            </p>
                          )}
                          <button
                            onClick={() => setAnomalieSelectionnee(anomalie)}
                            className="mt-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Voir les détails"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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
    <div className="h-full bg-slate-50">
      {content}
    </div>
  );
}
