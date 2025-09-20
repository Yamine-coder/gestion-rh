const axios = require('axios');

async function testScenarios() {
  try {
    console.log('🧪 Test de validation des scénarios de pointage\n');

    // Comptes de test à utiliser
    const comptesTest = [
      { email: 'pierre.dupont@test.com', password: 'test123', scenario: 'PRÉSENCE NORMALE (7h)' },
      { email: 'sophie.martin@test.com', password: 'test123', scenario: 'ABSENCE PLANIFIÉE' },
      { email: 'luc.bernard@test.com', password: 'test123', scenario: 'PRÉSENCE AVEC EXTRA (9h)' },
      { email: 'claire.moreau@test.com', password: 'test123', scenario: 'PRÉSENCE SANS DÉTAIL' }
    ];

    console.log('🔐 Test de connexion et récupération des shifts pour chaque scénario:\n');

    for (let i = 0; i < comptesTest.length; i++) {
      const compte = comptesTest[i];
      console.log(`${i + 1}. 🧑‍💻 Test avec ${compte.email} (${compte.scenario})`);

      try {
        // Connexion
        const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
          email: compte.email,
          password: compte.password
        });

        const token = loginResponse.data.token;
        console.log(`   ✅ Connexion réussie`);

        // Récupération des shifts
        const today = new Date();
        const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 jours
        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const shiftsResponse = await axios.get(`http://127.0.0.1:5000/shifts/mes-shifts?start=${startDateStr}&end=${endDateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const shifts = shiftsResponse.data;
        console.log(`   📋 Shifts trouvés: ${shifts.length}`);

        if (shifts.length > 0) {
          shifts.forEach(shift => {
            const dateStr = new Date(shift.date).toISOString().split('T')[0];
            console.log(`      📅 ${dateStr} - Type: ${shift.type}`);
            if (shift.motif) {
              console.log(`         🚫 Motif: ${shift.motif}`);
            }
            if (shift.segments && shift.segments.length > 0) {
              let totalMinutes = 0;
              console.log(`         ⏰ Segments:`);
              shift.segments.forEach(seg => {
                const [startH, startM] = seg.start.split(':').map(Number);
                const [endH, endM] = seg.end.split(':').map(Number);
                const minutes = (endH * 60 + endM) - (startH * 60 + startM);
                totalMinutes += minutes;
                console.log(`            • ${seg.start}-${seg.end} ${seg.commentaire}${seg.isExtra ? ' (EXTRA)' : ''}`);
              });
              console.log(`         📊 Total: ${(totalMinutes / 60).toFixed(1)}h`);
            }
          });
        }

        // Test API mes-pointages
        const pointagesResponse = await axios.get('http://127.0.0.1:5000/pointage/mes-pointages', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   ⏱️  Pointages existants: ${pointagesResponse.data.length}`);

        // Test API total-aujourdhui
        const totalResponse = await axios.get('http://127.0.0.1:5000/pointage/total-aujourdhui', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   🕐 Total aujourd'hui: ${totalResponse.data.totalHeures || 0}h`);

        console.log(`   ✅ Tous les endpoints fonctionnent pour ${compte.email}\n`);

      } catch (error) {
        console.log(`   ❌ Erreur pour ${compte.email}: ${error.response?.status} - ${error.response?.data?.message || error.message}\n`);
      }
    }

    console.log('🎯 INSTRUCTIONS POUR TESTER L\'INTERFACE:');
    console.log('=========================================');
    console.log('1. Démarrez le serveur frontend (npm run dev dans /client)');
    console.log('2. Connectez-vous avec un des comptes de test:');
    comptesTest.forEach((compte, idx) => {
      console.log(`   ${idx + 1}. ${compte.email} / ${compte.password} → ${compte.scenario}`);
    });
    console.log('3. Allez sur la page Pointage et observez l\'adaptation de l\'interface');
    console.log('4. Essayez de faire des pointages et voyez comment le système réagit\n');

    console.log('🔬 POINTS À VÉRIFIER:');
    console.log('• Interface différente selon le type de shift (présence/absence)');
    console.log('• Gestion des heures supplémentaires (badge Extra)');
    console.log('• Détection des anomalies (travail pendant absence)');
    console.log('• Calcul correct des écarts par rapport au planning');
    console.log('• Affichage adapté pour les shifts sans détail horaire');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécution
testScenarios();
