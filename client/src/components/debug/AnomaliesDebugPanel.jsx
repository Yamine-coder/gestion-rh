// client/src/components/debug/AnomaliesDebugPanel.jsx
import React, { useState } from 'react';
import { useAnomaliesDebug, useComparaisonsDebug } from '../../hooks/useAnomaliesDebug';

export default function AnomaliesDebugPanel({ 
  anomaliesData = {}, 
  comparaisons = [], 
  isVisible = false, 
  onToggle 
}) {
  const { debugInfo, clearProcessedCache, logCacheState, simulateAnomalieTraitement } = useAnomaliesDebug();
  const { debugStats, logComparaisonsState } = useComparaisonsDebug(comparaisons);
  const [testAnomalieId, setTestAnomalieId] = useState('');
  const [testStatus, setTestStatus] = useState('validee');

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-purple-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-purple-600 text-sm"
          title="Ouvrir le panneau de debug anomalies"
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-96 overflow-auto">
      <div className="bg-purple-500 text-white px-4 py-2 flex justify-between items-center">
        <h3 className="font-medium">Debug Anomalies</h3>
        <button
          onClick={onToggle}
          className="text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Cache Info */}
        <div className="border-b pb-2">
          <h4 className="font-medium text-gray-700 mb-2">Cache localStorage</h4>
          <div className="bg-gray-100 p-2 rounded text-[10px] space-y-1">
            <div>Total: {debugInfo.cacheStats.total || 0}</div>
            <div>Valides: {debugInfo.cacheStats.valid || 0}</div>
            <div>Expirés: {debugInfo.cacheStats.expired || 0}</div>
            <div>MAJ: {debugInfo.lastUpdate?.slice(11,19) || 'N/A'}</div>
          </div>
          <div className="mt-2 space-x-2">
            <button
              onClick={clearProcessedCache}
              className="bg-red-500 text-white px-2 py-1 rounded text-[10px]"
            >
              Vider cache
            </button>
            <button
              onClick={logCacheState}
              className="bg-blue-500 text-white px-2 py-1 rounded text-[10px]"
            >
              Log cache
            </button>
          </div>
        </div>

        {/* Comparaisons Stats */}
        <div className="border-b pb-2">
          <h4 className="font-medium text-gray-700 mb-2">Comparaisons</h4>
          <div className="bg-gray-100 p-2 rounded text-[10px] space-y-1">
            <div>Comparaisons: {debugStats.totalComparaisons || 0}</div>
            <div>Écarts total: {debugStats.totalEcarts || 0}</div>
            <div>Avec statut: {debugStats.ecartsAvecStatut || 0}</div>
            <div>Validés: {debugStats.ecartsValidees || 0}</div>
            <div>Refusés: {debugStats.ecartsRefusees || 0}</div>
          </div>
          <button
            onClick={logComparaisonsState}
            className="mt-2 bg-green-500 text-white px-2 py-1 rounded text-[10px]"
          >
            Log comparaisons
          </button>
        </div>

        {/* Anomalies Data */}
        <div className="border-b pb-2">
          <h4 className="font-medium text-gray-700 mb-2">Données anomalies</h4>
          <div className="bg-gray-100 p-2 rounded text-[10px]">
            <div>Clés: {Object.keys(anomaliesData).length}</div>
            <div>
              Total anomalies: {Object.values(anomaliesData).reduce((sum, arr) => sum + arr.length, 0)}
            </div>
          </div>
        </div>

        {/* Test Simulation */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Test simulation</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="ID anomalie"
              value={testAnomalieId}
              onChange={(e) => setTestAnomalieId(e.target.value)}
              className="w-full px-2 py-1 border rounded text-[10px]"
            />
            <select
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value)}
              className="w-full px-2 py-1 border rounded text-[10px]"
            >
              <option value="validee">Validée</option>
              <option value="refusee">Refusée</option>
              <option value="corrigee">Corrigée</option>
            </select>
            <button
              onClick={() => testAnomalieId && simulateAnomalieTraitement(parseInt(testAnomalieId), testStatus)}
              disabled={!testAnomalieId}
              className="w-full bg-orange-500 text-white px-2 py-1 rounded text-[10px] disabled:bg-gray-400"
            >
              Simuler traitement
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-[9px] text-gray-500">
          <div className="font-medium mb-1">Instructions:</div>
          <div>1. Ouvrir Console (F12)</div>
          <div>2. Traiter une anomalie</div>
          <div>3. Vérifier les logs de réconciliation</div>
          <div>4. Refresh (F5) et vérifier persistance</div>
        </div>
      </div>
    </div>
  );
}
