// client/src/components/anomalies/AnomalieManager.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { Check, X, AlertTriangle, Loader } from 'lucide-react';

// Configuration API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * SYSTÈME D'ANOMALIES UNIFIÉ - VERSION PARFAITE
 * 
 * Fonctionnalités :
 * - Validation/Refus rapide avec feedback immédiat
 * - Synchronisation automatique écart → anomalie → traitement
 * - Gestion intelligente des états et erreurs
 * - Interface optimisée selon la taille disponible
 * - Event handling parfait (pas de redirections)
 */

/**
 * Hook principal pour le traitement des anomalies
 */
export function useAnomalieProcessor() {
  const [processing, setProcessing] = useState(new Set());
  const [lastProcessed, setLastProcessed] = useState({});

  const processAnomalie = useCallback(async (ecart, employeId, date, action, options = {}) => {
    const tempId = `${employeId}_${date}_${ecart.type}`;
    
    if (processing.has(tempId)) {
      console.log(`⏳ Traitement déjà en cours pour ${tempId}`);
      return null;
    }

    setProcessing(prev => new Set(prev).add(tempId));

    try {
      console.log(`🚀 [AnomalieManager] Début traitement:`, {
        action, 
        employeId, 
        date, 
        ecart: ecart.type,
        options
      });

      // ÉTAPE 1: Synchroniser l'écart en anomalie réelle
      const syncResponse = await fetch(`${API_URL}/api/anomalies/sync-from-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeId: parseInt(employeId),
          date: date,
          ecarts: [ecart],
          forceCreate: true // Toujours forcer la création
        })
      });

      if (!syncResponse.ok) {
        const syncError = await syncResponse.json();
        throw new Error(syncError.error || `Erreur synchronisation ${syncResponse.status}`);
      }

      const syncResult = await syncResponse.json();
      console.log(`✅ [AnomalieManager] Synchronisation réussie:`, syncResult);

      if (!syncResult.success || !syncResult.anomalies?.length) {
        throw new Error(`Impossible de créer l'anomalie: ${syncResult.message || 'Raison inconnue'}`);
      }

      const anomalieId = syncResult.anomalies[0].id;
      console.log(`🆔 [AnomalieManager] ID anomalie: ${anomalieId}`);

      // ÉTAPE 2: Traiter l'anomalie
      const traitementResponse = await fetch(`${API_URL}/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          action, 
          commentaire: options.commentaire || `${action} rapide via planning`,
          ...options 
        })
      });

      if (!traitementResponse.ok) {
        const traitementError = await traitementResponse.json();
        throw new Error(traitementError.error || `Erreur traitement ${traitementResponse.status}`);
      }

      const traitementResult = await traitementResponse.json();
      console.log(`✅ [AnomalieManager] Traitement réussi:`, traitementResult);

      // ÉTAPE 3: Mise à jour des données locales
      const result = {
        success: true,
        anomalie: traitementResult.anomalie,
        action,
        ecart: {
          ...ecart,
          statut: action === 'valider' ? 'validee' : action === 'refuser' ? 'refusee' : 'traitee',
          anomalieId: anomalieId
        }
      };

      setLastProcessed(prev => ({
        ...prev,
        [tempId]: {
          timestamp: Date.now(),
          result
        }
      }));

      return result;

    } catch (error) {
      console.error(`❌ [AnomalieManager] Erreur:`, error);
      throw error;
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  }, [processing]);

  const isProcessing = useCallback((employeId, date, ecartType) => {
    return processing.has(`${employeId}_${date}_${ecartType}`);
  }, [processing]);

  const getLastResult = useCallback((employeId, date, ecartType) => {
    const tempId = `${employeId}_${date}_${ecartType}`;
    const cached = lastProcessed[tempId];
    
    // Cache valide pendant 30 secondes
    if (cached && (Date.now() - cached.timestamp) < 30000) {
      return cached.result;
    }
    
    return null;
  }, [lastProcessed]);

  return {
    processAnomalie,
    isProcessing,
    getLastResult
  };
}

/**
 * Composant de badge d'écart avec actions rapides
 */
export function EcartBadge({ 
  ecart, 
  employeId, 
  date, 
  onUpdate, 
  compact = false,
  disabled = false 
}) {
  const { processAnomalie, isProcessing, getLastResult } = useAnomalieProcessor();
  const [showRefuseInput, setShowRefuseInput] = useState(false);
  const [refuseMotif, setRefuseMotif] = useState('');
  const [notification, setNotification] = useState(null);

  const processing = isProcessing(employeId, date, ecart.type);
  const lastResult = getLastResult(employeId, date, ecart.type);

  // Détermine l'état d'affichage
  const currentStatut = lastResult?.ecart?.statut || ecart.statut || 'en_attente';
  const isProcessed = ['validee', 'refusee', 'traitee'].includes(currentStatut);

  const handleAction = useCallback(async (action, options = {}) => {
    try {
      const result = await processAnomalie(ecart, employeId, date, action, options);
      
      if (result?.success) {
        setNotification({
          type: 'success',
          message: `Anomalie ${action}ée avec succès`,
          duration: 3000
        });
        
        onUpdate?.(result.ecart, result);
        
        if (action === 'refuser') {
          setShowRefuseInput(false);
          setRefuseMotif('');
        }
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Erreur: ${error.message}`,
        duration: 5000
      });
    }
  }, [processAnomalie, ecart, employeId, date, onUpdate]);

  const handleValidate = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAction('valider');
  }, [handleAction]);

  const handleRefuse = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showRefuseInput) {
      setShowRefuseInput(true);
      return;
    }
    
    if (!refuseMotif.trim()) {
      setNotification({
        type: 'error',
        message: 'Le motif de refus est obligatoire',
        duration: 3000
      });
      return;
    }
    
    handleAction('refuser', { commentaire: refuseMotif.trim() });
  }, [showRefuseInput, refuseMotif, handleAction]);

  const handleCancelRefuse = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowRefuseInput(false);
    setRefuseMotif('');
  }, []);

  // Styles selon le type et statut d'écart
  const getEcartStyle = useMemo(() => {
    if (isProcessed) {
      return {
        bg: currentStatut === 'validee' ? 'bg-green-100' : 
            currentStatut === 'refusee' ? 'bg-red-100' : 'bg-blue-100',
        text: currentStatut === 'validee' ? 'text-green-800' : 
              currentStatut === 'refusee' ? 'text-red-800' : 'text-blue-800',
        border: currentStatut === 'validee' ? 'border-green-300' : 
                currentStatut === 'refusee' ? 'border-red-300' : 'border-blue-300'
      };
    }

    switch (ecart.type) {
      case 'retard_critique':
        return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' };
      case 'retard_attention':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
      case 'hors_plage':
        return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' };
      case 'heures_sup':
        return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' };
    }
  }, [ecart.type, currentStatut, isProcessed]);

  const getEcartLabel = useMemo(() => {
    const labels = {
      'retard_critique': 'Retard Critique',
      'retard_attention': 'Retard',
      'hors_plage': 'Hors Plage',
      'heures_sup': 'Heures Sup',
      'depart_anticipe': 'Départ Anticipé',
      'absence_totale': 'Absence',
      'presence_non_prevue': 'Non Prévu'
    };
    return labels[ecart.type] || ecart.type;
  }, [ecart.type]);

  const getStatusIcon = useMemo(() => {
    if (processing) return <Loader className="h-3 w-3 animate-spin" />;
    if (currentStatut === 'validee') return <Check className="h-3 w-3" />;
    if (currentStatut === 'refusee') return <X className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  }, [processing, currentStatut]);

  // Affichage des notifications
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className={`relative group ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Badge principal */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${getEcartStyle.bg} ${getEcartStyle.text} ${getEcartStyle.border} ${disabled ? 'opacity-50' : 'hover:shadow-sm'}`}
      >
        {getStatusIcon}
        <span className="font-medium">
          {compact ? ecart.type.split('_')[0] : getEcartLabel}
        </span>
        {ecart.ecartMinutes && (
          <span className="text-xs opacity-75">
            {ecart.ecartMinutes > 0 ? '+' : ''}{ecart.ecartMinutes}min
          </span>
        )}
      </div>

      {/* Actions (visibles au hover si pas déjà traité) */}
      {!disabled && !isProcessed && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 min-w-max">
          {!showRefuseInput ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleValidate}
                disabled={processing}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
              >
                <Check className="h-3 w-3" />
                Valider
              </button>
              <button
                onClick={handleRefuse}
                disabled={processing}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                <X className="h-3 w-3" />
                Refuser
              </button>
            </div>
          ) : (
            <div className="space-y-2 min-w-48">
              <input
                type="text"
                placeholder="Motif de refus..."
                value={refuseMotif}
                onChange={(e) => setRefuseMotif(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleRefuse(e);
                  if (e.key === 'Escape') handleCancelRefuse(e);
                }}
                autoFocus
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefuse}
                  disabled={processing || !refuseMotif.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Confirmer
                </button>
                <button
                  onClick={handleCancelRefuse}
                  disabled={processing}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification temporaire */}
      {notification && (
        <div
          className={`absolute top-full left-0 mt-1 px-3 py-2 rounded-lg shadow-lg text-sm font-medium z-50 ${
            notification.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

/**
 * Composant principal du gestionnaire d'anomalies
 */
export default function AnomalieManager({ 
  ecarts = [], 
  employeId, 
  date, 
  onUpdateEcarts,
  compact = false,
  disabled = false,
  className = '' 
}) {
  const handleEcartUpdate = useCallback((updatedEcart, result) => {
    console.log(`🔄 [AnomalieManager] Écart mis à jour:`, updatedEcart);
    
    // Mettre à jour la liste des écarts
    const updatedEcarts = ecarts.map(ecart => 
      ecart.type === updatedEcart.type ? updatedEcart : ecart
    );
    
    onUpdateEcarts?.(updatedEcarts, result);
  }, [ecarts, onUpdateEcarts]);

  if (!ecarts.length) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {ecarts.map((ecart, index) => (
        <EcartBadge
          key={`${ecart.type}-${index}`}
          ecart={ecart}
          employeId={employeId}
          date={date}
          onUpdate={handleEcartUpdate}
          compact={compact}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
