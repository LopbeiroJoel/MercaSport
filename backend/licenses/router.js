const express = require('express');
const { randomUUID } = require('node:crypto');
const { readLicense, validateFile, problem } = require('./upload');

// authenticate must verify a real session/JWT. Never use a client-supplied ID.
function createLicenseRouter(pool, { authenticate = async () => null, storage,
  onIncident = event => console.warn('[licenses]', event), maxConcurrent = 2 } = {}) {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 8) {
    throw new Error('maxConcurrent must be between 1 and 8');
  }
  const router = express.Router();
  let active = 0;
  router.post('/license', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let client, transaction = false, stored = false, commitStarted = false, key, admitted = false, brokenClient = false;
    const report = event => { try { onIncident(event); } catch { /* Logging must not change the outcome. */ } };
    try {
      const identity = await authenticate(req);
      if (!Number.isSafeInteger(identity?.userId) || identity.userId < 1) throw problem(401, 'AUTH_REQUIRED');
      if (!storage || storage.private !== true || typeof storage.put !== 'function' || typeof storage.remove !== 'function') {
        throw problem(503, 'PRIVATE_STORAGE_REQUIRED');
      }
      if (active >= maxConcurrent) throw problem(503, 'UPLOAD_BUSY');
      admitted = true; active++;
      if (!/^multipart\/form-data\s*;/i.test(req.headers['content-type'] || '')) throw problem(415, 'MULTIPART_REQUIRED');
      const file = await readLicense(req);
      const type = await validateFile(file);
      client = await pool.connect();
      await client.query('BEGIN'); transaction = true;
      const account = await client.query('SELECT role FROM public.users WHERE id=$1 FOR UPDATE', [identity.userId]);
      if (account.rows[0]?.role !== 'PLAYER') throw problem(403, 'PLAYER_REQUIRED');
      const profile = await client.query('SELECT user_id FROM public.player_profiles WHERE user_id=$1', [identity.userId]);
      if (!profile.rows.length) throw problem(409, 'PLAYER_PROFILE_REQUIRED');
      const pending = await client.query("SELECT id FROM public.player_verifications WHERE player_user_id=$1 AND status='PENDING'", [identity.userId]);
      if (pending.rows.length) throw problem(409, 'LICENSE_ALREADY_PENDING');
      key = `${randomUUID()}.${type.ext}`;
      // Adapter must make put atomic: a rejected promise must leave no object behind.
      await storage.put({ key, buffer: file.buffer, contentType: type.mime }); stored = true;
      const { rows } = await client.query(`INSERT INTO public.player_verifications
        (player_user_id,document_key) VALUES ($1,$2) RETURNING id,status,submitted_at`, [identity.userId, key]);
      commitStarted = true;
      await client.query('COMMIT'); transaction = false;
      res.status(201).json({ verification: rows[0] });
    } catch (error) {
      if (transaction) await client.query('ROLLBACK').catch(() => { brokenClient = true; });
      if (commitStarted) brokenClient = true;
      // COMMIT connection errors can mean it already committed. Keep the file for reconciliation.
      if (stored && !commitStarted) {
        await storage.remove(key).catch(() => report({ code: 'PRIVATE_FILE_CLEANUP_FAILED', key }));
      } else if (stored && commitStarted) report({ code: 'LICENSE_COMMIT_UNCERTAIN', key });
      if (!error.status && error.code !== '23505') report({ code: 'LICENSE_UPLOAD_FAILED' });
      const status = error.status || (error.code === '23505' ? 409 : 503);
      if (!req.complete) req.resume();
      if (!res.destroyed) res.status(status).json({ code: error.status ? error.code :
        error.code === '23505' ? 'LICENSE_ALREADY_PENDING' : 'LICENSE_UNAVAILABLE' });
    } finally {
      client?.release(brokenClient);
      if (admitted) active--;
    }
  });
  return router;
}
module.exports = { createLicenseRouter };
