const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function parentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      include: { parent: true }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid token or user not active' });
    }

    if (user.role !== 'PARENT') {
      return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }

    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      parent_id: user.parent?.parent_id || null
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    console.error('parentAuth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = parentAuth;
