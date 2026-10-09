// Adaptateur de test uniquement. En usage normal, run.py utilise node-postgres.
const { Pool } = require('pg');

function createTestPool() {
  if (process.env.MERCASPORT_TEST_PGLITE !== '1') {
    return new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
      user: process.env.DB_USER, database: process.env.DB_NAME });
  }
  const { PGlite } = require('@electric-sql/pglite');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const db = new PGlite();
  const ready = (async () => {
    for (const name of ['embedded-base.sql', 'neon-before-db-01-03.sql', 'db-01-03-applied.sql']) {
      await db.exec(await fs.readFile(path.join(__dirname, name), 'utf8'));
    }
  })();
  let queue = Promise.resolve();
  function acquire() {
    const previous = queue;
    let release;
    queue = new Promise(resolve => { release = resolve; });
    return previous.then(() => release);
  }
  return {
    query: async (sql, values) => {
      await ready;
      const release = await acquire();
      try { return await db.query(sql, values); } finally { release(); }
    },
    connect: async () => {
      await ready;
      const release = await acquire();
      return { query: (sql, values) => db.query(sql, values), release };
    },
    end: async () => { await ready; await db.close(); },
  };
}
module.exports = { createTestPool };
