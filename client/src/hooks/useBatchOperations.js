// client/src/hooks/useBatchOperations.js
import { useCallback, useRef } from 'react';

/**
 * Hook pour batch requests - groupe plusieurs appels API
 */
export function useBatchRequests(batchSize = 5, delayMs = 100) {
  const queueRef = useRef([]);
  const timeoutRef = useRef(null);

  const addToBatch = useCallback((operation) => {
    queueRef.current.push(operation);

    // Nettoie le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programme l'exécution du batch
    timeoutRef.current = setTimeout(async () => {
      if (queueRef.current.length === 0) return;

      const batch = queueRef.current.splice(0, batchSize);
      console.log(`🔄 Exécution batch de ${batch.length} opérations`);

      try {
        // Exécute toutes les opérations en parallèle
        const results = await Promise.allSettled(
          batch.map(op => op.execute())
        );

        // Traite les résultats
        results.forEach((result, index) => {
          const operation = batch[index];
          if (result.status === 'fulfilled') {
            operation.onSuccess?.(result.value);
          } else {
            operation.onError?.(result.reason);
          }
        });

        // S'il reste des opérations, programme le prochain batch
        if (queueRef.current.length > 0) {
          addToBatch({ execute: () => Promise.resolve() }); // Trigger suivant
        }

      } catch (error) {
        console.error('❌ Erreur batch operations:', error);
      }
    }, delayMs);
  }, [batchSize, delayMs]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { addToBatch, clearQueue, queueSize: queueRef.current.length };
}

/**
 * Hook pour debounced updates avec batch
 */
export function useDebouncedBatch(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const pendingUpdatesRef = useRef([]);

  const debouncedExecute = useCallback((update) => {
    // Ajoute à la liste des mises à jour
    pendingUpdatesRef.current.push(update);

    // Annule le précédent timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programme l'exécution
    timeoutRef.current = setTimeout(async () => {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      console.log(`🔄 Debounced batch: ${updates.length} mises à jour`);
      
      try {
        await callback(updates);
      } catch (error) {
        console.error('❌ Erreur debounced batch:', error);
      }
    }, delay);
  }, [callback, delay]);

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (pendingUpdatesRef.current.length > 0) {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];
      await callback(updates);
    }
  }, [callback]);

  return { debouncedExecute, flush };
}

/**
 * Hook spécialisé pour anomalies batch operations
 */
export function useAnomaliesBatchOperations() {
  const { addToBatch } = useBatchRequests(10, 200);

  const batchUpdateAnomalies = useCallback((updates) => {
    updates.forEach(({ anomalieId, updates: anomalieUpdates }) => {
      addToBatch({
        execute: () => fetch(`/api/anomalies/${anomalieId}/traiter`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(anomalieUpdates)
        }),
        onSuccess: (response) => {
          console.log(`✅ Anomalie ${anomalieId} mise à jour`);
        },
        onError: (error) => {
          console.error(`❌ Erreur anomalie ${anomalieId}:`, error);
        }
      });
    });
  }, [addToBatch]);

  const batchSyncAnomalies = useCallback((employeIds, dates) => {
    const syncOperations = [];
    
    employeIds.forEach(employeId => {
      dates.forEach(date => {
        syncOperations.push({
          execute: () => fetch('/api/anomalies/sync-from-comparison', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeId, date })
          }),
          onSuccess: () => console.log(`✅ Sync ${employeId} - ${date}`),
          onError: (error) => console.error(`❌ Sync error:`, error)
        });
      });
    });

    syncOperations.forEach(op => addToBatch(op));
  }, [addToBatch]);

  return { batchUpdateAnomalies, batchSyncAnomalies };
}
