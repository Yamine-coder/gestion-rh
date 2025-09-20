// diagnostic-anomalies.js - Script de test pour diagnostiquer les problèmes de cache et validation
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';

// Simuler un token admin (remplace par un vrai token)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTY5NDk2MjgwMCwiZXhwIjoxNzAyNzM4ODAwfQ.test';

async function testAnomaliesAPI() {
  console.log('🔍 === DIAGNOSTIC SYSTÈME ANOMALIES ===\n');

  // Test 1: Vérifier l'endpoint GET /api/anomalies
  console.log('1️⃣ Test GET /api/anomalies...');
  try {
    const response = await fetch(`${API_BASE}/api/anomalies?limit=5`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GET anomalies OK - Trouvées:', data.anomalies?.length || 0);
      
      if (data.anomalies?.length > 0) {
        const firstAnomalie = data.anomalies[0];
        console.log('📋 Première anomalie:', {
          id: firstAnomalie.id,
          type: firstAnomalie.type,
          statut: firstAnomalie.statut,
          employeId: firstAnomalie.employeId,
          date: firstAnomalie.date
        });
        
        // Test 2: Essayer de traiter cette anomalie
        console.log('\n2️⃣ Test traitement anomalie ID:', firstAnomalie.id);
        
        if (firstAnomalie.statut === 'en_attente') {
          const treatResponse = await fetch(`${API_BASE}/api/anomalies/${firstAnomalie.id}/traiter`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${ADMIN_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'valider',
              commentaire: 'Test diagnostic'
            })
          });
          
          if (treatResponse.ok) {
            const treatData = await treatResponse.json();
            console.log('✅ Traitement OK - Nouveau statut:', treatData.anomalie?.statut);
            
            // Test 3: Revérifier l'anomalie pour confirmer persistance
            console.log('\n3️⃣ Test persistance - Recharger anomalie...');
            const recheckResponse = await fetch(`${API_BASE}/api/anomalies/${firstAnomalie.id}`, {
              headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
              }
            });
            
            if (recheckResponse.ok) {
              const recheckData = await recheckResponse.json();
              console.log('📊 Statut après recharge:', recheckData.anomalie?.statut);
              
              if (recheckData.anomalie?.statut === treatData.anomalie?.statut) {
                console.log('✅ PERSISTANCE OK - Statut maintenu en base');
              } else {
                console.log('❌ PERSISTANCE ÉCHOUÉE - Statut non maintenu');
              }
            } else {
              console.log('❌ Erreur rechargement anomalie:', await recheckResponse.text());
            }
          } else {
            console.log('❌ Erreur traitement:', await treatResponse.text());
          }
        } else {
          console.log('⚠️ Anomalie déjà traitée, statut:', firstAnomalie.statut);
        }
      }
    } else {
      console.log('❌ Erreur GET anomalies:', response.status, await response.text());
    }
  } catch (error) {
    console.log('💥 Erreur réseau:', error.message);
  }

  // Test 4: Vérifier le cache localStorage côté client
  console.log('\n4️⃣ Instructions pour tester le cache frontend:');
  console.log('📱 Côté navigateur, exécute dans la console:');
  console.log('localStorage.getItem("processedAnomalies")');
  console.log('👆 Doit contenir les anomalies traitées récemment');
  
  console.log('\n5️⃣ Test de réconciliation:');
  console.log('1. Traiter une anomalie via l\'interface admin');
  console.log('2. Rafraîchir la page (F5)');
  console.log('3. Vérifier que les boutons d\'action ont disparu');
  console.log('4. Vérifier console pour logs "Réconciliation" et "processedMap"');

  console.log('\n6️⃣ Points de vérification critique:');
  console.log('🔸 Middleware auth fonctionne (pas d\'erreur 401/403)');
  console.log('🔸 Statut en base mis à jour (en_attente → validee/refusee)');
  console.log('🔸 Cache localStorage peuplé après action');
  console.log('🔸 Réconciliation post-refresh utilise le cache + DB');
  console.log('🔸 Actions admin disparaissent après traitement');
}

// Fonction pour nettoyer le cache de test
function clearCache() {
  console.log('\n🧹 Pour nettoyer le cache côté client:');
  console.log('localStorage.removeItem("processedAnomalies")');
  console.log('window.__processedAnomalies = {}');
  console.log('location.reload()');
}

if (require.main === module) {
  testAnomaliesAPI().then(() => {
    console.log('\n✅ Diagnostic terminé');
    clearCache();
    process.exit(0);
  }).catch(console.error);
}

module.exports = { testAnomaliesAPI, clearCache };
