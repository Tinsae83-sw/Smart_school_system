const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');

/**
 * PUBLIC ROUTES
 * Accessible to all users without authentication
 */

// Get School Policies (public endpoint)
// GET /api/public/policies
router.get('/policies', principalController.getAcademicPolicies);

module.exports = router;
