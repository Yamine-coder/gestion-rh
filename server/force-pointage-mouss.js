const axios = require('axios');

async function forcePointageTestMouss() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('🔐 Connexion avec test@Mouss.com...');
    
    // 1. Se connecter avec les vrais identifiants
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'test@Mouss.com',
      password: '7704154915Ym@!!'
    });
    
    const { token } = loginResponse.data;
    console.log('✅ Connexion réussie !');
    console.log(`👤 Utilisateur: test@Mouss.com`);
    console.log(`🔑 Token reçu: ${token.substring(0, 20)}...`);
    
    // 2. Vérifier les pointages existants
    console.log('\n📋 Vérification des pointages existants...');
    const pointagesResponse = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📊 Pointages existants aujourd'hui: ${pointagesResponse.data.length}`);
    pointagesResponse.data.forEach((p, i) => {
      const date = new Date(p.horodatage);
      console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${date.toLocaleTimeString('fr-FR')}`);
    });
    
    // 3. Forcer un nouveau pointage
    console.log('\n⏱️ Création d\'un nouveau pointage...');
    const pointageResponse = await axios.post(`${baseURL}/pointage/auto`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Pointage créé avec succès !');
    console.log(`📍 Type: ${pointageResponse.data.type}`);
    console.log(`⏰ Heure: ${new Date(pointageResponse.data.horodatage).toLocaleString('fr-FR')}`);
    
    // 4. Vérifier le total des heures
    console.log('\n📈 Calcul du temps travaillé...');
    const totalResponse = await axios.get(`${baseURL}/pointage/total-aujourdhui`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const totalHeures = totalResponse.data.totalHeures || 0;
    const heures = Math.floor(totalHeures);
    const minutes = Math.round((totalHeures - heures) * 60);
    console.log(`⏳ Temps travaillé aujourd'hui: ${heures}h${minutes.toString().padStart(2, '0')}`);
    
    // 5. Afficher les pointages mis à jour
    console.log('\n📋 Pointages après ajout:');
    const newPointagesResponse = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    newPointagesResponse.data.forEach((p, i) => {
      const date = new Date(p.horodatage);
      console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${date.toLocaleTimeString('fr-FR')}`);
    });
    
    console.log('\n🎉 Test terminé avec succès !');
    console.log('📱 Vous pouvez maintenant vérifier sur la page Pointage dans l\'interface web.');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('🔒 Problème d\'authentification - vérifiez le mot de passe');
    } else if (error.response?.status === 404) {
      console.log('🔍 Utilisateur non trouvé');
    }
  }
}

// Exécuter le test
forcePointageTestMouss();
