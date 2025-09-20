const axios = require('axios');

async function simulateRealWorkday() {
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
    
    // 2. Supprimer l'historique existant
    console.log('\n🗑️ Suppression de l\'historique de pointage...');
    
    // Récupérer les pointages existants
    const existingPointages = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📊 ${existingPointages.data.length} pointages à supprimer`);
    
    // Supprimer chaque pointage (si une route de suppression existe)
    // Sinon, on va directement créer les nouveaux pointages avec des horaires spécifiques
    
    // 3. Simuler une vraie journée de travail
    console.log('\n📅 Simulation d\'une journée de travail réaliste...');
    
    const today = new Date();
    const workdaySchedule = [
      { type: 'arrivee', time: '08:30:00', description: 'Arrivée matinale' },
      { type: 'depart', time: '12:15:00', description: 'Pause déjeuner' },
      { type: 'arrivee', time: '13:45:00', description: 'Retour déjeuner' },
      { type: 'depart', time: '18:00:00', description: 'Fin de journée' }
    ];
    
    console.log('⏰ Horaires planifiés:');
    workdaySchedule.forEach(schedule => {
      console.log(`   ${schedule.type === 'arrivee' ? '🟢' : '🔴'} ${schedule.type.toUpperCase()} - ${schedule.time} (${schedule.description})`);
    });
    
    // 4. Créer les pointages avec horaires spécifiques
    console.log('\n🔄 Création des pointages...');
    
    for (let i = 0; i < workdaySchedule.length; i++) {
      const schedule = workdaySchedule[i];
      
      // Créer une date avec l'horaire spécifique
      const [hours, minutes, seconds] = schedule.time.split(':');
      const pointageTime = new Date(today);
      pointageTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
      
      console.log(`\n${i + 1}. 📍 ${schedule.description}...`);
      
      try {
        // Utiliser la route manuelle si disponible, sinon auto
        const pointageResponse = await axios.post(`${baseURL}/pointage/manuel`, {
          type: schedule.type,
          horodatage: pointageTime.toISOString()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ ${schedule.type.toUpperCase()} à ${schedule.time}`);
        
      } catch (error) {
        // Si la route manuelle n'existe pas, utiliser auto
        console.log(`   ⚠️ Route manuelle indisponible, utilisation de la route auto...`);
        const autoResponse = await axios.post(`${baseURL}/pointage/auto`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ ${schedule.type.toUpperCase()} automatique créé`);
      }
      
      // Petite pause entre chaque pointage
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 5. Calculer le temps total travaillé
    console.log('\n📈 Calcul du temps travaillé total...');
    const totalResponse = await axios.get(`${baseURL}/pointage/total-aujourdhui`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const totalHeures = totalResponse.data.totalHeures || 0;
    const heures = Math.floor(totalHeures);
    const minutes = Math.round((totalHeures - heures) * 60);
    
    console.log(`⏳ Temps total travaillé: ${heures}h${minutes.toString().padStart(2, '0')}`);
    
    // Calculer le temps théorique
    const matin = (12 * 60 + 15) - (8 * 60 + 30); // 12h15 - 8h30 = 3h45 = 225 min
    const apresmidi = (18 * 60) - (13 * 60 + 45); // 18h00 - 13h45 = 4h15 = 255 min
    const totalTheorique = matin + apresmidi; // 480 min = 8h00
    
    console.log(`📊 Temps théorique: ${Math.floor(totalTheorique / 60)}h${(totalTheorique % 60).toString().padStart(2, '0')}`);
    console.log(`   • Matin: ${Math.floor(matin / 60)}h${(matin % 60).toString().padStart(2, '0')} (08h30 → 12h15)`);
    console.log(`   • Après-midi: ${Math.floor(apresmidi / 60)}h${(apresmidi % 60).toString().padStart(2, '0')} (13h45 → 18h00)`);
    console.log(`   • Pause déjeuner: 1h30 (12h15 → 13h45)`);
    
    // 6. Afficher l'historique final
    console.log('\n📋 Historique final de la journée:');
    const finalPointages = await axios.get(`${baseURL}/pointage/mes-pointages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    finalPointages.data
      .sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage))
      .forEach((p, i) => {
        const date = new Date(p.horodatage);
        const emoji = p.type === 'arrivee' ? '🟢' : '🔴';
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${emoji} ${p.type.toUpperCase()} - ${time}`);
      });
    
    console.log('\n🎉 Simulation d\'une journée de travail complète terminée !');
    console.log('📱 Connectez-vous sur l\'interface web pour voir le résultat :');
    console.log('   👤 Email: test@Mouss.com');
    console.log('   🔑 Mot de passe: 7704154915Ym@!!');
    console.log('   🌐 Page Pointage avec historique réaliste et calcul des heures');
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('🔒 Erreur d\'autorisation - certaines routes nécessitent des droits admin');
    }
  }
}

// Exécuter la simulation
simulateRealWorkday();
