const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_DATE = '2025-10-21';

async function testDashboardAPIs() {
  let token = null;
  const results = {
    auth: { ok: false, error: null },
    stats: { ok: false, error: null, data: null },
    conges: { ok: false, error: null, data: null },
    employes: { ok: false, error: null, data: null },
    shifts: { ok: false, error: null, data: null },
    planning: { ok: false, error: null, data: null }
  };

  console.log('\n🔍 TEST DES APIs DU DASHBOARD\n');
  console.log('=' .repeat(60));

  // 1. Test authentification
  console.log('\n1️⃣ Test authentification...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@gestionrh.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.token) {
      token = loginResponse.data.token;
      results.auth.ok = true;
      console.log('   ✅ Authentification réussie');
    } else {
      results.auth.error = 'Pas de token dans la réponse';
      console.log('   ❌ Pas de token reçu');
    }
  } catch (error) {
    results.auth.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.message);
    console.log('\n⚠️  Impossible de continuer sans authentification');
    return results;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Test /admin/stats
  console.log('\n2️⃣ Test /admin/stats...');
  try {
    const statsResponse = await axios.get(`${BASE_URL}/admin/stats`, { headers });
    results.stats.ok = true;
    results.stats.data = statsResponse.data;
    
    console.log('   ✅ API /admin/stats OK');
    console.log('   📊 Employés:', statsResponse.data.employes);
    console.log('   👥 Ont pointé:', statsResponse.data.pointes);
    console.log('   🏖️  Prochains congés:', statsResponse.data.prochainsConges?.length || 0);
    
    if (statsResponse.data.employes === 0) {
      console.log('   ⚠️  ATTENTION: 0 employés retournés!');
    }
    if (statsResponse.data.pointes === 0) {
      console.log('   ⚠️  ATTENTION: 0 pointages retournés!');
    }
  } catch (error) {
    results.stats.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }

  // 3. Test /admin/conges
  console.log('\n3️⃣ Test /admin/conges...');
  try {
    const congesResponse = await axios.get(`${BASE_URL}/admin/conges?statut=en%20attente`, { headers });
    results.conges.ok = true;
    results.conges.data = congesResponse.data;
    
    const list = Array.isArray(congesResponse.data) ? congesResponse.data : 
                 Array.isArray(congesResponse.data?.conges) ? congesResponse.data.conges : [];
    
    console.log('   ✅ API /admin/conges OK');
    console.log('   📝 Demandes en attente:', list.length);
  } catch (error) {
    results.conges.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }

  // 4. Test /admin/employes
  console.log('\n4️⃣ Test /admin/employes...');
  try {
    const employesResponse = await axios.get(`${BASE_URL}/admin/employes`, { headers });
    results.employes.ok = true;
    results.employes.data = employesResponse.data;
    
    const employes = Array.isArray(employesResponse.data) ? employesResponse.data : [];
    const employees = employes.filter(e => e.role === 'employee');
    
    console.log('   ✅ API /admin/employes OK');
    console.log('   👥 Total utilisateurs:', employes.length);
    console.log('   👤 Employés (role=employee):', employees.length);
    
    if (employees.length === 0) {
      console.log('   ⚠️  ATTENTION: Aucun employé trouvé!');
    }
  } catch (error) {
    results.employes.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }

  // 5. Test /admin/shifts
  console.log('\n5️⃣ Test /admin/shifts...');
  try {
    const shiftsResponse = await axios.get(
      `${BASE_URL}/admin/shifts?start=${TEST_DATE}&end=${TEST_DATE}`, 
      { headers }
    );
    results.shifts.ok = true;
    results.shifts.data = shiftsResponse.data;
    
    const shifts = Array.isArray(shiftsResponse.data) ? shiftsResponse.data : 
                   Array.isArray(shiftsResponse.data?.shifts) ? shiftsResponse.data.shifts : [];
    
    console.log('   ✅ API /admin/shifts OK');
    console.log('   📅 Shifts pour', TEST_DATE, ':', shifts.length);
  } catch (error) {
    results.shifts.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }

  // 6. Test /admin/planning/jour (alternative)
  console.log('\n6️⃣ Test /admin/planning/jour (alternative)...');
  try {
    const planningResponse = await axios.get(
      `${BASE_URL}/admin/planning/jour?date=${TEST_DATE}`, 
      { headers }
    );
    results.planning.ok = true;
    results.planning.data = planningResponse.data;
    
    const plannings = Array.isArray(planningResponse.data) ? planningResponse.data : [];
    
    console.log('   ✅ API /admin/planning/jour OK');
    console.log('   📅 Plannings pour', TEST_DATE, ':', plannings.length);
  } catch (error) {
    results.planning.error = error.message;
    console.log('   ❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RÉSUMÉ DES TESTS\n');
  
  const tests = Object.entries(results);
  const passed = tests.filter(([_, r]) => r.ok).length;
  const failed = tests.filter(([_, r]) => !r.ok).length;
  
  console.log(`✅ Réussis: ${passed}/${tests.length}`);
  console.log(`❌ Échoués: ${failed}/${tests.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  APIs en erreur:');
    tests.forEach(([name, result]) => {
      if (!result.ok) {
        console.log(`   - ${name}: ${result.error || 'Erreur inconnue'}`);
      }
    });
  }

  // Analyse des incohérences
  console.log('\n🔍 ANALYSE DES INCOHÉRENCES\n');
  
  if (results.stats.ok && results.stats.data) {
    const stats = results.stats.data;
    const employes = stats.employes || 0;
    const pointes = stats.pointes || 0;
    
    console.log('Données API /admin/stats:');
    console.log(`   • Employés: ${employes}`);
    console.log(`   • Ont pointé: ${pointes}`);
    
    if (employes > 0 && pointes === 0) {
      console.log('\n❌ INCOHÉRENCE DÉTECTÉE:');
      console.log('   Il y a des employés mais 0 pointages.');
      console.log('   Le dashboard va afficher 100% d\'absents à tort!');
      console.log('\n💡 Solutions possibles:');
      console.log('   1. Vérifier que les pointages existent en base (voir diagnostic-direct-db.js)');
      console.log('   2. Vérifier le calcul dans statsController.js ligne 26-27');
      console.log('   3. Vérifier les filtres de date (timezone?)');
    } else if (employes > 0 && pointes > 0) {
      const tauxPresence = Math.round((pointes / employes) * 100);
      console.log(`\n✅ Cohérence OK: Taux de présence = ${tauxPresence}%`);
    } else if (employes === 0) {
      console.log('\n⚠️  PROBLÈME: API retourne 0 employés');
      console.log('   Le dashboard ne peut pas fonctionner correctement.');
    }
  }

  console.log('\n' + '='.repeat(60));
  
  return results;
}

// Exécuter les tests
testDashboardAPIs().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
