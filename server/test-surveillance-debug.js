const axios = require('axios');

async function testSurveillanceData() {
    try {
        // D'abord login pour obtenir un token
        console.log('🔐 Connexion admin...');
        const loginResponse = await axios.post('http://localhost:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Token obtenu');

        // Récupérer les stats du dashboard
        console.log('\n📊 Récupération des stats...');
        const statsResponse = await axios.get('http://localhost:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const stats = statsResponse.data;
        
        console.log('\n🔍 DONNÉES SURVEILLANCE:');
        console.log('='.repeat(50));
        console.log(`Employés absents: ${stats.surveillance?.employesAbsents || 0}`);
        console.log(`Employés en retard: ${stats.surveillance?.employesEnRetard || 0}`);  
        console.log(`Employés écart planning: ${stats.surveillance?.employesEcartPlanning || 0}`);
        console.log(`Total éléments: ${stats.surveillance?.totalElements || 0}`);
        console.log(`Période: ${stats.surveillance?.periode || 'Non définie'}`);
        
        console.log('\n📋 STATS COMPLÈTES:');
        console.log('='.repeat(50));
        console.log(`Employés: ${stats.employes || 0}`);
        console.log(`Pointés: ${stats.pointes || 0}`);
        console.log(`Total heures: ${stats.totalHeures || '0h'}`);
        console.log(`Congés semaine: ${stats.congesSemaine || 0}`);
        
        console.log('\n🎯 OBJET SURVEILLANCE COMPLET:');
        console.log('='.repeat(50));
        console.log(JSON.stringify(stats.surveillance, null, 2));

    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

testSurveillanceData();
