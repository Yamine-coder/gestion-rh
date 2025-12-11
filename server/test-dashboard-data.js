const axios = require('axios');

async function testDashboardData() {
  console.log('🧪 Test des données du Dashboard\n');
  console.log('═'.repeat(60));

  // 1. Login en tant qu'admin
  console.log('\n1️⃣ Connexion admin...');
  let token;
  try {
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'password123'
    });
    token = loginRes.data.token;
    console.log('✅ Connexion réussie');
    console.log(`   Token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Test de l'endpoint /admin/stats
  console.log('\n2️⃣ Test de /admin/stats...');
  try {
    const statsRes = await axios.get('http://localhost:5000/admin/stats', { headers });
    console.log('✅ Stats récupérées:');
    console.log('   Employés:', statsRes.data.employes || 0);
    console.log('   Pointés:', statsRes.data.pointes || 0);
    console.log('   Congés ce mois:', statsRes.data.congesCeMois || 0);
    console.log('   Demandes en attente:', statsRes.data.demandesAttente || 0);
  } catch (error) {
    console.error('❌ Erreur stats:', error.response?.data || error.message);
  }

  // 3. Test de l'endpoint /admin/conges en attente
  console.log('\n3️⃣ Test de /admin/conges?statut=en attente...');
  try {
    const congesRes = await axios.get('http://localhost:5000/admin/conges?statut=en%20attente', { headers });
    const conges = Array.isArray(congesRes.data) ? congesRes.data : congesRes.data?.conges || [];
    console.log(`✅ ${conges.length} demande(s) en attente`);
    conges.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.user?.nom || c.user?.email || 'N/A'} - ${c.type} - ${c.statut}`);
    });
  } catch (error) {
    console.error('❌ Erreur congés:', error.response?.data || error.message);
  }

  // 4. Test de l'endpoint /admin/shifts pour aujourd'hui
  console.log('\n4️⃣ Test de /admin/shifts (aujourd\'hui)...');
  const today = new Date().toISOString().slice(0, 10);
  try {
    const shiftsRes = await axios.get(`http://localhost:5000/admin/shifts?start=${today}&end=${today}`, { headers });
    const shifts = Array.isArray(shiftsRes.data) ? shiftsRes.data : shiftsRes.data?.shifts || [];
    console.log(`✅ ${shifts.length} shift(s) trouvé(s) pour ${today}`);
    
    shifts.forEach((s, idx) => {
      const employeName = s.employe?.nom && s.employe?.prenom 
        ? `${s.employe.prenom} ${s.employe.nom}` 
        : s.employe?.email || 'Non assigné';
      
      console.log(`\n   Shift ${idx + 1}:`);
      console.log(`   ├─ Employé: ${employeName}`);
      console.log(`   ├─ Date: ${s.date}`);
      console.log(`   ├─ Type: ${s.type}`);
      console.log(`   ├─ Segments: ${Array.isArray(s.segments) ? s.segments.length : 0}`);
      
      if (Array.isArray(s.segments) && s.segments.length > 0) {
        s.segments.forEach((seg, segIdx) => {
          const debut = seg.debut || seg.start || 'N/A';
          const fin = seg.fin || seg.end || 'N/A';
          console.log(`   │  └─ Segment ${segIdx + 1}: ${debut} → ${fin}`);
        });
      }
    });
  } catch (error) {
    console.error('❌ Erreur shifts:', error.response?.data || error.message);
  }

  // 5. Vérifier la transformation des shifts côté frontend
  console.log('\n5️⃣ Simulation de la transformation des shifts...');
  try {
    const shiftsRes = await axios.get(`http://localhost:5000/admin/shifts?start=${today}&end=${today}`, { headers });
    const rawShifts = Array.isArray(shiftsRes.data) ? shiftsRes.data : shiftsRes.data?.shifts || [];
    
    console.log('   Transformation des shifts pour le Dashboard:');
    
    rawShifts.forEach((shift, idx) => {
      // Simuler la transformation
      const shiftDate = new Date(shift.date);
      
      if (isNaN(shiftDate.getTime())) {
        console.log(`   ❌ Shift ${idx + 1}: Date invalide (${shift.date})`);
        return;
      }
      
      let start, end;
      
      if (Array.isArray(shift.segments) && shift.segments.length > 0) {
        const firstSeg = shift.segments[0];
        const lastSeg = shift.segments[shift.segments.length - 1];
        
        const [startH, startM] = (firstSeg.debut || firstSeg.start || '08:00').split(':');
        const [endH, endM] = (lastSeg.fin || lastSeg.end || '16:00').split(':');
        
        const startDate = new Date(shiftDate);
        startDate.setHours(parseInt(startH), parseInt(startM), 0, 0);
        
        const endDate = new Date(shiftDate);
        endDate.setHours(parseInt(endH), parseInt(endM), 0, 0);
        
        start = startDate.toISOString();
        end = endDate.toISOString();
      } else {
        start = shiftDate.toISOString();
        end = new Date(shiftDate.getTime() + 8 * 3600000).toISOString();
      }
      
      const employeName = shift.employe?.nom && shift.employe?.prenom 
        ? `${shift.employe.prenom} ${shift.employe.nom}` 
        : shift.employe?.email || 'Non assigné';
      
      console.log(`   ✅ Shift ${idx + 1}:`);
      console.log(`      Employé: ${employeName}`);
      console.log(`      Start: ${new Date(start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`      End: ${new Date(end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    });
  } catch (error) {
    console.error('❌ Erreur transformation:', error.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Tests terminés !');
  console.log('\n💡 Prochaines étapes:');
  console.log('   1. Ouvrez http://localhost:3000 (ou le port affiché)');
  console.log('   2. Connectez-vous avec: admin@gestionrh.com / password123');
  console.log('   3. Vérifiez que le Dashboard affiche correctement les données');
}

testDashboardData()
  .catch(err => {
    console.error('❌ Erreur générale:', err.message);
    process.exit(1);
  });
