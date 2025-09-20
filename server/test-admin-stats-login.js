const axios = require('axios');

async function loginAndTestStats() {
    try {
        console.log('🔐 Connexion admin...');
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        console.log(`✅ Token obtenu: ${token.substring(0, 30)}...`);
        
        console.log('\n🔄 Test API admin stats...');
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('\n📊 Réponse de l\'API admin stats:');
        console.log(JSON.stringify(statsResponse.data, null, 2));
        
        // Analyse des heures
        if (statsResponse.data.totalHeures) {
            console.log(`\n⏰ Heures totales: ${statsResponse.data.totalHeures}`);
        } else {
            console.log('\n❌ Pas de heures totales dans la réponse');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

loginAndTestStats();
