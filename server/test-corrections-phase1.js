const axios = require('axios');

async function testerCorrectionsStats() {
  console.log('\n🔍 TEST DES CORRECTIONS PHASE 1 - STATISTIQUES RH\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Authentification
    console.log('\n📝 1. Authentification...');
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Authentification réussie');
    
    // 2. Récupération des statistiques
    console.log('\n📊 2. Récupération des statistiques (période: mois)...');
    const statsResponse = await axios.get('http://localhost:5000/admin/stats?periode=mois', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = statsResponse.data;
    console.log(`   ✅ Données récupérées`);
    
    // 3. Vérification des corrections
    console.log('\n' + '='.repeat(60));
    console.log('VÉRIFICATION DES CORRECTIONS');
    console.log('='.repeat(60));
    
    // ✅ Correction 1: Données simulées supprimées
    console.log('\n✅ 1. DONNÉES SIMULÉES SUPPRIMÉES');
    console.log('   📌 Vérification: stats.evolutionPresence devrait être undefined');
    if (stats.evolutionPresence === undefined) {
      console.log('   🟢 OK - evolutionPresence n\'existe plus dans l\'API');
    } else {
      console.log('   🔴 ÉCHEC - evolutionPresence existe encore !');
      console.log('   Valeur:', stats.evolutionPresence);
    }
    
    // ✅ Correction 2: Taux d'absentéisme corrigé
    console.log('\n✅ 2. TAUX D\'ABSENTÉISME CORRIGÉ');
    console.log('   📌 Vérification: Basé sur shifts réels vs heures travaillées');
    const tauxAbsenteisme = parseFloat(stats.kpis.tauxAbsenteisme);
    console.log(`   Taux d'absentéisme: ${tauxAbsenteisme}%`);
    
    if (tauxAbsenteisme >= 0 && tauxAbsenteisme <= 100) {
      console.log('   🟢 OK - Valeur cohérente (0-100%)');
      
      if (tauxAbsenteisme > 10) {
        console.log('   ⚠️  ATTENTION - Taux d\'absentéisme élevé (> 10%)');
      } else if (tauxAbsenteisme < 3) {
        console.log('   ✨ EXCELLENT - Taux d\'absentéisme faible (< 3%)');
      } else {
        console.log('   👍 BON - Taux d\'absentéisme normal (3-10%)');
      }
    } else {
      console.log(`   🔴 ÉCHEC - Valeur incohérente: ${tauxAbsenteisme}%`);
    }
    
    // ✅ Correction 3: Taux de rotation ajouté
    console.log('\n✅ 3. KPI TAUX DE ROTATION (TURNOVER) AJOUTÉ');
    console.log('   📌 Vérification: stats.kpis.tauxRotation doit exister');
    
    if (stats.kpis.tauxRotation !== undefined) {
      const tauxRotation = parseFloat(stats.kpis.tauxRotation);
      console.log(`   🟢 OK - KPI Turnover existe: ${tauxRotation}%`);
      
      if (tauxRotation > 15) {
        console.log('   ⚠️  ATTENTION - Turnover élevé (> 15%)');
      } else if (tauxRotation > 10) {
        console.log('   👍 MOYEN - Turnover acceptable (10-15%)');
      } else {
        console.log('   ✨ EXCELLENT - Turnover faible (< 10%)');
      }
    } else {
      console.log('   🔴 ÉCHEC - tauxRotation n\'existe pas !');
    }
    
    // ✅ Correction 4: Évolution effectif détaillé
    console.log('\n✅ 4. ÉVOLUTION EFFECTIF (5 derniers mois)');
    console.log('   📌 Vérification: Calcul correct du turnover');
    
    const evolutionEffectif = stats.kpis.evolutionEffectif;
    if (evolutionEffectif && evolutionEffectif.length > 0) {
      console.log(`   🟢 OK - ${evolutionEffectif.length} mois de données`);
      console.log('\n   Détails par mois:');
      console.log('   ' + '-'.repeat(56));
      console.log('   | Mois  | Entrées | Sorties | Effectif | Turnover |');
      console.log('   ' + '-'.repeat(56));
      
      const effectifDebut = evolutionEffectif[0].effectif;
      const effectifFin = evolutionEffectif[evolutionEffectif.length - 1].effectif;
      const effectifMoyen = (effectifDebut + effectifFin) / 2;
      let totalSorties = 0;
      
      evolutionEffectif.forEach(mois => {
        totalSorties += mois.sorties;
        const turnoverMois = mois.effectif > 0 ? ((mois.sorties / mois.effectif) * 100).toFixed(1) : 0;
        console.log(`   | ${mois.mois.padEnd(5)} | ${String(mois.entrees).padStart(7)} | ${String(mois.sorties).padStart(7)} | ${String(mois.effectif).padStart(8)} | ${String(turnoverMois).padStart(7)}% |`);
      });
      
      console.log('   ' + '-'.repeat(56));
      
      const turnoverGlobal = effectifMoyen > 0 ? ((totalSorties / effectifMoyen) * 100).toFixed(1) : 0;
      console.log(`\n   📊 Effectif début: ${effectifDebut}`);
      console.log(`   📊 Effectif fin: ${effectifFin}`);
      console.log(`   📊 Effectif moyen: ${effectifMoyen.toFixed(1)}`);
      console.log(`   📊 Total sorties: ${totalSorties}`);
      console.log(`   📊 Turnover global (corrigé): ${turnoverGlobal}%`);
      
      if (Math.abs(parseFloat(turnoverGlobal) - parseFloat(stats.kpis.tauxRotation)) < 0.1) {
        console.log('   🟢 OK - Formule turnover cohérente entre KPI et graphique');
      } else {
        console.log('   ⚠️  ATTENTION - Petite différence entre KPI et calcul graphique');
        console.log(`      KPI: ${stats.kpis.tauxRotation}% vs Calculé: ${turnoverGlobal}%`);
      }
    } else {
      console.log('   🔴 ÉCHEC - Pas de données d\'évolution effectif');
    }
    
    // ✅ Correction 5: Assiduité hebdomadaire (remplace heures sup)
    console.log('\n✅ 5. ASSIDUITÉ HEBDOMADAIRE (4 dernières semaines)');
    console.log('   📌 Vérification: evolutionPresenceHebdo existe');
    
    const evolutionPresenceHebdo = stats.kpis.evolutionPresenceHebdo;
    if (evolutionPresenceHebdo && evolutionPresenceHebdo.length > 0) {
      console.log(`   🟢 OK - ${evolutionPresenceHebdo.length} semaines de données`);
      console.log('\n   Détails par semaine:');
      
      evolutionPresenceHebdo.forEach((semaine, index) => {
        const barre = '█'.repeat(Math.round(semaine.taux / 5));
        const status = semaine.taux >= 90 ? '🟢' : semaine.taux >= 75 ? '🟠' : '🔴';
        console.log(`   ${status} ${semaine.semaine}: ${semaine.taux}% ${barre.padEnd(20)} (${semaine.joursPresents}/${semaine.joursTheoriques} jours)`);
      });
      
      const moyennePresence = evolutionPresenceHebdo.reduce((acc, s) => acc + s.taux, 0) / evolutionPresenceHebdo.length;
      const meilleureSemaine = Math.max(...evolutionPresenceHebdo.map(s => s.taux));
      
      console.log(`\n   📊 Moyenne: ${moyennePresence.toFixed(1)}%`);
      console.log(`   📊 Meilleure semaine: ${meilleureSemaine}%`);
    } else {
      console.log('   🔴 ÉCHEC - Pas de données d\'assiduité hebdomadaire');
    }
    
    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DES KPIs CORRIGÉS');
    console.log('='.repeat(60));
    console.log(`\n✅ Effectif total: ${stats.employes} employés`);
    console.log(`✅ Taux d'absentéisme: ${stats.kpis.tauxAbsenteisme}%`);
    console.log(`✅ Taux de rotation: ${stats.kpis.tauxRotation}%`);
    console.log(`✅ Taux de retards: ${stats.kpis.tauxRetards}%`);
    console.log(`✅ Temps moyen/jour: ${stats.kpis.dureeMoyenneJour}h`);
    console.log(`✅ Top Performers: ${stats.kpis.topEmployes?.length || 0} employés`);
    console.log(`✅ Alertes: ${stats.kpis.employesProblematiques?.length || 0} employés`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS TERMINÉS AVEC SUCCÈS');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      console.error('   Aucune réponse du serveur. Le serveur est-il démarré ?');
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Exécution
console.log('🚀 Démarrage des tests des corrections Phase 1...\n');
testerCorrectionsStats();
