const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createTestPool } = require('../../registration/tests/pool');
const { createLicenseAdminRouter } = require('../admin-router');
const pool = createTestPool();
let server, base, adminId, playerId, clubId, caller, id;
before(async () => {
  for (const role of ['ADMIN', 'PLAYER', 'CLUB']) {
    const result = await pool.query(`INSERT INTO users (name,username,email,password_hash,role)
      VALUES ($1,$1,$2,'test-only',$3) RETURNING id`, [`Review ${role}`, `review.${role}@example.invalid`, role]);
    if (role === 'ADMIN') adminId = result.rows[0].id;
    if (role === 'CLUB') clubId = result.rows[0].id;
    if (role === 'PLAYER') {
      playerId = result.rows[0].id;
      await pool.query("INSERT INTO player_profiles(user_id,first_name,last_name) VALUES($1,'Joel','Test')", [playerId]);
    }
  }
  caller = adminId;
  const app = express();
  // TEST ONLY: this variable is not production authentication.
  app.use('/admin', createLicenseAdminRouter(pool, { authenticate: async () => caller ? { userId: caller } : null, onIncident: () => {} }));
  app.use('/closed', createLicenseAdminRouter(pool));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});
async function reset() {
  caller = adminId;
  await pool.query('DELETE FROM player_verifications');
  await pool.query("UPDATE users SET status='PENDING',is_verified=false WHERE id=$1", [playerId]);
  const result = await pool.query(`INSERT INTO player_verifications(player_user_id,document_key)
    VALUES($1,'private-test-document.pdf') RETURNING id`, [playerId]);
  id = result.rows[0].id;
}
const decide = (body, target = id, route = '/admin') => fetch(`${base}${route}/licenses/${target}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
test('authentication defaults closed; player and club cannot review', async () => {
  await reset();
  assert.equal((await decide({ status: 'APPROVED' }, id, '/closed')).status, 401);
  for (const value of [null, playerId, clubId]) {
    caller = value;
    assert.equal((await decide({ status: 'APPROVED' })).status, value ? 403 : 401);
    assert.equal((await fetch(base + '/admin/licenses')).status, value ? 403 : 401);
  }
});
test('pending list returns identity but never private document key', async () => {
  await reset();
  const response = await fetch(base + '/admin/licenses');
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.verifications.length, 1);
  assert.equal(json.verifications[0].id, id);
  assert.ok(!JSON.stringify(json).includes('private-test-document'));
  assert.equal((await fetch(base + `/admin/licenses?after=${id}`)).status, 200);
  assert.equal((await fetch(base + '/admin/licenses?after=bad')).status, 400);
});
test('approval records reviewer/date and approves account without verifying email', async () => {
  await reset();
  const response = await decide({ status: 'APPROVED' });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.verification.reviewed_by, adminId);
  assert.ok(json.verification.reviewed_at);
  assert.equal(json.account_status, 'APPROVED');
  const account = (await pool.query('SELECT status,is_verified FROM users WHERE id=$1', [playerId])).rows[0];
  assert.deepEqual(account, { status: 'APPROVED', is_verified: false });
});
test('refusal requires a reason and records rejected account', async () => {
  await reset();
  assert.equal((await decide({ status: 'REJECTED' })).status, 400);
  const response = await decide({ status: 'REJECTED', rejection_reason: '  Document illisible  ' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).verification.rejection_reason, 'Document illisible');
  assert.equal((await pool.query('SELECT status FROM users WHERE id=$1', [playerId])).rows[0].status, 'REJECTED');
});
test('bad decisions, injected administrator and unknown IDs rejected', async () => {
  await reset();
  for (const body of [{ status: 'PENDING' }, { status: 'APPROVED', reviewed_by: clubId },
    { status: 'APPROVED', rejection_reason: 'x' }, { status: 'REJECTED', rejection_reason: ' ' },
    { status: 'REJECTED', rejection_reason: 'x'.repeat(1001) }, [], null]) {
    assert.equal((await decide(body)).status, 400);
  }
  assert.equal((await decide({ status: 'APPROVED' }, 'abc')).status, 400);
  assert.equal((await decide({ status: 'APPROVED' }, 2147483647)).status, 404);
});
test('concurrent opposite decisions: one winner and immutable review', async () => {
  await reset();
  const responses = await Promise.all([decide({ status: 'APPROVED' }), decide({ status: 'REJECTED', rejection_reason: 'Refus test' })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200,409]);
  const row = (await pool.query('SELECT status FROM player_verifications WHERE id=$1', [id])).rows[0];
  const account = (await pool.query('SELECT status FROM users WHERE id=$1', [playerId])).rows[0];
  assert.equal(account.status, row.status);
  assert.equal((await decide({ status: 'APPROVED' })).status, 409);
});
test('account update failure rolls back the review too', async () => {
  await reset();
  await pool.query(`CREATE FUNCTION fail_account_review() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'test' USING ERRCODE='23514'; END $$`);
  await pool.query(`CREATE TRIGGER fail_account_review BEFORE UPDATE OF status ON users
    FOR EACH ROW EXECUTE FUNCTION fail_account_review()`);
  try {
    assert.equal((await decide({ status: 'APPROVED' })).status, 503);
    const row = (await pool.query('SELECT status,reviewed_by,reviewed_at FROM player_verifications WHERE id=$1', [id])).rows[0];
    assert.deepEqual(row, { status: 'PENDING', reviewed_by: null, reviewed_at: null });
  } finally {
    await pool.query('DROP TRIGGER fail_account_review ON users');
    await pool.query('DROP FUNCTION fail_account_review()');
  }
});
test('bounded JSON parser rejects malformed, large and non-JSON bodies', async () => {
  await reset();
  for (const [body, type, expected] of [['{','application/json',400],
    ['x'.repeat(5000), 'application/json',413], ['hello','text/plain',415]]) {
    const response = await fetch(`${base}/admin/licenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': type }, body });
    assert.equal(response.status, expected);
  }
});
