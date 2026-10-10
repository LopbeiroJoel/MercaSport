const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { argon2id } = require('hash-wasm');
const derive = promisify(scrypt);
const argonParameters = { memorySize: 65536, iterations: 3, parallelism: 1, hashLength: 32 };
const legacyParameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
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
    return await argon2id({ password, salt, ...argonParameters, outputType: 'encoded' });
  } finally {
    activeHashes--;
  }
}

// Compare Argon2id et le format scrypt de la première version du module.
// Les comptes bcrypt existants sont conservés : leur vérification reste à brancher pour la connexion.
async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 512
    || typeof storedHash !== 'string') return false;
  const argon = storedHash.match(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/);
  if (argon) {
    const actual = await argon2id({ password, salt: Buffer.from(argon[1], 'base64'),
      ...argonParameters, outputType: 'binary' });
    return timingSafeEqual(Buffer.from(actual), Buffer.from(argon[2], 'base64'));
  }
  if (/^scrypt\$v1\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(storedHash)) {
    const parts = storedHash.split('$');
    const actual = await derive(password, Buffer.from(parts[5], 'hex'), 64, legacyParameters);
    return timingSafeEqual(actual, Buffer.from(parts[6], 'hex'));
  }
  return false;
}

module.exports = { hashPassword, verifyPassword };
