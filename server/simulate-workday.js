const axios = require('axios');

async function createNewTestUser() {
  try {
    console.log('🔄 Création d\'un nouvel utilisateur de test...');
    
    // Créer un utilisateur de test avec un email unique
    const timestamp = Date.now();
    const userData = {
      nom: 'TestUser',
      prenom: 'Mouss',
      email: `test.mouss.${timestamp}@example.com`,
      password: 'password123',
      role: 'employe',
      departement: 'Test',
      poste: 'Employé Test'
    };
    
    const response = await axios.post('http://localhost:5000/auth/signup', userData);
    
    console.log('✅ Utilisateur de test créé avec succès:', {
      email: userData.email,
      role: response.data.role
    });
    
    console.log('🔑 Token d\'authentification:', response.data.token);
    
    return {
      email: userData.email,
      password: userData.password,
      token: response.data.token
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    throw error;
  }
}

async function forceMultiplePointages(token) {
  try {
    console.log('\n🎯 Forçage de plusieurs pointages pour simuler une journée de travail...');
    
    // Simuler une journée de travail avec plusieurs pointages
    const now = new Date();
    const pointages = [
      {
        type: 'arrivee',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0), // 8h30
        description: 'Arrivée du matin'
      },
      {
        type: 'depart',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0), // 12h00
        description: 'Pause déjeuner'
      },
      {
        type: 'arrivee',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0), // 13h30
        description: 'Retour de pause'
      },
      {
        type: 'depart',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30, 0), // 17h30
        description: 'Fin de journée'
      }
    ];
    
    for (let i = 0; i < pointages.length; i++) {
      const pointage = pointages[i];
      
      console.log(`\n${i+1}. Ajout pointage ${pointage.type} à ${pointage.horodatage.toLocaleTimeString()}`);
      
      try {
        const pointageData = {
          type: pointage.type,
          horodatage: pointage.horodatage.toISOString()
        };
        
        const pointageResponse = await axios.post('http://localhost:5000/pointage', pointageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`   ✅ ${pointage.description} enregistrée`);
        
        // Petite pause entre les pointages
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Vérifier le résultat final
    console.log('\n📊 Vérification des pointages créés...');
    try {
      const historiqueResponse = await axios.get('http://localhost:5000/pointage/mes-pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Pointages enregistrés:', historiqueResponse.data.length);
      historiqueResponse.data.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.type} à ${new Date(p.horodatage).toLocaleTimeString()}`);
      });
    } catch (err) {
      console.log('Erreur lors de la récupération de l\'historique');
    }
    
    // Vérifier le total des heures
    console.log('\n⏰ Calcul du temps de travail...');
    try {
      const totalResponse = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Total heures travaillées:', totalResponse.data.totalHeures || 0, 'heures');
    } catch (err) {
      console.log('Erreur lors du calcul des heures:', err.response?.data?.message || err.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation:', error.message);
  }
}

async function main() {
  try {
    const credentials = await createNewTestUser();
    await forceMultiplePointages(credentials.token);
    
    console.log('\n🎉 Simulation terminée avec succès!');
    console.log('💡 Informations de connexion pour tester l\'interface:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Mot de passe: ${credentials.password}`);
    console.log('   Interface web: http://localhost:3000');
    console.log('\n🔍 Vous pouvez maintenant:');
    console.log('   - Vous connecter sur l\'interface web');
    console.log('   - Voir la page de pointage avec les données');
    console.log('   - Tester l\'affichage de l\'historique');
    console.log('   - Voir le calcul du temps travaillé');
    
  } catch (error) {
    console.error('❌ Échec de la simulation:', error.message);
  }
}

main();
