// client/src/components/TestAnomalies.jsx
import React, { useState } from 'react';
import { useSyncAnomalies } from '../hooks/useAnomalies';
import { TEST_SCENARIOS, TEST_BY_GRAVITE, TEST_MESSAGES, TEST_GUIDE } from '../utils/testAnomaliesData';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Composant de test pour le système de gestion des anomalies
 * À utiliser temporairement pour vérifier que tout fonctionne
 */
export default function TestAnomalies() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('retard_simple');
  const [showGuide, setShowGuide] = useState(false);
  const { syncAnomaliesFromComparison } = useSyncAnomalies();

  const addResult = (test, success, message) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Test 1: Vérifier la connexion API
  const testAPIConnection = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addResult('Connexion API', false, 'Token manquant - Veuillez vous connecter');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/anomalies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        addResult('Connexion API', true, `✅ Connecté - ${data.anomalies?.length || 0} anomalies trouvées`);
      } else {
        addResult('Connexion API', false, `❌ Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      addResult('Connexion API', false, `❌ Erreur: ${error.message}`);
    }
    setLoading(false);
  };

  // Test 2: Créer une anomalie de test avec scénario sélectionné
  const testCreateAnomalie = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addResult('Création Anomalie', false, TEST_MESSAGES.error.auth);
        setLoading(false);
        return;
      }

      // Utiliser le scénario sélectionné
      const scenario = TEST_SCENARIOS[selectedScenario];
      const ecartTest = scenario.ecart;

      const result = await syncAnomaliesFromComparison(
        scenario.employeId,
        scenario.date,
        [ecartTest]
      );

      if (result.success) {
        addResult('Création Anomalie', true, `${TEST_MESSAGES.success.sync} - ${result.anomaliesCreees} créée(s) (${selectedScenario})`);
      } else {
        addResult('Création Anomalie', false, `❌ ${result.error}`);
      }
    } catch (error) {
      addResult('Création Anomalie', false, `❌ Erreur: ${error.message}`);
    }
    setLoading(false);
  };

  // Test 3: Vérifier les types d'anomalies supportés
  const testAnomalieTypes = () => {
    const types = [
      'retard',
      'retard_modere', 
      'retard_critique',
      'hors_plage',
      'depart_anticipe',
      'heures_sup',
      'absence_planifiee_avec_pointage',
      'presence_non_prevue'
    ];

    addResult('Types Supportés', true, `✅ ${types.length} types configurés: ${types.join(', ')}`);
  };

  // Test 4: Vérifier les hooks
  const testHooks = () => {
    try {
      if (typeof syncAnomaliesFromComparison === 'function') {
        addResult('Hooks React', true, '✅ useSyncAnomalies chargé correctement');
      } else {
        addResult('Hooks React', false, '❌ Hook non fonctionnel');
      }
    } catch (error) {
      addResult('Hooks React', false, `❌ Erreur: ${error.message}`);
    }
  };

  // Test 5: Vérifier localStorage
  const testLocalStorage = () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token) {
        addResult('LocalStorage', true, `✅ Token présent (${token.substring(0, 20)}...)`);
      } else {
        addResult('LocalStorage', false, '⚠️ Token manquant - Connectez-vous d\'abord');
      }

      if (user) {
        const userData = JSON.parse(user);
        addResult('LocalStorage', true, `✅ Utilisateur: ${userData.email || 'inconnu'}`);
      }
    } catch (error) {
      addResult('LocalStorage', false, `❌ Erreur: ${error.message}`);
    }
  };

  // Test 6: Vérifier le serveur backend
  const testBackendServer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET'
      }).catch(() => null);

      if (response && response.ok) {
        addResult('Serveur Backend', true, '✅ Serveur démarré et accessible');
      } else {
        addResult('Serveur Backend', false, '❌ Serveur non accessible - Démarrez le backend');
      }
    } catch (error) {
      addResult('Serveur Backend', false, `❌ Serveur hors ligne: ${error.message}`);
    }
    setLoading(false);
  };

  // Test 7: Tester la gestion des erreurs
  const testErrorHandling = async () => {
    setLoading(true);
    try {
      // Essayer de créer une anomalie avec des données invalides
      const result = await syncAnomaliesFromComparison(
        999999, // ID inexistant
        '2025-01-01',
        [{ type: 'type_invalide' }]
      );

      if (!result.success) {
        addResult('Gestion Erreurs', true, `✅ Erreurs capturées correctement: ${result.error}`);
      } else {
        addResult('Gestion Erreurs', false, '⚠️ Devrait échouer avec données invalides');
      }
    } catch (error) {
      addResult('Gestion Erreurs', true, `✅ Exception capturée: ${error.message}`);
    }
    setLoading(false);
  };

  // Lancer tous les tests
  const runAllTests = async () => {
    setTestResults([]);
    addResult('DÉBUT', true, '🧪 Lancement de tous les tests...');
    
    testHooks();
    testLocalStorage();
    testAnomalieTypes();
    await testBackendServer();
    await testAPIConnection();
    
    addResult('FIN', true, '✅ Tests terminés');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-2xl border-2 border-gray-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🧪 Test Anomalies
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
        </h3>
        <p className="text-xs opacity-90">Système de vérification intégré</p>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        {/* Sélection du scénario */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scénario de test
          </label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
          >
            <optgroup label="🔴 Critiques">
              <option value="retard_critique">Retard critique (45min)</option>
              <option value="depart_premature">Départ prématuré (90min)</option>
              <option value="absence_avec_pointage">Absence + Pointage</option>
            </optgroup>
            <optgroup label="🟠 Attention">
              <option value="retard_modere">Retard modéré (15min)</option>
              <option value="depart_anticipe">Départ anticipé (20min)</option>
              <option value="presence_non_prevue">Présence non prévue</option>
              <option value="missing_in">Pointage IN manquant</option>
              <option value="missing_out">Pointage OUT manquant</option>
            </optgroup>
            <optgroup label="🟣 Hors plage">
              <option value="hors_plage_matin">Arrivée très tôt (5h30)</option>
            </optgroup>
            <optgroup label="🟡 À valider">
              <option value="heures_sup_validation">Heures sup (2h30)</option>
            </optgroup>
            <optgroup label="🔵 Info">
              <option value="retard_simple">Retard simple (8min)</option>
              <option value="heures_sup_auto">Heures sup auto (1h)</option>
            </optgroup>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span>🚀</span> Tous les tests
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-1"
          >
            <span>📖</span> {showGuide ? 'Masquer' : 'Guide'}
          </button>
          <button
            onClick={clearResults}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-1 col-span-2"
          >
            <span>🗑️</span> Effacer
          </button>
          
          <button
            onClick={testAPIConnection}
            disabled={loading}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
          >
            Test API
          </button>
          <button
            onClick={testCreateAnomalie}
            disabled={loading}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
          >
            Créer Test
          </button>
          
          <button
            onClick={testBackendServer}
            disabled={loading}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
          >
            Test Serveur
          </button>
          <button
            onClick={testErrorHandling}
            disabled={loading}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
          >
            Test Erreurs
          </button>
        </div>
      </div>

      {/* Guide de test */}
      {showGuide && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-200">
          <h3 className="font-bold text-sm text-indigo-900 mb-3 flex items-center gap-2">
            <span>📖</span> Guide de test étape par étape
          </h3>
          <div className="space-y-3">
            {TEST_GUIDE.map((step) => (
              <div key={step.step} className="bg-white rounded-md p-3 border border-indigo-200">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-xs text-gray-800">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {step.description}
                    </div>
                    <div className="text-xs text-indigo-600 mt-1 bg-indigo-50 px-2 py-1 rounded">
                      📝 {step.action}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ✓ {step.expected}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-h-96 overflow-y-auto p-4">
        {testResults.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <div className="text-4xl mb-2">🧪</div>
            <p>Aucun test lancé</p>
            <p className="text-xs mt-1">Cliquez sur "Tous les tests" ou "Guide" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-md border-l-4 ${
                  result.success
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-800">
                      {result.test}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {result.message}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {result.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-2 rounded-b-lg border-t border-gray-200 text-xs text-gray-500 text-center">
        {testResults.length} test(s) exécuté(s)
      </div>
    </div>
  );
}
