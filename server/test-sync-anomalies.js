const axios = require('axios');

async function testSync() {
  try {
    // Login admin
    console.log('1. Login admin...');
    let token;
    
    try {
      const loginRes = await axios.post('http://localhost:5000/auth/login', {
        email: 'admin@example.com',
        password: 'Admin123!'
      });
      token = loginRes.data.token;
    } catch(e1) {
      console.log('  admin@example.com failed, trying moussa...');
      try {
        const loginRes2 = await axios.post('http://localhost:5000/auth/login', {
          email: 'moussa@admin.com', 
          password: 'Moussa2025!'
        });
        token = loginRes2.data.token;
      } catch(e2) {
        console.log('  moussa@admin.com failed, trying marco (employee)...');
        const loginRes3 = await axios.post('http://localhost:5000/auth/login', {
          email: 'marco.romano@restaurant.com', 
          password: 'Marco2025!'
        });
        token = loginRes3.data.token;
        console.log('  Connecté en tant que Marco (employee)');
      }
    }
    
    console.log('2. Token obtenu !');
    
    // Sync anomalies pour le 5 décembre
    console.log('3. Sync anomalies pour 2025-12-05...');
    const syncRes = await axios.post('http://localhost:5000/api/anomalies/sync', {
      dateDebut: '2025-12-05',
      dateFin: '2025-12-05'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('4. Résultat sync:');
    console.log(JSON.stringify(syncRes.data, null, 2));
    
    // Vérifier les anomalies créées
    console.log('\n5. Anomalies pour Marco (ID 93) le 5 décembre:');
    const anomaliesRes = await axios.get('http://localhost:5000/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05&employeId=93', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(anomaliesRes.data, null, 2));
    
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testSync();
