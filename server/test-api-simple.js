const axios = require('axios');
const fs = require('fs');

async function testAPI() {
    try {
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        
        console.log('🔄 Test API admin stats...');
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = {
            success: true,
            data: statsResponse.data,
            totalHeures: statsResponse.data.totalHeures || 'NON TROUVÉ',
            tempsPresence: statsResponse.data.tempsPresence || 'NON TROUVÉ'
        };
        
        fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2));
        console.log('✅ Résultat écrit dans test-result.json');
        
    } catch (error) {
        const result = {
            success: false,
            error: error.message,
            response: error.response?.data || 'Pas de réponse'
        };
        
        fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2));
        console.log('❌ Erreur écrite dans test-result.json');
    }
}

testAPI();
