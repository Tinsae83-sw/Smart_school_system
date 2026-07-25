const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentAnnouncements,
  getStudentNotifications,
  markNotificationRead,
  getStudentProfile,
  updateStudentProfile,
  updateProfilePicture,
  changePassword,
  getStudentAssignments,
  submitAssignment,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentConduct,
  getStudentPeerEvaluations,
  getPeerEvaluationResults,
  submitPeerEvaluation,
  getStudentNotes,
  createStudentNote,
  updateStudentNote,
  deleteStudentNote,
  getStudentBooks,
  accessBook,
  getBookAccessLog,
  getTeacherEvaluationByToken,
  submitTeacherEvaluation
} = require('../controllers/studentController');

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

// GET /api/student/dashboard - Get student dashboard
router.get('/dashboard', getStudentDashboard);

// GET /api/student/profile - Get student profile
router.get('/profile', getStudentProfile);

// PUT /api/student/profile - Update student profile
router.put('/profile', updateStudentProfile);

// PUT /api/student/profile/picture - Update profile picture
router.put('/profile/picture', updateProfilePicture);

// POST /api/student/change-password - Change password
router.post('/change-password', changePassword);

// ============================================================
// ANNOUNCEMENTS & NOTIFICATIONS
// ============================================================

// GET /api/student/announcements - Get announcements
router.get('/announcements', getStudentAnnouncements);

// GET /api/student/notifications - Get notifications
router.get('/notifications', getStudentNotifications);

// POST /api/student/notifications/read - Mark notification as read
router.post('/notifications/read', markNotificationRead);

// ============================================================
// ASSIGNMENTS
// ============================================================

// GET /api/student/assignments - Get student assignments
router.get('/assignments', getStudentAssignments);

// POST /api/student/assignments/:assignmentId/submit - Submit assignment
router.post('/assignments/:assignmentId/submit', submitAssignment);

// ============================================================
// ATTENDANCE
// ============================================================

// GET /api/student/attendance - Get student attendance records
router.get('/attendance', getStudentAttendance);

// GET /api/student/attendance/summary - Get student attendance summary
router.get('/attendance/summary', getStudentAttendanceSummary);

// ============================================================
// CONDUCT & PEER EVALUATIONS
// ============================================================

// GET /api/student/conduct - Get student conduct grade
router.get('/conduct', getStudentConduct);

// GET /api/student/peer-evaluations - Get student peer evaluations
router.get('/peer-evaluations', getStudentPeerEvaluations);

// GET /api/student/peer-evaluations/:evaluationId/results - Get peer evaluation results
router.get('/peer-evaluations/:evaluationId/results', getPeerEvaluationResults);

// POST /api/student/peer-evaluations/:evaluationId/submit - Submit peer evaluation
router.post('/peer-evaluations/:evaluationId/submit', submitPeerEvaluation);

// ============================================================
// NOTES & BOOKS
// ============================================================

// GET /api/student/notes - Get student notes
router.get('/notes', getStudentNotes);

// POST /api/student/notes - Create student note
router.post('/notes', createStudentNote);

// PUT /api/student/notes/:noteId - Update student note
router.put('/notes/:noteId', updateStudentNote);

// DELETE /api/student/notes/:noteId - Delete student note
router.delete('/notes/:noteId', deleteStudentNote);

// GET /api/student/books - Get AI books
router.get('/books', getStudentBooks);

// POST /api/student/books/:bookId/access - Access book
router.post('/books/:bookId/access', accessBook);

// GET /api/student/books/access-log - Get book access log
router.get('/books/access-log', getBookAccessLog);

// POST /api/student/evaluation/:token - Submit teacher evaluation using one-time link
router.get('/evaluation/:token', getTeacherEvaluationByToken);
router.post('/evaluation/:token', submitTeacherEvaluation);

module.exports = router;
