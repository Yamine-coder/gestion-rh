/**
 * Script pour obtenir un token d'authentification
 * Usage: node get-auth-token.js admin password123
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';
const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'admin123';

async function getAuthToken() {
  try {
    console.log('🔐 Tentative de connexion...');
    console.log(`   Email: ${email}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.token) {
      console.log('\n✅ Connexion réussie !');
      console.log('\n📋 Votre token:');
      console.log(response.data.token);
      console.log('\n💡 Pour l\'utiliser avec le script de test:');
      console.log(`   $env:AUTH_TOKEN="${response.data.token}"; node test-retard-live.js`);
      console.log('\n   Ou directement avec PowerShell:');
      console.log(`   $env:AUTH_TOKEN="${response.data.token}"`);
      console.log(`   node test-retard-live.js`);
      
      return response.data.token;
    } else {
      console.error('❌ Échec de la connexion');
      console.error(response.data);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data?.error || error.message);
    console.error('\n💡 Vérifiez que:');
    console.error('   1. Le serveur est démarré (npm run dev)');
    console.error('   2. Les identifiants sont corrects');
    console.error('   3. Le compte admin existe dans la base de données');
  }
}

getAuthToken();
