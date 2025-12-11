// Test de la détection automatique via l'API réelle
// Simule un scan QR en appelant POST /pointage/auto

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

(async () => {
  try {
    // 1. Connexion Jordan
    console.log('🔐 Connexion Jordan...');
    const login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'yjordan496@gmail.com',
      password: 'password123'
    });
    const token = login.data.token;
    console.log('✅ Connecté\n');

    // 2. Appeler l'API de pointage auto (comme si Jordan scannait le QR)
    console.log('📱 Simulation scan QR via API /pointage/auto...');
    
    const scanRes = await axios.post(`${API_BASE}/pointage/auto`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n✅ Réponse du serveur:');
    console.log('   Type:', scanRes.data.pointage?.type);
    console.log('   Message:', scanRes.data.message);
    
    if (scanRes.data.anomalies && scanRes.data.anomalies.length > 0) {
      console.log('\n🚨 ANOMALIES DÉTECTÉES AUTOMATIQUEMENT:');
      scanRes.data.anomalies.forEach((a, i) => {
        console.log(`   ${i+1}. ${a.type}: ${a.message}`);
        if (a.detail) console.log(`      ${a.detail}`);
      });
    } else {
      console.log('\n✅ Aucune anomalie détectée');
    }

  } catch (err) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
})();
