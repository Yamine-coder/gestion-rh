const axios = require('axios');

async function testStatsAPI() {
  console.log('🧪 TEST COMPLET DE L\'API /admin/stats\n');
  console.log('=' .repeat(70));

  try {
    // 1. Login admin
    console.log('\n🔐 Étape 1: Connexion admin...');
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtenu');

    // 2. Appel API stats avec période "mois"
    console.log('\n📊 Étape 2: Appel /admin/stats?periode=mois...');
    const statsResponse = await axios.get('http://localhost:5000/admin/stats?periode=mois', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const stats = statsResponse.data;

    // 3. Afficher les résultats
    console.log('\n' + '='.repeat(70));
    console.log('� RÉPONSE API COMPLÈTE');
    console.log('='.repeat(70));

    console.log('\n📌 Métriques principales:');
    console.log(`   - Employés: ${stats.employes}`);
    console.log(`   - Taux d'absentéisme: ${stats.kpis?.tauxAbsenteisme || 'N/A'}%`);
    console.log(`   - Taux de retards: ${stats.kpis?.tauxRetards || 'N/A'}%`);
    console.log(`   - Durée moyenne/jour: ${stats.kpis?.dureeMoyenneJour || 'N/A'}h`);

    console.log('\n⏱️  KPI: TEMPS MOYEN PAR JOUR');
    console.log('=' .repeat(70));
    if (stats.kpis?.dureeMoyenneJour) {
      const heures = Math.floor(stats.kpis.dureeMoyenneJour);
      const minutes = Math.round((stats.kpis.dureeMoyenneJour - heures) * 60);
      console.log(`   Valeur brute: ${stats.kpis.dureeMoyenneJour}`);
      console.log(`   Format affiché: ${heures}h${minutes.toString().padStart(2, '0')}`);
      
      if (stats.kpis.dureeMoyenneJour < 7) {
        console.log('   ⚠️  ALERTE: Temps moyen inférieur à 7h');
      } else if (stats.kpis.dureeMoyenneJour >= 7 && stats.kpis.dureeMoyenneJour <= 8) {
        console.log('   ✅ Normal: Entre 7h et 8h');
      } else {
        console.log('   📈 Élevé: Plus de 8h par jour');
      }
    } else {
      console.log('   ❌ Données manquantes');
    }

    console.log('\n⚡ KPI: HEURES SUPPLÉMENTAIRES');
    console.log('=' .repeat(70));
    if (stats.kpis?.evolutionHeuresSup && stats.kpis.evolutionHeuresSup.length > 0) {
      console.log(`   Nombre de semaines: ${stats.kpis.evolutionHeuresSup.length}`);
      
      const totalSup = stats.kpis.evolutionHeuresSup.reduce((acc, s) => acc + s.heures, 0);
      const moyenneSup = totalSup / stats.kpis.evolutionHeuresSup.length;
      
      console.log(`   Total: ${totalSup}h`);
      console.log(`   Moyenne par semaine: ${moyenneSup.toFixed(0)}h`);
      
      console.log('\n   Détail par semaine:');
      stats.kpis.evolutionHeuresSup.forEach(s => {
        const bar = '█'.repeat(Math.floor(s.heures / 50));
        console.log(`      ${s.jour}: ${s.heures}h ${bar}`);
      });
    } else {
      console.log('   ❌ Données manquantes');
    }

    console.log('\n🏆 KPI: TOP EMPLOYÉS');
    console.log('=' .repeat(70));
    if (stats.kpis?.topEmployes && stats.kpis.topEmployes.length > 0) {
      stats.kpis.topEmployes.forEach((emp, i) => {
        console.log(`   ${i + 1}. ${emp.nom.padEnd(30)} | Score: ${emp.score} | Présence: ${emp.presence}% | Ponctualité: ${emp.ponctualite}%`);
      });
    } else {
      console.log('   ❌ Données manquantes');
    }

    console.log('\n🚨 KPI: EMPLOYÉS PROBLÉMATIQUES');
    console.log('=' .repeat(70));
    if (stats.kpis?.employesProblematiques && stats.kpis.employesProblematiques.length > 0) {
      stats.kpis.employesProblematiques.forEach((emp, i) => {
        const severity = emp.type === 'critical' ? '🔴 CRITIQUE' : '🟠 ATTENTION';
        console.log(`   ${i + 1}. ${severity} | ${emp.nom.padEnd(30)} | Absences: ${emp.absences} | Retards: ${emp.retards}`);
      });
    } else {
      console.log('   ✅ Aucun problème détecté');
    }

    console.log('\n📊 AUTRES DONNÉES');
    console.log('=' .repeat(70));
    console.log(`   - Répartition congés: ${stats.repartitionConges?.length || 0} catégories`);
    console.log(`   - Statuts demandes: ${stats.statutsDemandes?.length || 0} statuts`);
    console.log(`   - Évolution présence: ${stats.evolutionPresence?.length || 0} mois`);
    console.log(`   - Évolution effectif: ${stats.kpis?.evolutionEffectif?.length || 0} mois`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ AVEC SUCCÈS');
    console.log('='.repeat(70));
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('   1. Vérifier que le graphique "Heures supplémentaires" affiche 4 barres');
    console.log('   2. Vérifier que le KPI "Temps moyen/jour" affiche le format "Xh00"');
    console.log('   3. Les valeurs doivent être calculées à partir des pointages réels');
    console.log('   4. Tester avec différentes périodes (semaine, mois, trimestre, année)');

  } catch (error) {
    console.error('\n❌ ERREUR lors du test:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   ', error.message);
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Le serveur n\'est pas démarré. Lancez: npm run dev (dans le dossier server)');
    }
  }
}

testStatsAPI();
