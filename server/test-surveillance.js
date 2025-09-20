const axios = require('axios');

async function testSurveillanceData() {
    try {
        console.log('🔐 Connexion admin...');
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Token obtenu');
        
        console.log('\n🔄 Test API admin stats (surveillance)...');
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('\n📊 Données de surveillance:');
        if (statsResponse.data.surveillance) {
            console.log(`👁️ Éléments à surveiller: ${statsResponse.data.surveillance.totalElements}`);
            console.log(`🚨 Employés en retard: ${statsResponse.data.surveillance.employesEnRetard}`);
            console.log(`⏰ Employés < 20h: ${statsResponse.data.surveillance.employesMoinsDe20h}`);
        } else {
            console.log('❌ Pas de données de surveillance trouvées');
        }
        
        console.log('\n📈 Autres statistiques:');
        console.log(`👥 Employés: ${statsResponse.data.employes}`);
        console.log(`✋ Pointages aujourd\'hui: ${statsResponse.data.pointes}`);
        console.log(`⏰ Heures travaillées: ${statsResponse.data.totalHeures}`);
        console.log(`📋 Demandes congés: ${statsResponse.data.congesSemaine}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testSurveillanceData();
