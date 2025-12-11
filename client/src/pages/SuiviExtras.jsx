// client/src/pages/SuiviExtras.jsx
import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Calendar, 
  User, 
  Filter, 
  Search, 
  Check, 
  X, 
  Clock, 
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Calculator,
  Zap
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function SuiviExtras() {
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtres
  const [filtres, setFiltres] = useState({
    statut: '',
    employeId: '',
    dateDebut: '',
    dateFin: '',
    source: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recherche, setRecherche] = useState('');
  
  // Modal de paiement
  const [paiementAMarquer, setPaiementAMarquer] = useState(null);
  const [methodeConfirmation, setMethodeConfirmation] = useState('especes');
  const [referenceConfirmation, setReferenceConfirmation] = useState('');
  
  // Stats du mois
  const [moisStats, setMoisStats] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Headers avec token
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Charger les paiements
  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.employeId) params.append('employeId', filtres.employeId);
      if (filtres.dateDebut) params.append('dateDebut', filtres.dateDebut);
      if (filtres.dateFin) params.append('dateFin', filtres.dateFin);
      if (filtres.source) params.append('source', filtres.source);
      
      const response = await axios.get(`${API_URL}/api/paiements-extras?${params.toString()}`, getAuthHeaders());
      setPaiements(response.data.paiements || []);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setError('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  // Charger les stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/paiements-extras/stats?mois=${moisStats}`, getAuthHeaders());
      setStats(response.data.stats);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  useEffect(() => {
    fetchPaiements();
    fetchStats();
  }, [filtres, moisStats]);

  // Marquer comme payé
  const handleMarquerPaye = async () => {
    if (!paiementAMarquer) return;
    
    try {
      await axios.put(`${API_URL}/api/paiements-extras/${paiementAMarquer.id}/payer`, {
        methodePaiement: methodeConfirmation,
        reference: referenceConfirmation || undefined
      }, getAuthHeaders());
      
      setPaiementAMarquer(null);
      setMethodeConfirmation('especes');
      setReferenceConfirmation('');
      fetchPaiements();
      fetchStats();
      
      alert('✅ Paiement marqué comme effectué !');
    } catch (err) {
      console.error('Erreur marquage paiement:', err);
      alert('❌ Erreur lors du marquage du paiement');
    }
  };

  // Annuler un paiement
  const handleAnnuler = async (paiement) => {
    const raison = prompt('Raison de l\'annulation (optionnel):');
    if (raison === null) return; // Annulé par l'utilisateur
    
    try {
      await axios.put(`${API_URL}/api/paiements-extras/${paiement.id}/annuler`, { raison }, getAuthHeaders());
      fetchPaiements();
      fetchStats();
      alert('Paiement annulé');
    } catch (err) {
      console.error('Erreur annulation:', err);
      alert('Erreur lors de l\'annulation');
    }
  };

  // Recalculer les heures réelles depuis les pointages
  const handleRecalculerTous = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_URL}/api/paiements-extras/recalculer-tous`, {}, getAuthHeaders());
      fetchPaiements();
      fetchStats();
      alert(`✅ ${response.data.updated}/${response.data.total} paiements mis à jour avec les heures réelles`);
    } catch (err) {
      console.error('Erreur recalcul:', err);
      alert('❌ Erreur lors du recalcul des heures');
    } finally {
      setLoading(false);
    }
  };

  // Recalculer un seul paiement
  const handleRecalculerUn = async (paiementId) => {
    try {
      await axios.put(`${API_URL}/api/paiements-extras/${paiementId}/recalculer`, {}, getAuthHeaders());
      fetchPaiements();
    } catch (err) {
      console.error('Erreur recalcul:', err);
      alert('❌ Erreur lors du recalcul');
    }
  };

  // Filtrer localement par recherche
  const paiementsFiltres = paiements.filter(p => {
    if (!recherche) return true;
    const term = recherche.toLowerCase();
    return (
      p.employe?.nom?.toLowerCase().includes(term) ||
      p.employe?.prenom?.toLowerCase().includes(term) ||
      p.commentaire?.toLowerCase().includes(term)
    );
  });

  // Formatters
  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  const formatMontant = (montant) => `${Number(montant).toFixed(2)} €`;
  const formatHeures = (heures) => {
    const h = Math.floor(heures);
    const m = Math.round((heures - h) * 60);
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  };

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'a_payer':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">⏳ À payer</span>;
      case 'paye':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Payé</span>;
      case 'annule':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">❌ Annulé</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{statut}</span>;
    }
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'shift_extra':
        return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Shift Extra</span>;
      case 'anomalie_heures_sup':
        return <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">Heures sup</span>;
      case 'manuel':
        return <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">Manuel</span>;
      default:
        return <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">{source}</span>;
    }
  };

  const getMethodeBadge = (methode) => {
    switch (methode) {
      case 'especes':
        return '💵';
      case 'virement':
        return '🏦';
      case 'cheque':
        return '📝';
      default:
        return '💰';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="h-7 w-7 text-purple-600" />
            Suivi des Paiements Extras
          </h1>
          <p className="text-gray-600 mt-1">
            Paiements en espèces (hors fiche de paie) - Heures supplémentaires et extras
          </p>
        </div>

        {/* Statistiques du mois */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">À Payer</p>
                  <p className="text-2xl font-bold text-amber-600">{formatMontant(stats.parStatut?.a_payer?.montant || 0)}</p>
                  <p className="text-xs text-gray-500">{stats.parStatut?.a_payer?.nombre || 0} paiement(s)</p>
                </div>
                <Clock className="h-8 w-8 text-amber-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Payé ce mois</p>
                  <p className="text-2xl font-bold text-green-600">{formatMontant(stats.parStatut?.paye?.montant || 0)}</p>
                  <p className="text-xs text-gray-500">{stats.parStatut?.paye?.nombre || 0} paiement(s)</p>
                </div>
                <Check className="h-8 w-8 text-green-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Heures Extras</p>
                  <p className="text-2xl font-bold text-purple-600">{formatHeures(stats.totaux?.heuresTotal || 0)}</p>
                  <p className="text-xs text-gray-500">ce mois</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total du mois</p>
                  <p className="text-2xl font-bold text-blue-600">{formatMontant(stats.totaux?.montantTotal || 0)}</p>
                  <p className="text-xs text-gray-500">{stats.totaux?.nombrePaiements || 0} paiement(s)</p>
                </div>
                <Banknote className="h-8 w-8 text-blue-200" />
              </div>
            </div>
          </div>
        )}

        {/* Sélecteur de mois pour stats */}
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-600">Statistiques du mois:</label>
          <input
            type="month"
            value={moisStats}
            onChange={(e) => setMoisStats(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Barre d'actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Recherche */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtres
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              <button
                onClick={handleRecalculerTous}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                title="Recalculer les heures réelles depuis les pointages"
              >
                <Calculator className="h-4 w-4" />
                Recalculer heures
              </button>
              
              <button
                onClick={() => { fetchPaiements(); fetchStats(); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Panneau de filtres */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filtres.statut}
                  onChange={(e) => setFiltres({...filtres, statut: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Tous</option>
                  <option value="a_payer">À payer</option>
                  <option value="paye">Payé</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={filtres.source}
                  onChange={(e) => setFiltres({...filtres, source: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Toutes</option>
                  <option value="shift_extra">Shift Extra</option>
                  <option value="anomalie_heures_sup">Heures sup</option>
                  <option value="manuel">Manuel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={filtres.dateDebut}
                  onChange={(e) => setFiltres({...filtres, dateDebut: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filtres.dateFin}
                  onChange={(e) => setFiltres({...filtres, dateFin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFiltres({ statut: '', employeId: '', dateDebut: '', dateFin: '', source: '' })}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des paiements */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : paiementsFiltres.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun paiement extra trouvé</p>
              <p className="text-sm">Les paiements apparaîtront ici quand vous traiterez des heures sup en mode "Payer en Extra"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Prévues</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Réelles</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Écart</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paiementsFiltres.map((paiement) => (
                    <tr key={paiement.id} className={`hover:bg-gray-50 ${paiement.statut === 'a_payer' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {paiement.employe?.prenom} {paiement.employe?.nom}
                            </p>
                            {paiement.commentaire && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{paiement.commentaire}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(paiement.dateTravail)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getSourceBadge(paiement.source)}
                      </td>
                      {/* Heures Prévues */}
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {paiement.heuresPrevues != null ? formatHeures(paiement.heuresPrevues) : formatHeures(paiement.heures)}
                      </td>
                      {/* Heures Réelles */}
                      <td className="px-4 py-3 text-center">
                        {paiement.pointageValide ? (
                          <span className="font-medium text-green-600">
                            {formatHeures(paiement.heuresReelles)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            En attente
                          </span>
                        )}
                      </td>
                      {/* Écart */}
                      <td className="px-4 py-3 text-center">
                        {paiement.pointageValide && paiement.ecartHeures != null ? (
                          <span className={`text-sm font-medium ${
                            parseFloat(paiement.ecartHeures) > 0 ? 'text-green-600' :
                            parseFloat(paiement.ecartHeures) < 0 ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {parseFloat(paiement.ecartHeures) > 0 ? '+' : ''}
                            {formatHeures(Math.abs(parseFloat(paiement.ecartHeures)))}
                            {parseFloat(paiement.ecartHeures) < 0 && ' ⚠️'}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-purple-600">{formatMontant(paiement.montant)}</span>
                        <div className="text-xs text-gray-500">{paiement.tauxHoraire}€/h</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatutBadge(paiement.statut)}
                          {paiement.statut === 'paye' && paiement.payeLe && (
                            <span className="text-xs text-gray-500">
                              {getMethodeBadge(paiement.methodePaiement)} {formatDate(paiement.payeLe)}
                            </span>
                          )}
                          {paiement.statut === 'a_payer' && !paiement.pointageValide && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pointage incomplet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {paiement.statut === 'a_payer' && (
                          <div className="flex items-center justify-center gap-1">
                            {/* Bouton recalculer si pointage incomplet */}
                            {!paiement.pointageValide && paiement.source === 'shift_extra' && (
                              <button
                                onClick={() => handleRecalculerUn(paiement.id)}
                                className="p-1 text-amber-500 hover:text-amber-700 transition-colors"
                                title="Recalculer depuis pointages"
                              >
                                <Calculator className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setPaiementAMarquer(paiement)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                            >
                              Marquer payé
                            </button>
                            <button
                              onClick={() => handleAnnuler(paiement)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {paiement.statut === 'paye' && paiement.payeur && (
                          <span className="text-xs text-gray-500">
                            par {paiement.payeur.prenom}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de confirmation de paiement */}
        {paiementAMarquer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Confirmer le paiement
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">Employé:</p>
                <p className="font-medium">{paiementAMarquer.employe?.prenom} {paiementAMarquer.employe?.nom}</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {formatMontant(paiementAMarquer.montant)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatHeures(paiementAMarquer.heures)} à {paiementAMarquer.tauxHoraire}€/h
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Méthode de paiement
                  </label>
                  <select
                    value={methodeConfirmation}
                    onChange={(e) => setMethodeConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="especes">💵 Espèces</option>
                    <option value="virement">🏦 Virement</option>
                    <option value="cheque">📝 Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence (optionnel)
                  </label>
                  <input
                    type="text"
                    value={referenceConfirmation}
                    onChange={(e) => setReferenceConfirmation(e.target.value)}
                    placeholder="Ex: N° chèque, référence virement..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPaiementAMarquer(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleMarquerPaye}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Confirmer le paiement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
