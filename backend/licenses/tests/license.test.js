const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createTestPool } = require('../../registration/tests/pool');
const { createLicenseRouter } = require('../router');
const { createPrivateDiskStorage } = require('../storage');
const { MAX_FILE_BYTES } = require('../upload');
const pool = createTestPool();
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
let server, base, directory, storage, playerId, clubId, currentIdentity, incident = [], failPut = false, ambiguousCommit = false;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mercasport-licenses-test-'));
  storage = createPrivateDiskStorage(directory);
  for (const role of ['PLAYER','CLUB']) {
    const result = await pool.query(`INSERT INTO users (name,username,email,password_hash,role)
      VALUES ($1,$1,$2,'test-only-no-real-password',$3) RETURNING id`, [`Licence ${role}`, `license.${role}@example.invalid`, role]);
    const id = result.rows[0].id;
    if (role === 'PLAYER') {
      playerId = id;
      await pool.query("INSERT INTO player_profiles (user_id,first_name,last_name) VALUES ($1,'Joel','Test')", [id]);
    } else clubId = id;
  }
  currentIdentity = playerId;
  const app = express();
  // TEST ONLY. Actual integration must verify a real session/JWT.
  const authenticate = async () => currentIdentity ? { userId: currentIdentity } : null;
  const wrappedPool = { connect: async () => {
    const client = await pool.connect();
    return { release: (...args) => client.release(...args), query: async (sql, values) => {
      const result = await client.query(sql, values);
      if (ambiguousCommit && sql === 'COMMIT') throw new Error('Connection lost after commit');
      return result;
    } };
  } };
  app.use('/players', createLicenseRouter(wrappedPool, { authenticate,
    storage: { private: true, put: async args => {
      if (failPut) throw new Error('Simulated storage failure');
      return storage.put(args);
    }, remove: key => storage.remove(key) }, onIncident: e => incident.push(e) }));
  app.use('/closed', createLicenseRouter(pool, { storage }));
  app.use('/unconfigured', createLicenseRouter(pool, { authenticate }));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});
function body(buffer = pdf, filename = 'licence.pdf', mime = 'application/pdf') {
  const form = new FormData(); form.append('license', new Blob([buffer], { type: mime }), filename); return form;
}
const post = (form = body(), route = '/players/license', headers = {}) =>
  fetch(base + route, { method: 'POST', headers, body: form });
async function reset() {
  await pool.query('DELETE FROM player_verifications');
  for (const key of await fs.readdir(directory)) await fs.unlink(path.join(directory, key));
  currentIdentity = playerId; incident = []; failPut = false; ambiguousCommit = false;
}

test('default authentication denies access, including a spoofed user ID', async () => {
  assert.equal((await post(body(), '/closed/license', { 'x-user-id': String(playerId) })).status, 401);
  currentIdentity = null;
  assert.equal((await post()).status, 401);
  currentIdentity = playerId;
  assert.equal((await post(body(), '/unconfigured/license')).status, 503);
});
test('PDF stored privately and linked to authenticated player; no key or URL returned', async () => {
  await reset();
  const response = await post(body(pdf, '../../licence.pdf'));
  assert.equal(response.status, 201);
  const json = await response.json();
  assert.equal(json.verification.status, 'PENDING');
  assert.deepEqual(Object.keys(json.verification).sort(), ['id','status','submitted_at']);
  const { rows } = await pool.query('SELECT * FROM player_verifications');
  assert.equal(rows[0].player_user_id, playerId);
  assert.equal(rows[0].reviewed_by, null);
  assert.match(rows[0].document_key, /^[a-f0-9-]{36}\.pdf$/);
  assert.deepEqual(await fs.readFile(path.join(directory, rows[0].document_key)), pdf);
});
test('PNG is supported; clubs cannot submit a player license', async () => {
  await reset();
  assert.equal((await post(body(png, 'licence.png', 'image/png'))).status, 201);
  await reset(); currentIdentity = clubId;
  assert.equal((await post()).status, 403);
  assert.equal((await fs.readdir(directory)).length, 0);
});
test('bad signature, truncated document, wrong extension or MIME are rejected', async () => {
  await reset();
  for (const form of [body(Buffer.from('<html>fake</html>')), body(pdf.subarray(0, 15)),
    body(pdf, 'image.png'), body(pdf, 'licence.pdf', 'text/html')]) {
    assert.equal((await post(form)).status, 415);
  }
  assert.equal((await fs.readdir(directory)).length, 0);
});
test('missing, empty, multiple files and client identity fields are rejected', async () => {
  await reset();
  assert.equal((await post(new FormData())).status, 400);
  assert.equal((await post(body(Buffer.alloc(0)))).status, 400);
  const multiple = body(); multiple.append('license', new Blob([pdf], { type: 'application/pdf' }), 'second.pdf');
  assert.equal((await post(multiple)).status, 400);
  const forged = body(); forged.append('user_id', String(clubId));
  assert.equal((await post(forged)).status, 400);
  assert.equal((await post('text')).status, 415);
});
test('oversized and malformed multipart rejected without storing a file', async () => {
  await reset();
  assert.equal((await post(body(Buffer.alloc(MAX_FILE_BYTES + 1)))).status, 413);
  assert.equal((await post('broken', '/players/license', { 'content-type': 'multipart/form-data; boundary=x' })).status, 400);
  assert.equal((await fs.readdir(directory)).length, 0);
});
test('two concurrent submissions create only one pending verification and file', async () => {
  await reset();
  const responses = await Promise.all([post(), post()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201,409]);
  assert.equal((await fs.readdir(directory)).length, 1);
  assert.equal((await pool.query('SELECT * FROM player_verifications')).rows.length, 1);
});
test('storage failure creates no verification', async () => {
  await reset(); failPut = true;
  assert.equal((await post()).status, 503);
  assert.equal((await pool.query('SELECT * FROM player_verifications')).rows.length, 0);
  assert.equal((await fs.readdir(directory)).length, 0);
});
test('SQL failure rolls back and removes the file', async () => {
  await reset();
  await pool.query(`CREATE FUNCTION public.fail_license_test() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'test failure' USING ERRCODE='23514'; END $$`);
  await pool.query(`CREATE TRIGGER fail_license_test BEFORE INSERT ON player_verifications
    FOR EACH ROW EXECUTE FUNCTION public.fail_license_test()`);
  try {
    assert.equal((await post()).status, 503);
    assert.equal((await fs.readdir(directory)).length, 0);
    assert.equal((await pool.query('SELECT * FROM player_verifications')).rows.length, 0);
  } finally {
    await pool.query('DROP TRIGGER fail_license_test ON player_verifications');
    await pool.query('DROP FUNCTION public.fail_license_test()');
  }
});
test('private disk rejects repository paths and Vercel ephemeral disk', () => {
  assert.throws(() => createPrivateDiskStorage(path.resolve(__dirname, '../../..')));
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  try { assert.throws(() => createPrivateDiskStorage(directory)); }
  finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});
test('lost COMMIT acknowledgement preserves the possibly committed document for reconciliation', async () => {
  await reset(); ambiguousCommit = true;
  assert.equal((await post()).status, 503);
  assert.equal((await pool.query('SELECT * FROM player_verifications')).rows.length, 1);
  assert.equal((await fs.readdir(directory)).length, 1);
  assert.ok(incident.some(e => e.code === 'LICENSE_COMMIT_UNCERTAIN'));
  ambiguousCommit = false;
  assert.equal((await post()).status, 409);
});
