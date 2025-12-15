require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function generateTestData() {
  // Récupérer les employés actifs
  const employees = await pool.query(`SELECT id, nom, prenom FROM "User" WHERE role = 'employee' AND statut = 'actif' LIMIT 15`);
  console.log('Employés trouvés:', employees.rows.length);

  // Types d'événements avec leurs points (utilisant rule_code au lieu de type_evenement)
  const events = [
    { code: 'PONCTUALITE', points: 5, motif: 'Ponctualité exemplaire' },
    { code: 'PONCTUALITE', points: 3, motif: 'Arrivée à l\'heure' },
    { code: 'DISPONIBILITE', points: 10, motif: 'Remplacement accepté au dernier moment' },
    { code: 'DISPONIBILITE', points: 8, motif: 'Disponibilité week-end' },
    { code: 'POLYVALENCE', points: 8, motif: 'Polyvalence sur plusieurs postes' },
    { code: 'INITIATIVE', points: 15, motif: 'Initiative remarquable' },
    { code: 'RETARD', points: -5, motif: 'Retard de 15 minutes' },
    { code: 'RETARD', points: -3, motif: 'Retard de 10 minutes' },
    { code: 'ABSENCE', points: -15, motif: 'Absence non justifiée' },
    { code: 'ABSENCE', points: -10, motif: 'Absence sans prévenir' },
    { code: 'QUALITE', points: 7, motif: 'Qualité de service client' },
    { code: 'FORMATION', points: 10, motif: 'Formation nouveau collègue' },
    { code: 'EFFICACITE', points: 6, motif: 'Efficacité en rush' },
  ];

  // Générer des dates sur 3 mois
  const dates = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  let insertCount = 0;
  
  // Créer des profils variés
  for (let idx = 0; idx < employees.rows.length; idx++) {
    const emp = employees.rows[idx];
    
    // Profil de l'employé (bon, moyen, à surveiller)
    let profile;
    if (idx < 4) profile = 'excellent'; // 4 excellents
    else if (idx < 8) profile = 'good'; // 4 bons
    else if (idx < 12) profile = 'average'; // 4 moyens
    else profile = 'poor'; // 3 à surveiller
    
    // Nombre d'événements selon profil
    const numEvents = profile === 'excellent' ? 15 : profile === 'good' ? 12 : profile === 'average' ? 10 : 8;
    
    for (let i = 0; i < numEvents; i++) {
      let event;
      const rand = Math.random();
      
      // Sélection d'événements selon le profil
      if (profile === 'excellent') {
        // 90% bonus
        if (rand < 0.9) {
          event = events.filter(e => e.points > 0)[Math.floor(Math.random() * 8)];
        } else {
          event = events.filter(e => e.points < 0)[Math.floor(Math.random() * 4)];
        }
      } else if (profile === 'good') {
        // 75% bonus
        if (rand < 0.75) {
          event = events.filter(e => e.points > 0)[Math.floor(Math.random() * 8)];
        } else {
          event = events.filter(e => e.points < 0)[Math.floor(Math.random() * 4)];
        }
      } else if (profile === 'average') {
        // 50% bonus
        if (rand < 0.5) {
          event = events.filter(e => e.points > 0)[Math.floor(Math.random() * 8)];
        } else {
          event = events.filter(e => e.points < 0)[Math.floor(Math.random() * 4)];
        }
      } else {
        // 30% bonus (profil à surveiller)
        if (rand < 0.3) {
          event = events.filter(e => e.points > 0)[Math.floor(Math.random() * 8)];
        } else {
          event = events.filter(e => e.points < 0)[Math.floor(Math.random() * 4)];
        }
      }
      
      if (!event) continue;
      
      const date = dates[Math.floor(Math.random() * dates.length)];
      
      await pool.query(
        'INSERT INTO employe_points (employe_id, rule_code, points, motif, date_evenement, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [emp.id, event.code, event.points, event.motif, date, 91]
      );
      insertCount++;
      
      console.log(`  ${emp.prenom} ${emp.nom}: ${event.points > 0 ? '+' : ''}${event.points} (${event.code})`);
    }
  }
  
  console.log('\n✅ Points insérés:', insertCount);
  
  // Stats finales
  const stats = await pool.query(`
    SELECT 
      u.nom, u.prenom, 
      COALESCE(SUM(ep.points), 0) as score_total,
      COUNT(ep.id) as nb_events
    FROM "User" u
    LEFT JOIN employe_points ep ON u.id = ep.employe_id
    WHERE u.role = 'employee' AND u.statut = 'actif'
    GROUP BY u.id, u.nom, u.prenom
    ORDER BY score_total DESC
    LIMIT 15
  `);
  
  console.log('\n📊 Classement:');
  stats.rows.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.prenom} ${r.nom}: ${r.score_total} pts (${r.nb_events} événements)`);
  });
  
  await pool.end();
}

generateTestData().catch(e => {
  console.log('Erreur:', e.message);
  pool.end();
});
