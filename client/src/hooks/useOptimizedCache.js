// client/src/hooks/useOptimizedCache.js
import { useRef, useCallback } from 'react';

/**
 * Hook pour cache intelligent avec mémoire + TTL
 */
export function useOptimizedCache(ttlMinutes = 5) {
  const cacheRef = useRef(new Map());
  const timestampRef = useRef(new Map());

  const getCacheKey = useCallback((prefix, params) => {
    return `${prefix}_${JSON.stringify(params)}`;
  }, []);

  const get = useCallback((key) => {
    const now = Date.now();
    const timestamp = timestampRef.current.get(key);
    const ttlMs = ttlMinutes * 60 * 1000;

    if (timestamp && (now - timestamp > ttlMs)) {
      // Cache expiré
      cacheRef.current.delete(key);
      timestampRef.current.delete(key);
      return null;
    }

    return cacheRef.current.get(key) || null;
  }, [ttlMinutes]);

  const set = useCallback((key, value) => {
    cacheRef.current.set(key, value);
    timestampRef.current.set(key, Date.now());
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    timestampRef.current.clear();
  }, []);

  const getStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys())
    };
  }, []);

  return { get, set, clear, getCacheKey, getStats };
}

/**
 * Hook pour cache spécialisé anomalies avec reconciliation
 */
export function useAnomaliesCache() {
  const { get, set, getCacheKey, clear } = useOptimizedCache(30); // 30min TTL

  const getAnomalies = useCallback((employeId, date) => {
    const key = getCacheKey('anomalies', { employeId, date });
    return get(key);
  }, [get, getCacheKey]);

  const setAnomalies = useCallback((employeId, date, anomalies) => {
    const key = getCacheKey('anomalies', { employeId, date });
    set(key, anomalies);
  }, [set, getCacheKey]);

  const updateAnomalie = useCallback((employeId, date, anomalieId, updates) => {
    const key = getCacheKey('anomalies', { employeId, date });
    const cached = get(key);
    
    if (cached) {
      const updated = cached.map(a => 
        a.id === anomalieId ? { ...a, ...updates } : a
      );
      set(key, updated);
      return updated;
    }
    
    return null;
  }, [get, set, getCacheKey]);

  return { getAnomalies, setAnomalies, updateAnomalie, clear };
}
