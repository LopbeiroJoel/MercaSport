const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const { Pool } = require('pg');
const express = require('express');
const app = require('../server');
const pool = require('../backend/db');
const { configureApp } = require('../backend/app');

let server, base, ads;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});

function post(body) {
  return fetch(`${base}/applications`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('le front et les 28 annonces viennent du même serveur et du SQL', async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'OK');
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /type="module" src="js\/app\.mjs"/);
  const response = await fetch(`${base}/ads`);
  assert.equal(response.status, 200);
  ads = await response.json();
  assert.equal(ads.length, 28);
  assert.equal(new Set(ads.map(ad => ad.club)).size, 13);
  assert.equal(new Set(ads.map(ad => ad.team_id)).size, 28);
  assert.ok(ads.every(ad => ad.title && ad.location && ad.division && ad.short_description));
  assert.ok(ads.every(ad => !('status' in ad) && !('email' in ad) && !('password_hash' in ad)));
});

test('le détail correspond à l’annonce, les IDs invalides et absents sont distingués', async () => {
  const response = await fetch(`${base}/ads/${ads[0].id}`);
  assert.equal(response.status, 200);
  const detail = await response.json();
  assert.equal(detail.id, ads[0].id);
  assert.equal(detail.club, ads[0].club);
  assert.ok(detail.requirements && detail.missions && detail.description);
  for (const id of ['0', '-1', 'texte', '1%20OR%201=1', '2147483648']) {
    assert.equal((await fetch(`${base}/ads/${id}`)).status, 400);
  }
  assert.equal((await fetch(`${base}/ads/2147483647`)).status, 404);
});

test('la candidature est réellement enregistrée, sans compte ni ID inventé', async () => {
  const body = { ad_id: ads[0].id, name: "Test O'Brian <b>joueur</b>",
    email: 'API.TEST@example.invalid', phone: '+33 600 000 000', message: "L'équipe m'intéresse." };
  const response = await post(body);
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.ok(created.id && created.created_at);
  const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1', [created.id]);
  assert.equal(rows[0].name, body.name);
  assert.equal(rows[0].email, 'api.test@example.invalid');
  assert.equal(rows[0].message, body.message);
  assert.equal(rows[0].player_id, null);
  assert.equal((await post({ ...body, email: ' api.test@EXAMPLE.invalid ' })).status, 409);
  assert.equal((await post({ ...body, ad_id: 2147483647 })).status, 404);
});

test('les erreurs de formulaire/JSON sont traitées sans insérer de données', async () => {
  const count = async () => Number((await pool.query('SELECT count(*) AS n FROM applications')).rows[0].n);
  const initial = await count();
  const valid = { ad_id: ads[0].id, name: 'Test', email: 'new@example.invalid' };
  for (const body of [{}, [], { ...valid, ad_id: [1] }, { ...valid, email: 'sans-arobase' },
    { ...valid, name: ' ' }, { ...valid, name: 'n'.repeat(201) },
    { ...valid, phone: {} }, { ...valid, message: 'm'.repeat(2001) }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal((await fetch(`${base}/applications`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/applications`, { method: 'POST', body: 'texte' })).status, 415);
  assert.equal((await post({ ...valid, message: 'x'.repeat(20000) })).status, 413);
  assert.equal(await count(), initial);
});

test('une panne PostgreSQL renvoie 503 sans masquer le problème avec de fausses annonces', async () => {
  const brokenPool = new Pool({ host: '127.0.0.1', port: 1, user: 'nonexistent',
    database: 'nonexistent', connectionTimeoutMillis: 500 });
  const brokenServer = configureApp(express(), brokenPool).listen(0, '127.0.0.1');
  await once(brokenServer, 'listening');
  try {
    const result = await fetch(`http://127.0.0.1:${brokenServer.address().port}/ads`);
    assert.equal(result.status, 503);
    assert.deepEqual(Object.keys(await result.json()), ['error']);
  } finally {
    await new Promise(resolve => brokenServer.close(resolve));
    await brokenPool.end();
  }
});

test('la préparation Vercel ne publie que le front et garde les URL relatives', async () => {
  const root = path.resolve(__dirname, '..');
  require('../scripts/build');
  for (const name of ['index.html', 'css/style.css', 'js/app.mjs']) {
    assert.equal(await fs.readFile(path.join(root, 'frontend', name), 'utf8'),
      await fs.readFile(path.join(root, 'public', name), 'utf8'));
  }
  const script = await fs.readFile(path.join(root, 'public/js/app.mjs'), 'utf8');
  assert.doesNotMatch(script, /localhost|ads\.json/);
  const published = await fs.readdir(path.join(root, 'public'));
  assert.ok(!published.includes('.env') && !published.includes('database') && !published.includes('backend'));
});
