const express = require('express');
const router = express.Router();
const {
  getPtsaDashboard,
  getPtsaMeetings,
  getPtsaFeedback,
  getPtsaProfile
} = require('../controllers/ptsaController');

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

// GET /api/ptsa/dashboard - Get PTSA dashboard
router.get('/dashboard', getPtsaDashboard);

// GET /api/ptsa/profile - Get PTSA representative profile
router.get('/profile', getPtsaProfile);

// ============================================================
// MEETINGS & FEEDBACK
// ============================================================

// GET /api/ptsa/meetings - Get PTSA meetings
router.get('/meetings', getPtsaMeetings);

// GET /api/ptsa/feedback - Get PTSA feedback
router.get('/feedback', getPtsaFeedback);

module.exports = router;
