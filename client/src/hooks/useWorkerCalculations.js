// client/src/hooks/useWorkerCalculations.js
import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook pour utiliser le Web Worker pour les calculs lourds
 */
export function useWorkerCalculations() {
  const workerRef = useRef(null);
  const pendingCallbacks = useRef(new Map());

  // Initialisation du worker
  useEffect(() => {
    workerRef.current = new Worker('/workers/calculationsWorker.js');
    
    workerRef.current.onmessage = (e) => {
      const { success, type, result, error } = e.data;
      const callback = pendingCallbacks.current.get(type);
      
      if (callback) {
        if (success) {
          callback.resolve(result);
        } else {
          callback.reject(new Error(error));
        }
        pendingCallbacks.current.delete(type);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('❌ Erreur Worker:', error);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Fonction générique pour appeler le worker
  const executeWorkerTask = useCallback((type, data) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker non initialisé'));
        return;
      }

      // Stockage du callback
      pendingCallbacks.current.set(type, { resolve, reject });

      // Timeout de sécurité (30s)
      setTimeout(() => {
        if (pendingCallbacks.current.has(type)) {
          pendingCallbacks.current.delete(type);
          reject(new Error('Timeout Worker'));
        }
      }, 30000);

      // Envoi de la tâche
      workerRef.current.postMessage({ type, data });
    });
  }, []);

  // Méthodes spécialisées
  const calculateAnomaliesStats = useCallback(async (anomalies, comparaisons, shifts) => {
    console.log('🔄 Calcul stats anomalies via Worker...');
    const result = await executeWorkerTask('CALCULATE_ANOMALIES_STATS', {
      anomalies,
      comparaisons,
      shifts
    });
    console.log('✅ Stats anomalies calculées');
    return result;
  }, [executeWorkerTask]);

  const processPlanningData = useCallback(async (shifts, employes, dateDebut, dateFin) => {
    console.log('🔄 Traitement données planning via Worker...');
    const result = await executeWorkerTask('PROCESS_PLANNING_DATA', {
      shifts,
      employes,
      dateDebut,
      dateFin
    });
    console.log('✅ Données planning traitées');
    return result;
  }, [executeWorkerTask]);

  const generateRapportData = useCallback(async (shifts, anomalies, periode) => {
    console.log('🔄 Génération rapport via Worker...');
    const result = await executeWorkerTask('GENERATE_RAPPORT_DATA', {
      shifts,
      anomalies,
      periode
    });
    console.log('✅ Rapport généré');
    return result;
  }, [executeWorkerTask]);

  const calculateHeuresSupplementaires = useCallback(async (shifts, seuils) => {
    console.log('🔄 Calcul heures supplémentaires via Worker...');
    const result = await executeWorkerTask('CALCULATE_HEURES_SUPPLEMENTAIRES', {
      shifts,
      seuils
    });
    console.log('✅ Heures supplémentaires calculées');
    return result;
  }, [executeWorkerTask]);

  return {
    calculateAnomaliesStats,
    processPlanningData,
    generateRapportData,
    calculateHeuresSupplementaires,
    isWorkerReady: !!workerRef.current
  };
}

/**
 * Hook pour cache + worker combinés
 */
export function useCachedWorkerCalculations() {
  const worker = useWorkerCalculations();
  const cache = useRef(new Map());
  const cacheTimestamps = useRef(new Map());
  const TTL = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = useCallback((type, params) => {
    return `${type}_${JSON.stringify(params)}`;
  }, []);

  const isCacheValid = useCallback((key) => {
    const timestamp = cacheTimestamps.current.get(key);
    return timestamp && (Date.now() - timestamp < TTL);
  }, [TTL]);

  const executeWithCache = useCallback(async (type, workerMethod, ...params) => {
    const cacheKey = getCacheKey(type, params);
    
    // Vérifier le cache
    if (isCacheValid(cacheKey)) {
      console.log(`🎯 Cache hit pour ${type}`);
      return cache.current.get(cacheKey);
    }

    // Calcul via worker
    console.log(`🔄 Cache miss pour ${type}, calcul via Worker...`);
    const result = await workerMethod(...params);
    
    // Mise en cache
    cache.current.set(cacheKey, result);
    cacheTimestamps.current.set(cacheKey, Date.now());
    
    return result;
  }, [getCacheKey, isCacheValid]);

  // Méthodes avec cache
  const calculateAnomaliesStatsWithCache = useCallback(async (...params) => {
    return executeWithCache('ANOMALIES_STATS', worker.calculateAnomaliesStats, ...params);
  }, [executeWithCache, worker.calculateAnomaliesStats]);

  const processPlanningDataWithCache = useCallback(async (...params) => {
    return executeWithCache('PLANNING_DATA', worker.processPlanningData, ...params);
  }, [executeWithCache, worker.processPlanningData]);

  const generateRapportDataWithCache = useCallback(async (...params) => {
    return executeWithCache('RAPPORT_DATA', worker.generateRapportData, ...params);
  }, [executeWithCache, worker.generateRapportData]);

  const clearCache = useCallback(() => {
    cache.current.clear();
    cacheTimestamps.current.clear();
    console.log('🗑️ Cache worker nettoyé');
  }, []);

  return {
    ...worker,
    calculateAnomaliesStats: calculateAnomaliesStatsWithCache,
    processPlanningData: processPlanningDataWithCache,
    generateRapportData: generateRapportDataWithCache,
    clearCache
  };
}
