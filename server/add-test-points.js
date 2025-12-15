require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ajouter des points pour declencher un Level Up
async function addTestPoints() {
  const userId = 110; // Jordan
  const pointsToAdd = 195; // Pour passer de 105 a 300 pts = Or!

  try {
    // Ajouter les points
    const result = await pool.query(`
      INSERT INTO employe_points (employe_id, rule_code, points, motif, date_evenement)
      VALUES ($1, 'BONUS_TEST', $2, 'Bonus de test pour Level Up Or', CURRENT_DATE)
      RETURNING *
    `, [userId, pointsToAdd]);
    
    console.log('Points ajoutes:', result.rows[0]);

    // Verifier le nouveau score
    const scoreRes = await pool.query(`SELECT * FROM employe_scores WHERE employe_id = $1`, [userId]);
    console.log('\nNouveau score:', scoreRes.rows[0]);
    
    const totalPoints = parseInt(scoreRes.rows[0]?.score_total) || 0;
    const niveaux = [
      { min: 0, max: 100, label: 'Bronze' },
      { min: 100, max: 300, label: 'Argent' },
      { min: 300, max: 500, label: 'Or' },
      { min: 500, max: Infinity, label: 'Diamant' }
    ];
    const niveau = niveaux.find(n => totalPoints >= n.min && totalPoints < n.max);
    console.log(`\nNOUVEAU NIVEAU: ${niveau?.label} (${totalPoints} pts)`);
    console.log('\n>>> Rafraichissez la page HomeEmploye pour voir l animation Level Up! <<<');

  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    pool.end();
  }
}

addTestPoints();
