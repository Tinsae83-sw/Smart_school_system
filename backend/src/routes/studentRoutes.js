const express = require('express');
const router = express.Router();
const { authenticateStudent } = require('../middleware/studentAuth');
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
  getStudentGrades,
  getStudentPerformance,
  getStudentTranscript,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentConduct,
  getStudentConductHistory,
  getStudentMaterials,
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
  submitTeacherEvaluation,
  getStudentContacts,
  getStudentMessages,
  sendStudentMessage,
  markStudentMessageRead
} = require('../controllers/studentController');

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

// GET /api/student/dashboard - Get student dashboard
router.get('/dashboard', authenticateStudent, getStudentDashboard);

// GET /api/student/profile - Get student profile
router.get('/profile', authenticateStudent, getStudentProfile);

// PUT /api/student/profile - Update student profile
router.put('/profile', authenticateStudent, updateStudentProfile);

// PUT /api/student/profile/picture - Update profile picture
router.put('/profile/picture', authenticateStudent, updateProfilePicture);

// POST /api/student/change-password - Change password
router.post('/change-password', authenticateStudent, changePassword);

// ============================================================
// ANNOUNCEMENTS & NOTIFICATIONS
// ============================================================

// GET /api/student/announcements - Get announcements
router.get('/announcements', authenticateStudent, getStudentAnnouncements);

// GET /api/student/notifications - Get notifications
router.get('/notifications', authenticateStudent, getStudentNotifications);

// POST /api/student/notifications/read - Mark notification as read
router.post('/notifications/read', authenticateStudent, markNotificationRead);

// ============================================================
// ASSIGNMENTS
// ============================================================

// GET /api/student/assignments - Get student assignments
router.get('/assignments', authenticateStudent, getStudentAssignments);

// POST /api/student/assignments/:assignmentId/submit - Submit assignment
router.post('/assignments/:assignmentId/submit', authenticateStudent, submitAssignment);

// ============================================================
// GRADES & PERFORMANCE
// ============================================================

// GET /api/student/grades - Get student grades
router.get('/grades', authenticateStudent, getStudentGrades);

// GET /api/student/performance - Get student performance
router.get('/performance', authenticateStudent, getStudentPerformance);

// GET /api/student/transcript - Get student transcript
router.get('/transcript', authenticateStudent, getStudentTranscript);

// ============================================================
// ATTENDANCE
// ============================================================

// GET /api/student/attendance - Get student attendance records
router.get('/attendance', authenticateStudent, getStudentAttendance);

// GET /api/student/attendance/summary - Get student attendance summary
router.get('/attendance/summary', authenticateStudent, getStudentAttendanceSummary);

// ============================================================
// CONDUCT & PEER EVALUATIONS
// ============================================================

// GET /api/student/conduct - Get student conduct grade
router.get('/conduct', authenticateStudent, getStudentConduct);

// GET /api/student/conduct/history - Get student conduct history
router.get('/conduct/history', authenticateStudent, getStudentConductHistory);

// GET /api/student/materials - Get student materials
router.get('/materials', authenticateStudent, getStudentMaterials);

// GET /api/student/peer-evaluations - Get student peer evaluations
router.get('/peer-evaluations', authenticateStudent, getStudentPeerEvaluations);

// GET /api/student/peer-evaluations/:evaluationId/results - Get peer evaluation results
router.get('/peer-evaluations/:evaluationId/results', authenticateStudent, getPeerEvaluationResults);

// POST /api/student/peer-evaluations/:evaluationId/submit - Submit peer evaluation
router.post('/peer-evaluations/:evaluationId/submit', authenticateStudent, submitPeerEvaluation);

// ============================================================
// NOTES & BOOKS
// ============================================================

// GET /api/student/notes - Get student notes
router.get('/notes', authenticateStudent, getStudentNotes);

// POST /api/student/notes - Create student note
router.post('/notes', authenticateStudent, createStudentNote);

// PUT /api/student/notes/:noteId - Update student note
router.put('/notes/:noteId', authenticateStudent, updateStudentNote);

// DELETE /api/student/notes/:noteId - Delete student note
router.delete('/notes/:noteId', authenticateStudent, deleteStudentNote);

// GET /api/student/books - Get AI books
router.get('/books', authenticateStudent, getStudentBooks);

// POST /api/student/books/:bookId/access - Access book
router.post('/books/:bookId/access', authenticateStudent, accessBook);

// GET /api/student/books/access-log - Get book access log
router.get('/books/access-log', authenticateStudent, getBookAccessLog);

// POST /api/student/evaluation/:token - Submit teacher evaluation using one-time link
router.get('/evaluation/:token', getTeacherEvaluationByToken);
router.post('/evaluation/:token', submitTeacherEvaluation);

// ============================================================
// COMMUNICATION
// ============================================================
router.get('/contacts', authenticateStudent, getStudentContacts);
router.get('/messages', authenticateStudent, getStudentMessages);
router.post('/messages', authenticateStudent, sendStudentMessage);
router.put('/messages/:messageId/read', authenticateStudent, markStudentMessageRead);

module.exports = router;
