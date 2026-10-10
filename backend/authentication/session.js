const { randomUUID, createHmac, timingSafeEqual } = require('node:crypto');
const COOKIE = '__Host-mercasport_session';

function createSessionService(pool, { secret, origins, lifetimeSeconds = 1800 } = {}) {
  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('AUTH_SECRET must be 32 random bytes encoded as 64 hexadecimal characters.');
  }
  if (!Array.isArray(origins) || !origins.length || origins.some(value => {
    try { const u = new URL(value); return u.protocol !== 'https:' || u.origin !== value; }
    catch { return true; }
  })) throw new Error('Configure exact HTTPS origins.');
  if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < 60 || lifetimeSeconds > 3600) {
    throw new Error('Session lifetime must be 60..3600 seconds.');
  }
  const key = Buffer.from(secret, 'hex');
  const tag = hash => createHmac('sha256', key).update(hash).digest('base64url');
  const allowsOrigin = req => origins.includes(req.headers.origin);
  return {
    allowsOrigin,
    async issue(user, res) {
      const { SignJWT } = await import('jose');
      const token = await new SignJWT({ credential: tag(user.password_hash) })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(String(user.id))
        .setIssuer('mercasport-auth').setAudience('mercasport-api')
        .setIssuedAt().setJti(randomUUID()).setExpirationTime(`${lifetimeSeconds}s`).sign(key);
      res.cookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict',
        path: '/', maxAge: lifetimeSeconds * 1000 });
    },
    async authenticate(req) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowsOrigin(req)) return null;
      const matches = String(req.headers.cookie || '').split(';').map(v => v.trim())
        .filter(v => v.startsWith(`${COOKIE}=`));
      if (matches.length !== 1) return null;
      const token = matches[0].slice(COOKIE.length + 1);
      if (token.length > 2048) return null;
      let payload;
      try {
        const { jwtVerify } = await import('jose');
        ({ payload } = await jwtVerify(token, key, { algorithms: ['HS256'],
          issuer: 'mercasport-auth', audience: 'mercasport-api', typ: 'JWT',
          requiredClaims: ['sub', 'iat', 'exp', 'jti', 'credential'], maxTokenAge: lifetimeSeconds }));
      } catch { return null; }
      if (!/^[1-9]\d{0,9}$/.test(payload.sub) || Number(payload.sub) > 2147483647 ||
          typeof payload.credential !== 'string') return null;
      const { rows } = await pool.query('SELECT id,password_hash FROM users WHERE id=$1', [Number(payload.sub)]);
      if (!rows.length) return null;
      const expected = Buffer.from(tag(rows[0].password_hash));
      const actual = Buffer.from(payload.credential);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      return { userId: rows[0].id };
    },
  };
}
module.exports = { createSessionService, COOKIE };
