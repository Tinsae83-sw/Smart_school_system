const prisma = require('../config/prisma');

/**
 * VP Administration Authentication Middleware
 * Verifies that the user is a VP Administration and attaches user info to request
 */
async function authenticateVPAdmin(req, res, next) {
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

    // Check if user is a VP Administration
    if (session.user.role !== 'VP_ADMINISTRATION') {
      return res.status(403).json({ error: 'Access denied. VP Administration role required.' });
    }

    // Get VP Administration profile
    const vpAdmin = await prisma.vPAdministration.findUnique({
      where: { user_id: session.user.user_id }
    });

    if (!vpAdmin) {
      return res.status(403).json({ error: 'VP Administration profile not found' });
    }

    // Attach user info to request
    req.user = {
      user_id: session.user.user_id,
      full_name: session.user.full_name,
      email: session.user.email,
      role: session.user.role,
      profile_picture_url: session.user.profile_picture_url,
      vp_admin_id: vpAdmin.vp_admin_id,
      employee_id: vpAdmin.employee_id
    };

    // Update last activity
    await prisma.userSession.update({
      where: { session_id: session.session_id },
      data: { last_activity: new Date() }
    });

    next();
  } catch (error) {
    console.error('VP Administration authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticateVPAdmin };
