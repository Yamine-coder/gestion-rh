// client/src/hooks/useAnomaliesDebug.js
import { useState, useEffect } from 'react';

/**
 * Hook de debug pour surveiller l'état des anomalies et du cache
 */
export function useAnomaliesDebug() {
  const [debugInfo, setDebugInfo] = useState({
    processedAnomalies: {},
    anomaliesData: {},
    lastUpdate: null,
    cacheStats: { hits: 0, misses: 0, expired: 0 }
  });

  // Surveillance du cache localStorage
  useEffect(() => {
    const checkCache = () => {
      try {
        const stored = localStorage.getItem('processedAnomalies');
        const processedAnomalies = stored ? JSON.parse(stored) : {};
        const now = Date.now();
        const TTL = 30 * 60 * 1000; // 30 min

        // Analyser le cache
        const stats = {
          total: Object.keys(processedAnomalies).length,
          valid: 0,
          expired: 0
        };

        Object.entries(processedAnomalies).forEach(([id, data]) => {
          if (now - data.updatedAt > TTL) {
            stats.expired++;
          } else {
            stats.valid++;
          }
        });

        setDebugInfo(prev => ({
          ...prev,
          processedAnomalies,
          cacheStats: stats,
          lastUpdate: new Date().toISOString()
        }));

      } catch (e) {
        console.warn('Erreur debug cache anomalies:', e);
      }
    };

    // Vérifier le cache toutes les 5 secondes
    const interval = setInterval(checkCache, 5000);
    checkCache(); // Vérification immédiate

    return () => clearInterval(interval);
  }, []);

  // Utilitaires de debug
  const clearProcessedCache = () => {
    localStorage.removeItem('processedAnomalies');
    if (window.__processedAnomalies) {
      window.__processedAnomalies = {};
    }
    setDebugInfo(prev => ({
      ...prev,
      processedAnomalies: {},
      lastUpdate: new Date().toISOString()
    }));
    console.log('🧹 Cache processedAnomalies nettoyé manuellement');
  };

  const logCacheState = () => {
    console.log('🔍 === ÉTAT DU CACHE ANOMALIES ===');
    console.log('localStorage.processedAnomalies:', debugInfo.processedAnomalies);
    console.log('window.__processedAnomalies:', window.__processedAnomalies);
    console.log('Stats:', debugInfo.cacheStats);
    console.log('Dernière mise à jour:', debugInfo.lastUpdate);
    console.log('=================================');
  };

  const simulateAnomalieTraitement = (anomalieId, newStatus) => {
    const processedEntry = {
      statut: newStatus,
      updatedAt: Date.now(),
      employeId: 1, // Exemple
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const stored = localStorage.getItem('processedAnomalies');
      const processedMap = stored ? JSON.parse(stored) : {};
      processedMap[anomalieId] = processedEntry;
      localStorage.setItem('processedAnomalies', JSON.stringify(processedMap));

      if (!window.__processedAnomalies) window.__processedAnomalies = {};
      window.__processedAnomalies[anomalieId] = processedEntry;

      console.log(`✅ Simulation traitement anomalie ${anomalieId} -> ${newStatus}`);
    } catch (e) {
      console.error('Erreur simulation:', e);
    }
  };

  return {
    debugInfo,
    clearProcessedCache,
    logCacheState,
    simulateAnomalieTraitement
  };
}

// Hook pour debugging avancé des comparaisons
export function useComparaisonsDebug(comparaisons = []) {
  const [debugStats, setDebugStats] = useState({});

  useEffect(() => {
    const stats = {
      totalComparaisons: comparaisons.length,
      totalEcarts: 0,
      ecartsAvecStatut: 0,
      ecartsAvecAnomalieId: 0,
      ecartsValidees: 0,
      ecartsRefusees: 0,
      ecartsCorrigees: 0,
      ecartsEnAttente: 0,
      typeEcarts: {}
    };

    comparaisons.forEach(comp => {
      if (comp.ecarts) {
        stats.totalEcarts += comp.ecarts.length;

        comp.ecarts.forEach(ecart => {
          if (ecart.statut) stats.ecartsAvecStatut++;
          if (ecart.anomalieId) stats.ecartsAvecAnomalieId++;
          
          // Compteur par statut
          if (ecart.statut === 'validee') stats.ecartsValidees++;
          else if (ecart.statut === 'refusee') stats.ecartsRefusees++;
          else if (ecart.statut === 'corrigee') stats.ecartsCorrigees++;
          else if (ecart.statut === 'en_attente') stats.ecartsEnAttente++;
          
          // Compteur par type
          const type = ecart.type || 'inconnu';
          stats.typeEcarts[type] = (stats.typeEcarts[type] || 0) + 1;
        });
      }
    });

    setDebugStats(stats);
  }, [comparaisons]);

  const logComparaisonsState = () => {
    console.log('📊 === ÉTAT DES COMPARAISONS ===');
    console.log('Stats:', debugStats);
    console.log('Détail comparaisons:', comparaisons.map(c => ({
      employeId: c.employeId,
      date: c.date?.slice(0,10),
      ecartsCount: c.ecarts?.length || 0,
      ecartsTraites: c.ecarts?.filter(e => ['validee', 'refusee', 'corrigee'].includes(e.statut)).length || 0
    })));
    console.log('===============================');
  };

  return {
    debugStats,
    logComparaisonsState
  };
}

// Fonction utilitaire pour debug complet
export function debugAnomaliesSystem() {
  console.log('🔍 === DEBUG SYSTÈME ANOMALIES COMPLET ===');
  
  // 1. Cache localStorage
  console.log('1. Cache localStorage:');
  const stored = localStorage.getItem('processedAnomalies');
  console.log(stored ? JSON.parse(stored) : 'Aucun cache');
  
  // 2. Window global
  console.log('2. Window global:');
  console.log(window.__processedAnomalies || 'Non défini');
  
  // 3. Vérifier présence des données dans les composants React
  console.log('3. Pour vérifier les données React, exécuter:');
  console.log('   - Ouvrir React DevTools');
  console.log('   - Rechercher PlanningRH');
  console.log('   - Inspecter les états: anomaliesData, comparaisons');
  
  // 4. Tests de cohérence
  console.log('4. Tests de cohérence:');
  if (stored) {
    const processedMap = JSON.parse(stored);
    const now = Date.now();
    const TTL = 30 * 60 * 1000;
    
    Object.entries(processedMap).forEach(([id, data]) => {
      const age = now - data.updatedAt;
      const expired = age > TTL;
      console.log(`Anomalie ${id}: ${data.statut} (${Math.round(age/60000)}min) ${expired ? '⚠️EXPIRÉ' : '✅'}`);
    });
  }
  
  console.log('=========================================');
}

// Export pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  window.debugAnomaliesSystem = debugAnomaliesSystem;
}
