// client/src/components/anomalies/AnomalieActionModal.jsx
import React, { useState } from 'react';
import { Check, X, Edit, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '../Toast';
import { API_BASE } from '../../config/api';

export default function AnomalieActionModal({ anomalie, onClose, onSuccess }) {
  const { showToast, ToastContainer } = useToast();
  const [action, setAction] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [payerHeuresManquantes, setPayerHeuresManquantes] = useState(false);
  const [shiftCorrection, setShiftCorrection] = useState({
    type: '',
    nouvelleHeure: '',
    raison: '',
    preuves: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    // Validation
    if (!commentaire && action !== 'corriger') {
      setError('Le commentaire est requis');
      return;
    }

    if (action === 'corriger' && !shiftCorrection.raison) {
      setError('La justification de la correction est obligatoire');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/anomalies/${anomalie.id}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          commentaire,
          payerHeuresManquantes: action === 'valider' ? payerHeuresManquantes : false,
          heuresARecuperer: action === 'valider' && payerHeuresManquantes ? heuresManquantes : 0,
          shiftCorrection: action === 'corriger' ? shiftCorrection : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du traitement');
      }

      const data = await response.json();
      
      // Message de succès simple et clair
      const emoji = action === 'valider' ? '✅' : action === 'refuser' ? '❌' : '🔧';
      const actionLabel = action === 'valider' ? 'validée' : action === 'refuser' ? 'refusée' : 'corrigée';
      const toastType = action === 'refuser' ? 'error' : 'success';
      
      let message = `${emoji} Anomalie ${actionLabel} avec succès !`;
      
      if (action === 'valider') {
        if (data.payerHeuresManquantes && data.heuresARecuperer > 0) {
          message += ` 💰 ${data.heuresARecuperer.toFixed(2)}h seront payées (justification acceptée).`;
        } else {
          message += ' Justification acceptée.';
        }
      } else if (action === 'refuser') {
        message += ' Justification non recevable.';
      } else if (data.shiftModifie) {
        message += ' Shift corrigé.';
      }

      showToast(message, toastType, 4000);
      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDetails = (details) => {
    if (!details) return null;
    return typeof details === 'string' ? JSON.parse(details) : details;
  };

  const details = formatDetails(anomalie.details);
  
  // Calculer les heures manquantes
  const heuresManquantes = details?.ecartMinutes ? Math.abs(details.ecartMinutes) / 60 : 0;

  return (
    <>
      <ToastContainer />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Traiter l'anomalie</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Détails anomalie */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Employé:</span>
                <p className="text-gray-900 font-medium mt-1">
                  {anomalie.employe?.prenom} {anomalie.employe?.nom}
                </p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Date:</span>
                <p className="text-gray-900 font-medium mt-1">
                  {new Date(anomalie.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Type:</span>
                <p className="text-gray-900 font-medium mt-1">
                  {anomalie.type.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Gravité:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  anomalie.gravite === 'critique' ? 'bg-red-100 text-red-700' :
                  anomalie.gravite === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {anomalie.gravite.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="font-semibold text-gray-600">Description:</span>
              <p className="text-gray-700 mt-2 leading-relaxed">{anomalie.description}</p>
            </div>

            {details && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="font-semibold text-gray-600">Détails:</span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {details.ecartMinutes && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Écart:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {Math.abs(details.ecartMinutes)} minutes
                      </span>
                    </div>
                  )}
                  {details.heurePrevu && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Heure prévue:</span>
                      <span className="ml-2 font-medium">{details.heurePrevu}</span>
                    </div>
                  )}
                  {details.heureReelle && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Heure réelle:</span>
                      <span className="ml-2 font-medium">{details.heureReelle}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {anomalie.justificationEmploye && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">Justification employé:</span>
                </div>
                <p className="text-gray-700 italic bg-white p-3 rounded">
                  "{anomalie.justificationEmploye}"
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Choix action */}
          {!action ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Choisissez une action à effectuer :
              </p>

              <button
                onClick={() => setAction('valider')}
                className="w-full flex items-start gap-4 p-5 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all group"
              >
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-lg text-green-700 mb-1">✅ VALIDER</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    La justification est acceptable (certificat médical, urgence familiale, etc.).
                    <strong className="text-green-700"> Option paiement heures disponible.</strong>
                  </div>
                  <div className="mt-2 text-xs bg-white px-3 py-1 rounded inline-block border border-green-200">
                    ❌ Shift NON modifié • ✅ Justification acceptée
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAction('refuser')}
                className="w-full flex items-start gap-4 p-5 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all group"
              >
                <div className="bg-red-100 p-3 rounded-lg group-hover:bg-red-200 transition">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-lg text-red-700 mb-1">❌ REFUSER</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    Justification absente ou non recevable.
                    <strong className="text-red-700"> Alerte si ≥5 refus.</strong>
                  </div>
                  <div className="mt-2 text-xs bg-white px-3 py-1 rounded inline-block border border-red-200">
                    ❌ Shift NON modifié • ⚠️ Compteur anomalies refusées
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAction('corriger')}
                className="w-full flex items-start gap-4 p-5 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition">
                  <Edit className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-lg text-blue-700 mb-1">🔧 CORRIGER</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    Erreur administrative avérée (planning incorrect, formation oubliée, badge HS).
                    <strong className="text-blue-700"> Shift sera corrigé.</strong>
                  </div>
                  <div className="mt-2 text-xs bg-white px-3 py-1 rounded inline-block border border-blue-200">
                    ✅ Shift MODIFIÉ • 📝 Audit complet • 🔒 RH uniquement
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alert selon action */}
              {action === 'corriger' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-bold mb-1">⚠️ ATTENTION - Action sensible</p>
                      <p>
                        Cette action va <strong>modifier définitivement le shift original</strong>. 
                        Utilisez cette option UNIQUEMENT pour les erreurs administratives avérées 
                        (erreur saisie, formation non inscrite, incident technique prouvé).
                      </p>
                      <p className="mt-2 text-xs">
                        L'ancienne version sera conservée dans l'historique avec audit trail complet.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {action === 'refuser' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-bold mb-1">⚠️ Refus d'anomalie</p>
                      <p>
                        L'anomalie sera marquée comme <strong>refusée</strong>.
                        Une alerte RH sera déclenchée si l'employé atteint 5 refus.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire correction shift */}
              {action === 'corriger' && (
                <div className="space-y-4 bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Correction du shift
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'erreur <span className="text-red-500">*</span>
                    </label>
                    <select 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={shiftCorrection.type}
                      onChange={(e) => setShiftCorrection({
                        ...shiftCorrection,
                        type: e.target.value
                      })}
                    >
                      <option value="">Sélectionner le type d'erreur...</option>
                      <option value="erreur_admin">📝 Erreur de saisie administrative</option>
                      <option value="changement_planning">📅 Changement planning non saisi</option>
                      <option value="incident_technique">⚙️ Incident technique (badge, système)</option>
                      <option value="formation">🎓 Formation non inscrite au planning</option>
                      <option value="reunion">👥 Réunion/convocation non planifiée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nouvelle heure correcte
                    </label>
                    <input 
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={shiftCorrection.nouvelleHeure}
                      onChange={(e) => setShiftCorrection({
                        ...shiftCorrection,
                        nouvelleHeure: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Indiquez l'heure qui aurait dû être dans le planning
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Justification détaillée <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="4"
                      placeholder="Détaillez la raison de la correction (références, preuves, documents...)"
                      value={shiftCorrection.raison}
                      onChange={(e) => setShiftCorrection({
                        ...shiftCorrection,
                        raison: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: "Email de convocation à réunion du 25/11 à 10h, envoyé par Direction le 22/11"
                    </p>
                  </div>
                </div>
              )}

              {/* Option paiement heures pour validation */}
              {action === 'valider' && heuresManquantes > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="payerHeures"
                      checked={payerHeuresManquantes}
                      onChange={(e) => setPayerHeuresManquantes(e.target.checked)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="payerHeures" className="font-medium text-green-900 cursor-pointer">
                        💰 Payer les heures manquantes
                      </label>
                      <p className="text-sm text-green-700 mt-1">
                        L'employé a perdu <strong>{heuresManquantes.toFixed(2)}h</strong> ({Math.round(heuresManquantes * 60)} minutes).
                        Cochez cette case si la justification est médicale/familiale et que les heures doivent être rémunérées.
                      </p>
                      <div className="mt-2 text-xs bg-white p-2 rounded border border-green-200">
                        {payerHeuresManquantes ? (
                          <span className="text-green-800">
                            ✅ Impact paie: <strong>Heures complètes payées</strong> (justification acceptée)
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            ℹ️ Impact paie: <strong>Heures réelles payées</strong> (retard déduit du salaire)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commentaire manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire {action === 'corriger' ? '(optionnel)' : <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder={
                    action === 'valider' ? "Ex: Certificat médical fourni et vérifié" :
                    action === 'refuser' ? "Ex: Aucun justificatif malgré 2 relances. Récidive 3ème fois ce mois." :
                    "Commentaire additionnel sur la correction..."
                  }
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setAction(null);
                    setError(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || (action === 'corriger' && !shiftCorrection.raison)}
                  className={`flex-1 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all ${
                    action === 'valider' ? 'bg-green-600 hover:bg-green-700 hover:shadow-xl' :
                    action === 'refuser' ? 'bg-red-600 hover:bg-red-700 hover:shadow-xl' :
                    'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Traitement...
                    </span>
                  ) : (
                    `Confirmer ${
                      action === 'valider' ? 'la validation' :
                      action === 'refuser' ? 'le refus' :
                      'la correction'
                    }`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
