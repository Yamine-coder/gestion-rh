const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const today = new Date().toISOString().split('T')[0];

console.log('🔍 TEST DES DONNÉES DE PLANNING ET RETARDS');
console.log('='.repeat(60));
console.log('📅 Date:', today);
console.log('');

async function testPlanningRetards() {
  try {
    // Se connecter d'abord pour obtenir un token
    console.log('🔐 Authentification...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@gestionrh.com',
      motDePasse: 'Admin123!'
    });
    
    const token = loginRes.data.token;
    console.log('   ✅ Authentification réussie');
    console.log('');
    
    // Configuration axios avec le token
    const axiosConfig = {
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    // 1. Récupérer les stats
    console.log('1️⃣ Récupération des stats...');
    const statsRes = await axios.get(`${BASE_URL}/admin/stats`, axiosConfig);
    const stats = statsRes.data;
    
    console.log('   ✅ Stats récupérées:');
    console.log('      - Total employés:', stats.employes?.total || 0);
    console.log('      - Pointés:', stats.employes?.pointes || 0);
    console.log('      - Non pointés:', stats.employes?.nonPointes || 0);
    console.log('');

    // 2. Récupérer les comparaisons (planning vs réalité)
    console.log('2️⃣ Récupération des comparaisons planning vs réalité...');
    const compRes = await axios.get(`${BASE_URL}/api/comparison/planning-vs-realite?date=${today}`, axiosConfig);
    const comparaisons = compRes.data;
    
    console.log(`   ✅ ${comparaisons.length} comparaison(s) récupérée(s)`);
    console.log('');

    // 3. Analyser les écarts
    console.log('3️⃣ Analyse des écarts détectés:');
    console.log('');
    
    let totalEcarts = 0;
    let retards = 0;
    let absences = 0;
    let horsPlage = 0;
    let departs = 0;

    comparaisons.forEach((comp, idx) => {
      if (comp.ecarts && comp.ecarts.length > 0) {
        totalEcarts += comp.ecarts.length;
        
        console.log(`   👤 Employé: ${comp.employeNom} (ID: ${comp.employeId})`);
        console.log(`      Date: ${comp.date}`);
        console.log(`      Écarts (${comp.ecarts.length}):`);
        
        comp.ecarts.forEach((ecart, eidx) => {
          const minutes = ecart.dureeMinutes || Math.abs(ecart.ecartMinutes) || 0;
          const icon = ecart.gravite === 'critique' ? '🔴' :
                      ecart.gravite === 'attention' ? '🟡' :
                      ecart.gravite === 'hors_plage' ? '🟣' :
                      ecart.gravite === 'info' ? '🔵' : '🟢';
          
          console.log(`         ${icon} [${ecart.type}] - ${minutes} min`);
          console.log(`            Gravité: ${ecart.gravite}`);
          console.log(`            Prévu: ${ecart.prevu || 'N/A'}`);
          console.log(`            Réel: ${ecart.reel || 'N/A'}`);
          if (ecart.description) {
            console.log(`            ${ecart.description.substring(0, 100)}`);
          }
          console.log('');
          
          // Compter par type
          if (ecart.type?.includes('retard')) retards++;
          if (ecart.type === 'absence_totale') absences++;
          if (ecart.type?.includes('hors_plage')) horsPlage++;
          if (ecart.type?.includes('depart')) departs++;
        });
      }
    });

    // 4. Récupérer les shifts du planning
    console.log('4️⃣ Récupération des shifts du planning...');
    const shiftsRes = await axios.get(`${BASE_URL}/api/shifts?date=${today}`, axiosConfig);
    const shifts = shiftsRes.data;
    
    console.log(`   ✅ ${shifts.length} shift(s) récupéré(s)`);
    console.log('');

    // 5. Récupérer la liste des employés avec leurs pointages
    console.log('5️⃣ Récupération de la liste des employés...');
    const empRes = await axios.get(`${BASE_URL}/admin/employes`, axiosConfig);
    const employes = empRes.data;
    
    console.log(`   ✅ ${employes.length} employé(s) récupéré(s)`);
    console.log('');

    // 6. Récupérer les pointages
    console.log('6️⃣ Récupération des pointages...');
    const pointagesRes = await axios.get(`${BASE_URL}/admin/pointages?date=${today}`, axiosConfig);
    const pointages = pointagesRes.data;
    
    console.log(`   ✅ ${pointages.length} pointage(s) récupéré(s)`);
    
    // Afficher les détails des pointages
    if (pointages.length > 0) {
      console.log('');
      console.log('   📋 Détails des pointages:');
      pointages.forEach(p => {
        const emp = employes.find(e => e.id === p.employeId);
        console.log(`      - ${emp ? emp.prenom + ' ' + emp.nom : 'Employé ' + p.employeId}`);
        console.log(`        Type: ${p.type}, Heure: ${p.heure}`);
      });
    }
    console.log('');

    // Résumé final
    console.log('='.repeat(60));
    console.log('📊 RÉSUMÉ DES ANOMALIES DÉTECTÉES:');
    console.log('='.repeat(60));
    console.log(`   Total écarts: ${totalEcarts}`);
    console.log(`   🔴 Retards: ${retards}`);
    console.log(`   🚨 Absences: ${absences}`);
    console.log(`   🟣 Hors-plage: ${horsPlage}`);
    console.log(`   ⏰ Départs anticipés: ${departs}`);
    console.log('');

    // Vérification des données pour le dashboard
    console.log('='.repeat(60));
    console.log('✅ VÉRIFICATION POUR LE DASHBOARD:');
    console.log('='.repeat(60));
    
    let hasRetardWithMinutes = false;
    comparaisons.forEach(comp => {
      if (comp.ecarts) {
        comp.ecarts.forEach(ecart => {
          if (ecart.type?.includes('retard') && (ecart.dureeMinutes || ecart.ecartMinutes)) {
            hasRetardWithMinutes = true;
            console.log(`   ✅ Retard trouvé avec minutes: ${comp.employeNom}`);
            console.log(`      - Type: ${ecart.type}`);
            console.log(`      - dureeMinutes: ${ecart.dureeMinutes}`);
            console.log(`      - ecartMinutes: ${ecart.ecartMinutes}`);
            console.log(`      - Description: ${ecart.description?.substring(0, 80)}`);
            console.log('');
          }
        });
      }
    });

    if (!hasRetardWithMinutes) {
      console.log('   ⚠️  Aucun retard avec minutes détectées dans les comparaisons');
    }

    // Vérifier si des shifts sont en retard
    const now = new Date();
    const shiftsEnRetard = shifts.filter(s => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      const started = !!(s.started || s.hasPointage || s.checkIn);
      return start < now && end > now && !started && s.employeeId;
    });

    console.log(`   📋 Shifts en retard (selon planning): ${shiftsEnRetard.length}`);
    shiftsEnRetard.forEach(s => {
      const start = new Date(s.start);
      const retardMinutes = Math.floor((now - start) / 60000);
      console.log(`      - ${s.employeeName || 'Employé ' + s.employeeId}: +${retardMinutes} min`);
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test terminé avec succès!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testPlanningRetards();
