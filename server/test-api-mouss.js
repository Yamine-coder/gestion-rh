const axios = require('axios');

async function testAPIWithMoussToken() {
  try {
    console.log('🧪 Test API avec le token de test@Mouss.com...\n');
    
    // D'abord se connecter pour obtenir le vrai token
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'test@Mouss.com',
      motDePasse: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token récupéré:', token.substring(0, 50) + '...');
    
    // Test 1: Mes pointages
    console.log('\n📍 Test 1: /pointage/mes-pointages');
    const mesPointages = await axios.get('http://localhost:5000/pointage/mes-pointages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Nombre de pointages:', mesPointages.data.length);
    mesPointages.data.forEach((p, i) => {
      const date = new Date(p.horodatage);
      console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${date.toLocaleString('fr-FR')}`);
    });
    
    // Test 2: Mes pointages aujourd'hui
    console.log('\n📅 Test 2: /pointage/mes-pointages-aujourdhui');
    try {
      const pointagesAujourdhui = await axios.get('http://localhost:5000/pointage/mes-pointages-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   Nombre de pointages aujourd\'hui:', pointagesAujourdhui.data.length);
      pointagesAujourdhui.data.forEach((p, i) => {
        const date = new Date(p.horodatage);
        console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${date.toLocaleString('fr-FR')}`);
      });
    } catch (error) {
      console.log('   ⚠️ Endpoint non disponible, utilise mes-pointages');
    }
    
    // Test 3: Total heures aujourd'hui
    console.log('\n⏰ Test 3: /pointage/total-aujourdhui');
    const totalHeures = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Total heures:', totalHeures.data.totalHeures);
    const h = Math.floor(totalHeures.data.totalHeures || 0);
    const m = Math.round(((totalHeures.data.totalHeures || 0) - h) * 60);
    console.log(`   Format affiché: ${h.toString().padStart(2,'0')}h${m.toString().padStart(2,'0')}`);
    
    // Test 4: Profil utilisateur
    console.log('\n👤 Test 4: /user/profile');
    const profile = await axios.get('http://localhost:5000/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Nom:', profile.data.nom);
    console.log('   Prénom:', profile.data.prenom);
    console.log('   Email:', profile.data.email);
    
    console.log('\n🎯 RÉSUMÉ POUR LE FRONTEND:');
    console.log('   Le frontend devrait maintenant afficher:');
    console.log(`   • Nom: ${profile.data.prenom} ${profile.data.nom}`);
    console.log(`   • Pointages: ${mesPointages.data.length}`);
    console.log(`   • Temps travaillé: ${h.toString().padStart(2,'0')}h${m.toString().padStart(2,'0')}`);
    console.log(`   • Progression: ${Math.round(((totalHeures.data.totalHeures || 0) / 8) * 100)}%`);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Erreur API:', error.response.status, error.response.data);
    } else {
      console.error('❌ Erreur réseau:', error.message);
    }
  }
}

testAPIWithMoussToken();
