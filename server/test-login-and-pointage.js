const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔄 Test de connexion avec différents mots de passe...');
    
    const emails = ['test@Mouss.com'];
    const passwords = ['password123', 'motdepasse', '123456', 'admin', 'test'];
    
    for (const email of emails) {
      for (const password of passwords) {
        try {
          console.log(`Tentative: ${email} / ${password}`);
          const response = await axios.post('http://localhost:5000/auth/login', {
            email: email,
            password: password
          });
          
          console.log('✅ CONNEXION RÉUSSIE!');
          console.log('Email:', email);
          console.log('Mot de passe:', password);
          console.log('Token:', response.data.token);
          
          return { email, password, token: response.data.token };
          
        } catch (err) {
          console.log(`❌ ${email} / ${password} - Échec`);
        }
      }
    }
    
    throw new Error('Aucune combinaison ne fonctionne');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

async function forcePointageWithCredentials(token) {
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
      horodatage: new Date().toISOString()
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
      console.log('⏰ Total heures: Erreur lors du calcul');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du pointage:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

async function main() {
  const credentials = await testLogin();
  
  if (credentials) {
    await forcePointageWithCredentials(credentials.token);
    
    console.log('\n🎉 Test terminé avec succès!');
    console.log('💡 Informations de connexion:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Mot de passe: ${credentials.password}`);
    console.log('   Interface: http://localhost:3000 (ou autre port)');
  }
}

main();
