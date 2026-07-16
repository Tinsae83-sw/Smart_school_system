const express = require('express');
const router = express.Router();
const departmentHeadController = require('../controllers/departmentHeadController');

// ==================== DASHBOARD & OVERVIEW ====================

router.get('/dashboard', departmentHeadController.getDashboardMetrics);
router.get('/activity', departmentHeadController.getActivityFeed);

// ==================== TEACHER MANAGEMENT ====================

router.get('/teachers', departmentHeadController.getDepartmentTeachers);
router.post('/teachers/ta', departmentHeadController.addTeachingAssistant);
router.post('/teachers/assign', departmentHeadController.assignTeacherToCourse);
router.get('/teachers/:id/performance', departmentHeadController.getTeacherPerformance);

// ==================== LESSON PLAN MANAGEMENT ====================

router.get('/lesson-plans', departmentHeadController.getLessonPlans);
router.put('/lesson-plans/:id', departmentHeadController.reviewLessonPlan);

// ==================== ACADEMIC MONITORING ====================

router.get('/academics/grades', departmentHeadController.getDepartmentGrades);
router.get('/academics/grade-distribution', departmentHeadController.getGradeDistribution);

// ==================== RESOURCE MANAGEMENT ====================

router.get('/resources', departmentHeadController.getResources);
router.post('/resources', departmentHeadController.addResource);
router.post('/resources/allocate', departmentHeadController.allocateResource);
router.post('/resources/request', departmentHeadController.requestResource);

// ==================== EXAM MANAGEMENT ====================

router.get('/exams', departmentHeadController.getExams);
router.post('/exams', departmentHeadController.createExam);
router.put('/exams/:id/approve', departmentHeadController.approveExam);
router.post('/exams/:id/invigilators', departmentHeadController.assignInvigilator);
router.get('/exams/:id/results', departmentHeadController.getExamResults);

// ==================== PEER EVALUATION ====================

router.get('/evaluations/forms', departmentHeadController.getEvaluationForms);
router.post('/evaluations/forms', departmentHeadController.createEvaluationForm);
router.get('/evaluations', departmentHeadController.getPeerEvaluations);
router.post('/evaluations/assign', departmentHeadController.assignPeerEvaluation);

// ==================== COMMUNICATION ====================

router.get('/meetings', departmentHeadController.getMeetings);
router.post('/meetings', departmentHeadController.createMeeting);
router.post('/announcements', departmentHeadController.sendAnnouncement);

// ==================== STUDENT SUPPORT ====================

router.get('/students/at-risk', departmentHeadController.getAtRiskStudents);
router.post('/interventions', departmentHeadController.createIntervention);
router.get('/interventions', departmentHeadController.getInterventions);

// ==================== REPORTS ====================

router.get('/reports/generate', departmentHeadController.generateDepartmentReport);

// ==================== SETTINGS ====================

router.get('/settings', departmentHeadController.getDepartmentSettings);
router.put('/settings', departmentHeadController.updateDepartmentSettings);

// ==================== CURRICULUM MANAGEMENT ====================

router.get('/curriculum', departmentHeadController.getCurriculumMaps);
router.post('/curriculum', departmentHeadController.createCurriculumMap);

// ==================== AUDIT LOG ====================

router.get('/audit-log', departmentHeadController.getAuditLog);

module.exports = router;
