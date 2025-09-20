// client/src/components/VirtualizedList.jsx
import React, { useState, useRef, useMemo } from 'react';

/**
 * Composant de liste virtualisée pour grandes quantités de données
 */
export function VirtualizedList({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = ""
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);

  // Calculs optimisés avec useMemo
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount);
    
    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <div
                key={item.id || actualIndex}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Liste virtualisée spécialisée pour anomalies
 */
export function VirtualizedAnomaliesList({ 
  anomalies, 
  onSelectAnomalie,
  selectedId,
  containerHeight = 400 
}) {
  const renderAnomalie = (anomalie, index) => (
    <div
      className={`
        border-b border-gray-200 p-3 cursor-pointer transition-colors
        ${selectedId === anomalie.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
      `}
      onClick={() => onSelectAnomalie(anomalie)}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">
            {anomalie.employeNom} - {anomalie.jour}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {anomalie.heuresManquantes}h manquantes • {anomalie.type}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`
            px-2 py-1 text-xs rounded-full
            ${anomalie.statut === 'validated' ? 'bg-green-100 text-green-800' :
              anomalie.statut === 'refused' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'}
          `}>
            {anomalie.statut === 'validated' ? '✓ Validé' :
             anomalie.statut === 'refused' ? '✗ Refusé' : '⏳ En attente'}
          </span>
          
          {anomalie.priority === 'high' && (
            <span className="text-red-500 text-xs">🔥</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={anomalies}
      itemHeight={65}
      containerHeight={containerHeight}
      renderItem={renderAnomalie}
      className="border border-gray-200 rounded-lg"
    />
  );
}

/**
 * Liste virtualisée pour employés avec recherche
 */
export function VirtualizedEmployesList({ 
  employes, 
  searchTerm = "",
  onSelectEmploye,
  selectedId 
}) {
  // Filtrage optimisé avec useMemo
  const filteredEmployes = useMemo(() => {
    if (!searchTerm) return employes;
    
    const term = searchTerm.toLowerCase();
    return employes.filter(emp => 
      emp.nom?.toLowerCase().includes(term) ||
      emp.prenom?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term)
    );
  }, [employes, searchTerm]);

  const renderEmploye = (employe, index) => (
    <div
      className={`
        border-b border-gray-200 p-3 cursor-pointer transition-colors
        ${selectedId === employe.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
      `}
      onClick={() => onSelectEmploye(employe)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
          {employe.prenom?.[0]}{employe.nom?.[0]}
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm">
            {employe.prenom} {employe.nom}
          </div>
          <div className="text-xs text-gray-500">
            {employe.email} • {employe.role}
          </div>
        </div>
        
        {employe.actif === false && (
          <span className="text-xs text-red-500">Inactif</span>
        )}
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={filteredEmployes}
      itemHeight={60}
      containerHeight={300}
      renderItem={renderEmploye}
      className="border border-gray-200 rounded-lg"
    />
  );
}
