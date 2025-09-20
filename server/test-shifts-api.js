const axios = require('axios');

async function testAPIShifts() {
  try {
    console.log('🔍 === TEST API MES-SHIFTS ===\n');
    
    // 1. Login pour obtenir un token
    console.log('1. Login...');
    const loginRes = await axios.post('http://127.0.0.1:5000/auth/login', {
      email: 'test@Mouss.com',
      password: '7704154915Ym@!!'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Token obtenu:', token.substring(0, 50) + '...');
    
    // 2. Test de l'endpoint mes-shifts
    console.log('\n2. Test endpoint /shifts/mes-shifts...');
    const today = new Date().toISOString().split('T')[0];
    
    const shiftsRes = await axios.get(`http://127.0.0.1:5000/shifts/mes-shifts?start=${today}&end=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Réponse API shifts:', shiftsRes.data);
    console.log('📊 Nombre de shifts:', shiftsRes.data.length);
    
    shiftsRes.data.forEach((shift, index) => {
      console.log(`\n   Shift ${index + 1}:`);
      console.log('   - ID:', shift.id);
      console.log('   - Date:', shift.date);
      console.log('   - Type:', shift.type);
      console.log('   - EmployeId:', shift.employeId);
      console.log('   - Motif:', shift.motif || 'Aucun');
      console.log('   - Segments:', shift.segments || 'Aucun');
    });
    
    // 3. Vérifier si on trouve une absence
    const absenceShift = shiftsRes.data.find(s => s.type === 'absence');
    if (absenceShift) {
      console.log('\n✅ ABSENCE TROUVÉE !');
      console.log('   Type:', absenceShift.type);
      console.log('   Motif:', absenceShift.motif);
    } else {
      console.log('\n❌ ABSENCE NON TROUVÉE');
      console.log('   Types disponibles:', shiftsRes.data.map(s => s.type));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testAPIShifts();
