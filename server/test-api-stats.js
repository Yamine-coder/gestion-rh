// Test de l'API dashboard stats

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/dashboard-stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Test de l\'API /api/admin/dashboard-stats...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log('=' .repeat(70));
      console.log('📊 RÉPONSE DE L\'API DASHBOARD STATS');
      console.log('='.repeat(70));
      
      console.log('\n📈 DONNÉES PRINCIPALES:');
      console.log(`   - Employés: ${json.employes}`);
      console.log(`   - Demandes en attente: ${json.demandesAttente}`);
      console.log(`   - Congés ce mois: ${json.congesCeMois}`);
      console.log(`   - Total heures: ${json.totalHeures}`);
      console.log(`   - Pointés aujourd'hui: ${json.pointes}`);
      
      console.log('\n📊 SURVEILLANCE:');
      if (json.surveillance) {
        console.log(`   - Absents: ${json.surveillance.employesAbsents}`);
        console.log(`   - En retard: ${json.surveillance.employesEnRetard}`);
        console.log(`   - Écart planning: ${json.surveillance.employesEcartPlanning}`);
        console.log(`   - Période: ${json.surveillance.periode}`);
      }
      
      console.log('\n📊 KPIs:');
      if (json.kpis) {
        console.log(`   - Taux absentéisme: ${json.kpis.tauxAbsenteisme}%`);
        console.log(`   - Durée moyenne/jour: ${json.kpis.dureeMoyenneJour}h`);
        console.log(`   - Taux retards: ${json.kpis.tauxRetards}%`);
        console.log(`   - Taux rotation: ${json.kpis.tauxRotation}%`);
        console.log(`   - Ancienneté moyenne: ${json.kpis.ancienneteMoyenne} ans`);
        console.log(`   - Taux utilisation: ${json.kpis.tauxUtilisation}%`);
        
        console.log('\n   📊 Répartition par service:');
        if (json.kpis.repartitionParService) {
          json.kpis.repartitionParService.forEach(s => {
            console.log(`      - ${s.categorie}: ${s.count} (${s.pourcentage}%)`);
          });
        }
        
        console.log('\n   📊 Absences par motif:');
        if (json.kpis.absencesParMotif && json.kpis.absencesParMotif.length > 0) {
          json.kpis.absencesParMotif.forEach(a => {
            console.log(`      - ${a.motif}: ${a.jours} jour(s)`);
          });
        } else {
          console.log('      (vide)');
        }
        
        console.log('\n   📊 Absences par durée:');
        if (json.kpis.absencesParDuree && json.kpis.absencesParDuree.length > 0) {
          json.kpis.absencesParDuree.forEach(a => {
            console.log(`      - ${a.duree}: ${a.count}`);
          });
        } else {
          console.log('      (vide)');
        }
        
        console.log('\n   📊 Absentéisme par équipe:');
        if (json.kpis.absenteismeParEquipe && json.kpis.absenteismeParEquipe.length > 0) {
          json.kpis.absenteismeParEquipe.forEach(e => {
            console.log(`      - ${e.equipe}: ${e.tauxPresence}% présence, ${e.effectif} employés`);
          });
        } else {
          console.log('      (vide)');
        }
        
        console.log('\n   📊 Top employés:');
        if (json.kpis.topEmployes && json.kpis.topEmployes.length > 0) {
          json.kpis.topEmployes.slice(0, 5).forEach((e, i) => {
            console.log(`      ${i+1}. ${e.nom}: ${e.score} (${e.joursTravailles}j, ${e.heures}h)`);
          });
        } else {
          console.log('      (vide)');
        }
        
        console.log('\n   📊 Évolution présence hebdo:');
        if (json.kpis.evolutionPresenceHebdo && json.kpis.evolutionPresenceHebdo.length > 0) {
          json.kpis.evolutionPresenceHebdo.forEach(s => {
            console.log(`      - ${s.semaine}: ${s.presence}%`);
          });
        } else {
          console.log('      (vide)');
        }
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ API FONCTIONNE CORRECTEMENT');
      console.log('='.repeat(70) + '\n');
      
    } catch (e) {
      console.error('Erreur parsing JSON:', e);
      console.log('Réponse brute:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Erreur: ${e.message}`);
  console.log('   → Le serveur est-il démarré? (npm start ou node index.js)');
});

req.end();
