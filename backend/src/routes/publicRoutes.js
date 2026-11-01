const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');
const publicController = require('../controllers/publicController');

/**
 * PUBLIC ROUTES
 * Accessible to all users without authentication
 */

// Get School Policies (public endpoint)
// GET /api/public/policies
router.get('/policies', principalController.getAcademicPolicies);

// Landing Page Data (public endpoints)
// GET /api/public/school-info
router.get('/school-info', publicController.getSchoolInfo);

// GET /api/public/academic-programs
router.get('/academic-programs', publicController.getAcademicPrograms);

// GET /api/public/contact-info
router.get('/contact-info', publicController.getContactInfo);

module.exports = router;
