const axios = require('axios');

async function testNouvelIndicateur() {
  console.log('🧪 TEST DU NOUVEL INDICATEUR: TAUX DE PRÉSENCE HEBDOMADAIRE\n');
  console.log('=' .repeat(70));

  try {
    // 1. Connexion
    console.log('\n🔐 Connexion admin...');
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtenu');

    // 2. Appel API stats
    console.log('\n📊 Récupération des stats...');
    const statsResponse = await axios.get('http://localhost:5000/admin/stats?periode=mois', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const stats = statsResponse.data;

    console.log('\n' + '='.repeat(70));
    console.log('✅ NOUVEAU KPI: ASSIDUITÉ HEBDOMADAIRE');
    console.log('='.repeat(70));

    if (stats.kpis?.evolutionPresenceHebdo && stats.kpis.evolutionPresenceHebdo.length > 0) {
      console.log('\n📈 Évolution sur 4 semaines:');
      
      stats.kpis.evolutionPresenceHebdo.forEach(semaine => {
        const bar = '█'.repeat(Math.floor(semaine.taux / 5));
        const statusIcon = semaine.taux >= 90 ? '🟢' : semaine.taux >= 75 ? '🟠' : '🔴';
        
        console.log(`\n   ${statusIcon} ${semaine.semaine}: ${semaine.taux}% ${bar}`);
        console.log(`      • Employés présents: ${semaine.presents}`);
        console.log(`      • Jours-personne présents: ${semaine.joursPresents}/${semaine.joursTheoriques}`);
      });

      const moyenneTaux = stats.kpis.evolutionPresenceHebdo.reduce((acc, s) => acc + s.taux, 0) / stats.kpis.evolutionPresenceHebdo.length;
      const meilleureSemaine = Math.max(...stats.kpis.evolutionPresenceHebdo.map(s => s.taux));
      const pireSemaine = Math.min(...stats.kpis.evolutionPresenceHebdo.map(s => s.taux));

      console.log('\n📊 Résumé:');
      console.log(`   • Moyenne: ${moyenneTaux.toFixed(1)}%`);
      console.log(`   • Meilleure semaine: ${meilleureSemaine}%`);
      console.log(`   • Pire semaine: ${pireSemaine}%`);
      console.log(`   • Variation: ${(meilleureSemaine - pireSemaine).toFixed(1)}%`);

      console.log('\n💡 Interprétation:');
      if (moyenneTaux >= 90) {
        console.log('   🟢 EXCELLENT - Assiduité très élevée');
      } else if (moyenneTaux >= 75) {
        console.log('   🟠 MOYEN - Assiduité acceptable mais peut être améliorée');
      } else {
        console.log('   🔴 FAIBLE - Problèmes d\'assiduité à résoudre');
      }

    } else {
      console.log('\n❌ Aucune donnée disponible pour evolutionPresenceHebdo');
      console.log('   Vérifiez que le serveur a été redémarré avec les nouvelles modifications.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ');
    console.log('='.repeat(70));

    console.log('\n📊 AUTRES KPIs DISPONIBLES:');
    console.log(`   • Employés: ${stats.employes}`);
    console.log(`   • Taux d'absentéisme: ${stats.kpis?.tauxAbsenteisme}%`);
    console.log(`   • Taux de retards: ${stats.kpis?.tauxRetards}%`);
    console.log(`   • Temps moyen/jour: ${stats.kpis?.dureeMoyenneJour}h`);

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Le serveur n\'est pas démarré. Lancez: npm run dev (dans server/)');
    }
  }
}

testNouvelIndicateur();
