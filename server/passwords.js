const crypto = require('crypto');

const PASSWORD_HASH_PREFIX = 'scrypt$';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 32);
  return `${PASSWORD_HASH_PREFIX}${salt}$${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || typeof password !== 'string') return false;
  if (!stored.startsWith(PASSWORD_HASH_PREFIX)) {
    const a = Buffer.from(stored); const b = Buffer.from(password);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const parts = stored.split('$');
  if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const derived = crypto.scryptSync(password, parts[1], 32);
  const expected = Buffer.from(parts[2], 'hex');
  return crypto.timingSafeEqual(derived, expected);
}

module.exports = { PASSWORD_HASH_PREFIX, hashPassword, verifyPassword };
