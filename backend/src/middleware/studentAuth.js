const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware for Student
 * Uses JWT token to identify the logged-in student
 */
async function authenticateStudent(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    console.log(`[authenticateStudent] Auth header:`, authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log(`[authenticateStudent] Token length:`, token.length);

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[authenticateStudent] Decoded token:`, { userId: decoded.userId, email: decoded.email, role: decoded.role });
    
    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      include: { student: true }
    });

    console.log(`[authenticateStudent] Found user:`, user ? { user_id: user.user_id, email: user.email, role: user.role } : 'Not found');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    if (!user.student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Attach user and student info to request
    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      profile_picture_url: user.profile_picture_url
    };

    req.studentId = user.student.student_id;
    console.log(`[authenticateStudent] Set req.studentId:`, req.studentId);

    // Log for debugging email mismatch issues
    console.log('[studentAuth] Authenticated:', {
      tokenEmail: decoded.email,
      userId: user.user_id,
      userEmail: user.email,
      studentId: user.student.student_id,
      studentUserId: user.student.user_id
    });

    // Verify the student record belongs to the authenticated user
    if (user.student.user_id !== user.user_id) {
      console.error('[studentAuth] CRITICAL: Student record user_id mismatch!', {
        authenticatedUserId: user.user_id,
        authenticatedUserEmail: user.email,
        studentRecordUserId: user.student.user_id
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Student authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  authenticateStudent
};
