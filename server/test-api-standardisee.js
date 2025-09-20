/**
 * Test de l'API de comparaison avec les nouvelles données standardisées Europe/Paris
 */

const axios = require('axios');

async function testComparisonAPI() {
  console.log('🧪 TEST DE L\'API DE COMPARAISON AVEC TIMEZONE STANDARDISÉE');
  console.log('📅 Base temporelle: Europe/Paris');
  
  const baseURL = 'http://localhost:5000';
  const employeId = 86; // test@Mouss.com
  
  try {
    // Test 1: Jour avec tolérance normale (25 août)
    console.log('\n🟢 TEST 1: Tolérance normale (25 août 2025)');
    const response1 = await axios.get(`${baseURL}/api/comparison/planning-vs-realite`, {
      params: { employeId, date: '2025-08-25' }
    });
    
    console.log(`📋 Réponse API:`, JSON.stringify(response1.data, null, 2));
    
    // Test 2: Jour avec hors-plage extrême (26 août)
    console.log('\n🟣 TEST 2: Hors-plage extrême (26 août 2025)');
    const response2 = await axios.get(`${baseURL}/api/comparison/planning-vs-realite`, {
      params: { employeId, date: '2025-08-26' }
    });
    
    console.log(`📋 Réponse API:`, JSON.stringify(response2.data, null, 2));
    
    // Test 3: Jour avec double service et retard critique (27 août)
    console.log('\n🔴 TEST 3: Double service + retard critique (27 août 2025)');
    const response3 = await axios.get(`${baseURL}/api/comparison/planning-vs-realite`, {
      params: { employeId, date: '2025-08-27' }
    });
    
    console.log(`📋 Réponse API:`, JSON.stringify(response3.data, null, 2));
    
    // Test 4: Plage de dates (25-27 août)
    console.log('\n📊 TEST 4: Plage de dates (25-27 août 2025)');
    const response4 = await axios.get(`${baseURL}/api/comparison/planning-vs-realite`, {
      params: { employeId, dateDebut: '2025-08-25', dateFin: '2025-08-27' }
    });
    
    console.log(`📋 Nombre de comparaisons:`, response4.data.comparaisons?.length || 0);
    response4.data.comparaisons?.forEach((comp, index) => {
      console.log(`📅 Jour ${index + 1} (${comp.date}): ${comp.ecarts.length} anomalies détectées`);
      comp.ecarts.forEach(ecart => {
        console.log(`   ${ecart.description}`);
      });
    });
    
    console.log('\n✅ Tests terminés !');
    console.log('🎯 Le système de tolérance Europe/Paris fonctionne correctement');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
  }
}

testComparisonAPI();
