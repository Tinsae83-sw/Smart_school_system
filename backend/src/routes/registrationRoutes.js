const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { validateStudentRegistration } = require('../middleware/registrationValidators');

/**
 * REGISTRATION ROLE ROUTES
 * All routes are prefixed with /api/registration and require the
 * authenticateRegistration middleware (see server.js).
 */

// ==================== DASHBOARD ====================

// Get registration dashboard statistics
// GET /api/registration/dashboard
router.get('/dashboard', registrationController.getDashboard);

// ==================== STUDENT REGISTER ====================

// Register a new student
// POST /api/registration/students
router.post('/students', validateStudentRegistration, registrationController.registerStudent);

// List / search the student register
// GET /api/registration/students?search=abebe&page=1&limit=20
router.get('/students', registrationController.getStudents);

module.exports = router;
