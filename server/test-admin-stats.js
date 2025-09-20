const axios = require('axios');

async function testAdminStats() {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MDY3NTk4MiwiZXhwIjoxNzYwNjc5NTgyfQ.wDy30nFRN3iFP-E8SagYgOhwJqHybtZvFJ7pqiGQLcw";
    
    try {
        console.log('🔄 Test API admin stats...');
        const response = await axios.get('http://localhost:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('\n📊 Réponse de l\'API admin stats:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Vérifications spécifiques
        if (response.data.totalHeures) {
            console.log(`\n✅ Heures totales trouvées: ${response.data.totalHeures}`);
        } else {
            console.log('\n❌ Pas de heures totales dans la réponse');
        }
        
        if (response.data.employes) {
            console.log(`✅ Nombre d'employés: ${response.data.employes}`);
        }
        
        if (response.data.pointes !== undefined) {
            console.log(`✅ Employés pointés: ${response.data.pointes}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur API:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testAdminStats();
