// client/src/components/anomalies/AnomaliesManager.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Filter, RefreshCw, Search, Calendar, User, 
  X, Check, Clock, ChevronDown, AlertCircle, ChevronRight, Zap,
  ClipboardList, Timer, Ban, UserX, HelpCircle, LogOut, Plus, MapPin, CheckCircle, XCircle, Wrench, AlertOctagon,
  Sparkles, TrendingUp, MoreHorizontal, Eye, FileText, UserCheck, Banknote
} from 'lucide-react';
import ModalTraiterAnomalie from './ModalTraiterAnomalie';
import { API_URL } from '../../config/api';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS UI - Style Dashboard épuré (inspiré widgets dashboard)
// ═══════════════════════════════════════════════════════════════════════════

// Mini KPI Card - Style léger comme les widgets dashboard
const StatKpiCard = ({ label, value, icon: Icon, color = 'slate', active, onClick }) => {
  const styles = {
    slate: { text: 'text-slate-900', subtext: 'text-slate-500', icon: 'text-slate-400' },
    amber: { text: 'text-amber-600', subtext: 'text-amber-600/70', icon: 'text-amber-500' },
    emerald: { text: 'text-emerald-600', subtext: 'text-emerald-600/70', icon: 'text-emerald-500' },
    red: { text: 'text-red-600', subtext: 'text-red-600/70', icon: 'text-red-500' },
    rose: { text: 'text-rose-600', subtext: 'text-rose-600/70', icon: 'text-rose-500' }
  };
  const s = styles[color] || styles.slate;

  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-xl border p-3 transition-all
        ${active ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'}
        ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${s.text}`}>{value}</div>
          <div className={`text-xs ${s.subtext}`}>{label}</div>
        </div>
        <Icon className={`w-5 h-5 ${s.icon}`} />
      </div>
    </div>
  );
};

// Utilitaires pour les anomalies - SIMPLIFIÉ (4 types seulement)
const anomaliesUtils = {
  getTypeLabel: (type) => {
    const types = {
      // Les 4 types actifs
      'absence_injustifiee': 'Absence injustifiée',
      'extra_potentiel': 'Extra potentiel',
      'arrivee_anticipee_extra': 'Extra potentiel (arrivée)',
      'arrivee_anticipee_auto': 'Arrivée anticipée',
      'missing_out': 'Sortie manquante',
      'missing_in': 'Entrée manquante',
      'pointage_hors_planning': 'Pointage hors planning',
      // Rétro-compatibilité ancien type
      'heures_sup_a_valider': 'Extra potentiel',
      // Anciens types (rétro-compatibilité)
      'absence_totale': 'Absence',
      'absence_non_justifiee': 'Absence',
      'heures_supplementaires': 'Heures sup',
      'segment_non_pointe': 'Sortie manquante',
      'pause_non_prise': 'Pause non prise'
    };
    return types[type] || type.replace(/_/g, ' ');
  },
  
  getTypeIcon: (type) => {
    const IconMap = {
      // Les 4 types actifs
      'absence_injustifiee': Ban,
      'extra_potentiel': Banknote,
      'arrivee_anticipee_extra': Banknote,
      'arrivee_anticipee_auto': Clock,
      'missing_out': LogOut,
      'missing_in': UserX,
      'pointage_hors_planning': AlertCircle,
      // Rétro-compatibilité
      'heures_sup_a_valider': Banknote,
      // Anciens types
      'absence_totale': Ban,
      'heures_supplementaires': Clock,
      'segment_non_pointe': LogOut,
      'pause_non_prise': Clock
    };
    return IconMap[type] || AlertTriangle;
  },
  
  getGraviteStyle: (gravite) => {
    const styles = {
      // 4 niveaux de gravité standardisés
      'critique': { bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500', badge: 'bg-red-100', label: 'Critique' },
      'moyenne': { bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-200', dotColor: 'bg-orange-500', badge: 'bg-orange-100', label: 'Moyenne' },
      'attention': { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500', badge: 'bg-amber-100', label: 'Attention' },
      'a_valider': { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200', dotColor: 'bg-blue-500', badge: 'bg-blue-100', label: 'À valider' },
      'info': { bg: 'bg-slate-50', color: 'text-slate-700', border: 'border-slate-200', dotColor: 'bg-slate-400', badge: 'bg-slate-100', label: 'Info' }
    };
    return styles[gravite] || styles['moyenne'];
  },
  
  getStatutStyle: (statut) => {
    const styles = {
      'en_attente': { bg: 'bg-amber-100', color: 'text-amber-800', label: 'En attente', dot: 'bg-amber-500' },
      'validee': { bg: 'bg-emerald-100', color: 'text-emerald-800', label: 'Validée', dot: 'bg-emerald-500' },
      'refusee': { bg: 'bg-red-100', color: 'text-red-800', label: 'Refusée', dot: 'bg-red-500' },
      'corrigee': { bg: 'bg-blue-100', color: 'text-blue-800', label: 'Corrigée', dot: 'bg-blue-500' },
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
      // Augmenter la limite pour voir plus d'anomalies historiques
      params.append('limit', '500');

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

      const label = action === 'valider' ? 'validée' : 'refusée';
      
      if (showToast) showToast(`Anomalie ${label}`, action === 'valider' ? 'success' : 'warning');
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
    <div className="flex flex-col h-full bg-white">
      {/* ═══════════════════════════════════════════════════════════════════════════
          HEADER - Style Dashboard léger et épuré
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        {/* En-tête principal */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icône simple */}
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[#cf292c]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  Anomalies
                  {stats.enAttente > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      {stats.enAttente}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500">Suivi et validation des écarts de pointage</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Bouton actualiser */}
              <button
                onClick={loadAnomalies}
                disabled={loading}
                className="px-3 py-2 text-sm font-medium text-[#cf292c] bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              {embedded && onClose && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* ═══ KPIs Cards - Style léger ═══ */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            <StatKpiCard 
              label="Total" 
              value={stats.total} 
              icon={ClipboardList} 
              color="slate"
            />
            <StatKpiCard 
              label="En attente" 
              value={stats.enAttente} 
              icon={Timer} 
              color="amber"
              active={filtres.statut === 'en_attente'}
              onClick={() => handleFilterChange('statut', filtres.statut === 'en_attente' ? '' : 'en_attente')}
            />
            <StatKpiCard 
              label="Validées" 
              value={stats.validees} 
              icon={CheckCircle} 
              color="emerald"
              active={filtres.statut === 'validee'}
              onClick={() => handleFilterChange('statut', filtres.statut === 'validee' ? '' : 'validee')}
            />
            <StatKpiCard 
              label="Refusées" 
              value={stats.refusees} 
              icon={XCircle} 
              color="red"
              active={filtres.statut === 'refusee'}
              onClick={() => handleFilterChange('statut', filtres.statut === 'refusee' ? '' : 'refusee')}
            />
            <StatKpiCard 
              label="Critiques" 
              value={stats.critiques} 
              icon={AlertOctagon} 
              color="rose"
              active={filtres.gravite === 'critique'}
              onClick={() => handleFilterChange('gravite', filtres.gravite === 'critique' ? '' : 'critique')}
            />
          </div>
        </div>

        {/* ═══ Barre d'outils - Style léger ═══ */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom, type..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c]/40 transition-all placeholder:text-slate-400"
            />
            {recherche && (
              <button 
                onClick={() => setRecherche('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtres rapides pills */}
          <div className="flex items-center gap-2">
            <select
              value={filtres.statut}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              className="px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30 cursor-pointer"
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
              className="px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30 cursor-pointer"
            >
              <option value="">Toutes gravités</option>
              <option value="critique">Critique</option>
              <option value="moyenne">Moyenne</option>
              <option value="attention">Attention</option>
              <option value="a_valider">À valider</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2.5 py-1.5 text-sm rounded-lg border flex items-center gap-1.5 transition-colors ${
                showFilters 
                  ? 'bg-red-50 text-[#cf292c] border-red-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {(recherche || filtres.statut || filtres.gravite || filtres.type) && (
              <button
                onClick={resetFilters}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-[#cf292c] transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="px-5 py-3 bg-white border-t border-slate-100">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type d'anomalie</label>
                <select
                  value={filtres.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30"
                >
                  <option value="">Tous types</option>
                  <option value="absence_injustifiee">Absence injustifiée</option>
                  <option value="extra_potentiel">Extra potentiel</option>
                  <option value="missing_out">Sortie manquante</option>
                  <option value="missing_in">Entrée manquante</option>
                  <option value="pointage_hors_planning">Hors planning</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date début</label>
                <input
                  type="date"
                  value={filtres.dateDebut}
                  onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filtres.dateFin}
                  onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#cf292c]/30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          LISTE DES ANOMALIES - Style Dashboard épuré
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Chargement...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center bg-white rounded-xl p-5 border border-slate-200">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-slate-700 font-medium text-sm mb-1">Erreur de chargement</p>
              <p className="text-slate-500 text-xs mb-3">{error}</p>
              <button 
                onClick={loadAnomalies} 
                className="px-3 py-1.5 text-xs font-medium text-[#cf292c] bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : anomaliesFiltrees.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-slate-700 font-medium">Aucune anomalie</p>
              <p className="text-slate-400 text-sm mt-1">
                {filtres.statut === 'en_attente' ? 'Tout est en ordre !' : 'Modifiez les filtres'}
              </p>
              {(recherche || filtres.statut || filtres.gravite) && (
                <button 
                  onClick={resetFilters} 
                  className="mt-3 text-sm text-[#cf292c] hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {anomaliesFiltrees.map((anomalie) => {
              const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
              const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
              const TypeIcon = anomaliesUtils.getTypeIcon(anomalie.type);
              const isProcessing = processing.has(anomalie.id);

              return (
                <div 
                  key={anomalie.id} 
                  className={`bg-white rounded-xl border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-sm ${
                    isProcessing ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar employé */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#cf292c] font-semibold text-sm">
                      {anomalie.employe?.prenom?.[0]}{anomalie.employe?.nom?.[0]}
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      {/* Ligne 1: Nom + Badges */}
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="font-medium text-slate-900">
                          {anomalie.employe?.prenom} {anomalie.employe?.nom}
                        </span>
                        
                        {/* Badge gravité */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${graviteStyle.badge} ${graviteStyle.color}`}>
                          <span className={`w-1 h-1 rounded-full ${graviteStyle.dotColor}`}></span>
                          {anomalie.gravite}
                        </span>
                        
                        {/* Badge statut */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                          <span className={`w-1 h-1 rounded-full ${statutStyle.dot}`}></span>
                          {statutStyle.label}
                        </span>
                      </div>
                      
                      {/* Ligne 2: Date + Type */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {anomaliesUtils.formatDate(anomalie.date)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <TypeIcon className="w-3 h-3" />
                          {anomaliesUtils.getTypeLabel(anomalie.type)}
                        </span>
                        {anomalie.details?.ecartMinutes && (
                          <span className={`font-medium ${
                            anomalie.details.ecartMinutes > 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {anomalie.details.ecartMinutes > 0 ? '+' : ''}{anomalie.details.ecartMinutes} min
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {anomalie.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      {anomalie.statut === 'en_attente' ? (
                        <div className="flex items-center gap-1">
                          {/* Bouton valider */}
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'valider')}
                            disabled={isProcessing}
                            className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          
                          {/* Bouton refuser */}
                          <button
                            onClick={() => handleQuickAction(anomalie.id, 'refuser')}
                            disabled={isProcessing}
                            className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Refuser"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          {/* Bouton détails */}
                          <button
                            onClick={() => setAnomalieSelectionnee(anomalie)}
                            disabled={isProcessing}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Plus d'options"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {anomalie.traiteur && (
                            <span className="text-xs text-slate-400">
                              par {anomalie.traiteur.prenom}
                            </span>
                          )}
                          <button
                            onClick={() => setAnomalieSelectionnee(anomalie)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Détails"
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

      {/* Modale de traitement */}
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
    <div className="h-full bg-slate-50/50">
      {content}
    </div>
  );
}
