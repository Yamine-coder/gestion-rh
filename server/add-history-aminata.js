const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/gestion_rh' });

async function addHistory() {
  await pool.query(`
    INSERT INTO score_history (employee_id, points, reason, category, source, created_by)
    VALUES (99, 4, 'Feedback collègue: pour pour pour', 'formation', 'peer_feedback', 110)
  `);
  console.log('✅ Historique ajouté pour Aminata');
  await pool.end();
}

addHistory();
