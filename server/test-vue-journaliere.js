const axios = require('axios');

async function testVueJournaliere() {
  console.log('🧪 Test de la Vue Journalière\n');
  
  // 1. Login
  console.log('1️⃣ Connexion admin...');
  const loginRes = await axios.post('http://localhost:5000/auth/login', {
    email: 'admin@gestionrh.com',
    password: 'password123'
  });
  const token = loginRes.data.token;
  console.log('✅ Connecté\n');
  
  // 2. Récupérer les pointages du 20 octobre
  const date = '2025-10-20';
  console.log(`2️⃣ Récupération des pointages du ${date}...`);
  
  const res = await axios.get(`http://localhost:5000/pointage/admin/pointages/jour/${date}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log(`✅ ${res.data.length} employé(s) trouvé(s)\n`);
  
  res.data.forEach((user, idx) => {
    console.log(`📊 Employé ${idx + 1}:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.prenom} ${user.nom}`);
    console.log(`   Blocs: ${user.blocs.length}`);
    
    user.blocs.forEach((bloc, blocIdx) => {
      const arrivee = bloc.arrivee ? new Date(bloc.arrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
      const depart = bloc.depart ? new Date(bloc.depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
      
      console.log(`      Bloc ${blocIdx + 1}: ${arrivee} → ${depart} (${bloc.duree || 'en cours'})`);
    });
    
    console.log(`   Total: ${user.total}`);
    console.log('');
  });
  
  console.log('🎉 Test terminé !');
  console.log('\n💡 Si les heures s\'affichent correctement ici,');
  console.log('   rechargez la page de la vue journalière dans le navigateur.');
}

testVueJournaliere()
  .catch(err => {
    console.error('❌ Erreur:', err.response?.data || err.message);
    process.exit(1);
  });
