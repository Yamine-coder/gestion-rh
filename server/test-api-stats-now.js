const axios = require('axios');

async function testStatsAPI() {
  try {
    // D'abord se connecter
    console.log('🔐 Connexion en tant qu\'admin...');
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté avec succès\n');
    
    // Récupérer les stats
    console.log('📊 Récupération des stats...\n');
    const statsRes = await axios.get('http://localhost:5000/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = statsRes.data;
    
    console.log('=== STATS RETOURNÉES PAR L\'API ===\n');
    console.log('📌 Effectif total:', stats.employes);
    console.log('✅ Ont pointé aujourd\'hui:', stats.pointes);
    console.log('❌ Absents (NON PLANIFIÉES):', stats.absents);
    console.log('🏖️ Prochains congés:', stats.prochainsConges?.length || 0);
    
    // Analyser les congés aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const congesAujourdHui = (stats.prochainsConges || []).filter(c => {
      const debut = new Date(c.dateDebut);
      const fin = new Date(c.dateFin);
      return today >= debut && today <= fin;
    });
    
    console.log('\n📅 CONGÉS ACTIFS AUJOURD\'HUI:', congesAujourdHui.length);
    congesAujourdHui.forEach((c, idx) => {
      console.log(`  ${idx + 1}. ${c.nom || c.employe} - ${c.type}`);
    });
    
    console.log('\n💡 CALCUL:');
    console.log(`  Employes total: ${stats.employes}`);
    console.log(`  Ont pointé: ${stats.pointes}`);
    console.log(`  En congé aujourd'hui: ${congesAujourdHui.length}`);
    console.log(`  → Absents non planifiés: ${stats.employes} - ${stats.pointes} - ${congesAujourdHui.length} = ${stats.employes - stats.pointes - congesAujourdHui.length}`);
    console.log(`  → Valeur "absents" de l'API: ${stats.absents}`);
    
    if (stats.absents !== stats.employes - stats.pointes - congesAujourdHui.length) {
      console.log('\n⚠️  ATTENTION: Incohérence détectée!');
      console.log('   La valeur "absents" ne correspond pas au calcul attendu.');
    } else {
      console.log('\n✅ Calcul cohérent');
    }
    
    console.log('\n📋 TOTAL ABSENTS (tous types):');
    console.log(`  ${congesAujourdHui.length} en congé + ${stats.absents} non planifiés = ${congesAujourdHui.length + stats.absents} absents totaux`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    process.exit(1);
  }
}

testStatsAPI();
