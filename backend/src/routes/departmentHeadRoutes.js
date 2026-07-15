const express = require('express');
const router = express.Router();
const departmentHeadController = require('../controllers/departmentHeadController');
const { authenticateDepartmentHead } = require('../middleware/authMiddleware');

// ==================== DASHBOARD & OVERVIEW ====================

router.get('/dashboard', authenticateDepartmentHead, departmentHeadController.getDashboardMetrics);
router.get('/activity', authenticateDepartmentHead, departmentHeadController.getActivityFeed);

// ==================== TEACHER MANAGEMENT ====================

router.get('/teachers', authenticateDepartmentHead, departmentHeadController.getDepartmentTeachers);
router.post('/teachers/ta', authenticateDepartmentHead, departmentHeadController.addTeachingAssistant);
router.post('/teachers/assign', authenticateDepartmentHead, departmentHeadController.assignTeacherToCourse);
router.get('/teachers/:id/performance', authenticateDepartmentHead, departmentHeadController.getTeacherPerformance);

// ==================== LESSON PLAN MANAGEMENT ====================

router.get('/lesson-plans', authenticateDepartmentHead, departmentHeadController.getLessonPlans);
router.put('/lesson-plans/:id', authenticateDepartmentHead, departmentHeadController.reviewLessonPlan);

// ==================== ACADEMIC MONITORING ====================

router.get('/academics/grades', authenticateDepartmentHead, departmentHeadController.getDepartmentGrades);
router.get('/academics/grade-distribution', authenticateDepartmentHead, departmentHeadController.getGradeDistribution);

// ==================== RESOURCE MANAGEMENT ====================

router.get('/resources', authenticateDepartmentHead, departmentHeadController.getResources);
router.post('/resources', authenticateDepartmentHead, departmentHeadController.addResource);
router.post('/resources/allocate', authenticateDepartmentHead, departmentHeadController.allocateResource);
router.post('/resources/request', authenticateDepartmentHead, departmentHeadController.requestResource);

// ==================== EXAM MANAGEMENT ====================

router.get('/exams', authenticateDepartmentHead, departmentHeadController.getExams);
router.post('/exams', authenticateDepartmentHead, departmentHeadController.createExam);
router.put('/exams/:id/approve', authenticateDepartmentHead, departmentHeadController.approveExam);
router.post('/exams/:id/invigilators', authenticateDepartmentHead, departmentHeadController.assignInvigilator);
router.get('/exams/:id/results', authenticateDepartmentHead, departmentHeadController.getExamResults);

// ==================== PEER EVALUATION ====================

router.get('/evaluations/forms', authenticateDepartmentHead, departmentHeadController.getEvaluationForms);
router.post('/evaluations/forms', authenticateDepartmentHead, departmentHeadController.createEvaluationForm);
router.get('/evaluations', authenticateDepartmentHead, departmentHeadController.getPeerEvaluations);
router.post('/evaluations/assign', authenticateDepartmentHead, departmentHeadController.assignPeerEvaluation);

// ==================== COMMUNICATION ====================

router.get('/meetings', authenticateDepartmentHead, departmentHeadController.getMeetings);
router.post('/meetings', authenticateDepartmentHead, departmentHeadController.createMeeting);
router.post('/announcements', authenticateDepartmentHead, departmentHeadController.sendAnnouncement);

// ==================== STUDENT SUPPORT ====================

router.get('/students/at-risk', authenticateDepartmentHead, departmentHeadController.getAtRiskStudents);
router.post('/interventions', authenticateDepartmentHead, departmentHeadController.createIntervention);
router.get('/interventions', authenticateDepartmentHead, departmentHeadController.getInterventions);

// ==================== REPORTS ====================

router.get('/reports/generate', authenticateDepartmentHead, departmentHeadController.generateDepartmentReport);

// ==================== SETTINGS ====================

router.get('/settings', authenticateDepartmentHead, departmentHeadController.getDepartmentSettings);
router.put('/settings', authenticateDepartmentHead, departmentHeadController.updateDepartmentSettings);

// ==================== CURRICULUM MANAGEMENT ====================

router.get('/curriculum', authenticateDepartmentHead, departmentHeadController.getCurriculumMaps);
router.post('/curriculum', authenticateDepartmentHead, departmentHeadController.createCurriculumMap);

// ==================== AUDIT LOG ====================

router.get('/audit-log', authenticateDepartmentHead, departmentHeadController.getAuditLog);

module.exports = router;
