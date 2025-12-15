require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables dans la base:');
    res.rows.forEach(t => console.log('  -', t.table_name));
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    pool.end();
  }
}

listTables();
