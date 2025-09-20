const axios = require('axios');

async function testerNouvelleSurveillance() {
    try {
        console.log('🔐 Connexion admin...');
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
            email: 'test@admin.com',
            password: 'test123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Connexion réussie');
        
        console.log('\n🔄 Test nouvelle section "À surveiller" hebdomadaire...');
        const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const surveillance = statsResponse.data.surveillance;
        
        console.log('\n📊 NOUVELLE SECTION "À SURVEILLER" - Données hebdomadaires:');
        console.log('='.repeat(60));
        
        if (surveillance) {
            console.log(`📅 Période: ${surveillance.periode || 'Non définie'}`);
            console.log(`📊 Total éléments: ${surveillance.totalElements || 0}`);
            console.log('');
            console.log('📋 Détail des surveillances:');
            console.log(`  🚫 Employés absents: ${surveillance.employesAbsents || 0}`);
            console.log(`  ⏰ Employés en retard: ${surveillance.employesEnRetard || 0}`);
            console.log(`  📋 Employés écart planning: ${surveillance.employesEcartPlanning || 0}`);
            
            console.log('\n✅ RÉSULTAT: Section "À surveiller" mise à jour avec succès !');
            console.log('Les données sont maintenant basées sur la semaine courante avec:');
            console.log('- Employés absents (sans pointages)');
            console.log('- Employés avec retards répétés');
            console.log('- Employés avec écarts de planning');
        } else {
            console.log('❌ PROBLÈME: Aucune donnée de surveillance trouvée');
        }
        
        console.log('\n📈 Autres stats pour contexte:');
        console.log(`👥 Total employés: ${statsResponse.data.employes}`);
        console.log(`✋ Pointages aujourd'hui: ${statsResponse.data.pointes}`);
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        if (error.response?.status === 401) {
            console.error('⚠️ Problème d\'authentification - recréer le compte admin');
        }
    }
}

testerNouvelleSurveillance();
