/**
 * Pool PostgreSQL partagé (pg) pour les requêtes SQL brutes (scoring, etc.)
 * Singleton — un seul Pool pour tout le serveur.
 */
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
