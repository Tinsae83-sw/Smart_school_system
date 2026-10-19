require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS - Allow frontend to access backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies with increased limit for file uploads
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const materialsDir = path.join(uploadsDir, 'materials');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, materialsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/\s+/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mpeg',
      'video/quicktime'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, PPT, PPTX, Images, Videos'));
    }
  }
});

// Make upload middleware available globally
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Test endpoint to verify backend is receiving requests
app.get('/api/test', (req, res) => {
  console.log('[Test] Request received:', req.method, req.path);
  console.log('[Test] Headers:', JSON.stringify(req.headers, null, 2));
  res.json({ message: 'Backend is responding', timestamp: new Date().toISOString() });
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

// Teacher routes with authentication
const { authenticateTeacher } = require('./middleware/teacherAuth');
const teacherRoutes = require('./routes/teacherRoutes');
app.use('/api/teacher', authenticateTeacher, teacherRoutes);

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

// ==================== SOCKET.IO SETUP ====================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room based on user_id
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Handle new message
  socket.on('send_message', (message) => {
    console.log('New message:', message);
    
    // Broadcast to sender's room and receiver's room
    io.to(`user_${message.sender_id}`).emit('new_message', message);
    io.to(`user_${message.receiver_id}`).emit('new_message', message);
  });

  // Handle message read status
  socket.on('mark_read', (messageId) => {
    console.log('Message marked as read:', messageId);
    io.emit('message_read', messageId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// ==================== START SERVER ====================

server.listen(PORT, () => {
  console.log('========================================');
  console.log('🎓 Smart School Connect Backend');
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('🔌 Socket.IO enabled for real-time messaging');
  console.log('========================================');
  console.log('📋 Available Routes:');
  console.log('   POST   /api/admin/users              - Register new user');
  console.log('   POST   /api/admin/users/link-parent  - Link parent to student');
  console.log('   GET    /api/admin/users              - Get all users');
  console.log('   GET    /api/admin/users/:id          - Get user by ID');
  console.log('   PUT    /api/admin/users/:id          - Update user');
  console.log('   PATCH   /api/admin/users/:id/status   - Toggle user status');
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

// Graceful shutdown handlers removed to prevent premature server exit
// process.on('SIGTERM', () => {
//   console.log('👋 SIGTERM received. Shutting down gracefully...');
//   process.exit(0);
// });

// process.on('SIGINT', () => {
//   console.log('👋 SIGINT received. Shutting down gracefully...');
//   process.exit(0);
// });
