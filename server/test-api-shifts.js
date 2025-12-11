// Test l'API /shifts/mes-shifts exactement comme le frontend
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

(async () => {
  try {
    // 1. Se connecter en tant que Jordan
    console.log('🔐 Connexion en tant que Jordan...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'yjordan496@gmail.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Token obtenu');
    
    // 2. Calculer workDay comme le frontend
    const now = new Date();
    const workDayDate = new Date(now);
    if (now.getHours() < 6) {
      workDayDate.setDate(workDayDate.getDate() - 1);
    }
    const workDay = workDayDate.toISOString().split('T')[0];
    
    console.log(`\n📅 Heure actuelle: ${now.toISOString()} (${now.getHours()}h locale)`);
    console.log(`📅 WorkDay calculé: ${workDay}`);
    
    // 3. Appeler l'API mes-shifts
    console.log(`\n🔍 Appel API: /shifts/mes-shifts?start=${workDay}&end=${workDay}`);
    const shiftsRes = await axios.get(`${API_BASE}/shifts/mes-shifts?start=${workDay}&end=${workDay}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Réponse API:', JSON.stringify(shiftsRes.data, null, 2));
    
    // 4. Tester le matching comme le frontend
    console.log('\n🔍 Test matching frontend:');
    shiftsRes.data.forEach(shift => {
      const shiftDateObj = new Date(shift.date);
      const shiftDateLocal = shiftDateObj.toLocaleDateString('fr-CA');
      const match = shiftDateLocal === workDay;
      console.log(`  Shift ID ${shift.id}: date brute="${shift.date}" → locale="${shiftDateLocal}" vs workDay="${workDay}" → ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
    });
    
    // 5. Trouver le shift comme le frontend
    const userShift = shiftsRes.data.find(shift => {
      const shiftDateObj = new Date(shift.date);
      const shiftDateLocal = shiftDateObj.toLocaleDateString('fr-CA');
      return shiftDateLocal === workDay;
    });
    
    console.log('\n📌 Résultat final:');
    if (userShift) {
      console.log('✅ Shift trouvé:', userShift.id, 'Type:', userShift.type);
      console.log('   Segments:', JSON.stringify(userShift.segments));
    } else {
      console.log('❌ Aucun shift trouvé pour ce jour');
    }
    
  } catch (err) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
})();
