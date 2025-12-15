require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function showTopScores() {
  const result = await pool.query(`
    SELECT u.id, u.prenom, u.nom, COALESCE(SUM(ep.points), 0)::int as score
    FROM "User" u
    LEFT JOIN employe_points ep ON u.id = ep.employe_id
    WHERE u.role = 'employee' AND u.statut = 'actif'
    GROUP BY u.id, u.prenom, u.nom
    ORDER BY score DESC
    LIMIT 10
  `);
  
  console.log('=== TOP 10 SCORES EMPLOYÉS ===\n');
  result.rows.forEach((e, i) => {
    const badge = e.score >= 100 ? '🥈' : e.score >= 0 ? '🥉' : '⚠️';
    console.log(`${i+1}. ${badge} ${e.prenom} ${e.nom} (ID:${e.id}): ${e.score} pts`);
  });
  
  await pool.end();
}

showTopScores();
