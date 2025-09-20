const axios = require('axios');

async function forcePointageTest() {
  try {
    console.log('🔄 Tentative de connexion avec test@Mouss.com...');
    
    // 1. Connexion pour obtenir le token
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'test@Mouss.com',
      password: 'password123' // Mot de passe par défaut pour les tests
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Connexion réussie, token obtenu');
    
    // 2. Vérifier les informations de l'utilisateur
    const userResponse = await axios.get('http://localhost:5000/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('👤 Utilisateur connecté:', {
      nom: userResponse.data.nom,
      prenom: userResponse.data.prenom,
      email: userResponse.data.email,
      role: userResponse.data.role
    });
    
    // 3. Vérifier les pointages existants
    console.log('\n📊 Vérification des pointages existants...');
    try {
      const historique = await axios.get('http://localhost:5000/pointage/mes-pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Pointages existants aujourd\'hui:', historique.data.length);
      historique.data.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.type} à ${new Date(p.horodatage).toLocaleTimeString()}`);
      });
    } catch (err) {
      console.log('Aucun pointage existant ou erreur:', err.message);
    }
    
    // 4. Forcer un pointage d'arrivée si aucun pointage aujourd'hui
    console.log('\n🎯 Forçage d\'un pointage...');
    const pointageData = {
      type: 'arrivee',
      horodatage: new Date(),
      coordonnees: {
        latitude: 48.8566,
        longitude: 2.3522
      }
    };
    
    const pointageResponse = await axios.post('http://localhost:5000/pointage', pointageData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Pointage forcé avec succès:', pointageResponse.data);
    
    // 5. Vérifier le total des heures
    const totalResponse = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('⏰ Total heures aujourd\'hui:', totalResponse.data.totalHeures, 'heures');
    
    console.log('\n🎉 Test terminé avec succès!');
    console.log('💡 Vous pouvez maintenant vous connecter avec test@Mouss.com sur l\'interface');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

// Exécuter le test
forcePointageTest();
