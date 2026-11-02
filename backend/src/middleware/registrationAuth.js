const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware for the Registration actor
 * Uses the same JWT approach as teacherAuth.js:
 *   1. read Bearer token
 *   2. verify signature
 *   3. load the user by the email inside the token (uses the email index)
 *   4. require role REGISTRATION
 *   5. attach user info to req.user / req.user_id
 *
 * Attached ids are used by controllers exactly like getSICMemberId(req)
 * uses req.user_id, so downstream code stays consistent.
 */
async function authenticateRegistration(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    if (user.role !== 'REGISTRATION') {
      return res.status(403).json({
        error: 'Access denied. Registration officer role required.'
      });
    }

    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };
    // convenience alias used by controllers (same convention as getSICMemberId)
    req.user_id = user.user_id;

    next();
  } catch (error) {
    console.error('Registration authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  authenticateRegistration
};
