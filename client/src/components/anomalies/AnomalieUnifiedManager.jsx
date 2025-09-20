// client/src/components/anomalies/AnomalieUnifiedManager.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { Check, X, Clock, AlertTriangle, Zap, Eye } from 'lucide-react';

/**
 * SYSTÈME UNIFIÉ DE GESTION D'ANOMALIES
 * Combine actions rapides + modal détaillée selon le contexte
 */

/**
 * Hook pour gérer les actions anomalies avec batch et cache
 */
export function useAnomalieActions() {
  const [processing, setProcessing] = useState(new Set());

  const processAction = useCallback(async (anomalieId, action, data = {}) => {
    if (processing.has(anomalieId)) return false;

    setProcessing(prev => new Set(prev).add(anomalieId));

    try {
      const response = await fetch(`/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();
      
      // Mise à jour cache localStorage
      const cacheKey = `anomalies_cache_${new Date().toDateString()}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.anomalies) {
            // Mettre à jour l'anomalie dans le cache
            data.anomalies = data.anomalies.map(a => 
              a.id === anomalieId ? { ...a, ...result.anomalie } : a
            );
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        } catch (e) {
          // Cache invalide, le nettoyer
          localStorage.removeItem(cacheKey);
        }
      }

      return result;

    } catch (error) {
      console.error(`❌ Erreur ${action} anomalie ${anomalieId}:`, error);
      throw error;
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(anomalieId);
        return next;
      });
    }
  }, [processing]);

  return { processAction, isProcessing: (id) => processing.has(id) };
}

/**
 * Actions rapides inline pour anomalies simples
 */
export function AnomalieQuickActions({ 
  anomalie, 
  onSuccess,
  compact = false,
  className = ""
}) {
  const { processAction, isProcessing } = useAnomalieActions();
  const processing = isProcessing(anomalie.id);

  // Déterminer quelles actions sont possibles
  const availableActions = useMemo(() => {
    if (anomalie.statut !== 'en_attente') return [];

    const actions = [];

    // Validation rapide (toujours disponible)
    actions.push({
      type: 'validate',
      label: compact ? '✓' : '✓ Valider',
      color: 'green',
      icon: Check,
      tooltip: 'Valider cette anomalie'
    });

    // Conversion en heures extra (si applicable)
    if (anomalie.type === 'heures_sup' || anomalie.type === 'hors_plage') {
      actions.push({
        type: 'extra',
        label: compact ? '€' : '€ Extra',
        color: 'amber',
        icon: Zap,
        tooltip: 'Convertir en heures supplémentaires'
      });
    }

    // Refus rapide (toujours disponible)
    actions.push({
      type: 'refuse_quick',
      label: compact ? '×' : '× Refuser',
      color: 'red',
      icon: X,
      tooltip: 'Refuser avec motif'
    });

    return actions;
  }, [anomalie, compact]);

  const handleQuickAction = useCallback(async (actionType) => {
    try {
      let actionData = {};

      switch (actionType) {
        case 'validate':
          actionData = {
            action: 'valider',
            commentaire: 'Validation automatique - anomalie justifiée'
          };
          break;

        case 'extra':
          // Calcul automatique du montant/heures
          const heuresExtra = Math.max(1, Math.floor((anomalie.ecartMinutes || 60) / 60));
          const montantExtra = heuresExtra * 15; // 15€/h par défaut
          
          actionData = {
            action: 'valider',
            heuresExtra: heuresExtra.toString(),
            montantExtra: montantExtra.toString(),
            commentaire: `Conversion automatique: ${heuresExtra}h supplémentaires à ${montantExtra}€`
          };
          break;

        case 'refuse_quick':
          // Refus avec motif générique selon le type
          const motifs = {
            'retard': 'Retard non justifié selon le règlement',
            'absence_totale': 'Absence non autorisée',
            'hors_plage': 'Travail hors horaires sans autorisation',
            'default': 'Anomalie non conforme aux règles établies'
          };
          
          actionData = {
            action: 'refuser',
            commentaire: motifs[anomalie.type] || motifs.default
          };
          break;

        default:
          throw new Error(`Action inconnue: ${actionType}`);
      }

      const result = await processAction(anomalie.id, actionData.action, actionData);
      
      console.log(`✅ Action ${actionType} réussie pour anomalie ${anomalie.id}`);
      onSuccess?.(result.anomalie);

    } catch (error) {
      console.error(`❌ Erreur action ${actionType}:`, error);
      // Toast d'erreur ici
    }
  }, [anomalie, processAction, onSuccess]);

  if (availableActions.length === 0) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        {anomalie.statut === 'validee' && '✅ Validée'}
        {anomalie.statut === 'refusee' && '❌ Refusée'}
        {anomalie.statut === 'corrigee' && '🔧 Corrigée'}
      </div>
    );
  }

  return (
    <div className={`flex gap-1 ${compact ? 'flex-col' : ''} ${className}`}>
      {availableActions.map(action => {
        const Icon = action.icon;
        const colorClasses = {
          green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
          amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200', 
          red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
        };

        return (
          <button
            key={action.type}
            onClick={() => handleQuickAction(action.type)}
            disabled={processing}
            title={action.tooltip}
            className={`
              flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium
              border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${colorClasses[action.color]}
              ${compact ? 'min-w-[32px] h-7' : 'min-w-[60px] h-8'}
            `}
          >
            {processing ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Icon className="h-3 w-3" />
                {!compact && <span>{action.label.split(' ')[1]}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Modal intelligente qui s'adapte selon la complexité de l'anomalie
 */
export function AnomalieSmartModal({ 
  anomalie, 
  onClose, 
  onSuccess,
  forceDetailed = false 
}) {
  const [mode, setMode] = useState(() => {
    // Auto-détection du mode selon la complexité
    if (forceDetailed) return 'detailed';
    
    // Modal simple pour anomalies courantes
    const simpleTypes = ['retard', 'depart_anticipe', 'absence_totale'];
    if (simpleTypes.includes(anomalie?.type)) return 'simple';
    
    // Modal détaillée pour cas complexes
    return 'detailed';
  });

  if (!anomalie) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        
        {/* Switch entre mode simple et détaillé */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Traiter l'anomalie
          </h3>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('simple')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  mode === 'simple' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Zap className="h-4 w-4 inline mr-1" />
                Rapide
              </button>
              <button
                onClick={() => setMode('detailed')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  mode === 'detailed' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4 inline mr-1" />
                Détaillé
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenu selon le mode */}
        {mode === 'simple' ? (
          <AnomalieSimpleForm 
            anomalie={anomalie}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : (
          <AnomalieDetailedForm 
            anomalie={anomalie}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Formulaire simple pour traitement rapide
 */
function AnomalieSimpleForm({ anomalie, onClose, onSuccess }) {
  const { processAction, isProcessing } = useAnomalieActions();
  const [action, setAction] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const processing = isProcessing(anomalie.id);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!action) return;

    try {
      const result = await processAction(anomalie.id, action, { commentaire });
      onSuccess?.(result.anomalie);
      onClose();
    } catch (error) {
      // Error handling
    }
  }, [action, commentaire, processAction, anomalie.id, onSuccess, onClose]);

  const actionOptions = [
    { value: 'valider', label: '✅ Valider cette anomalie', color: 'green' },
    { value: 'refuser', label: '❌ Refuser cette anomalie', color: 'red' },
    { value: 'corriger', label: '🔧 Marquer comme corrigée', color: 'blue' }
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6">
      
      {/* Résumé de l'anomalie */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-medium">{anomalie.type || 'Anomalie'}</span>
          <span className="text-sm text-gray-500">
            {new Date(anomalie.date).toLocaleDateString('fr-FR')}
          </span>
        </div>
        {anomalie.description && (
          <p className="text-sm text-gray-700">{anomalie.description}</p>
        )}
      </div>

      {/* Choix de l'action */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Action à effectuer
        </label>
        <div className="space-y-2">
          {actionOptions.map(option => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                value={option.value}
                checked={action === option.value}
                onChange={(e) => setAction(e.target.value)}
                className="mr-3"
              />
              <span className={`text-sm ${
                option.color === 'green' ? 'text-green-700' :
                option.color === 'red' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Commentaire */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commentaire {action === 'refuser' && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          required={action === 'refuser'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={
            action === 'refuser' 
              ? "Expliquez pourquoi cette anomalie est refusée..."
              : "Commentaire optionnel..."
          }
        />
      </div>

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
          disabled={!action || processing || (action === 'refuser' && !commentaire.trim())}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Traitement...' : 'Confirmer'}
        </button>
      </div>
    </form>
  );
}

/**
 * Formulaire détaillé pour cas complexes (garde la logique de ModalTraiterAnomalie)
 */
function AnomalieDetailedForm({ anomalie, onClose, onSuccess }) {
  // Logique complète de ModalTraiterAnomalie ici
  // Pour l'instant, on réutilise la modal existante
  return (
    <div className="p-6">
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Mode détaillé - Intégration avec ModalTraiterAnomalie existante
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
