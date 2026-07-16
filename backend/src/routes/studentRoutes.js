const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentAnnouncements,
  getStudentNotifications,
  getStudentProfile
} = require('../controllers/studentController');

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

// GET /api/student/dashboard - Get student dashboard
router.get('/dashboard', getStudentDashboard);

// GET /api/student/profile - Get student profile
router.get('/profile', getStudentProfile);

// ============================================================
// ANNOUNCEMENTS & NOTIFICATIONS
// ============================================================

// GET /api/student/announcements - Get announcements
router.get('/announcements', getStudentAnnouncements);

// GET /api/student/notifications - Get notifications
router.get('/notifications', getStudentNotifications);

module.exports = router;
