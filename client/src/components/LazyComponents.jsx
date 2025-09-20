// client/src/components/LazyComponents.jsx
import React, { Suspense, lazy } from 'react';

/**
 * Composants chargés de manière lazy pour améliorer les performances
 */

// Lazy loading des modals lourdes
export const LazyModalTraiterAnomalie = lazy(() => 
  import('./anomalies/ModalTraiterAnomalie')
);

export const LazyModalRefusRapide = lazy(() => 
  import('./anomalies/ModalRefusRapide')
);

export const LazyRapportHeuresEmploye = lazy(() => 
  import('./RapportHeuresEmploye')
);

export const LazyAnomaliesDebugPanel = lazy(() => 
  process.env.NODE_ENV === 'development' 
    ? import('./debug/AnomaliesDebugPanel')
    : Promise.resolve({ default: () => null })
);

// Composants admin lourds
export const LazyAdminAnomaliesPanel = lazy(() => 
  import('./admin/AdminAnomaliesPanel')
);

export const LazyAdminDashboard = lazy(() => 
  import('./admin/AdminDashboard')
);

/**
 * Wrapper avec Suspense et fallback optimisé
 */
export function LazyWrapper({ children, fallback = <LoadingSkeleton /> }) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * Skeleton de chargement réutilisable
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
      <div className="space-y-2">
        <div className="h-8 bg-gray-300 rounded"></div>
        <div className="h-8 bg-gray-300 rounded"></div>
        <div className="h-8 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton spécialisé pour modal
 */
export function ModalLoadingSkeleton() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          <div className="h-10 bg-gray-300 rounded w-full mt-4"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour les tableaux
 */
export function TableLoadingSkeleton({ rows = 3, columns = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {/* Header */}
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-6 bg-gray-300 rounded"></div>
        ))}
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) =>
          Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={`row-${rowIndex}-col-${colIndex}`} 
              className="h-4 bg-gray-200 rounded"
            ></div>
          ))
        )}
      </div>
    </div>
  );
}
