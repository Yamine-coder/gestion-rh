const { Pool } = require('./server/node_modules/pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/gestion_rh' });

async function findAminata() {
  const result = await pool.query(`
    SELECT id, email, nom, prenom, role, statut 
    FROM "User" 
    WHERE nom ILIKE '%diop%' OR prenom ILIKE '%aminata%'
  `);
  console.log('Résultat:', result.rows);
  await pool.end();
}

findAminata();
