const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * USER MANAGEMENT ROUTES
 * All routes are prefixed with /api/admin/users
 */

// Register new user (Teacher, Student, or Parent)
// POST /api/admin/users
router.post('/', userController.registerUser);

// Link parent to student
// POST /api/admin/users/link-parent
router.post('/link-parent', userController.linkParentToStudent);

// Get all users (with optional filters)
// GET /api/admin/users?role=STUDENT&status=active
router.get('/', userController.getUsers);

// Get user by ID
// GET /api/admin/users/:id
router.get('/:id', userController.getUserById);

// Update user
// PUT /api/admin/users/:id
router.put('/:id', userController.updateUser);

// Toggle user status (enable/disable)
// PATCH /api/admin/users/:id/status
router.patch('/:id/status', userController.toggleUserStatus);

// Reset user password
// POST /api/admin/users/:id/reset-password
router.post('/:id/reset-password', userController.resetPassword);

// Get grades for a student by user id
// GET /api/admin/users/:id/grades
router.get('/:id/grades', userController.getStudentGrades);

// Get grades assigned by a teacher (by user id)
// GET /api/admin/users/:id/assigned-grades
router.get('/:id/assigned-grades', userController.getTeacherAssignedGrades);
// Delete user
// DELETE /api/admin/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
