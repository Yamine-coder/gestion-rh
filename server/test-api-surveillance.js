const axios = require('axios');

async function testerAPISurveillance() {
    try {
        console.log('🔐 Connexion admin...');
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Connexion réussie');
        
        console.log('\n🔄 Récupération des stats admin...');
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = statsResponse.data;
        
        console.log('\n📊 Statistiques générales:');
        console.log(`👥 Employés: ${data.employes}`);
        console.log(`✋ Pointages aujourd'hui: ${data.pointes}`);
        console.log(`⏰ Heures travaillées: ${data.totalHeures}`);
        console.log(`📋 Demandes de congés: ${data.congesSemaine}`);
        
        console.log('\n👁️ Données de surveillance:');
        if (data.surveillance) {
            console.log(`🔍 Surveillance object trouvé: ✅`);
            console.log(`⚠️ Employés en retard: ${data.surveillance.employesEnRetard}`);
            console.log(`⏰ Employés < 20h: ${data.surveillance.employesMoinsDe20h}`);
            console.log(`📊 Total éléments: ${data.surveillance.totalElements}`);
            
            console.log('\n✅ RÉSULTAT: La section "À surveiller" est bien reliée aux données !');
            console.log(`Le frontend devrait afficher ${data.surveillance.totalElements} éléments à surveiller.`);
        } else {
            console.log('❌ PROBLÈME: Aucune donnée de surveillance trouvée dans la réponse API');
        }
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testerAPISurveillance();
