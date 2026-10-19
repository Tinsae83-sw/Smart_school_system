const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware for Teacher
 * Uses JWT token to identify the logged-in teacher
 */
async function authenticateTeacher(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user by email and role first (uses index)
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      select: { user_id: true, full_name: true, email: true, role: true }
    });

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Teacher record not found' });
    }

    // Then find teacher by user_id (uses index)
    const teacher = await prisma.teacher.findUnique({
      where: { user_id: user.user_id },
      include: { user: { select: { user_id: true, full_name: true, email: true, role: true } } }
    });

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher record not found' });
    }

    // Attach user info to request
    req.user = {
      user_id: teacher.user.user_id,
      full_name: teacher.user.full_name,
      email: teacher.user.email,
      role: teacher.user.role
    };

    // Attach teacher_id to request for use in controllers
    req.teacherId = teacher.teacher_id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  authenticateTeacher
};
