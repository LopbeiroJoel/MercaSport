const express = require('express');
const { validateRegistration } = require('./validation');
const { hashPassword } = require('./password');

function createRegistrationRouter(pool) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/register', (req, res, next) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ code: 'JSON_REQUIRED', error: 'Utiliser Content-Type: application/json.' });
    }
    next();
  }, express.json({ limit: '8kb', strict: true }), async (req, res) => {
    let client;
    let inTransaction = false;
    try {
      const { errors, data } = validateRegistration(req.body);
      if (Object.keys(errors).length) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Vérifier les informations.', fields: errors });
      }
      const duplicate = await pool.query(`SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE lower(btrim(email)) = $1 OR lower(btrim(username)) = lower($2)
      ) AS exists`, [data.email, data.username]);
      if (duplicate.rows[0].exists) return conflict(res);

      // Hash hors transaction : ne pas immobiliser une connexion PostgreSQL pendant le calcul.
      const passwordHash = await hashPassword(data.password);
      client = await pool.connect();
      await client.query('BEGIN');
      inTransaction = true;
      const account = await client.query(`INSERT INTO public.users
        (name, username, email, password_hash, role, is_verified)
        VALUES ($1, $1, $2, $3, $4, FALSE)
        RETURNING id, username, email, role, is_verified, created_at`,
      [data.username, data.email, passwordHash, data.role]);
      const user = account.rows[0];
      const p = data.profile;
      let profile;
      if (data.role === 'PLAYER') {
        profile = await client.query(`INSERT INTO public.player_profiles
          (user_id, first_name, last_name, birth_date, position, preferred_foot, height_cm, current_club)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING user_id, first_name, last_name, birth_date::text AS birth_date, position, preferred_foot, height_cm, current_club, created_at`,
        [user.id, p.first_name, p.last_name, p.birth_date, p.position, p.preferred_foot, p.height_cm, p.current_club]);
      } else {
        profile = await client.query(`INSERT INTO public.club_profiles (user_id, name, city, divisions)
          VALUES ($1,$2,$3,$4) RETURNING user_id, name, city, divisions, created_at`,
        [user.id, p.name, p.city, p.divisions]);
      }
      await client.query('COMMIT');
      inTransaction = false;
      return res.status(201).json({ message: 'Compte et profil créés.', user, profile: profile.rows[0] });
    } catch (error) {
      if (inTransaction && client) {
        try { await client.query('ROLLBACK'); } catch { /* Ne pas exposer les détails SQL. */ }
      }
      if (error.code === '23505') return conflict(res); // Protège aussi les inscriptions simultanées.
      if (error.code === 'HASH_BUSY') {
        return res.set('Retry-After', '5').status(503)
          .json({ code: 'REGISTER_BUSY', error: 'Réessayer dans quelques secondes.' });
      }
      const unavailable = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET',
        '28P01', '28000', '3D000', '53300', '57P01', '57P02', '57P03'].includes(error.code)
        || error.code?.startsWith('08') || /connection|timeout/i.test(error.message);
      console.error('Inscription indisponible :', error.code || error.name);
      return res.status(unavailable ? 503 : 500).json({
        code: unavailable ? 'SERVICE_UNAVAILABLE' : 'REGISTER_FAILED',
        error: 'Inscription temporairement indisponible.',
      });
    } finally {
      if (client) client.release();
    }
  });

  // Gestion dédiée : les erreurs d'inscription ne doivent pas devenir des erreurs de candidature.
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ code: 'INVALID_JSON', error: 'JSON invalide.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ code: 'BODY_TOO_LARGE', error: 'Requête limitée à 8 Ko.' });
    }
    console.error('Format inscription :', error.type || error.name);
    return res.status(400).json({ code: 'INVALID_BODY', error: 'Format de requête invalide.' });
  });
  return router;
}

function conflict(res) {
  return res.status(409).json({ code: 'ACCOUNT_CONFLICT', error: 'Cet e-mail ou ce pseudo est déjà utilisé.' });
}

module.exports = { createRegistrationRouter };
