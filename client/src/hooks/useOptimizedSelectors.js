// client/src/hooks/useOptimizedSelectors.js
import { useMemo } from 'react';

/**
 * Sélecteurs memoizés pour éviter les recalculs coûteux
 */
export function useAnomaliesSelectors(anomalies, comparaisons) {
  // Anomalies par statut
  const anomaliesByStatus = useMemo(() => {
    if (!anomalies?.length) return { pending: [], validated: [], refused: [] };
    
    return anomalies.reduce((acc, anomalie) => {
      const status = anomalie.statut || 'pending';
      if (!acc[status]) acc[status] = [];
      acc[status].push(anomalie);
      return acc;
    }, { pending: [], validated: [], refused: [] });
  }, [anomalies]);

  // Statistiques globales
  const stats = useMemo(() => {
    const total = anomalies?.length || 0;
    const pending = anomaliesByStatus.pending.length;
    const validated = anomaliesByStatus.validated.length;
    const refused = anomaliesByStatus.refused.length;

    return {
      total,
      pending,
      validated,
      refused,
      processed: validated + refused,
      pendingPercent: total ? Math.round((pending / total) * 100) : 0
    };
  }, [anomaliesByStatus, anomalies?.length]);

  // Anomalies critiques (par priorité)
  const criticalAnomalies = useMemo(() => {
    if (!anomalies?.length) return [];
    
    return anomalies
      .filter(a => a.priority === 'high' || a.heuresManquantes > 4)
      .sort((a, b) => (b.heuresManquantes || 0) - (a.heuresManquantes || 0));
  }, [anomalies]);

  // Map des comparaisons par clé
  const comparaisonsMap = useMemo(() => {
    if (!comparaisons?.length) return new Map();
    
    return new Map(
      comparaisons.map(comp => [
        `${comp.employeId}_${comp.jour}`,
        comp
      ])
    );
  }, [comparaisons]);

  // Anomalies avec données de comparaison enrichies
  const enrichedAnomalies = useMemo(() => {
    if (!anomalies?.length) return [];
    
    return anomalies.map(anomalie => {
      const compKey = `${anomalie.employeId}_${anomalie.jour}`;
      const comparison = comparaisonsMap.get(compKey);
      
      return {
        ...anomalie,
        comparison,
        hasComparison: !!comparison,
        severity: calculateSeverity(anomalie, comparison)
      };
    });
  }, [anomalies, comparaisonsMap]);

  return {
    anomaliesByStatus,
    stats,
    criticalAnomalies,
    enrichedAnomalies,
    comparaisonsMap
  };
}

/**
 * Calcul de sévérité optimisé
 */
function calculateSeverity(anomalie, comparison) {
  if (!comparison) return 'medium';
  
  const heuresManquantes = anomalie.heuresManquantes || 0;
  const retardMinutes = comparison.retardTotal || 0;
  
  if (heuresManquantes > 6 || retardMinutes > 120) return 'high';
  if (heuresManquantes > 2 || retardMinutes > 30) return 'medium';
  return 'low';
}

/**
 * Sélecteurs pour le planning
 */
export function usePlanningSelectors(shifts, employes) {
  // Map des employés pour accès O(1)
  const employesMap = useMemo(() => {
    if (!employes?.length) return new Map();
    return new Map(employes.map(emp => [emp.id, emp]));
  }, [employes]);

  // Shifts groupés par date
  const shiftsByDate = useMemo(() => {
    if (!shifts?.length) return new Map();
    
    return shifts.reduce((acc, shift) => {
      const date = shift.jour || shift.date;
      if (!acc.has(date)) acc.set(date, []);
      acc.get(date).push(shift);
      return acc;
    }, new Map());
  }, [shifts]);

  // Shifts avec données employé enrichies
  const enrichedShifts = useMemo(() => {
    if (!shifts?.length) return [];
    
    return shifts.map(shift => ({
      ...shift,
      employe: employesMap.get(shift.employeId),
      hasEmploye: employesMap.has(shift.employeId)
    }));
  }, [shifts, employesMap]);

  return {
    employesMap,
    shiftsByDate,
    enrichedShifts
  };
}
