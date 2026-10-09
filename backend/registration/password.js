const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const parameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let activeHashes = 0;

async function hashPassword(password) {
  // Limite locale de mémoire : une protection distribuée contre les abus reste nécessaire.
  if (activeHashes >= 2) {
    const error = new Error('Password hashing capacity reached');
    error.code = 'HASH_BUSY';
    throw error;
  }
  activeHashes++;
  try {
    const salt = randomBytes(16);
    const key = await derive(password, salt, 64, parameters);
    return `scrypt$v1$131072$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
  } finally {
    activeHashes--;
  }
}

// Fonction de comparaison du nouveau format, fournie pour la future connexion de Matteo.
// Elle ne traite pas les anciens hashes bcrypt et ne crée aucune route de connexion.
async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 512
    || typeof storedHash !== 'string'
    || !/^scrypt\$v1\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(storedHash)) return false;
  const parts = storedHash.split('$');
  const actual = await derive(password, Buffer.from(parts[5], 'hex'), 64, parameters);
  return timingSafeEqual(actual, Buffer.from(parts[6], 'hex'));
}

module.exports = { hashPassword, verifyPassword };
