const { Pool } = require('pg');

// DATABASE_URL pour la base hébergée, DB_* pour les configurations locales existantes.
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'mercasport',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...config,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 5000,
  statement_timeout: 10000,
});

pool.on('error', () => console.error('Connexion PostgreSQL interrompue.'));
if (process.env.VERCEL) {
  const { attachDatabasePool } = require('@vercel/functions');
  attachDatabasePool(pool);
}

module.exports = pool;
