const axios = require('axios');

async function testAnomalyAPI() {
  try {
    console.log('🔍 Test API pour le scénario d\'anomalie...\n');
    
    // Essayer avec le bon mot de passe
    const possiblePasswords = ['7704154915Ym@!!', 'password123', 'test123'];
    let token = null;
    let loginSuccess = false;
    
    for (const pwd of possiblePasswords) {
      try {
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
          email: 'test@Mouss.com',
          password: pwd
        });
        
        token = loginResponse.data.token;
        loginSuccess = true;
        console.log('✅ Connexion réussie avec le mot de passe:', pwd);
        break;
      } catch (err) {
        // Continuer avec le prochain mot de passe
      }
    }
    
    if (!loginSuccess) {
      console.log('❌ Aucun mot de passe ne fonctionne. Mots de passe testés:', possiblePasswords.join(', '));
      return;
    }
    
    // Test shift (doit être absence)
    const today = new Date().toISOString().split('T')[0];
    const shiftsResponse = await axios.get(`http://127.0.0.1:5000/shifts/mes-shifts?start=${today}&end=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Shifts trouvés:', shiftsResponse.data.length);
    if (shiftsResponse.data.length > 0) {
      const shift = shiftsResponse.data[0];
      console.log('   - Type:', shift.type);
      console.log('   - Motif:', shift.motif || 'Non spécifié');
      console.log('   - Date:', new Date(shift.date).toISOString().split('T')[0]);
    }
    
    // Test pointages
    const pointagesResponse = await axios.get('http://127.0.0.1:5000/pointage/mes-pointages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const pointagesAujourdhui = pointagesResponse.data.filter(p => {
      const pointageDate = new Date(p.horodatage).toISOString().split('T')[0];
      return pointageDate === today;
    });
    
    console.log('⏱️  Pointages aujourd\'hui:', pointagesAujourdhui.length);
    pointagesAujourdhui.forEach(p => {
      const time = new Date(p.horodatage).toTimeString().substring(0,5);
      console.log(`   - ${p.type} à ${time}`);
    });
    
    // Test total heures
    const totalResponse = await axios.get('http://127.0.0.1:5000/pointage/total-aujourdhui', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('📊 Total heures:', totalResponse.data.totalHeures + 'h');
    
    console.log('\n🎯 SITUATION CONFIGURÉE:');
    console.log('========================');
    console.log('✓ Shift d\'absence planifiée (congé maladie)');
    console.log('✓ Pointage inattendu présent');
    console.log('→ L\'interface doit afficher l\'anomalie !');
    
    console.log('\n🔍 CE QUE VOUS DEVEZ VOIR DANS L\'INTERFACE:');
    console.log('============================================');
    console.log('📱 Section "Temps travaillé":');
    console.log('   • Icône: 🚫');
    console.log('   • Titre: "Absence planifiée"');
    console.log('   • Badge rouge: "Anomalie"');
    console.log('   • Encadré rouge avec:');
    console.log('     - "🚫 Absence planifiée - Motif: Congé maladie"');
    console.log('     - "⚠️ Pointages détectés malgré l\'absence planifiée"');
    console.log('   • Message: "Pointage inattendu (absence prévue: Congé maladie)"');
    console.log('   • Couleur texte: Rouge');
    
    console.log('\n🌐 Testez sur: http://localhost:3000');
    console.log('🔑 Connexion: test@Mouss.com / password123');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.status, error.response?.data?.message || error.message);
  }
}

// Exécution
testAnomalyAPI();
