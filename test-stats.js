// Script de test des stats avec fetch natif (Node 18+)
async function testStats() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:5000/auth/login', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'moussa@restaurant.com', password: 'Test1234' })
    });
    const login = await loginRes.json();
    const token = login.token;
    console.log('✅ Login OK\n');

    // Get stats
    const statsRes = await fetch('http://localhost:5000/admin/stats?periode=mois', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const stats = await statsRes.json();

    const data = stats;
    const k = data.kpis;

    console.log('════════════════════════════════════════════');
    console.log('       📊 STATISTIQUES RH - DONNÉES RÉELLES');
    console.log('════════════════════════════════════════════\n');

    console.log('📈 INDICATEURS GÉNÉRAUX');
    console.log('─────────────────────────────────────────');
    console.log(`  👥 Employés total:        ${data.employes}`);
    console.log(`  ✅ Pointés aujourd'hui:   ${data.pointes}`);
    console.log(`  📝 Demandes en attente:   ${data.demandesAttente}`);
    console.log(`  🏖️  Congés ce mois:        ${data.congesCeMois}\n`);

    console.log('📊 KPIs PRINCIPAUX');
    console.log('─────────────────────────────────────────');
    console.log(`  📉 Taux absentéisme:      ${k.tauxAbsenteisme}%`);
    console.log(`  ⏱️  Durée moyenne/jour:    ${k.dureeMoyenneJour}h`);
    console.log(`  ⚡ Taux utilisation:      ${k.tauxUtilisation}%`);
    console.log(`  🚨 Taux retards:          ${k.tauxRetards}%`);
    console.log(`  🔄 Turnover:              ${k.tauxRotation}%`);
    console.log(`  📅 Ancienneté moyenne:    ${k.ancienneteMoyenne} ans\n`);

    console.log('👥 RÉPARTITION PAR CATÉGORIE');
    console.log('─────────────────────────────────────────');
    k.repartitionParService.forEach(c => {
      const bar = '█'.repeat(Math.round(c.pourcentage / 5));
      console.log(`  ${c.categorie.padEnd(15)} ${String(c.count).padStart(2)} (${String(c.pourcentage).padStart(2)}%) ${bar}`);
    });

    console.log('\n🏆 TOP 3 EMPLOYÉS (Présence + Ponctualité)');
    console.log('─────────────────────────────────────────');
    k.topEmployes.forEach((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      console.log(`  ${medal} ${e.nom.padEnd(20)} Score: ${e.score}% (Présence: ${e.presence}%, Ponctualité: ${e.ponctualite}%)`);
    });

    console.log('\n📈 ÉVOLUTION EFFECTIF (5 derniers mois)');
    console.log('─────────────────────────────────────────');
    k.evolutionEffectif.forEach(m => {
      console.log(`  ${m.mois.padEnd(5)} │ +${m.entrees} entrée(s) / -${m.sorties} sortie(s) │ Effectif: ${m.effectif}`);
    });

    console.log('\n📅 ÉVOLUTION PRÉSENCE HEBDOMADAIRE');
    console.log('─────────────────────────────────────────');
    k.evolutionPresenceHebdo.forEach(s => {
      const bar = '█'.repeat(Math.round(s.taux / 10));
      console.log(`  ${s.semaine} │ ${String(s.taux).padStart(3)}% ${bar.padEnd(10)} │ ${s.joursPresents}/${s.joursTheoriques} jours`);
    });

    console.log('\n════════════════════════════════════════════');
    console.log('              ✅ TEST TERMINÉ');
    console.log('════════════════════════════════════════════');

  } catch (e) {
    console.error('❌ Erreur:', e.response?.data || e.message);
  }
}

testStats();
