// Utiliser le fetch natif de Node.js 18+
const fetch = globalThis.fetch || require('./server/node_modules/node-fetch');

(async () => {
  try {
    // Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin' })
    });
    
    const { token } = await loginRes.json();
    console.log('✅ Connecté\n');
    
    // Récupérer comparaisons
    const compRes = await fetch('http://localhost:5000/api/comparison/planning-vs-realite?employeId=56&dateDebut=2025-12-08&dateFin=2025-12-14', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await compRes.json();
    console.log('📊 ANALYSE ANOMALIES SEMAINE 2 (8-14 décembre)\n');
    console.log('='.repeat(60));
    
    let totalEcarts = 0;
    const typesCounts = {};
    const gravitesCounts = {};
    
    data.comparaisons.forEach(comp => {
      console.log(`\n📅 ${comp.date}:`);
      console.log(`   Planifié: ${comp.planifie.length} créneaux`);
      console.log(`   Réel: ${comp.reel.length} pointages`);
      console.log(`   Écarts détectés: ${comp.ecarts.length}`);
      
      if (comp.ecarts.length > 0) {
        comp.ecarts.forEach(ecart => {
          const type = ecart.type || 'unknown';
          const gravite = ecart.gravite || 'non_definie';
          
          typesCounts[type] = (typesCounts[type] || 0) + 1;
          gravitesCounts[gravite] = (gravitesCounts[gravite] || 0) + 1;
          totalEcarts++;
          
          console.log(`      • ${ecart.type} → gravité: ${ecart.gravite || '❓'} (${ecart.dureeMinutes || 0}min)`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Total écarts: ${totalEcarts}`);
    
    console.log(`\n🏷️  Par type:`);
    Object.entries(typesCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   • ${type.padEnd(30)} : ${count}`);
    });
    
    console.log(`\n⚠️  Par gravité:`);
    Object.entries(gravitesCounts).sort((a, b) => b[1] - a[1]).forEach(([gravite, count]) => {
      console.log(`   • ${gravite.padEnd(20)} : ${count}`);
    });
    
    // Tester sync des anomalies
    console.log('\n' + '='.repeat(60));
    console.log('\n🔄 TEST SYNCHRONISATION ANOMALIES...\n');
    
    for (const comp of data.comparaisons) {
      if (comp.ecarts.length === 0) continue;
      
      // Filtrer écarts significatifs
      const ecartsSignificatifs = comp.ecarts.filter(e => 
        e.gravite !== 'ok' && 
        e.type !== 'absence_conforme' &&
        e.type !== 'arrivee_acceptable' &&
        e.type !== 'depart_acceptable'
      );
      
      if (ecartsSignificatifs.length === 0) {
        console.log(`📅 ${comp.date}: Aucun écart significatif`);
        continue;
      }
      
      console.log(`📅 ${comp.date}: ${ecartsSignificatifs.length} écart(s) à synchroniser`);
      
      const syncRes = await fetch('http://localhost:5000/api/anomalies/sync-from-comparison', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeId: 56,
          date: comp.date,
          ecarts: ecartsSignificatifs,
          forceCreate: false
        })
      });
      
      const syncData = await syncRes.json();
      
      if (syncData.success) {
        console.log(`   ✅ ${syncData.anomaliesCreees} anomalie(s) créée(s)`);
        if (syncData.message) {
          console.log(`   ℹ️  ${syncData.message}`);
        }
      } else {
        console.log(`   ❌ Erreur: ${syncData.error || 'Inconnue'}`);
      }
    }
    
    // Vérifier anomalies en base
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 ANOMALIES EN BASE DE DONNÉES:\n');
    
    const anomaliesRes = await fetch('http://localhost:5000/api/anomalies?employeId=56&dateDebut=2025-12-08&dateFin=2025-12-14', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const anomaliesData = await anomaliesRes.json();
    
    if (anomaliesData.success) {
      console.log(`Total anomalies: ${anomaliesData.pagination.total}`);
      
      if (anomaliesData.anomalies.length > 0) {
        console.log('\nDétails:');
        anomaliesData.anomalies.forEach(a => {
          console.log(`   [${a.id}] ${a.date.split('T')[0]} - ${a.type} (${a.gravite}) - ${a.statut}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
})();
