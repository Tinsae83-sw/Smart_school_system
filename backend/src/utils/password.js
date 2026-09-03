const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

/** Hash a plaintext password (bcrypt). */
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/** Compare a plaintext password to a stored hash. */
function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

/** Generate a random human-friendly password (for admin-created accounts). */
function randomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = require("crypto").randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

module.exports = { hashPassword, verifyPassword, randomPassword };