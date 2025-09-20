// client/src/components/anomalies/AnomalieOptimized.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { Check, X, Clock, Eye, DollarSign } from 'lucide-react';

/**
 * VERSION OPTIMISÉE FINALE DU SYSTÈME D'ANOMALIES
 * Remplace ModalTraiterAnomalie + ModalRefusRapide + EcartQuickActions
 */

/**
 * Hook optimisé pour traiter les anomalies avec cache et batch
 */
export function useAnomalieProcessor() {
  const [processing, setProcessing] = useState(new Set());
  const [cache, setCache] = useState(new Map());

  const processAnomalie = useCallback(async (anomalieId, action, data = {}) => {
    if (processing.has(anomalieId)) return null;

    setProcessing(prev => new Set(prev).add(anomalieId));

    try {
      console.log(`🔄 Traitement anomalie ${anomalieId}: ${action}`, data);

      const response = await fetch(`/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, ...data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      
      // Mise à jour du cache
      setCache(prev => new Map(prev).set(anomalieId, result.anomalie));
      
      // Mise à jour localStorage
      updateLocalStorageCache(anomalieId, result.anomalie);
      
      console.log(`✅ Anomalie ${anomalieId} traitée avec succès`);
      return result;

    } catch (error) {
      console.error(`❌ Erreur traitement anomalie ${anomalieId}:`, error);
      throw error;
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(anomalieId);
        return next;
      });
    }
  }, [processing]);

  return {
    processAnomalie,
    isProcessing: (id) => processing.has(id),
    getCached: (id) => cache.get(id)
  };
}

// Fonction utilitaire pour mettre à jour le cache localStorage
function updateLocalStorageCache(anomalieId, updatedAnomalie) {
  try {
    const today = new Date().toDateString();
    const cacheKey = `anomalies_cache_${today}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      if (data.anomalies && Array.isArray(data.anomalies)) {
        data.anomalies = data.anomalies.map(a => 
          a.id === anomalieId ? { ...a, ...updatedAnomalie } : a
        );
        data.timestamp = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        console.log(`📦 Cache localStorage mis à jour pour anomalie ${anomalieId}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur mise à jour cache localStorage:', error);
  }
}

/**
 * COMPOSANT PRINCIPAL - Actions rapides intelligentes
 */
export function AnomalieActions({ 
  anomalie, 
  onSuccess,
  onDetailedView,
  mode = 'auto', // 'auto', 'quick', 'full'
  size = 'normal' // 'compact', 'normal', 'large'
}) {
  const { processAnomalie, isProcessing } = useAnomalieProcessor();
  const [showQuickRefuse, setShowQuickRefuse] = useState(false);
  
  const processing = isProcessing(anomalie.id);
  const isProcessed = ['validee', 'refusee', 'corrigee'].includes(anomalie.statut);

  // Configuration des actions disponibles selon l'anomalie
  const availableActions = useMemo(() => {
    if (isProcessed) return [];

    const actions = [];

    // Validation rapide (toujours disponible)
    actions.push({
      id: 'validate',
      label: 'Valider',
      icon: Check,
      color: 'green',
      tooltip: 'Valider cette anomalie rapidement',
      priority: 1
    });

    // Heures supplémentaires (si applicable)
    if (['heures_sup', 'hors_plage', 'presence_non_prevue'].includes(anomalie.type)) {
      actions.push({
        id: 'extra',
        label: 'Extra',
        icon: DollarSign,
        color: 'amber',
        tooltip: 'Convertir en heures supplémentaires payées',
        priority: 2
      });
    }

    // Refus rapide
    actions.push({
      id: 'refuse',
      label: 'Refuser',
      icon: X,
      color: 'red',
      tooltip: 'Refuser avec motif',
      priority: 3
    });

    // Action détaillée (pour cas complexes)
    if (anomalie.gravite === 'critique' || mode === 'full') {
      actions.push({
        id: 'detailed',
        label: 'Détails',
        icon: Eye,
        color: 'blue',
        tooltip: 'Traitement détaillé avec toutes les options',
        priority: 4
      });
    }

    return actions;
  }, [anomalie, isProcessed, mode]);

  // Gestionnaire d'actions rapides
  const handleQuickAction = useCallback(async (actionId) => {
    try {
      let actionData = {};

      switch (actionId) {
        case 'validate':
          actionData = {
            action: 'valider',
            commentaire: getAutoComment(anomalie, 'validate')
          };
          break;

        case 'extra':
          const { heures, montant } = calculateExtraHours(anomalie);
          actionData = {
            action: 'valider',
            heuresExtra: heures.toString(),
            montantExtra: montant.toString(),
            commentaire: `Heures supplémentaires: ${heures}h à ${montant}€`
          };
          break;

        case 'refuse':
          setShowQuickRefuse(true);
          return; // Ne pas traiter immédiatement

        case 'detailed':
          onDetailedView?.(anomalie);
          return;

        default:
          throw new Error(`Action inconnue: ${actionId}`);
      }

      const result = await processAnomalie(anomalie.id, actionData.action, actionData);
      onSuccess?.(result.anomalie);

    } catch (error) {
      console.error(`❌ Erreur action ${actionId}:`, error);
      // TODO: Afficher toast d'erreur
    }
  }, [anomalie, processAnomalie, onSuccess, onDetailedView]);

  // Affichage conditionnel selon l'état
  if (isProcessed) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {anomalie.statut === 'validee' && (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-3 w-3" /> Validée
          </span>
        )}
        {anomalie.statut === 'refusee' && (
          <span className="flex items-center gap-1 text-red-600">
            <X className="h-3 w-3" /> Refusée
          </span>
        )}
        {anomalie.statut === 'corrigee' && (
          <span className="flex items-center gap-1 text-blue-600">
            <Clock className="h-3 w-3" /> Corrigée
          </span>
        )}
      </div>
    );
  }

  const sizeClasses = {
    compact: 'gap-1 text-xs',
    normal: 'gap-2 text-sm',
    large: 'gap-3 text-base'
  };

  return (
    <>
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {availableActions.map(action => {
          const Icon = action.icon;
          const isDisabled = processing;

          const colorClasses = {
            green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
            amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
            red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
            blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
          };

          const buttonSize = size === 'compact' ? 'px-2 py-1' : size === 'large' ? 'px-4 py-2' : 'px-3 py-1.5';

          return (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isDisabled}
              title={action.tooltip}
              className={`
                flex items-center justify-center gap-1 ${buttonSize} rounded
                border transition-all duration-200 font-medium
                ${colorClasses[action.color]}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm active:scale-95'}
                ${size === 'compact' ? 'min-w-[28px]' : 'min-w-[60px]'}
              `}
            >
              {processing ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Icon className={`${size === 'compact' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  {size !== 'compact' && (
                    <span className="whitespace-nowrap">{action.label}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal refus rapide */}
      {showQuickRefuse && (
        <QuickRefuseModal
          anomalie={anomalie}
          onClose={() => setShowQuickRefuse(false)}
          onConfirm={async (motif) => {
            try {
              const result = await processAnomalie(anomalie.id, 'refuser', {
                commentaire: motif
              });
              onSuccess?.(result.anomalie);
              setShowQuickRefuse(false);
            } catch (error) {
              console.error('❌ Erreur refus:', error);
            }
          }}
          processing={processing}
        />
      )}
    </>
  );
}

/**
 * Modal rapide pour refus avec motifs pré-définis
 */
function QuickRefuseModal({ anomalie, onClose, onConfirm, processing }) {
  const [motif, setMotif] = useState('');
  const [customMotif, setCustomMotif] = useState('');

  const predefinedMotifs = useMemo(() => {
    const motifs = {
      retard: [
        'Retard non justifié selon le règlement',
        'Absence de justificatif médical',
        'Retard récurrent non excusé'
      ],
      absence_totale: [
        'Absence non autorisée préalablement',
        'Congé non validé par la hiérarchie',
        'Absence injustifiée'
      ],
      hors_plage: [
        'Travail hors horaires non autorisé',
        'Heures supplémentaires non validées',
        'Non-respect des créneaux attribués'
      ],
      default: [
        'Non-conformité au règlement intérieur',
        'Justificatif insuffisant',
        'Anomalie non justifiée'
      ]
    };

    return motifs[anomalie.type] || motifs.default;
  }, [anomalie.type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalMotif = motif === 'custom' ? customMotif : motif;
    if (finalMotif.trim()) {
      onConfirm(finalMotif.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Refuser l'anomalie</h3>
              <p className="text-sm text-gray-600">
                {new Date(anomalie.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-4">
          
          {/* Motifs prédéfinis */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif de refus <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {predefinedMotifs.map((predefinedMotif, idx) => (
                <label key={idx} className="flex items-start">
                  <input
                    type="radio"
                    value={predefinedMotif}
                    checked={motif === predefinedMotif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-700">{predefinedMotif}</span>
                </label>
              ))}
              
              <label className="flex items-start">
                <input
                  type="radio"
                  value="custom"
                  checked={motif === 'custom'}
                  onChange={(e) => setMotif(e.target.value)}
                  className="mt-1 mr-3"
                />
                <span className="text-sm text-gray-700">Motif personnalisé</span>
              </label>
            </div>
          </div>

          {/* Motif personnalisé */}
          {motif === 'custom' && (
            <div className="mb-4">
              <textarea
                value={customMotif}
                onChange={(e) => setCustomMotif(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Décrivez le motif de refus..."
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={processing || !motif || (motif === 'custom' && !customMotif.trim())}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Refus...' : 'Confirmer le refus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Fonctions utilitaires
function getAutoComment(anomalie, action) {
  const comments = {
    validate: {
      retard: 'Retard justifié et accepté',
      absence_totale: 'Absence justifiée',
      hors_plage: 'Travail hors plage autorisé exceptionnellement',
      default: 'Anomalie validée automatiquement'
    }
  };

  return comments[action]?.[anomalie.type] || comments[action]?.default || 'Action automatique';
}

function calculateExtraHours(anomalie) {
  // Calcul intelligent des heures supplémentaires
  const ecartMinutes = anomalie.ecartMinutes || 60;
  const heures = Math.max(0.5, Math.ceil(ecartMinutes / 30) * 0.5); // Par tranches de 30min
  const tauxHoraire = 15; // €/h - à paramétrer
  const montant = Math.round(heures * tauxHoraire);

  return { heures, montant };
}

export default AnomalieActions;
