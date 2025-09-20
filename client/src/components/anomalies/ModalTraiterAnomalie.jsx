// client/src/components/anomalies/ModalTraiterAnomalie.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useTraiterAnomalie } from '../../hooks/useAnomalies';
import { anomaliesUtils } from '../../hooks/useAnomalies';

/**
 * Modale pour traiter une anomalie (valider, refuser, corriger)
 */
export default function ModalTraiterAnomalie({
  anomalie,
  onClose,
  onTraited = null
}) {
  const [action, setAction] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [montantExtra, setMontantExtra] = useState('');
  const [heuresExtra, setHeuresExtra] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { traiterAnomalie, loading, error } = useTraiterAnomalie();

  // Initialiser les valeurs selon le type d'anomalie
  useEffect(() => {
    if (anomalie?.type?.includes('heures_sup')) {
      setHeuresExtra(anomalie.heuresExtra?.toString() || '');
      setMontantExtra(anomalie.montantExtra?.toString() || '');
    }
    
    // Si l'anomalie est déjà traitée, pré-sélectionner son statut actuel
    if (anomalie?.statut && ['validee', 'refusee', 'corrigee'].includes(anomalie.statut)) {
      const actionMap = {
        'validee': 'valider',
        'refusee': 'refuser',
        'corrigee': 'corriger'
      };
      setAction(actionMap[anomalie.statut]);
    }
  }, [anomalie]);

  if (!anomalie) return null;
  
  // Vérifier si l'anomalie a déjà été traitée
  const estDejaTraitee = anomalie.statut && ['validee', 'refusee', 'corrigee'].includes(anomalie.statut);

  const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
  const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
  const typeLabel = anomaliesUtils.getTypeLabel(anomalie.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) {
      alert('Veuillez sélectionner une action');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      const options = {
        commentaire: commentaire.trim() || undefined
      };

      // Pour les heures supplémentaires, inclure les montants
      if (anomalie.type.includes('heures_sup')) {
        if (heuresExtra) options.heuresExtra = parseFloat(heuresExtra);
        if (montantExtra) options.montantExtra = parseFloat(montantExtra);
      }

      const anomalieMAJ = await traiterAnomalie(anomalie.id, action, options);
      
      setShowConfirmation(false);
      onTraited?.(anomalieMAJ);
      onClose();
      
    } catch (error) {
      console.error('Erreur traitement anomalie:', error);
      setShowConfirmation(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'valider': return <CheckCircle className="h-4 w-4" />;
      case 'refuser': return <XCircle className="h-4 w-4" />;
      case 'corriger': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'valider': return 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100';
      case 'refuser': return 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100';
      case 'corriger': return 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${graviteStyle.bg}`}>
              <span className="text-lg">{graviteStyle.icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Traiter l'anomalie
              </h2>
              <p className="text-sm text-gray-600">
                {anomalie.employe?.prenom} {anomalie.employe?.nom} - {anomaliesUtils.formatDate(anomalie.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          
          {/* Détails de l'anomalie */}
          <div className={`p-4 rounded-lg border mb-6 ${graviteStyle.bg} ${graviteStyle.border}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                  {statutStyle.label}
                </span>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {typeLabel}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {anomaliesUtils.formatTime(anomalie.createdAt)}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">
              {anomalie.description}
            </p>

            {/* Détails spécifiques */}
            {anomalie.details && (
              <div className="grid grid-cols-2 gap-4 text-xs">
                {anomalie.details.ecartMinutes && (
                  <div>
                    <span className="text-gray-500">Écart:</span>
                    <span className="ml-1 font-medium">
                      {anomalie.details.ecartMinutes > 0 ? '+' : ''}{anomalie.details.ecartMinutes} min
                    </span>
                  </div>
                )}
                {anomalie.details.heurePrevu && (
                  <div>
                    <span className="text-gray-500">Prévu:</span>
                    <span className="ml-1 font-medium">{anomalie.details.heurePrevu}</span>
                  </div>
                )}
                {anomalie.details.heureReelle && (
                  <div>
                    <span className="text-gray-500">Réel:</span>
                    <span className="ml-1 font-medium">{anomalie.details.heureReelle}</span>
                  </div>
                )}
                {anomalie.heuresExtra && (
                  <div>
                    <span className="text-gray-500">Heures sup:</span>
                    <span className="ml-1 font-medium">{anomalie.heuresExtra}h</span>
                  </div>
                )}
                {anomalie.montantExtra && (
                  <div>
                    <span className="text-gray-500">Montant:</span>
                    <span className="ml-1 font-medium">{anomalie.montantExtra}€</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formulaire de traitement */}
          <form onSubmit={handleSubmit}>
            
            {/* Choix de l'action */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Action à effectuer
                {estDejaTraitee && (
                  <span className="ml-2 text-amber-600 text-xs">
                    Cette anomalie a déjà été traitée ({anomalie.statut})
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'valider', label: 'Valider', description: 'Anomalie justifiée' },
                  { value: 'refuser', label: 'Refuser', description: 'Anomalie injustifiée' },
                  { value: 'corriger', label: 'Corriger', description: 'Correction nécessaire' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`${estDejaTraitee && action !== option.value ? 'opacity-50' : ''} cursor-pointer border-2 rounded-lg p-4 transition-all ${
                      action === option.value
                        ? getActionColor(option.value)
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={option.value}
                      checked={action === option.value}
                      onChange={(e) => setAction(e.target.value)}
                      disabled={estDejaTraitee && action !== option.value}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      {getActionIcon(option.value)}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{option.description}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Champs spécifiques aux heures supplémentaires */}
            {action === 'valider' && anomalie.type.includes('heures_sup') && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">
                  Paramètres des heures supplémentaires
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'heures
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={heuresExtra}
                      onChange={(e) => setHeuresExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={montantExtra}
                      onChange={(e) => setMontantExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 31.25"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire {action && (
                  <span className="text-gray-500 font-normal">
                    ({action === 'refuser' ? 'Obligatoire' : 'Optionnel'})
                  </span>
                )}
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  required={action === 'refuser'}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    action === 'valider' ? 'Motif de validation...' :
                    action === 'refuser' ? 'Motif de refus...' :
                    action === 'corriger' ? 'Description de la correction...' :
                    'Votre commentaire...'
                  }
                />
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Erreur: {error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!action || loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'valider' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                  action === 'refuser' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                  action === 'corriger' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' :
                  'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Traitement...
                  </div>
                ) : (
                  estDejaTraitee ? 
                  `Modifier (${action === 'valider' ? 'Valider' : action === 'refuser' ? 'Refuser' : 'Corriger'})` :
                  `${action === 'valider' ? 'Valider' : action === 'refuser' ? 'Refuser' : action === 'corriger' ? 'Corriger' : 'Traiter'}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmer l'action</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              {estDejaTraitee ? (
                <>
                  Êtes-vous sûr de vouloir <strong>modifier</strong> le statut de cette anomalie ?<br/>
                  Statut actuel : <strong>{anomalie.statut}</strong><br/>
                  Nouveau statut : <strong>{action === 'valider' ? 'validée' : action === 'refuser' ? 'refusée' : 'corrigée'}</strong>
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir <strong>{action}</strong> cette anomalie ?
                  Cette action ne pourra pas être annulée.
                </>
              )}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${getActionColor(action).includes('green') ? 'bg-green-600 hover:bg-green-700' :
                  getActionColor(action).includes('red') ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
