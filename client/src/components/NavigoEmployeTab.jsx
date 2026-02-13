import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Eye, Check, X, Clock, FileText, AlertCircle, Info, CheckCircle2, XCircle, RefreshCw, ShieldCheck, ShieldX, CalendarDays } from 'lucide-react';
import { API_URL } from '../config/api';

/**
 * Composant onglet Navigo pour la fiche employé (Vue Admin)
 * Design aligné avec la charte de l'app (#cf292c)
 */
export default function NavigoEmployeTab({ employe, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [justificatifsMensuels, setJustificatifsMensuels] = useState([]);
  const [loadingMensuels, setLoadingMensuels] = useState(false);
  
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [selectedJustificatif, setSelectedJustificatif] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('token');

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
      if (onUpdate) onUpdate();
      window.dispatchEvent(new Event('navigo-updated'));
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
      if (onUpdate) onUpdate();
      window.dispatchEvent(new Event('navigo-updated'));
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

  const openValidateModal = (justif) => {
    setSelectedJustificatif(justif);
    setShowValidateModal(true);
  };

  const openRefuseModal = (justif) => {
    setSelectedJustificatif(justif);
    setMotifRefus('');
    setShowRefuseModal(true);
  };

  const formatMois = (mois, annee) => {
    const date = new Date(annee, mois - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'valide':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Validé
          </span>
        );
      case 'refuse':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-[#cf292c] border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Refusé
          </span>
        );
      case 'en_attente':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> En attente
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#cf292c]"></div>
      </div>
    );
  }

  const enAttenteCount = justificatifsMensuels.filter(j => j.statut === 'en_attente').length;
  const validesCount = justificatifsMensuels.filter(j => j.statut === 'valide').length;
  const refusesCount = justificatifsMensuels.filter(j => j.statut === 'refuse').length;

  return (
    <div className="space-y-5">
      {/* Toast message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-[#cf292c] border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-xl p-3 text-center border transition-all ${
          enAttenteCount > 0 ? 'bg-amber-50 border-amber-200 shadow-sm shadow-amber-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`text-xl font-bold ${enAttenteCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
            {enAttenteCount}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Clock className={`w-3 h-3 ${enAttenteCount > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${enAttenteCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              En attente
            </span>
          </div>
        </div>
        <div className={`rounded-xl p-3 text-center border transition-all ${
          validesCount > 0 ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`text-xl font-bold ${validesCount > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
            {validesCount}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <CheckCircle2 className={`w-3 h-3 ${validesCount > 0 ? 'text-emerald-500' : 'text-gray-300'}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${validesCount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              Validés
            </span>
          </div>
        </div>
        <div className={`rounded-xl p-3 text-center border transition-all ${
          refusesCount > 0 ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`text-xl font-bold ${refusesCount > 0 ? 'text-[#cf292c]' : 'text-gray-300'}`}>
            {refusesCount}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <XCircle className={`w-3 h-3 ${refusesCount > 0 ? 'text-red-500' : 'text-gray-300'}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${refusesCount > 0 ? 'text-[#cf292c]' : 'text-gray-400'}`}>
              Refusés
            </span>
          </div>
        </div>
      </div>

      {/* Historique des justificatifs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-800">Historique</h4>
          </div>
          <button
            onClick={fetchJustificatifsMensuels}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#cf292c] hover:bg-red-50 transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMensuels ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingMensuels ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-[#cf292c]"></div>
          </div>
        ) : justificatifsMensuels.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Aucun justificatif</p>
            <p className="text-xs text-gray-400 mt-1">Les justificatifs apparaitront ici une fois envoyés par l'employé</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {justificatifsMensuels.map((justif) => (
              <div 
                key={justif.id} 
                className={`rounded-xl border transition-all ${
                  justif.statut === 'en_attente' 
                    ? 'bg-white border-amber-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Ligne principale */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    justif.statut === 'en_attente' ? 'bg-amber-50 border border-amber-100' :
                    justif.statut === 'valide' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      justif.statut === 'en_attente' ? 'text-amber-500' :
                      justif.statut === 'valide' ? 'text-emerald-500' : 'text-red-500'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {formatMois(justif.mois, justif.annee)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Envoyé le {new Date(justif.dateUpload).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {getStatutBadge(justif.statut)}
                  </div>
                </div>

                {/* Motif refus */}
                {justif.motifRefus && (
                  <div className="mx-4 mb-3 px-3 py-2 bg-red-50/60 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span><strong>Motif :</strong> {justif.motifRefus}</span>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 pb-3 flex items-center gap-2">
                  <a
                    href={`${API_URL}/api/navigo/fichier/${justif.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Voir
                  </a>
                  {justif.statut === 'en_attente' && (
                    <>
                      <button
                        onClick={() => openValidateModal(justif)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        onClick={() => openRefuseModal(justif)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#cf292c] bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-600">Fonctionnement :</span> L'employé soumet ses justificatifs depuis son espace. 
          Validez pour confirmer le remboursement, ou refusez avec un motif.
        </p>
      </div>

      {/* Modal Confirmation Validation */}
      {showValidateModal && selectedJustificatif && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Valider ce justificatif</h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Vous confirmez le justificatif Navigo de <strong>{employe?.prenom} {employe?.nom}</strong> pour <strong className="capitalize">{formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}</strong>.
              </p>
              <a
                href={`${API_URL}/api/navigo/fichier/${selectedJustificatif.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Eye className="w-4 h-4 text-gray-400" />
                Voir le justificatif avant validation
              </a>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => { setShowValidateModal(false); setSelectedJustificatif(null); }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmValidate}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refus avec Motif */}
      {showRefuseModal && selectedJustificatif && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100">
                  <ShieldX className="w-5 h-5 text-[#cf292c]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Refuser ce justificatif</h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {formatMois(selectedJustificatif.mois, selectedJustificatif.annee)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Motif du refus
                </label>
                <textarea
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  placeholder="Ex: Document illisible, mauvaise période..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] resize-none outline-none transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400">Ce motif sera visible par l'employé</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['Document illisible', 'Mauvaise période', 'Justificatif incomplet', 'Non conforme', 'Non éligible'].map((motif) => (
                  <button
                    key={motif}
                    onClick={() => setMotifRefus(motif)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                      motifRefus === motif 
                        ? 'bg-red-50 border-red-300 text-[#cf292c]' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {motif}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => { setShowRefuseModal(false); setSelectedJustificatif(null); setMotifRefus(''); }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRefuse}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-[#cf292c] rounded-xl hover:bg-[#b82325] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Refuser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
