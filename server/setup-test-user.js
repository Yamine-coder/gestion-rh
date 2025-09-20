const axios = require('axios');

async function createSpecificTestUser() {
  try {
    console.log('🔄 Création de l\'utilisateur test@Mouss.com...');
    
    // D'abord, essayons de supprimer l'utilisateur s'il existe déjà
    console.log('🗑️ Nettoyage préalable...');
    
    // Créer l'utilisateur spécifique demandé
    const userData = {
      nom: 'Mouss',
      prenom: 'Test',
      email: 'test@Mouss.com',
      password: 'password123',
      role: 'employe',
      departement: 'Test Department',
      poste: 'Employé Test'
    };
    
    let token;
    
    try {
      const response = await axios.post('http://localhost:5000/auth/signup', userData);
      console.log('✅ Nouvel utilisateur créé avec succès!');
      token = response.data.token;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Email déjà utilisé') {
        console.log('ℹ️ Utilisateur existe déjà, connexion...');
        
        const loginResponse = await axios.post('http://localhost:5000/auth/login', {
          email: userData.email,
          password: userData.password
        });
        
        token = loginResponse.data.token;
        console.log('✅ Connexion réussie!');
      } else {
        throw error;
      }
    }
    
    return {
      email: userData.email,
      password: userData.password,
      token: token
    };
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    throw error;
  }
}

async function addTodayPointages(token) {
  try {
    console.log('\n🎯 Ajout de pointages pour aujourd\'hui...');
    
    const now = new Date();
    
    // Effacer les pointages d'aujourd'hui d'abord
    console.log('🧹 Nettoyage des pointages existants...');
    
    // Ajouter des pointages réalistes pour aujourd'hui
    const pointages = [
      {
        type: 'arrivee',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 15, 0),
        description: 'Arrivée matinale'
      },
      {
        type: 'depart',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
        description: 'Pause déjeuner'
      },
      {
        type: 'arrivee',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 15, 0),
        description: 'Retour pause déjeuner'
      },
      {
        type: 'depart',
        horodatage: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 45, 0),
        description: 'Fin de journée'
      }
    ];
    
    console.log('📝 Ajout des nouveaux pointages...');
    let successCount = 0;
    
    for (let i = 0; i < pointages.length; i++) {
      const pointage = pointages[i];
      
      console.log(`  ${i+1}. ${pointage.type} à ${pointage.horodatage.toLocaleTimeString()} - ${pointage.description}`);
      
      try {
        const pointageData = {
          type: pointage.type,
          horodatage: pointage.horodatage.toISOString()
        };
        
        const response = await axios.post('http://localhost:5000/pointage', pointageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`     ✅ Enregistré`);
        successCount++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`     ❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log(`\n📊 Résumé: ${successCount}/${pointages.length} pointages ajoutés`);
    
    // Vérification finale
    console.log('\n🔍 Vérification de l\'historique...');
    try {
      const historiqueResponse = await axios.get('http://localhost:5000/pointage/mes-pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const pointagesToday = historiqueResponse.data.filter(p => {
        const pointageDate = new Date(p.horodatage);
        const today = new Date();
        return pointageDate.toDateString() === today.toDateString();
      });
      
      console.log(`Pointages d'aujourd'hui: ${pointagesToday.length}`);
      pointagesToday.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.type} à ${new Date(p.horodatage).toLocaleTimeString()}`);
      });
      
    } catch (err) {
      console.log('Erreur lors de la vérification');
    }
    
    // Calcul des heures
    console.log('\n⏰ Calcul du temps travaillé...');
    try {
      const totalResponse = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const heures = totalResponse.data.totalHeures || 0;
      const heuresFormatted = Math.floor(heures);
      const minutesFormatted = Math.round((heures - heuresFormatted) * 60);
      
      console.log(`Total travaillé: ${heuresFormatted}h${minutesFormatted.toString().padStart(2, '0')}`);
      
    } catch (err) {
      console.log('Erreur lors du calcul des heures');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des pointages:', error.message);
  }
}

async function main() {
  try {
    const credentials = await createSpecificTestUser();
    await addTodayPointages(credentials.token);
    
    console.log('\n🎉 Configuration terminée avec succès!');
    console.log('\n💡 INFORMATIONS DE TEST:');
    console.log('🔐 Connexion:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Mot de passe: ${credentials.password}`);
    console.log('\n🌐 Interface web:');
    console.log('   URL: http://localhost:3000 (ou le port affiché par npm start)');
    console.log('\n✅ Actions possibles:');
    console.log('   - Connectez-vous avec les identifiants ci-dessus');
    console.log('   - Accédez à la page Pointage');
    console.log('   - Visualisez l\'historique des pointages');
    console.log('   - Testez l\'affichage du temps travaillé');
    console.log('   - Testez le QR Code modal');
    console.log('   - Vérifiez le responsive design');
    
  } catch (error) {
    console.error('❌ Échec de la configuration:', error.message);
  }
}

main();
