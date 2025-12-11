import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Train, Eye, Check, X, Clock, FileText, AlertCircle, AlertTriangle, MessageSquare } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Composant onglet Navigo pour la fiche employé (Vue Admin)
 * L'admin peut :
 * - Voir les justificatifs envoyés par l'employé
 * - Valider/refuser les justificatifs mensuels
 * 
 * Tous les employés peuvent envoyer leurs justificatifs (pas de toggle d'éligibilité)
 * L'admin valide ou refuse avec motif si non éligible
 */
export default function NavigoEmployeTab({ employe, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [justificatifsMensuels, setJustificatifsMensuels] = useState([]);
  const [loadingMensuels, setLoadingMensuels] = useState(false);
  
  // États des modals
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [selectedJustificatif, setSelectedJustificatif] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('token');

  // Charger les justificatifs mensuels
  const fetchJustificatifsMensuels = useCallback(async () => {
    if (!employe?.id) return;
    
    setLoadingMensuels(true);
    try {
      const response = await axios.get(`${API_URL}/api/navigo/mensuel/admin/employe/${employe.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJustificatifsMensuels(response.data.justificatifs || []);
    } catch (error) {
      console.error('Erreur chargement justificatifs mensuels:', error);
    } finally {
      setLoadingMensuels(false);
      setLoading(false);
    }
  }, [employe?.id, token]);

  useEffect(() => {
    fetchJustificatifsMensuels();
  }, [fetchJustificatifsMensuels]);

  // Valider un justificatif mensuel
  const confirmValidate = async () => {
    if (!selectedJustificatif) return;
    
    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/api/navigo/mensuel/admin/${selectedJustificatif.id}/statut`, {
        statut: 'valide'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Justificatif validé avec succès' });
      fetchJustificatifsMensuels();
    } catch (error) {
      console.error('Erreur validation:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la validation' });
    } finally {
      setActionLoading(false);
      setShowValidateModal(false);
      setSelectedJustificatif(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Refuser un justificatif mensuel
  const confirmRefuse = async () => {
    if (!selectedJustificatif) return;
    
    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/api/navigo/mensuel/admin/${selectedJustificatif.id}/statut`, {
        statut: 'refuse',
        motifRefus: motifRefus.trim() || 'Non conforme'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Justificatif refusé' });
      fetchJustificatifsMensuels();
    } catch (error) {
      console.error('Erreur refus:', error);
      setMessage({ type: 'error', text: 'Erreur lors du refus' });
    } finally {
      setActionLoading(false);
      setShowRefuseModal(false);
      setSelectedJustificatif(null);
      setMotifRefus('');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Ouvrir modal de validation
  const openValidateModal = (justif) => {
    setSelectedJustificatif(justif);
    setShowValidateModal(true);
  };

  // Ouvrir modal de refus
  const openRefuseModal = (justif) => {
    setSelectedJustificatif(justif);
    setMotifRefus('');
    setShowRefuseModal(true);
  };

  // Formater le mois
  const formatMois = (mois, annee) => {
    const date = new Date(annee, mois - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Badge de statut
  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'valide':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Check className="w-3 h-3" /> Validé</span>;
      case 'refuse':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><X className="w-3 h-3" /> Refusé</span>;
      case 'en_attente':
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> En attente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100">
          <Train className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Justificatifs Navigo</p>
          <p className="text-xs text-gray-500">Validez ou refusez les justificatifs envoyés par l'employé</p>
        </div>
      </div>

      {/* Section Justificatifs Mensuels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Historique des justificatifs</h4>
          {justificatifsMensuels.filter(j => j.statut === 'en_attente').length > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {justificatifsMensuels.filter(j => j.statut === 'en_attente').length} en attente
            </span>
          )}
        </div>

        {loadingMensuels ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#cf292c]"></div>
          </div>
        ) : justificatifsMensuels.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Aucun justificatif mensuel soumis par l'employé</p>
            <p className="text-xs text-gray-400 mt-1">Les justificatifs apparaîtront ici une fois envoyés</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date envoi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {justificatifsMensuels.map((justif) => (
                  <tr key={justif.id} className={`hover:bg-gray-50 ${justif.statut === 'en_attente' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {formatMois(justif.mois, justif.annee)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(justif.dateUpload).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatutBadge(justif.statut)}
                        {justif.motifRefus && (
                          <span className="text-[10px] text-red-600 max-w-[150px] truncate" title={justif.motifRefus}>
                            {justif.motifRefus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`${API_URL}${justif.fichier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          title="Voir le justificatif"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        {justif.statut === 'en_attente' && (
                          <>
                            <button
                              onClick={() => openValidateModal(justif)}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                              title="Valider"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRefuseModal(justif)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                              title="Refuser"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-800">
          <strong>ℹ️ Fonctionnement :</strong> L'employé soumet ses justificatifs Navigo depuis son espace personnel. 
          Validez pour confirmer le remboursement, ou refusez avec un motif (document non conforme, employé non éligible, etc.).
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {/* Modal Confirmation Validation */}
      {showValidateModal && selectedJustificatif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Valider ce justificatif ?</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Vous êtes sur le point de valider le justificatif Navigo de <strong>{employe?.prenom} {employe?.nom}</strong> pour le mois de <strong className="capitalize">{formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}</strong>.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <a
                  href={`${API_URL}${selectedJustificatif.fichier}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir le justificatif avant validation
                </a>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setSelectedJustificatif(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmValidate}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <Check className="w-4 h-4" />
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refus avec Motif */}
      {showRefuseModal && selectedJustificatif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Refuser ce justificatif ?</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Vous êtes sur le point de refuser le justificatif Navigo de <strong>{employe?.prenom} {employe?.nom}</strong>.
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Motif du refus
                </label>
                <textarea
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  placeholder="Ex: Document illisible, mauvaise période, justificatif non conforme..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
                <p className="text-xs text-gray-400">
                  Ce motif sera visible par l'employé
                </p>
              </div>

              {/* Motifs rapides */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Motifs rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {['Document illisible', 'Mauvaise période', 'Justificatif incomplet', 'Document non conforme'].map((motif) => (
                    <button
                      key={motif}
                      onClick={() => setMotifRefus(motif)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        motifRefus === motif 
                          ? 'bg-red-100 border-red-300 text-red-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {motif}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRefuseModal(false);
                  setSelectedJustificatif(null);
                  setMotifRefus('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRefuse}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <X className="w-4 h-4" />
                Refuser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
