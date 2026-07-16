const prisma = require('../config/prisma');

/**
 * Authentication Middleware for Teacher
 * Verifies that the user is a Teacher and attaches user info to request
 */
async function authenticateTeacher(req, res, next) {
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

    // Check if user is a Teacher
    if (session.user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Access denied. Teacher role required.' });
    }

    // Get teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { user_id: session.user.user_id }
    });

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher record not found' });
    }

    // Attach user info to request
    req.user = {
      user_id: session.user.user_id,
      full_name: session.user.full_name,
      email: session.user.email,
      role: session.user.role
    };

    // Attach teacher_id to request for use in controllers
    req.teacherId = teacher.teacher_id;

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

module.exports = {
  authenticateTeacher
};
