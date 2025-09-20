const axios = require('axios');

async function simulateArriveeDepart() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('🔐 Connexion avec test@Mouss.com...');
    
    // 1. Se connecter
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'test@Mouss.com',
      password: '7704154915Ym@!!'
    });
    
    const { token } = loginResponse.data;
    console.log('✅ Connexion réussie !');
    
    // 2. Vérifier l'état actuel
    console.log('\n📋 État actuel des pointages...');
    const currentPointages = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📊 Pointages existants: ${currentPointages.data.length}`);
    currentPointages.data.forEach((p, i) => {
      const date = new Date(p.horodatage);
      console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${date.toLocaleTimeString('fr-FR')}`);
    });
    
    // 3. Créer une ARRIVÉE
    console.log('\n🌅 Création d\'un pointage ARRIVÉE...');
    const arriveeResponse = await axios.post(`${baseURL}/pointage/auto`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Pointage ARRIVÉE créé !');
    const arriveeTime = new Date().toLocaleTimeString('fr-FR');
    console.log(`⏰ Heure d'arrivée: ${arriveeTime}`);
    
    // 4. Attendre 2 secondes pour simuler le temps
    console.log('\n⏳ Simulation du temps de travail...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Créer un DÉPART
    console.log('\n🌇 Création d\'un pointage DÉPART...');
    const departResponse = await axios.post(`${baseURL}/pointage/auto`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Pointage DÉPART créé !');
    const departTime = new Date().toLocaleTimeString('fr-FR');
    console.log(`⏰ Heure de départ: ${departTime}`);
    
    // 6. Vérifier le résultat final
    console.log('\n📈 Calcul du temps travaillé total...');
    const totalResponse = await axios.get(`${baseURL}/pointage/total-aujourdhui`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const totalHeures = totalResponse.data.totalHeures || 0;
    const heures = Math.floor(totalHeures);
    const minutes = Math.round((totalHeures - heures) * 60);
    const secondes = Math.round(((totalHeures - heures) * 60 - minutes) * 60);
    
    console.log(`⏳ Temps travaillé: ${heures}h${minutes.toString().padStart(2, '0')}m${secondes.toString().padStart(2, '0')}s`);
    
    // 7. Afficher l'historique final
    console.log('\n📋 Historique complet de la journée:');
    const finalPointages = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    finalPointages.data.forEach((p, i) => {
      const date = new Date(p.horodatage);
      const emoji = p.type === 'arrivee' ? '🟢' : '🔴';
      console.log(`   ${emoji} ${p.type.toUpperCase()} - ${date.toLocaleTimeString('fr-FR')}`);
    });
    
    console.log('\n🎉 Simulation arrivée/départ terminée !');
    console.log('📱 Connectez-vous sur l\'interface web pour voir les résultats :');
    console.log('   👤 Email: test@Mouss.com');
    console.log('   🔑 Mot de passe: 7704154915Ym@!!');
    console.log('   🌐 URL: http://localhost:3001 (ou autre port utilisé)');
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation:', error.response?.data || error.message);
  }
}

// Exécuter la simulation
simulateArriveeDepart();
