const express = require('express');
const router = express.Router();
const vpAcademicController = require('../controllers/vpAcademicController');

/**
 * VP ACADEMIC ROUTES
 * All routes are prefixed with /api/vp-academic
 */

// ==================== DASHBOARD & OVERVIEW ====================

// Get Academic Dashboard
// GET /api/vp-academic/dashboard
router.get('/dashboard', vpAcademicController.getAcademicDashboard);

// Get Quick Stats Cards
// GET /api/vp-academic/quick-stats
router.get('/quick-stats', vpAcademicController.getQuickStats);

// Get Academic Calendar
// GET /api/vp-academic/academic-calendar
router.get('/academic-calendar', vpAcademicController.getAcademicCalendar);

// Get Recent Academic Activity
// GET /api/vp-academic/recent-activity
router.get('/recent-activity', vpAcademicController.getRecentActivity);

// Get VP Academic Notifications
// GET /api/vp-academic/notifications
router.get('/notifications', vpAcademicController.getNotifications);

// ==================== CURRICULUM MANAGEMENT ====================

// Get National Curriculum
// GET /api/vp-academic/curriculum
router.get('/curriculum', vpAcademicController.getCurriculum);

// Create/Update Subject Offering
// POST /api/vp-academic/curriculum/subjects
router.post('/curriculum/subjects', vpAcademicController.manageSubjectOffering);

// Set Curriculum Objectives
// POST /api/vp-academic/curriculum/objectives
router.post('/curriculum/objectives', vpAcademicController.setCurriculumObjectives);

// Map Subject to Department
// PUT /api/vp-academic/curriculum/map-department
router.put('/curriculum/map-department', vpAcademicController.mapSubjectToDepartment);

// View Curriculum Compliance
// GET /api/vp-academic/curriculum/compliance
router.get('/curriculum/compliance', vpAcademicController.getCurriculumCompliance);

// Export Curriculum Guide
// GET /api/vp-academic/curriculum/export
router.get('/curriculum/export', vpAcademicController.exportCurriculumGuide);

// ==================== TIMETABLE & SCHEDULING MANAGEMENT ====================

// Create Master Timetable
// POST /api/vp-academic/timetable/master
router.post('/timetable/master', vpAcademicController.createMasterTimetable);

// Assign Teachers to Classes
// PUT /api/vp-academic/timetable/assign-teacher
router.put('/timetable/assign-teacher', vpAcademicController.assignTeacherToClass);

// Manage Classrooms
// PUT /api/vp-academic/timetable/assign-classroom
router.put('/timetable/assign-classroom', vpAcademicController.assignClassroom);

// View Timetable Conflicts
// GET /api/vp-academic/timetable/conflicts
router.get('/timetable/conflicts', vpAcademicController.getTimetableConflicts);

// Generate Individual Timetables
// GET /api/vp-academic/timetable/individual/:type/:id
router.get('/timetable/individual/:type/:id', vpAcademicController.getIndividualTimetable);

// Edit Timetable
// PUT /api/vp-academic/timetable/:id
router.put('/timetable/:id', vpAcademicController.editTimetable);

// View Substitute Teacher Assignments
// GET /api/vp-academic/timetable/substitutes
router.get('/timetable/substitutes', vpAcademicController.getSubstituteAssignments);

// Export Timetable
// GET /api/vp-academic/timetable/export
router.get('/timetable/export', vpAcademicController.exportTimetable);

// ==================== TEACHER MANAGEMENT ====================

// Register New Teacher
// POST /api/vp-academic/teachers/register
router.post('/teachers/register', vpAcademicController.registerTeacher);

// Register Teaching Assistant
// POST /api/vp-academic/teachers/register-ta
router.post('/teachers/register-ta', vpAcademicController.registerTeachingAssistant);

// View All Teachers
// GET /api/vp-academic/teachers
router.get('/teachers', vpAcademicController.getAllTeachers);

// Edit Teacher Details
// PUT /api/vp-academic/teachers/:id
router.put('/teachers/:id', vpAcademicController.editTeacher);

// Assign Teacher to Department
// PUT /api/vp-academic/teachers/:id/department
router.put('/teachers/:id/department', vpAcademicController.assignTeacherToDepartment);

// Assign Teacher to Classes (Homeroom)
// PUT /api/vp-academic/teachers/:id/homeroom
router.put('/teachers/:id/homeroom', vpAcademicController.assignTeacherToHomeroom);

// Assign Teacher to Subjects
// PUT /api/vp-academic/teachers/:id/subjects
router.put('/teachers/:id/subjects', vpAcademicController.assignTeacherToSubjects);

// Remove/Transfer Teacher
// DELETE /api/vp-academic/teachers/:id
router.delete('/teachers/:id', vpAcademicController.removeTeacher);

// View Teacher Workload
// GET /api/vp-academic/teachers/:id/workload
router.get('/teachers/:id/workload', vpAcademicController.getTeacherWorkload);

// View Teacher Performance
// GET /api/vp-academic/teachers/:id/performance
router.get('/teachers/:id/performance', vpAcademicController.getTeacherPerformance);

// ==================== STUDENT MANAGEMENT ====================

// Register New Student
// POST /api/vp-academic/students/register
router.post('/students/register', vpAcademicController.registerStudent);

// Bulk Import Students
// POST /api/vp-academic/students/bulk-import
router.post('/students/bulk-import', vpAcademicController.bulkImportStudents);

// Assign Student to Class
// PUT /api/vp-academic/students/:id/class
router.put('/students/:id/class', vpAcademicController.assignStudentToClass);

// View All Students
// GET /api/vp-academic/students
router.get('/students', vpAcademicController.getAllStudents);

// Edit Student Details
// PUT /api/vp-academic/students/:id
router.put('/students/:id', vpAcademicController.editStudent);

// Promote Students
// POST /api/vp-academic/students/promote
router.post('/students/promote', vpAcademicController.promoteStudents);

// Transfer Student
// PUT /api/vp-academic/students/:id/transfer
router.put('/students/:id/transfer', vpAcademicController.transferStudent);

// Archive Student
// PUT /api/vp-academic/students/:id/archive
router.put('/students/:id/archive', vpAcademicController.archiveStudent);

// View Student Academic History
// GET /api/vp-academic/students/:id/history
router.get('/students/:id/history', vpAcademicController.getStudentHistory);

// ==================== EXAMINATION & ASSESSMENT MANAGEMENT ====================

// Create Examination Schedule
// POST /api/vp-academic/exams
router.post('/exams', vpAcademicController.createExamSchedule);

// Assign Invigilators
// POST /api/vp-academic/exams/:exam_id/invigilators
router.post('/exams/:exam_id/invigilators', vpAcademicController.assignInvigilators);

// Approve Exam Papers
// PUT /api/vp-academic/exams/:id/approve
router.put('/exams/:id/approve', vpAcademicController.approveExamPaper);

// View Exam Results
// GET /api/vp-academic/exams/:id/results
router.get('/exams/:id/results', vpAcademicController.getExamResults);

// Analyze Exam Performance
// GET /api/vp-academic/exams/:id/analysis
router.get('/exams/:id/analysis', vpAcademicController.analyzeExamPerformance);

// Generate National Exam Results
// POST /api/vp-academic/exams/national-results
router.post('/exams/national-results', vpAcademicController.generateNationalExamResults);

// Compare Results to Previous Years
// GET /api/vp-academic/exams/comparison
router.get('/exams/comparison', vpAcademicController.compareExamResults);

// Export Exam Results
// GET /api/vp-academic/exams/export
router.get('/exams/export', vpAcademicController.exportExamResults);

// ==================== ACADEMIC MONITORING & REPORTING ====================

// View School-Wide Grades
// GET /api/vp-academic/academic/grades
router.get('/academic/grades', vpAcademicController.getSchoolWideGrades);

// View Grade Distribution Charts
// GET /api/vp-academic/academic/grade-distribution
router.get('/academic/grade-distribution', vpAcademicController.getGradeDistribution);

// View Attendance Summary
// GET /api/vp-academic/academic/attendance
router.get('/academic/attendance', vpAcademicController.getAttendanceSummary);

// Identify At-Risk Students
// GET /api/vp-academic/academic/at-risk
router.get('/academic/at-risk', vpAcademicController.getAtRiskStudents);

// Generate Academic Report
// POST /api/vp-academic/academic/reports
router.post('/academic/reports', vpAcademicController.generateAcademicReport);

// Generate Transcripts
// POST /api/vp-academic/academic/transcripts
router.post('/academic/transcripts', vpAcademicController.generateTranscript);

// ==================== LESSON PLAN OVERSIGHT ====================

// View All Lesson Plans
// GET /api/vp-academic/lesson-plans
router.get('/lesson-plans', vpAcademicController.getAllLessonPlans);

// Review Pending Lesson Plans
// GET /api/vp-academic/lesson-plans/pending
router.get('/lesson-plans/pending', vpAcademicController.getPendingLessonPlans);

// Approve/Reject Lesson Plans
// PUT /api/vp-academic/lesson-plans/:id/review
router.put('/lesson-plans/:id/review', vpAcademicController.reviewLessonPlan);

// View Lesson Plan Statistics
// GET /api/vp-academic/lesson-plans/statistics
router.get('/lesson-plans/statistics', vpAcademicController.getLessonPlanStatistics);

// Export Lesson Plan Report
// GET /api/vp-academic/lesson-plans/export
router.get('/lesson-plans/export', vpAcademicController.exportLessonPlanReport);

// ==================== PARENT-TEACHER COMMUNICATION ====================

// View Parent Feedback
// GET /api/vp-academic/parent-feedback
router.get('/parent-feedback', vpAcademicController.getParentFeedback);

// Schedule Parent-Teacher Conferences
// POST /api/vp-academic/conferences
router.post('/conferences', vpAcademicController.scheduleConference);

// Send Academic Alerts to Parents
// POST /api/vp-academic/parent-alerts
router.post('/parent-alerts', vpAcademicController.sendParentAlert);

// ==================== DEPARTMENT HEAD & TEACHER SUPERVISION ====================

// View All Department Heads
// GET /api/vp-academic/department-heads
router.get('/department-heads', vpAcademicController.getAllDepartmentHeads);

// Assign Department Heads
// POST /api/vp-academic/department-heads
router.post('/department-heads', vpAcademicController.assignDepartmentHead);

// View Department Performance
// GET /api/vp-academic/department-performance
router.get('/department-performance', vpAcademicController.getDepartmentPerformance);

// Conduct Teacher Evaluation
// POST /api/vp-academic/teacher-evaluations
router.post('/teacher-evaluations', vpAcademicController.createTeacherEvaluation);

// ==================== COMMUNICATION & ANNOUNCEMENTS ====================

// Post Academic Announcements
// POST /api/vp-academic/announcements
router.post('/announcements', vpAcademicController.createAnnouncement);

// Get Academic Announcements
// GET /api/vp-academic/announcements
router.get('/announcements', vpAcademicController.getAnnouncements);

// ==================== SETTINGS & PREFERENCES ====================

// Manage Academic Calendar
// POST /api/vp-academic/settings/academic-calendar
router.post('/settings/academic-calendar', vpAcademicController.manageAcademicCalendar);

// Manage Grading Rubrics
// POST /api/vp-academic/settings/grading-scale
router.post('/settings/grading-scale', vpAcademicController.manageGradingScale);

// Update Personal Profile
// PUT /api/vp-academic/settings/profile
router.put('/settings/profile', vpAcademicController.updateProfile);

// ==================== AUDIT LOG ====================

// View Academic Audit Log
// GET /api/vp-academic/audit-log
router.get('/audit-log', vpAcademicController.getAuditLog);

module.exports = router;
