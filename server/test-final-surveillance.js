const axios = require('axios');
const fs = require('fs');

async function testFinal() {
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
            message: 'Section "À surveiller" bien reliée !',
            surveillance: statsResponse.data.surveillance,
            verification: {
                employes: statsResponse.data.employes,
                pointes: statsResponse.data.pointes,
                totalHeures: statsResponse.data.totalHeures,
                congesSemaine: statsResponse.data.congesSemaine
            }
        };
        
        fs.writeFileSync('test-final-surveillance.json', JSON.stringify(result, null, 2));
        console.log('✅ Test terminé - résultat dans test-final-surveillance.json');
        
    } catch (error) {
        const result = { success: false, error: error.message };
        fs.writeFileSync('test-final-surveillance.json', JSON.stringify(result, null, 2));
        console.log('❌ Erreur - résultat dans test-final-surveillance.json');
    }
}

testFinal();
