// test-analytics-api.js - Test des endpoints analytics
const http = require('http');

const API_BASE = 'localhost';
const API_PORT = 5000;

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testAnalyticsAPI() {
  console.log('🧪 === TEST ANALYTICS API ===\n');

  // 1. Connexion
  console.log('1️⃣ Connexion...');
  const loginRes = await makeRequest('/auth/login', 'POST', {
    email: 'thomas.laurent@restaurant.com',
    password: 'password123'
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('❌ Échec connexion:', loginRes.status, loginRes.data);
    return;
  }

  const token = loginRes.data.token;
  const user = loginRes.data.user || loginRes.data;
  console.log('✅ Connecté:', user.prenom || 'User', user.nom || '', '(ID:', user.userId || user.id, ')');

  // 2. Test analytics globaux
  console.log('\n2️⃣ Analytics globaux (mois)...');
  const analyticsRes = await makeRequest('/api/anomalies/analytics?periode=mois&dept=all', 'GET', null, token);
  
  if (analyticsRes.status === 200) {
    console.log('✅ Analytics OK');
    console.log('\n📊 KPIs:');
    console.log('  • Taux ponctualité:', analyticsRes.data.kpis.tauxPonctualite + '%', 
                `(${analyticsRes.data.kpis.tauxPonctualiteEvolution > 0 ? '+' : ''}${analyticsRes.data.kpis.tauxPonctualiteEvolution}%)`);
    console.log('  • En attente:', analyticsRes.data.kpis.enAttente,
                `(${analyticsRes.data.kpis.enAttenteEvolution > 0 ? '+' : ''}${analyticsRes.data.kpis.enAttenteEvolution}%)`);
    console.log('  • Taux validation:', analyticsRes.data.kpis.tauxValidation + '%');
    console.log('  • Coût heures sup:', analyticsRes.data.kpis.coutHeuresSup + '€');
    
    console.log('\n📈 Tendances:', analyticsRes.data.tendances.length, 'points');
    console.log('\n📊 Répartition types:', analyticsRes.data.kpis.repartitionTypes.length, 'types');
    analyticsRes.data.kpis.repartitionTypes.forEach(t => {
      console.log(`  • ${t.type}: ${t.count}`);
    });
    
    console.log('\n👥 Top employés:', analyticsRes.data.topEmployes.length);
    analyticsRes.data.topEmployes.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.nom} - ${e.nbAnomalies} anomalies - Score: ${e.score}/100 - ${e.tendance}`);
    });
    
    console.log('\n💡 Insights:', analyticsRes.data.kpis.insights.length);
    analyticsRes.data.kpis.insights.forEach(ins => {
      const emoji = ins.type === 'warning' ? '⚠️' : ins.type === 'success' ? '✅' : 'ℹ️';
      console.log(`  ${emoji} ${ins.titre}`);
      console.log(`     ${ins.description}`);
    });
  } else {
    console.error('❌ Erreur analytics:', analyticsRes.data);
  }

  // 3. Test score employé
  const userId = user.userId || user.id;
  console.log('\n3️⃣ Score employé (ID:', userId, ')...');
  const scoreRes = await makeRequest(`/api/anomalies/score/${userId}`, 'GET', null, token);
  
  if (scoreRes.status === 200) {
    console.log('✅ Score OK');
    console.log('  📊 Score actuel:', scoreRes.data.score + '/100');
    console.log('  📈 Tendance:', scoreRes.data.tendance);
    console.log('  📅 Historique (4 semaines):');
    scoreRes.data.historique.forEach(h => {
      console.log(`     ${h.semaine}: ${h.score}/100`);
    });
  } else {
    console.error('❌ Erreur score:', scoreRes.data);
  }

  // 4. Test patterns
  console.log('\n4️⃣ Patterns employé (ID:', userId, ')...');
  const patternsRes = await makeRequest(`/api/anomalies/patterns/${userId}`, 'GET', null, token);
  
  if (patternsRes.status === 200) {
    console.log('✅ Patterns OK');
    if (patternsRes.data.patterns.length === 0) {
      console.log('  ℹ️ Aucun pattern détecté (bon signe !)');
    } else {
      console.log(`  ⚠️ ${patternsRes.data.patterns.length} pattern(s) détecté(s):`);
      patternsRes.data.patterns.forEach(p => {
        console.log(`     • ${p.titre}`);
        console.log(`       ${p.description} (${p.gravite})`);
        console.log(`       Actions: ${p.actions.join(', ')}`);
      });
    }
  } else {
    console.error('❌ Erreur patterns:', patternsRes.data);
  }

  // 5. Test différentes périodes
  console.log('\n5️⃣ Test autres périodes...');
  const periodes = ['jour', 'semaine', 'trimestre'];
  
  for (const periode of periodes) {
    const res = await makeRequest(`/api/anomalies/analytics?periode=${periode}&dept=all`, 'GET', null, token);
    if (res.status === 200) {
      console.log(`  ✅ ${periode.padEnd(10)}: ${res.data.kpis.tauxPonctualite}% ponctualité, ${res.data.kpis.enAttente} en attente`);
    } else {
      console.log(`  ❌ ${periode}: erreur`);
    }
  }

  console.log('\n✅ Tests analytics terminés !');
}

// Lancer les tests
testAnalyticsAPI().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
