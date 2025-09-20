const axios = require('axios');
const fs = require('fs');

async function testAPI() {
    try {
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = {
            success: true,
            surveillance: statsResponse.data.surveillance || null,
            stats: {
                employes: statsResponse.data.employes,
                pointes: statsResponse.data.pointes,
                totalHeures: statsResponse.data.totalHeures,
                congesSemaine: statsResponse.data.congesSemaine
            }
        };
        
        fs.writeFileSync('surveillance-result.json', JSON.stringify(result, null, 2));
        console.log('✅ Test surveillance terminé - résultat dans surveillance-result.json');
        
    } catch (error) {
        const result = {
            success: false,
            error: error.message
        };
        fs.writeFileSync('surveillance-result.json', JSON.stringify(result, null, 2));
        console.log('❌ Erreur - résultat dans surveillance-result.json');
    }
}

testAPI();
