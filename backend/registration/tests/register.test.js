const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createTestPool } = require('./pool');
const { createRegistrationRouter } = require('../router');
const { verifyPassword } = require('../password');
const { validateRegistration } = require('../validation');

const pool = createTestPool();
let server, base;
const password = 'Une longue phrase pour mon compte !';
const player = { email: 'registration.player@example.invalid', username: 'Joel Test', password,
  role: 'PLAYER', profile: { first_name: 'Joel', last_name: 'Test' } };
const club = { email: 'registration.club@example.invalid', username: 'FC Test', password,
  role: 'CLUB', profile: { name: 'FC Test', city: 'Strasbourg', divisions: 'R3 / D4' } };

before(async () => {
  const app = express();
  app.use('/auth', createRegistrationRouter(pool));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});
const post = body => fetch(`${base}/auth/register`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const count = async () => Number((await pool.query('SELECT count(*) AS n FROM users')).rows[0].n);

test('PLAYER : compte, profil et joueur compatibles, hash salé et aucune fuite de secret', async () => {
  const response = await post({ ...player, email: ' REGISTRATION.PLAYER@example.invalid ' });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.user.email, player.email);
  assert.equal(result.user.role, 'PLAYER');
  assert.equal(result.user.is_verified, false);
  assert.equal(result.profile.user_id, result.user.id);
  assert.equal(result.profile.first_name, 'Joel');
  assert.ok(!JSON.stringify(result).includes('$argon2id$'));
  assert.ok(!JSON.stringify(result).includes(password));
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [result.user.id]);
  assert.match(rows[0].password_hash, /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  assert.equal(await verifyPassword(password, rows[0].password_hash), true);
  assert.equal(await verifyPassword(`${password} faux`, rows[0].password_hash), false);
  const legacy = await pool.query('SELECT * FROM players WHERE user_id=$1', [result.user.id]);
  assert.equal(legacy.rows[0].first_name, 'Joel');
});

test('CLUB : compte, profil et club compatibles ; même mot de passe, sel différent', async () => {
  const response = await post(club);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.user.role, 'CLUB');
  const { rows } = await pool.query('SELECT name,city FROM clubs WHERE user_id=$1', [result.user.id]);
  assert.deepEqual(rows[0], { name: 'FC Test', city: 'Strasbourg' });
  const hashes = await pool.query('SELECT password_hash FROM users WHERE email=ANY($1)', [[player.email, club.email]]);
  assert.equal(hashes.rows.length, 2);
  assert.notEqual(hashes.rows[0].password_hash, hashes.rows[1].password_hash);
});

test('contrôles des champs : aucun ADMIN, mot de passe court, profil incompatible ou champ injecté', async () => {
  const initial = await count();
  for (const body of [[], null, {}, { ...player, role: 'ADMIN' }, { ...player, role: 'player' },
    { ...player, email: 'sans-arobase' }, { ...player, username: 'ab' },
    { ...player, password: 'court' }, { ...player, is_verified: true },
    { ...player, profile: { first_name: 'Joel' } },
    { ...player, profile: { ...player.profile, height_cm: '180' } },
    { ...player, profile: { ...player.profile, position: 'p'.repeat(51) } },
    { ...player, profile: { ...player.profile, preferred_foot: 'Droit' } },
    { ...player, profile: { ...player.profile, birth_date: '2025-02-30' } },
    { ...player, profile: { ...player.profile, birth_date: '0000-01-01' } },
    { ...club, profile: { name: 'Club', city: '' } }]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.ok(['VALIDATION_ERROR', 'INVALID_JSON'].includes((await response.json()).code));
  }
  assert.equal(await count(), initial);
  assert.equal((await post({ ...player, password: 'x'.repeat(129) })).status, 400);
});

test('doublons d’e-mail et de pseudo ignorent la casse et ne créent pas un deuxième compte', async () => {
  const initial = await count();
  for (const body of [{ ...player, username: 'Autre joueur', email: ` ${player.email.toUpperCase()} ` },
    { ...player, email: 'autre@example.invalid', username: ' joel test ' }]) {
    const response = await post(body);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'ACCOUNT_CONFLICT');
  }
  assert.equal(await count(), initial);
});

test('deux inscriptions concurrentes identiques : un 201, un 409, un seul compte et profil', async () => {
  const body = { ...player, email: 'race@example.invalid', username: 'Concurrent' };
  const responses = await Promise.all([post(body), post(body)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const counts = await pool.query(`SELECT count(*) AS n FROM users u
    JOIN player_profiles p ON p.user_id=u.id WHERE u.email=$1`, [body.email]);
  assert.equal(Number(counts.rows[0].n), 1);
});

test('échec du profil : rollback du compte, connexion rendue au pool, pas de détail SQL dans la réponse', async () => {
  const failingPool = {
    query: (...args) => pool.query(...args),
    connect: async () => {
      const client = await pool.connect();
      return {
        query: async (sql, values) => {
          if (sql.includes('INSERT INTO public.player_profiles')) {
            const error = new Error('simulated SQL with private data'); error.code = 'XX000'; throw error;
          }
          return client.query(sql, values);
        },
        release: () => client.release(),
      };
    },
  };
  const app = express(); app.use('/auth', createRegistrationRouter(failingPool));
  const failedServer = app.listen(0, '127.0.0.1'); await once(failedServer, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${failedServer.address().port}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...player, email: 'rollback@example.invalid', username: 'Rollback' }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { code: 'REGISTER_FAILED', error: 'Inscription temporairement indisponible.' });
    assert.equal(Number((await pool.query("SELECT count(*) AS n FROM users WHERE email='rollback@example.invalid'")).rows[0].n), 0);
  } finally { await new Promise(resolve => failedServer.close(resolve)); }
});

test('erreurs JSON, taille et type de contenu sont propres à l’inscription', async () => {
  assert.equal((await fetch(`${base}/auth/register`, { method: 'POST', body: 'texte' })).status, 415);
  assert.equal((await fetch(`${base}/auth/register`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await post({ ...player, extra: 'x'.repeat(10000) })).status, 413);
});

test('panne PostgreSQL : 503, aucune donnée sensible renvoyée', async () => {
  const unavailable = { query: async () => { const error = new Error('private connection'); error.code = 'ECONNREFUSED'; throw error; } };
  const app = express(); app.use('/auth', createRegistrationRouter(unavailable));
  const failedServer = app.listen(0, '127.0.0.1'); await once(failedServer, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${failedServer.address().port}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...player, email: 'offline@example.invalid', username: 'Offline' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
  } finally { await new Promise(resolve => failedServer.close(resolve)); }
});

test('validation : phrase longue, accents, pieds et dates réelles acceptés ; mot de passe non modifié', () => {
  const body = { ...player, username: ' FC Hégenheim ', password: ` ${password} `,
    profile: { ...player.profile, birth_date: '2000-02-29', preferred_foot: 'BOTH', height_cm: 180 } };
  const result = validateRegistration(body);
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.password, body.password);
  assert.equal(result.data.username, 'FC Hégenheim');
});

test('SEC-01 : le format scrypt historique reste vérifiable sans créer de nouveaux hashes scrypt', async () => {
  const { scrypt, randomBytes } = require('node:crypto');
  const { promisify } = require('node:util');
  const salt = randomBytes(16);
  const key = await promisify(scrypt)(password, salt, 64,
    { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  const legacy = `scrypt$v1$131072$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
  assert.equal(await verifyPassword(password, legacy), true);
  assert.equal(await verifyPassword('Mauvais mot de passe', legacy), false);
});

test('SEC-01 : hashes malformés ou paramètres arbitraires refusés avant tout calcul', async () => {
  for (const hash of ['', 'mot-de-passe-en-clair', '$argon2id$v=19$m=999999999,t=99,p=99$bad$bad',
    '$2b$12$ancien-format-non-pris-en-charge-ici', null]) {
    assert.equal(await verifyPassword(password, hash), false);
  }
});

test('API-03 : une vraie erreur de contrainte SQL du profil annule aussi le compte', async () => {
  await pool.query(`CREATE FUNCTION registration_test_refuse_profile() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.first_name='RollbackSQL' THEN
      RAISE EXCEPTION 'Test rollback' USING ERRCODE='23514';
    END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER registration_test_refuse BEFORE INSERT ON player_profiles
    FOR EACH ROW EXECUTE FUNCTION registration_test_refuse_profile()`);
  try {
    const response = await post({ ...player, email: 'rollback-sql@example.invalid', username: 'Rollback SQL',
      profile: { first_name: 'RollbackSQL', last_name: 'Test' } });
    assert.equal(response.status, 500);
    assert.equal((await response.json()).code, 'REGISTER_FAILED');
    const result = await pool.query(`SELECT count(*) AS n FROM users WHERE email=$1`, ['rollback-sql@example.invalid']);
    assert.equal(Number(result.rows[0].n), 0);
  } finally {
    await pool.query('DROP TRIGGER registration_test_refuse ON player_profiles');
    await pool.query('DROP FUNCTION registration_test_refuse_profile()');
  }
});
