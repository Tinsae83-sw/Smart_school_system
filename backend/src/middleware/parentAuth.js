const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function parentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    console.log('[parentAuth] Request path:', req.path);
    console.log('[parentAuth] Auth header present:', !!authHeader);

    // TEMPORARY BYPASS FOR DEBUGGING
    console.log('[parentAuth] TEMPORARY BYPASS - Skipping JWT verification');
    console.log('[parentAuth] JWT_SECRET configured:', JWT_SECRET ? 'present' : 'missing');
    console.log('[parentAuth] JWT_SECRET value:', JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'N/A');

    // Try to get first parent user for testing
    const parent = await prisma.parent.findFirst({
      where: { user: { role: 'PARENT' } },
      include: { user: true }
    });

    if (parent) {
      req.user = {
        user_id: parent.user.user_id,
        full_name: parent.user.full_name,
        email: parent.user.email,
        role: parent.user.role,
        parent_id: parent.parent_id
      };
      console.log('[parentAuth] Using parent user:', parent.user.email);
    } else {
      console.log('[parentAuth] No parent user found in database');
    }

    next();
    return;

    // ORIGINAL CODE BELOW (TEMPORARILY DISABLED)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[parentAuth] No valid Bearer token found');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('[parentAuth] Token received (first 20 chars):', token.slice(0, 20), '...');

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('[parentAuth] Decoded payload:', decoded);
    } catch (jwtError) {
      console.log('[parentAuth] JWT verification failed:', jwtError.name, jwtError.message);
      console.log('[parentAuth] Full error:', JSON.stringify(jwtError, null, 2));
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', details: jwtError.message });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', details: jwtError.message });
      }
      throw jwtError;
    }

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      include: { parent: true }
    });

    console.log('[parentAuth] User found:', !!user);
    console.log('[parentAuth] User active:', user?.is_active);
    console.log('[parentAuth] User role:', user?.role);

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

    console.log('[parentAuth] Authentication successful for user:', user.email);
    next();
  } catch (error) {
    console.log('[parentAuth] Unexpected error:', error.name, error.message);
    console.error('parentAuth error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}

module.exports = parentAuth;
