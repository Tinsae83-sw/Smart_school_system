const prisma = require('../config/prisma');

/**
 * General Authentication Middleware
 * Verifies the user's token and attaches user info to request
 * Role-based authorization is handled separately by roleMiddleware
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For simplicity, we'll use a basic token validation
    // In production, use JWT or similar
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if session is expired
    if (session.expires_at && new Date() > session.expires_at) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Attach user info to request
    req.user = {
      user_id: session.user.user_id,
      full_name: session.user.full_name,
      email: session.user.email,
      role: session.user.role,
      profile_picture_url: session.user.profile_picture_url
    };

    // Update last activity
    await prisma.userSession.update({
      where: { session_id: session.session_id },
      data: { last_activity: new Date() }
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Authentication Middleware for Department Head
 * Verifies that the user is a Department Head and attaches user info to request
 */
async function authenticateDepartmentHead(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For simplicity, we'll use a basic token validation
    // In production, use JWT or similar
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user is a Department Head
    if (session.user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({ error: 'Access denied. Department Head role required.' });
    }

    // Attach user info to request
    req.user = {
      user_id: session.user.user_id,
      full_name: session.user.full_name,
      email: session.user.email,
      role: session.user.role
    };

    // Update last activity
    await prisma.userSession.update({
      where: { session_id: session.session_id },
      data: { last_activity: new Date() }
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based Authorization Middleware
 * Checks if the authenticated user has one of the allowed roles
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Required roles: ' + allowedRoles.join(', ') 
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authenticateDepartmentHead,
  authorizeRoles
};
