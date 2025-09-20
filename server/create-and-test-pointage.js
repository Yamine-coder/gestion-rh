const axios = require('axios');

async function createTestUser() {
  try {
    console.log('🔄 Création de l\'utilisateur de test...');
    
    // Créer un utilisateur de test
    const userData = {
      nom: 'Test',
      prenom: 'Mouss',
      email: 'test@Mouss.com',
      password: 'password123',
      role: 'employe',
      departement: 'Test',
      poste: 'Employé Test'
    };
    
    const response = await axios.post('http://localhost:5000/auth/signup', userData);
    
    console.log('✅ Utilisateur de test créé avec succès:', {
      nom: response.data.user.nom,
      prenom: response.data.user.prenom,
      email: response.data.user.email,
      role: response.data.user.role
    });
    
    console.log('🔑 Token d\'authentification:', response.data.token);
    
    return response.data.token;
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('existe déjà')) {
      console.log('ℹ️ L\'utilisateur existe déjà, tentative de connexion...');
      
      try {
        const loginResponse = await axios.post('http://localhost:5000/auth/login', {
          email: 'test@Mouss.com',
          password: 'password123'
        });
        
        console.log('✅ Connexion réussie avec l\'utilisateur existant');
        return loginResponse.data.token;
        
      } catch (loginError) {
        console.error('❌ Erreur lors de la connexion:', loginError.message);
        throw loginError;
      }
    } else {
      console.error('❌ Erreur lors de la création:', error.message);
      if (error.response) {
        console.error('Détails:', error.response.data);
      }
      throw error;
    }
  }
}

async function forcePointage(token) {
  try {
    console.log('\n📊 Vérification des pointages existants...');
    
    // Vérifier les pointages existants
    let historique = [];
    try {
      const historiqueResponse = await axios.get('http://localhost:5000/pointage/mes-pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      historique = historiqueResponse.data;
      console.log('Pointages existants aujourd\'hui:', historique.length);
      historique.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.type} à ${new Date(p.horodatage).toLocaleTimeString()}`);
      });
    } catch (err) {
      console.log('Aucun pointage existant');
    }
    
    // Déterminer le type de pointage à faire
    let typePointage = 'arrivee';
    if (historique.length > 0) {
      const dernierPointage = historique[historique.length - 1];
      typePointage = dernierPointage.type === 'arrivee' ? 'depart' : 'arrivee';
    }
    
    console.log(`\n🎯 Forçage d'un pointage de ${typePointage}...`);
    
    const pointageData = {
      type: typePointage,
      horodatage: new Date(),
      coordonnees: {
        latitude: 48.8566,
        longitude: 2.3522
      }
    };
    
    const pointageResponse = await axios.post('http://localhost:5000/pointage', pointageData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Pointage ${typePointage} forcé avec succès:`, {
      type: pointageResponse.data.type,
      horodatage: new Date(pointageResponse.data.horodatage).toLocaleString()
    });
    
    // Vérifier le total des heures
    try {
      const totalResponse = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('⏰ Total heures aujourd\'hui:', totalResponse.data.totalHeures || 0, 'heures');
    } catch (err) {
      console.log('⏰ Total heures: 0 (pas encore calculé)');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du pointage:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

async function main() {
  try {
    const token = await createTestUser();
    await forcePointage(token);
    
    console.log('\n🎉 Test terminé avec succès!');
    console.log('💡 Vous pouvez maintenant:');
    console.log('   - Vous connecter avec test@Mouss.com / password123');
    console.log('   - Voir le pointage dans l\'interface employé');
    console.log('   - Tester la vue d\'historique');
    
  } catch (error) {
    console.error('❌ Échec du test:', error.message);
  }
}

main();
