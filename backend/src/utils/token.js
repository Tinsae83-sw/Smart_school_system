const jwt = require("jsonwebtoken");

/**
 * Sign a JWT.
 * @param {object} user  user with user_id and role
 * @param {string} type  "session" (full access, persisted in user_sessions) or
 *                       "setup" (short-lived, only grants password setup)
 */
function signToken(user, type = "session", expiresIn) {
  const payload = { user_id: user.user_id, role: user.role, type };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };