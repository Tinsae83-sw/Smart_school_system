require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS - Allow frontend to access backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ==================== ROUTES ====================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart School Connect API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// User management routes (all /api/admin/users/*)
app.use('/api/admin/users', userRoutes);

const subjectRoutes = require('./routes/subjectRoutes');
const classSubjectRoutes = require('./routes/classSubjectRoutes');
const classRoutes = require('./routes/classRoutes');

// Additional admin routes
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/class-subject', classSubjectRoutes);
app.use('/api/admin/classes', classRoutes);

// Department Head routes
const departmentHeadRoutes = require('./routes/departmentHeadRoutes');
app.use('/api/department-head', departmentHeadRoutes);

// Principal routes (no authentication for development)
const principalRoutes = require('./routes/principalRoutes');
app.use('/api/principal', principalRoutes);

// VP Academic routes (no authentication for development)
const vpAcademicRoutes = require('./routes/vpAcademicRoutes');
app.use('/api/vp-academic', vpAcademicRoutes);

// VP Administration routes
const vpAdminRoutes = require('./routes/vpAdminRoutes');
app.use('/api/vp-administration', vpAdminRoutes);

// SIC (School Improvement Committee) routes (no authentication for development)
const sicRoutes = require('./routes/sicRoutes');
app.use('/api/sic', sicRoutes);

// Parent routes
const parentRoutes = require('./routes/parentRoutes');
app.use('/api/parent', parentRoutes);

// Teacher routes (no authentication for development)
const teacherRoutes = require('./routes/teacherRoutes');
app.use('/api/teacher', teacherRoutes);

// Student routes (no authentication for development)
const studentRoutes = require('./routes/studentRoutes');
app.use('/api/student', studentRoutes);

// PTSA representative routes (no authentication for development)
const ptsaRoutes = require('./routes/ptsaRoutes');
app.use('/api/ptsa', ptsaRoutes);

// Public routes (accessible without authentication)
const publicRoutes = require('./routes/publicRoutes');
app.use('/api/public', publicRoutes);

// app.use('/api/admin/classes', classRoutes);
// app.use('/api/admin/attendance', attendanceRoutes);
// etc.

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log('========================================');
  console.log('🎓 Smart School Connect Backend');
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('========================================');
  console.log('📋 Available Routes:');
  console.log('   POST   /api/admin/users              - Register new user');
  console.log('   POST   /api/admin/users/link-parent  - Link parent to student');
  console.log('   GET    /api/admin/users              - Get all users');
  console.log('   GET    /api/admin/users/:id          - Get user by ID');
  console.log('   PUT    /api/admin/users/:id          - Update user');
  console.log('   PATCH  /api/admin/users/:id/status   - Toggle user status');
  console.log('   POST   /api/admin/users/:id/reset-password - Reset password');
  console.log('   DELETE /api/admin/users/:id          - Delete user');
  console.log('   GET    /api/admin/subjects           - List all subjects');
  console.log('   POST   /api/admin/subjects           - Create a subject');
  console.log('   PUT    /api/admin/subjects/:id       - Update a subject');
  console.log('   DELETE /api/admin/subjects/:id       - Delete a subject');
  console.log('   GET    /api/admin/class-subject      - Get all class-subject assignments');
  console.log('   POST   /api/admin/class-subject      - Assign teacher to class subject');
  console.log('========================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't crash the server, but log the error
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
