// client/src/components/anomalies/AnomalieQuickActions.jsx
import React, { useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';

// Configuration API centralisée
const API_URL = 'http://localhost:5000';

/**
 * SYSTÈME D'ANOMALIES SIMPLIFIÉ - VALIDATION RAPIDE UNIQUEMENT
 * Corrige le problème de redirection vers shift
 */

/**
 * Hook simplifié pour traiter les anomalies
 */
export function useQuickAnomalieProcessor() {
  const [processing, setProcessing] = useState(new Set());

  const processQuickAnomalie = useCallback(async (ecartInfo, action, data = {}) => {
    const tempId = `temp_${ecartInfo.employeId}_${ecartInfo.date}_${ecartInfo.ecart.type}`;
    
    if (processing.has(tempId)) return null;

    setProcessing(prev => new Set(prev).add(tempId));

    try {
      console.log(`🔄 Action rapide pour écart ${ecartInfo.ecart.type}: ${action}`);

      // ÉTAPE 1: D'abord synchroniser/créer l'anomalie depuis l'écart
      console.log(`🔄 Synchronisation automatique de l'écart en anomalie`);
      console.log(`📊 Données envoyées:`, {
        employeId: parseInt(ecartInfo.employeId),
        date: ecartInfo.date,
        ecarts: [ecartInfo.ecart]
      });
      
      const syncResponse = await fetch(`${API_URL}/api/anomalies/sync-from-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeId: parseInt(ecartInfo.employeId),
          date: ecartInfo.date,
          ecarts: [ecartInfo.ecart],
          forceCreate: true // Forcer la création même si pas "significatif"
        })
      });

      console.log(`📡 Réponse sync:`, syncResponse.status, syncResponse.statusText);

      if (!syncResponse.ok) {
        const syncError = await syncResponse.json();
        console.error('❌ Erreur synchronisation:', syncError);
        throw new Error(syncError.error || `Erreur synchronisation ${syncResponse.status}`);
      }

      const syncResult = await syncResponse.json();
      console.log(`✅ Résultat synchronisation:`, syncResult);
      
      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Échec de synchronisation');
      }
      
      if (!syncResult.anomalies?.length) {
        throw new Error(`Aucune anomalie créée: ${syncResult.message || 'Raison inconnue'}`);
      }

      const anomalieId = syncResult.anomalies[0].id;
      console.log(`✅ Anomalie synchronisée avec ID: ${anomalieId}`);

      // ÉTAPE 2: Maintenant traiter l'anomalie réelle
      const response = await fetch(`${API_URL}/api/anomalies/${anomalieId}/traiter`, {
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
      console.log(`✅ Anomalie ${anomalieId} ${action}ée avec succès`);
      return result;

    } catch (error) {
      console.error(`❌ Erreur ${action} pour écart ${ecartInfo.ecart.type}:`, error);
      throw error;
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  }, [processing]);

  return {
    processQuickAnomalie,
    isProcessing: (id) => processing.has(id)
  };
}

/**
 * COMPOSANT PRINCIPAL - Actions rapides uniquement (Valider/Refuser)
 */
export function QuickAnomalieActions({ 
  ecart,
  employeId, 
  date,
  onSuccess,
  compact = false 
}) {
  const { processQuickAnomalie, isProcessing } = useQuickAnomalieProcessor();
  const [showRefuseInput, setShowRefuseInput] = useState(false);
  const [refuseMotif, setRefuseMotif] = useState('');
  
  // Créer un ID unique pour le tracking du processing
  const tempId = `temp_${employeId}_${date}_${ecart.type}`;
  const processing = isProcessing(tempId);

  // Vérifier si déjà traité
  const isProcessed = ['validee', 'refusee', 'traitee', 'corrigee'].includes(ecart.statut);

  const handleValidate = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANT: Empêche la propagation vers le shift

    try {
      const result = await processQuickAnomalie({ ecart, employeId, date }, 'valider', {
        commentaire: `Validation rapide - ${ecart.type} accepté`
      });

      // Callback vers le parent avec nouveau statut
      onSuccess?.({
        ...ecart,
        statut: 'validee',
        id: result?.anomalie?.id || tempId
      });

      console.log('✅ Anomalie validée:', result);
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      alert('Erreur lors de la validation');
    }
  }, [processQuickAnomalie, ecart, employeId, date, onSuccess, tempId]);

  const handleRefuse = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANT: Empêche la propagation vers le shift

    if (!showRefuseInput) {
      setShowRefuseInput(true);
      return;
    }

    if (!refuseMotif.trim()) {
      alert('Le motif de refus est obligatoire');
      return;
    }

    try {
      const result = await processQuickAnomalie({ ecart, employeId, date }, 'refuser', {
        commentaire: refuseMotif.trim()
      });

      // Callback vers le parent avec nouveau statut
      onSuccess?.({
        ...ecart,
        statut: 'refusee',
        commentaire: refuseMotif.trim(),
        id: result?.anomalie?.id || tempId
      });

      setShowRefuseInput(false);
      setRefuseMotif('');
      console.log('✅ Anomalie refusée:', result);
    } catch (error) {
      console.error('❌ Erreur refus:', error);
      alert('Erreur lors du refus');
    }
  }, [processQuickAnomalie, ecart, employeId, date, onSuccess, showRefuseInput, refuseMotif, tempId]);

  const handleCancelRefuse = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANT: Empêche la propagation vers le shift
    
    setShowRefuseInput(false);
    setRefuseMotif('');
  }, []);

  // Si déjà traité, afficher le statut
  if (isProcessed) {
    return (
      <span className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${ecart.statut === 'validee' ? 'bg-green-100 text-green-800' :
          ecart.statut === 'refusee' ? 'bg-red-100 text-red-800' :
          ecart.statut === 'corrigee' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'}
      `}>
        {ecart.statut === 'validee' && <><Check className="h-3 w-3" /> Validé</>}
        {ecart.statut === 'refusee' && <><X className="h-3 w-3" /> Refusé</>}
        {(ecart.statut === 'traitee' || ecart.statut === 'corrigee') && '✓ Traité'}
      </span>
    );
  }

  // Mode refus avec input
  if (showRefuseInput) {
    return (
      <div 
        className="flex flex-col gap-2 p-2 bg-red-50 border border-red-200 rounded"
        onClick={(e) => e.stopPropagation()} // Empêche propagation sur tout le container
      >
        <input
          type="text"
          value={refuseMotif}
          onChange={(e) => setRefuseMotif(e.target.value)}
          placeholder="Motif de refus..."
          className="text-xs px-2 py-1 border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          autoFocus
          onKeyDown={(e) => {
            e.stopPropagation(); // Empêche propagation des touches
            if (e.key === 'Enter') {
              handleRefuse(e);
            }
            if (e.key === 'Escape') {
              handleCancelRefuse(e);
            }
          }}
        />
        <div className="flex gap-1">
          <button
            onClick={handleRefuse}
            disabled={processing || !refuseMotif.trim()}
            className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
          >
            {processing ? '...' : 'Refuser'}
          </button>
          <button
            onClick={handleCancelRefuse}
            className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // Mode normal avec boutons rapides
  return (
    <div 
      className={`flex gap-1 ${compact ? 'flex-col' : ''}`}
      onClick={(e) => e.stopPropagation()} // Empêche propagation sur le container
    >
      <button
        onClick={handleValidate}
        disabled={processing}
        title="Valider cette anomalie"
        className={`
          flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium
          bg-green-50 text-green-700 border border-green-200 
          hover:bg-green-100 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${compact ? 'min-w-[28px]' : 'min-w-[60px]'}
        `}
      >
        {processing ? (
          <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="h-3 w-3" />
            {!compact && <span>Valider</span>}
          </>
        )}
      </button>

      <button
        onClick={handleRefuse}
        disabled={processing}
        title="Refuser cette anomalie"
        className={`
          flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium
          bg-red-50 text-red-700 border border-red-200 
          hover:bg-red-100 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${compact ? 'min-w-[28px]' : 'min-w-[60px]'}
        `}
      >
        {processing ? (
          <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <X className="h-3 w-3" />
            {!compact && <span>Refuser</span>}
          </>
        )}
      </button>
    </div>
  );
}

export default QuickAnomalieActions;
