const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { createTestPool } = require('../../registration/tests/pool');
const { hashPassword } = require('../../registration/password');
const { createLoginRouter } = require('../router');
const { createSessionService, COOKIE } = require('../session');
const { createLicenseAdminRouter } = require('../../licenses/admin-router');
const pool = createTestPool();
const origin = 'https://mercasport.example';
const secret = randomBytes(32).toString('hex');
const password = 'Une vraie phrase de connexion !';
let server, base, playerId, adminId, cookie, sessions;
before(async () => {
  const hash = await hashPassword(password);
  for (const role of ['PLAYER', 'ADMIN']) {
    const { rows } = await pool.query(`INSERT INTO users(name,username,email,password_hash,role)
      VALUES($1,$1,$2,$3,$4) RETURNING id`, [`Login ${role}`, `login.${role}@example.invalid`, hash, role]);
    if (role === 'PLAYER') playerId = rows[0].id;
    else adminId = rows[0].id;
  }
  await pool.query(`INSERT INTO users(name,username,email,password_hash,role)
    VALUES('Ancien Club','Ancien Club','bcrypt@example.invalid',$1,'CLUB')`, [await bcrypt.hash('ancien-pass', 4)]);
  sessions = createSessionService(pool, { secret, origins: [origin] });
  const app = express();
  app.use('/auth', createLoginRouter(pool, { sessions, maxAttempts: 100 }));
  app.use('/unconfigured', createLoginRouter(pool));
  app.use('/limited', createLoginRouter(pool, { sessions, maxAttempts: 2 }));
  app.use('/admin', createLicenseAdminRouter(pool, { authenticate: sessions.authenticate, onIncident: () => {} }));
  app.get('/identity', async (req, res) => {
    const identity = await sessions.authenticate(req);
    res.status(identity ? 200 : 401).json(identity);
  });
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await pool.end(); });
const post = (body, route = '/auth/login', headers = {}) => fetch(base + route, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body),
});
test('email case/whitespace accepted, no hash/token in JSON, secure cookie created', async () => {
  const response = await post({ identifier: ' LOGIN.PLAYER@example.invalid ', password });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user.id, playerId);
  assert.equal(data.user.status, 'PENDING');
  assert.equal(data.user.is_verified, false);
  assert.ok(!JSON.stringify(data).includes('password_hash'));
  const header = response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/); assert.match(header, /Secure/); assert.match(header, /SameSite=Strict/);
  assert.match(header, /Max-Age=1800/); assert.match(header, /Path=\//);
  cookie = header.split(';')[0];
  const identity = await fetch(base + '/identity', { headers: { Cookie: cookie } });
  assert.equal(identity.status, 200);
  assert.equal((await identity.json()).userId, playerId);
});
test('pseudo login and old bcrypt supported; password never trimmed', async () => {
  assert.equal((await post({ identifier: 'login player', password })).status, 200);
  assert.equal((await post({ identifier: 'Ancien Club', password: 'ancien-pass' })).status, 200);
  assert.equal((await post({ identifier: 'login player', password: password + ' ' })).status, 401);
  assert.equal((await post({ identifier: 'Ancien Club', password: 'ancien-pass' + 'x'.repeat(80) })).status, 401);
});
test('unknown account and wrong password produce the same response without cookie', async () => {
  const unknown = await post({ identifier: 'unknown@example.invalid', password });
  const wrong = await post({ identifier: 'login player', password: 'mauvais' });
  assert.equal(unknown.status, 401); assert.equal(wrong.status, 401);
  assert.deepEqual(await unknown.json(), await wrong.json());
  assert.equal(unknown.headers.get('set-cookie'), null);
  assert.equal(wrong.headers.get('set-cookie'), null);
});
test('validation, malformed JSON, body limit and content type', async () => {
  for (const b of [{}, [], null, { identifier: 'x', password: '' }, { identifier: 'x', password: 'x', role: 'ADMIN' },
    { identifier: 'x', password: 'x'.repeat(129) }, { identifier: 'x\u0000', password }]) {
    assert.equal((await post(b)).status, 400);
  }
  for (const [body, type, status] of [['{','application/json',400], ['x'.repeat(5000),'application/json',413], ['x','text/plain',415]]) {
    assert.equal((await fetch(base + '/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': type }, body })).status, status);
  }
});
test('unconfigured login and unknown origins are denied', async () => {
  assert.equal((await post({ identifier: 'login player', password }, '/unconfigured/login')).status, 503);
  assert.equal((await post({ identifier: 'login player', password }, '/auth/login', { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await fetch(base + '/auth/login', { method: 'POST' })).status, 403);
});
test('rate limit refuses further attempts', async () => {
  const b = { identifier: 'limited@example.invalid', password };
  assert.equal((await post(b, '/limited/login')).status, 401);
  assert.equal((await post(b, '/limited/login')).status, 401);
  const response = await post(b, '/limited/login');
  assert.equal(response.status, 429); assert.ok(response.headers.get('retry-after'));
});
test('forged, duplicate and expired cookies are not authenticated', async () => {
  const token = cookie.slice(COOKIE.length + 1);
  const forged = token.slice(0, -10) + 'AAAAAAAAAA';
  for (const value of [`${COOKIE}=${forged}`, cookie + '; ' + cookie, 'user_id=' + playerId]) {
    assert.equal((await fetch(base + '/identity', { headers: { Cookie: value } })).status, 401);
  }
  const { decodeJwt, SignJWT } = await import('jose');
  const payload = decodeJwt(token);
  payload.iat = Math.floor(Date.now() / 1000) - 100;
  payload.exp = payload.iat + 1;
  const expired = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(Buffer.from(secret, 'hex'));
  assert.equal((await fetch(base + '/identity', { headers: { Cookie: `${COOKIE}=${expired}` } })).status, 401);
});
test('real signed session plugs into admin module; current DB role is enforced', async () => {
  assert.equal((await fetch(base + '/admin/licenses', { headers: { Cookie: cookie } })).status, 403);
  const admin = await post({ identifier: 'login admin', password });
  const adminCookie = admin.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base + '/admin/licenses', { headers: { Cookie: adminCookie } })).status, 200);
  await pool.query("UPDATE users SET role='CLUB' WHERE id=$1", [adminId]);
  assert.equal((await fetch(base + '/admin/licenses', { headers: { Cookie: adminCookie } })).status, 403);
  await pool.query("UPDATE users SET role='ADMIN' WHERE id=$1", [adminId]);
  assert.equal((await fetch(base + '/admin/licenses/1', { method: 'PATCH', headers: {
    Cookie: adminCookie, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{"status":"APPROVED"}' })).status, 401);
});
test('password hash change invalidates existing cookie', async () => {
  await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1', [playerId, await hashPassword('Nouvelle phrase de connexion !')]);
  assert.equal((await fetch(base + '/identity', { headers: { Cookie: cookie } })).status, 401);
});
test('session configuration rejects weak/missing keys and non-HTTPS origins', () => {
  assert.throws(() => createSessionService(pool, { secret: 'weak', origins: [origin] }));
  assert.throws(() => createSessionService(pool, { secret, origins: ['http://example.com'] }));
  assert.throws(() => createSessionService(pool, { secret, origins: [origin], lifetimeSeconds: 99999 }));
});
