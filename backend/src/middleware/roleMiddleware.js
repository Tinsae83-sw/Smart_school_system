const prisma = require('../config/prisma');

/**
 * Role Authorization Middleware
 * Checks if the authenticated user has the required role(s)
 */
function authorize(allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `Role '${req.user.role}' is not authorized for this resource`,
          required_roles: allowedRoles
        });
      }

      // For Parent role, attach parent_id if not already present
      if (req.user.role === 'PARENT' && !req.user.parent_id) {
        const parent = await prisma.parent.findUnique({
          where: { user_id: req.user.user_id }
        });
        
        if (parent) {
          req.user.parent_id = parent.parent_id;
        }
      }

      // For Student role, attach student_id if not already present
      if (req.user.role === 'STUDENT' && !req.user.student_id) {
        const student = await prisma.student.findUnique({
          where: { user_id: req.user.user_id }
        });
        
        if (student) {
          req.user.student_id = student.student_id;
        }
      }

      // For Teacher role, attach teacher_id if not already present
      if (req.user.role === 'TEACHER' && !req.user.teacher_id) {
        const teacher = await prisma.teacher.findUnique({
          where: { user_id: req.user.user_id }
        });
        
        if (teacher) {
          req.user.teacher_id = teacher.teacher_id;
        }
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

module.exports = { authorize };
