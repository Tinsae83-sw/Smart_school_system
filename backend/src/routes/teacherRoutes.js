const express = require('express');
const router = express.Router();
const {
  // Profile & Dashboard
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherDashboard,
  
  // Classes & Students
  getTeacherClasses,
  getClassRoster,
  getStudentProfile,
  getClassTimetable,
  getTeacherTimetable,
  
  // Attendance
  getAttendance,
  saveAttendance,
  updateAttendance,
  getAttendanceSummary,
  
  // Assignments
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  bulkGradeAssignments,
  
  // Grades
  getClassGrades,
  enterExamGrades,
  
  // Conduct
  getClassConduct,
  gradeConduct,
  addConductComment,
  
  // Lesson Plans
  getLessonPlans,
  createLessonPlan,
  updateLessonPlan,
  submitLessonPlan,
  
  // Course Materials
  getMaterials,
  createMaterial,
  deleteMaterial,
  
  // Online Classes
  getOnlineClasses,
  createOnlineClass,
  startOnlineClass,
  endOnlineClass,
  
  // Exams
  getExams,
  createExam,
  submitExam,
  getExamResults,
  
  // Peer Evaluation
  getPeerEvaluationForms,
  createPeerEvaluationForm,
  assignPeerEvaluation,
  getPeerEvaluationResults,
  
  // Communication
  getMessages,
  sendMessage,
  markMessageRead,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  
  // Reports
  generateClassReport,
  generateStudentReport,
  
  // Settings
  getTeacherSettings,
  updateTeacherSettings,
  changePassword,
  
  // Activity Log
  getActivityLog
} = require('../controllers/teacherController');

// ============================================================
// PROFILE & DASHBOARD
// ============================================================

// GET /api/teacher/profile - Get teacher profile
router.get('/profile', getTeacherProfile);

// PUT /api/teacher/profile - Update teacher profile
router.put('/profile', updateTeacherProfile);

// GET /api/teacher/dashboard - Get teacher dashboard
router.get('/dashboard', getTeacherDashboard);

// ============================================================
// CLASSES & STUDENTS
// ============================================================

// GET /api/teacher/classes - Get teacher's classes
router.get('/classes', getTeacherClasses);

// GET /api/teacher/classes/:classId/roster - Get class roster
router.get('/classes/:classId/roster', getClassRoster);

// GET /api/teacher/students/:studentId - Get student profile
router.get('/students/:studentId', getStudentProfile);

// GET /api/teacher/classes/:classId/timetable - Get class timetable
router.get('/classes/:classId/timetable', getClassTimetable);

// GET /api/teacher/timetable - Get teacher's personal timetable
router.get('/timetable', getTeacherTimetable);

// ============================================================
// ATTENDANCE MANAGEMENT
// ============================================================

// GET /api/teacher/attendance - Get attendance for a class on a date
router.get('/attendance', getAttendance);

// POST /api/teacher/attendance - Save attendance
router.post('/attendance', saveAttendance);

// PUT /api/teacher/attendance/:attendanceId - Update attendance
router.put('/attendance/:attendanceId', updateAttendance);

// GET /api/teacher/attendance/summary/:classId - Get attendance summary
router.get('/attendance/summary/:classId', getAttendanceSummary);

// ============================================================
// ASSIGNMENT MANAGEMENT
// ============================================================

// GET /api/teacher/assignments - Get all assignments
router.get('/assignments', getAssignments);

// POST /api/teacher/assignments - Create assignment
router.post('/assignments', createAssignment);

// PUT /api/teacher/assignments/:assignmentId - Update assignment
router.put('/assignments/:assignmentId', updateAssignment);

// DELETE /api/teacher/assignments/:assignmentId - Delete assignment
router.delete('/assignments/:assignmentId', deleteAssignment);

// POST /api/teacher/assignments/:assignmentId/grade - Grade submission
router.post('/assignments/:assignmentId/grade', gradeSubmission);

// POST /api/teacher/assignments/:assignmentId/bulk-grade - Bulk grade assignments
router.post('/assignments/:assignmentId/bulk-grade', bulkGradeAssignments);

// ============================================================
// GRADE MANAGEMENT
// ============================================================

// GET /api/teacher/grades/:classId - Get grades for a class
router.get('/grades/:classId', getClassGrades);

// POST /api/teacher/exam-grades - Enter exam grades
router.post('/exam-grades', enterExamGrades);

// ============================================================
// CONDUCT MANAGEMENT
// ============================================================

// GET /api/teacher/conduct/:classId - Get conduct grades for class
router.get('/conduct/:classId', getClassConduct);

// POST /api/teacher/conduct - Grade student conduct
router.post('/conduct', gradeConduct);

// POST /api/teacher/conduct/:conductId/comment - Add conduct comment
router.post('/conduct/:conductId/comment', addConductComment);

// ============================================================
// LESSON PLANS
// ============================================================

// GET /api/teacher/lesson-plans - Get teacher's lesson plans
router.get('/lesson-plans', getLessonPlans);

// POST /api/teacher/lesson-plans - Create lesson plan
router.post('/lesson-plans', createLessonPlan);

// PUT /api/teacher/lesson-plans/:lessonPlanId - Update lesson plan
router.put('/lesson-plans/:lessonPlanId', updateLessonPlan);

// POST /api/teacher/lesson-plans/:lessonPlanId/submit - Submit lesson plan for approval
router.post('/lesson-plans/:lessonPlanId/submit', submitLessonPlan);

// ============================================================
// COURSE MATERIALS
// ============================================================

// GET /api/teacher/materials - Get teacher's course materials
router.get('/materials', getMaterials);

// POST /api/teacher/materials - Create course material
router.post('/materials', createMaterial);

// DELETE /api/teacher/materials/:materialId - Delete course material
router.delete('/materials/:materialId', deleteMaterial);

// ============================================================
// ONLINE CLASSES
// ============================================================

// GET /api/teacher/online-classes - Get online classes
router.get('/online-classes', getOnlineClasses);

// POST /api/teacher/online-classes - Create online class
router.post('/online-classes', createOnlineClass);

// POST /api/teacher/online-classes/:onlineClassId/start - Start online class
router.post('/online-classes/:onlineClassId/start', startOnlineClass);

// POST /api/teacher/online-classes/:onlineClassId/end - End online class
router.post('/online-classes/:onlineClassId/end', endOnlineClass);

// ============================================================
// EXAMINATION MANAGEMENT
// ============================================================

// GET /api/teacher/exams - Get exams
router.get('/exams', getExams);

// POST /api/teacher/exams - Create exam
router.post('/exams', createExam);

// POST /api/teacher/exams/:examId/submit - Submit exam for approval
router.post('/exams/:examId/submit', submitExam);

// GET /api/teacher/exams/:examId/results - Get exam results
router.get('/exams/:examId/results', getExamResults);

// ============================================================
// PEER EVALUATION
// ============================================================

// GET /api/teacher/peer-evaluation-forms - Get peer evaluation forms
router.get('/peer-evaluation-forms', getPeerEvaluationForms);

// POST /api/teacher/peer-evaluation-forms - Create peer evaluation form
router.post('/peer-evaluation-forms', createPeerEvaluationForm);

// POST /api/teacher/peer-evaluation-forms/:formId/assign - Assign peer evaluation
router.post('/peer-evaluation-forms/:formId/assign', assignPeerEvaluation);

// GET /api/teacher/peer-evaluation-results/:classId - Get peer evaluation results
router.get('/peer-evaluation-results/:classId', getPeerEvaluationResults);

// ============================================================
// COMMUNICATION
// ============================================================

// GET /api/teacher/messages - Get messages
router.get('/messages', getMessages);

// POST /api/teacher/messages - Send message
router.post('/messages', sendMessage);

// PUT /api/teacher/messages/:messageId/read - Mark message as read
router.put('/messages/:messageId/read', markMessageRead);

// ============================================================
// NOTIFICATIONS
// ============================================================

// GET /api/teacher/notifications - Get notifications
router.get('/notifications', getNotifications);

// PUT /api/teacher/notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read', markNotificationRead);

// ============================================================
// REPORTS
// ============================================================

// GET /api/teacher/reports/class/:classId - Generate class academic report
router.get('/reports/class/:classId', generateClassReport);

// GET /api/teacher/reports/student/:studentId - Generate student academic report
router.get('/reports/student/:studentId', generateStudentReport);

// ============================================================
// SETTINGS
// ============================================================

// GET /api/teacher/settings - Get teacher settings
router.get('/settings', getTeacherSettings);

// PUT /api/teacher/settings - Update teacher settings
router.put('/settings', updateTeacherSettings);

// POST /api/teacher/change-password - Change password
router.post('/change-password', changePassword);

// ============================================================
// ACTIVITY LOG
// ============================================================

// GET /api/teacher/activity-log - Get teacher activity log
router.get('/activity-log', getActivityLog);

module.exports = router;
