// Test de l'export Excel depuis l'API de rapport d'heures
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function testExportAPI() {
  try {
    console.log('🧪 TEST EXPORT EXCEL DEPUIS API\n');
    console.log('=' .repeat(80));

    // 1. Se connecter en tant qu'admin
    console.log('\n🔐 Connexion admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@restaurant.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Connecté avec succès');

    // 2. Appeler l'export Excel pour le mois en cours
    console.log('\n📊 Génération du rapport Excel...');
    const exportResponse = await axios.get(`${API_URL}/stats/rapports/export-all`, {
      params: {
        periode: 'mois',
        format: 'excel'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });

    console.log(`✅ Buffer généré: ${exportResponse.data.byteLength} bytes`);

    // 3. Sauvegarder le fichier
    const fileName = 'test_export_api_rapport_heures.xlsx';
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, exportResponse.data);

    console.log(`💾 Fichier sauvegardé: ${filePath}`);
    console.log('=' .repeat(80));
    console.log('\n🎉 SUCCÈS !');
    console.log('\n📂 Ouvrir le fichier pour vérifier les 3 colonnes de dates:');
    console.log('   - Dates Congés/RTT');
    console.log('   - Dates Maladie');
    console.log('   - Dates Abs. Injust.');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Le serveur doit être démarré et l\'admin doit exister');
    }
    process.exit(1);
  }
}

testExportAPI();
