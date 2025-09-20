// Test avec authentification
async function testerEmploye19() {
  try {
    console.log('=== TEST API EMPLOYÉ ID 19 ===');
    
    // Étape 1: Authentification
    console.log('1. Authentification...');
    const loginResponse = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('Erreur login:', loginResponse.status);
      // Essayons avec d'autres credentials
      console.log('Tentative avec d\'autres credentials...');
      const loginResponse2 = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@exemple.com',
          password: 'motdepasse123'
        })
      });
      
      if (!loginResponse2.ok) {
        console.log('Échec d\'authentification. Vérifiez les credentials.');
        return;
      }
      
      const loginData = await loginResponse2.json();
      var token = loginData.token;
    } else {
      const loginData = await loginResponse.json();
      var token = loginData.token;
    }
    
    console.log('Token obtenu:', token ? 'Oui' : 'Non');
    
    // Étape 2: Récupérer le rapport
    console.log('2. Récupération du rapport employé ID 19...');
    const rapportResponse = await fetch('http://localhost:5000/api/stats/employe/19/rapport', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!rapportResponse.ok) {
      console.log('Erreur rapport:', rapportResponse.status);
      const errorText = await rapportResponse.text();
      console.log('Détail:', errorText);
      return;
    }
    
    const rapportData = await rapportResponse.json();
    console.log('\n=== DONNÉES RAPPORT EMPLOYÉ 19 ===');
    console.log('Heures par jour:', rapportData.heuresParJour?.length || 0, 'entrées');
    console.log('Retards:', rapportData.retards?.length || 0, 'entrées');
    
    if (rapportData.retards && rapportData.retards.length > 0) {
      console.log('\nDétail des retards:');
      rapportData.retards.forEach((retard, index) => {
        console.log(`${index + 1}. Date: ${retard.date}, Durée: ${retard.duree} min`);
      });
    } else {
      console.log('Aucun retard trouvé.');
    }
    
    if (rapportData.heuresParJour && rapportData.heuresParJour.length > 0) {
      console.log('\nDétail des heures par jour (premiers 5):');
      rapportData.heuresParJour.slice(0, 5).forEach((jour, index) => {
        const travaillees = jour.travaillees || jour.heuresTravaillees || 0;
        console.log(`${index + 1}. ${jour.jour || jour.date}: ${travaillees}h travaillées`);
      });
      if (rapportData.heuresParJour.length > 5) {
        console.log(`... et ${rapportData.heuresParJour.length - 5} autres entrées`);
      }
    } else {
      console.log('Aucune donnée d\'heures par jour.');
    }
    
    // Simulation du calcul de ponctualité
    console.log('\n=== CALCUL PONCTUALITÉ ===');
    
    const joursPresents = (rapportData.heuresParJour || []).filter(r => {
      const travaillees = r.travaillees || r.heuresTravaillees || 0;
      return travaillees > 0;
    });
    
    console.log('Jours présents:', joursPresents.length);
    
    const retardsUniques = new Set();
    if (rapportData.retards) {
      rapportData.retards.forEach(retard => {
        if (retard.date && parseInt(retard.duree) > 0) {
          retardsUniques.add(retard.date);
        }
      });
    }
    
    console.log('Jours avec retard (uniques):', retardsUniques.size);
    console.log('Dates avec retards:', Array.from(retardsUniques));
    
    const joursSansRetard = Math.max(0, joursPresents.length - retardsUniques.size);
    const taux = joursPresents.length > 0 ? Math.round((joursSansRetard / joursPresents.length) * 100) : 100;
    
    console.log('Jours sans retard:', joursSansRetard);
    console.log('Taux de ponctualité calculé:', taux + '%');
    
    // Afficher aussi le taux du backend pour comparaison
    if (rapportData.tauxPonctualite !== undefined) {
      console.log('Taux du backend:', rapportData.tauxPonctualite + '%');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

testerEmploye19();
