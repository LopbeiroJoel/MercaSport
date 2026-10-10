const express = require('express');
const { problem } = require('./upload');

function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647) {
    throw problem(400, 'INVALID_ID');
  }
  return Number(value);
}

function validateDecision(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      Object.keys(body).some(k => !['status', 'rejection_reason'].includes(k)) ||
      !['APPROVED', 'REJECTED'].includes(body.status)) throw problem(400, 'INVALID_DECISION');
  if (body.status === 'APPROVED') {
    if (body.rejection_reason !== undefined) throw problem(400, 'INVALID_DECISION');
    return { status: body.status, reason: null };
  }
  if (typeof body.rejection_reason !== 'string') throw problem(400, 'REJECTION_REASON_REQUIRED');
  const reason = body.rejection_reason.trim();
  if (!reason || reason.length > 1000 || /[\u0000-\u001f\u007f]/.test(reason)) {
    throw problem(400, 'INVALID_REJECTION_REASON');
  }
  return { status: body.status, reason };
}

// Separate, inactive by default. Identity must come from verified login middleware.
function createLicenseAdminRouter(pool, { authenticate = async () => null,
  onIncident = event => console.warn('[license-admin]', event) } = {}) {
  const router = express.Router();
  const report = code => { try { onIncident({ code }); } catch { /* diagnostic only */ } };
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const identity = await authenticate(req);
      if (!Number.isSafeInteger(identity?.userId) || identity.userId < 1) throw problem(401, 'AUTH_REQUIRED');
      const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [identity.userId]);
      if (rows[0]?.role !== 'ADMIN') throw problem(403, 'ADMIN_REQUIRED');
      res.locals.adminId = identity.userId;
      next();
    } catch (error) {
      res.status(error.status || 503).json({ code: error.status ? error.code : 'LICENSE_ADMIN_UNAVAILABLE' });
    }
  });
  router.get('/licenses', async (req, res) => {
    try {
      if (Object.keys(req.query).some(k => k !== 'after')) throw problem(400, 'INVALID_QUERY');
      const after = req.query.after === undefined ? 0 : parseId(req.query.after);
      const { rows } = await pool.query(`SELECT v.id,v.player_user_id,v.status,v.submitted_at,
        p.first_name,p.last_name,u.username FROM player_verifications v
        JOIN player_profiles p ON p.user_id=v.player_user_id JOIN users u ON u.id=p.user_id
        WHERE v.status='PENDING' AND v.id>$1 ORDER BY v.id LIMIT 51`, [after]);
      const items = rows.slice(0, 50);
      res.json({ verifications: items, next_after: rows.length > 50 ? items[49].id : null });
    } catch (error) {
      res.status(error.status || 503).json({ code: error.status ? error.code : 'LICENSE_ADMIN_UNAVAILABLE' });
    }
  });
  // Mount our bounded parser after authentication. Do not mount a larger global parser before it.
  router.patch('/licenses/:id', (req, res, next) => {
    if (!req.is('application/json')) return res.status(415).json({ code: 'JSON_REQUIRED' });
    next();
  }, express.json({ limit: '4kb', strict: true }), async (req, res) => {
    let client, transaction = false, commitStarted = false, broken = false;
    try {
      const id = parseId(req.params.id);
      const decision = validateDecision(req.body);
      client = await pool.connect(); await client.query('BEGIN'); transaction = true;
      // Recheck and lock the administrator role inside the decision transaction.
      const admin = await client.query('SELECT role FROM users WHERE id=$1 FOR SHARE', [res.locals.adminId]);
      if (admin.rows[0]?.role !== 'ADMIN') throw problem(403, 'ADMIN_REQUIRED');
      const lookup = await client.query('SELECT player_user_id FROM player_verifications WHERE id=$1', [id]);
      if (!lookup.rows.length) throw problem(404, 'LICENSE_NOT_FOUND');
      const playerId = lookup.rows[0].player_user_id;
      // Same locking order as upload: player first, verification second.
      const player = await client.query('SELECT role FROM users WHERE id=$1 FOR UPDATE', [playerId]);
      if (player.rows[0]?.role !== 'PLAYER') throw problem(409, 'PLAYER_REQUIRED');
      const verification = await client.query('SELECT status FROM player_verifications WHERE id=$1 FOR UPDATE', [id]);
      if (!verification.rows.length) throw problem(404, 'LICENSE_NOT_FOUND');
      if (verification.rows[0].status !== 'PENDING') throw problem(409, 'LICENSE_ALREADY_REVIEWED');
      const result = await client.query(`UPDATE player_verifications SET status=$2,
        rejection_reason=$3,reviewed_by=$4,reviewed_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING id,player_user_id,status,submitted_at,reviewed_at,reviewed_by,rejection_reason`,
      [id, decision.status, decision.reason, res.locals.adminId]);
      await client.query('UPDATE users SET status=$2 WHERE id=$1', [playerId, decision.status]);
      commitStarted = true; await client.query('COMMIT'); transaction = false;
      res.json({ verification: result.rows[0], account_status: decision.status });
    } catch (error) {
      if (transaction) await client.query('ROLLBACK').catch(() => { broken = true; });
      if (commitStarted) { broken = true; report('LICENSE_DECISION_COMMIT_UNCERTAIN'); }
      if (!error.status && !commitStarted) report('LICENSE_DECISION_FAILED');
      res.status(error.status || 503).json({ code: error.status ? error.code : 'LICENSE_ADMIN_UNAVAILABLE' });
    } finally { client?.release(broken); }
  });
  router.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ code: 'BODY_TOO_LARGE' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ code: 'INVALID_JSON' });
    next(error);
  });
  return router;
}
module.exports = { createLicenseAdminRouter, validateDecision };
