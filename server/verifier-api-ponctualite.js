// Vérification API du taux de ponctualité corrigé
const axios = require('axios');

async function verifierAPI() {
  console.log('🔍 VÉRIFICATION API - TAUX DE PONCTUALITÉ CORRIGÉ\n');
  console.log('='.repeat(80));

  try {
    // Se connecter en tant qu'admin
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@restaurant.com',
      password: 'Admin123!'
    });

    const token = loginRes.data.token;
    console.log('✅ Connexion admin réussie\n');

    // Appeler l'API de rapport tous employés
    const rapportRes = await axios.get(
      'http://localhost:5000/api/stats/rapport-tous-employes',
      {
        params: {
          periode: 'semaine',
          date: '2025-11-24'
        },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const employes = rapportRes.data.employes;
    console.log(`📊 Rapport reçu: ${employes.length} employés\n`);

    // Chercher l'employé TestDouble
    const employeTest = employes.find(e => e.email === 'test.double.segment@restaurant.com');

    if (!employeTest) {
      console.log('❌ Employé TestDouble non trouvé dans le rapport\n');
      console.log('Employés présents:');
      employes.forEach(e => console.log(`   - ${e.nom} ${e.prenom} (${e.email})`));
      return;
    }

    console.log('✅ Employé TestDouble trouvé!\n');
    console.log('='.repeat(80));
    console.log('\n📈 RÉSULTATS:\n');
    console.log(`   Nom: ${employeTest.nom} ${employeTest.prenom}`);
    console.log(`   Email: ${employeTest.email}`);
    console.log(`   Jours présents: ${employeTest.joursPresents}`);
    console.log(`   Nombre de retards: ${employeTest.nombreRetards}`);
    console.log(`   Taux de ponctualité: ${employeTest.tauxPonctualite}%`);
    console.log(`   Heures travaillées: ${employeTest.heuresTravaillees}h`);
    console.log(`   Heures prévues: ${employeTest.heuresPrevues}h\n`);

    console.log('='.repeat(80));
    console.log('\n✅ VALIDATION:\n');

    let tousCorrects = true;

    if (employeTest.nombreRetards === 2) {
      console.log('   ✅ nombreRetards = 2 (CORRECT: 2 jours avec retard)');
    } else {
      console.log(`   ❌ nombreRetards = ${employeTest.nombreRetards} (ATTENDU: 2)`);
      tousCorrects = false;
    }

    if (employeTest.tauxPonctualite === 60) {
      console.log('   ✅ tauxPonctualite = 60% (CORRECT: (5-2)/5 = 60%)');
    } else {
      console.log(`   ❌ tauxPonctualite = ${employeTest.tauxPonctualite}% (ATTENDU: 60%)`);
      tousCorrects = false;
    }

    if (employeTest.joursPresents === 5) {
      console.log('   ✅ joursPresents = 5 (CORRECT: lundi à vendredi)');
    } else {
      console.log(`   ❌ joursPresents = ${employeTest.joursPresents} (ATTENDU: 5)`);
      tousCorrects = false;
    }

    console.log('\n' + '='.repeat(80));

    if (tousCorrects) {
      console.log('\n🎉 SUCCÈS ! LA CORRECTION FONCTIONNE PARFAITEMENT\n');
      console.log('Le bug est corrigé:');
      console.log('  ✅ On compte maintenant les JOURS avec retard (pas les segments)');
      console.log('  ✅ Lundi avec 2 segments en retard = 1 jour');
      console.log('  ✅ Taux de ponctualité: 60% (au lieu de 40%)\n');
    } else {
      console.log('\n⚠️  ATTENTION: Des valeurs ne correspondent pas\n');
      console.log('Vérifiez que le serveur a bien été redémarré après la correction.\n');
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur API:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

verifierAPI();
