const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * AUTHENTICATION ROUTES
 * All routes are prefixed with /api/auth
 */

// Login - Authenticate user and return JWT token
// POST /api/auth/login
router.post('/login', authController.login);

// Verify OTP - Verify OTP code for two-factor authentication
// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// Verify Token - Verify JWT token validity
// GET /api/auth/verify
router.get('/verify', authController.verifyToken);

module.exports = router;
