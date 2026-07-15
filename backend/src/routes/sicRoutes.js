const express = require('express');
const router = express.Router();
const sicController = require('../controllers/sicController');

/**
 * SIC (School Improvement Committee) MEMBER ROUTES
 * All routes are prefixed with /api/sic
 */

// ==================== DASHBOARD & OVERVIEW ====================

// Get SIC Dashboard
// GET /api/sic/dashboard
router.get('/dashboard', sicController.getSICDashboard);

// ==================== SIP MANAGEMENT ====================

// Get Current School Improvement Plan
// GET /api/sic/sip/current
router.get('/sip/current', sicController.getCurrentSIP);

// Get SIP Progress Dashboard
// GET /api/sic/sip/progress
router.get('/sip/progress', sicController.getSIPProgress);

// Submit SIP Feedback
// POST /api/sic/sip/feedback
router.post('/sip/feedback', sicController.submitSIPFeedback);

// Propose SIP Amendment
// POST /api/sic/sip/amendments
router.post('/sip/amendments', sicController.proposeSIPAmendment);

// ==================== MONITORING & EVALUATION ====================

// Get KPIs and Trends
// GET /api/sic/monitoring/kpis
router.get('/monitoring/kpis', sicController.getKPIs);

// Get Academic Performance Data
// GET /api/sic/monitoring/academic-performance
router.get('/monitoring/academic-performance', sicController.getAcademicPerformance);

// Get Financial Progress
// GET /api/sic/monitoring/financial-progress
router.get('/monitoring/financial-progress', sicController.getFinancialProgress);

// ==================== MEETING MANAGEMENT ====================

// Get SIC Meeting Schedule
// GET /api/sic/meetings
router.get('/meetings', sicController.getSICMeetings);

// Get Meeting Agenda
// GET /api/sic/meetings/:meetingId/agenda
router.get('/meetings/:meetingId/agenda', sicController.getMeetingAgenda);

// Get Meeting Minutes
// GET /api/sic/meetings/:meetingId/minutes
router.get('/meetings/:meetingId/minutes', sicController.getMeetingMinutes);

// Submit Agenda Item
// POST /api/sic/meetings/agenda-items
router.post('/meetings/agenda-items', sicController.submitAgendaItem);

// Vote on Resolution
// POST /api/sic/meetings/resolutions/:resolutionId/vote
router.post('/meetings/resolutions/:resolutionId/vote', sicController.voteOnResolution);

// ==================== NEEDS ASSESSMENT & SURVEYS ====================

// Get Needs Assessments
// GET /api/sic/needs-assessments
router.get('/needs-assessments', sicController.getNeedsAssessments);

// Create Needs Assessment
// POST /api/sic/needs-assessments
router.post('/needs-assessments', sicController.createNeedsAssessment);

// Get School Self-Assessment
// GET /api/sic/self-assessment
router.get('/self-assessment', sicController.getSelfAssessment);

// ==================== PARTNERSHIPS & RESOURCES ====================

// Get Partnerships
// GET /api/sic/partnerships
router.get('/partnerships', sicController.getPartnerships);

// Get Partnership Tracking
// GET /api/sic/partnerships/:partnershipId/tracking
router.get('/partnerships/:partnershipId/tracking', sicController.getPartnershipTracking);

// Suggest New Partner
// POST /api/sic/partnerships/suggest
router.post('/partnerships/suggest', sicController.suggestPartner);

// ==================== ACCOUNTABILITY & TRANSPARENCY ====================

// Get Action Log
// GET /api/sic/action-log
router.get('/action-log', sicController.getActionLog);

// Get Inspection Reports
// GET /api/sic/inspection-reports
router.get('/inspection-reports', sicController.getInspectionReports);

// Submit Annual SIC Report
// POST /api/sic/annual-report
router.post('/annual-report', sicController.submitAnnualReport);

// ==================== COMMUNICATION ====================

// Get Recommendations
// GET /api/sic/recommendations
router.get('/recommendations', sicController.getRecommendations);

// Submit Recommendation
// POST /api/sic/recommendations
router.post('/recommendations', sicController.submitRecommendation);

// Get School Announcements
// GET /api/sic/announcements
router.get('/announcements', sicController.getAnnouncements);

// Post SIC Announcement
// POST /api/sic/announcements
router.post('/announcements', sicController.postAnnouncement);

// ==================== TRAINING & CAPACITY BUILDING ====================

// Get Training Calendar
// GET /api/sic/training
router.get('/training', sicController.getTraining);

// Mark Training as Completed
// POST /api/sic/training/:trainingId/complete
router.post('/training/:trainingId/complete', sicController.completeTraining);

// ==================== SETTINGS & PROFILE ====================

// Get SIC Member Profile
// GET /api/sic/profile
router.get('/profile', sicController.getProfile);

// Update SIC Member Profile
// PUT /api/sic/profile
router.put('/profile', sicController.updateProfile);

module.exports = router;
