const express = require('express');
const path = require('node:path');

const adColumns = `id, club_id, club_name AS club, team_id, team_name AS team,
  division, title, short_description, position, preferred_foot, requirements,
  contract, work_time, salary, coalesce(location, city) AS location,
  description, missions, created_at`;

function validId(value) {
  return ['number', 'string'].includes(typeof value) && /^(?:[1-9]\d*)$/.test(String(value))
    && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
}

function configureApp(app, pool) {
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.set('Cache-Control', 'no-store').json({ status: 'OK', timestamp: new Date() });
  });

  app.get('/ads', async (req, res) => {
    const result = await pool.query(`SELECT ${adColumns} FROM public.ads_details
      ORDER BY created_at DESC, id DESC`);
    res.set('Cache-Control', 'no-store').json(result.rows);
  });

  app.get('/ads/:id', async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant d’annonce invalide.' });
    }
    const result = await pool.query(
      `SELECT ${adColumns} FROM public.ads_details WHERE id = $1`, [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Annonce introuvable.' });
    }
    res.set('Cache-Control', 'no-store').json(result.rows[0]);
  });

  app.post('/applications', async (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Envoyer les données au format application/json.' });
    }
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return res.status(400).json({ error: 'Candidature invalide.' });
    }
    const { ad_id, name, email, phone, message } = body;
    if (!validId(ad_id) || typeof name !== 'string' || !name.trim() || name.trim().length > 200
      || typeof email !== 'string' || email.trim().length > 255
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || (phone != null && (typeof phone !== 'string' || phone.trim().length > 30))
      || (message != null && (typeof message !== 'string' || message.length > 2000))) {
      return res.status(400).json({ error: 'Vérifier l’annonce, le nom, l’email et les longueurs des champs.' });
    }
    const result = await pool.query(`
      INSERT INTO public.applications (ad_id, name, email, phone, message)
      SELECT id, $2, $3, $4, $5 FROM public.ads WHERE id = $1
      RETURNING id, created_at`, [Number(ad_id), name.trim(), email.trim().toLowerCase(),
      phone?.trim() || null, message ?? '']);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Annonce introuvable.' });
    }
    res.status(201).json(result.rows[0]);
  });

  // Même origine pour le HTML et l’API en local ; public/ sera servi par Vercel.
  app.use(express.static(path.join(__dirname, '../frontend')));
  app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Requête trop volumineuse.' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Une candidature avec cet email existe déjà pour cette annonce.' });
    }
    if (error.code === '23503' || error.code === '23514') {
      return res.status(400).json({ error: 'Candidature incompatible avec les données de l’annonce.' });
    }
    // Ne pas renvoyer les détails SQL, les paramètres ni les identifiants de connexion.
    console.error('Erreur API :', error.code || error.name);
    const unavailable = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET',
      '28P01', '28000', '3D000', '53300', '57P01', '57P02', '57P03'].includes(error.code)
      || error.code?.startsWith('08') || /connection|timeout/i.test(error.message);
    res.status(unavailable ? 503 : 500).json({
      error: 'Service temporairement indisponible. Réessayer plus tard.',
    });
  });
  return app;
}

function startServer(app) {
  const port = Number(process.env.PORT || 3000);
  return app.listen(port, '127.0.0.1', () => {
    console.log(`MercaSport : http://localhost:${port}`);
  });
}

module.exports = { configureApp, startServer };
