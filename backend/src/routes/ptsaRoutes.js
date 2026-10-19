const express = require('express');
const router = express.Router();
const {
  getPtsaDashboard,
  getPtsaMeetings,
  getPtsaFeedback,
  getPtsaProfile,
  getAcademicGradeSummaries,
  getGradeDistributions,
  getAttendanceSummaries,
  getConductSummaries,
  getNationalExamResults,
  getPerformanceTrends,
  getBudgetSummary,
  getExpenditureBreakdown,
  getPTSAFunds,
  getProcurementReports,
  submitBudgetAdvisory,
  getSchoolImprovementPlan,
  getSIPProgress,
  getSICMeetingMinutes,
  getAnnualReports,
  submitSIPFeedback,
  getPtsaMeetingsFull,
  getMeetingMinutes,
  getMeetingAttendance,
  createMeeting,
  uploadMeetingMinutes,
  sendMeetingInvitations,
  getReports,
  getPTSAActivities,
  generateSchoolPerformanceReport,
  generatePTSAActivityReport,
  downloadReport,
  getFeedbackItems,
  submitFeedbackItem,
  getAnnouncements,
  postAnnouncement,
  getGrievances,
  escalateGrievance,
  getCalendarEvents,
  getSurveys,
  getSurveyResults,
  createSurvey,
  sendSurvey,
  getWoredaReports,
  getPublicMetrics,
  getPolicyProposals,
  submitPolicyProposal,
  getDiscussions,
  getDiscussionMessages,
  createDiscussion,
  sendDiscussionMessage
} = require('../controllers/ptsaController');

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

// GET /api/ptsa/dashboard - Get PTSA dashboard
router.get('/dashboard', getPtsaDashboard);

// GET /api/ptsa/profile - Get PTSA representative profile
router.get('/profile', getPtsaProfile);

// ============================================================
// MEETINGS & FEEDBACK
// ============================================================

// GET /api/ptsa/meetings - Get PTSA meetings (dashboard summary)
router.get('/meetings', getPtsaMeetings);

// GET /api/ptsa/meetings - Get all PTSA meetings (full details for meetings page)
router.get('/meetings/all', getPtsaMeetingsFull);

// GET /api/ptsa/meetings/minutes - Get meeting minutes
router.get('/meetings/minutes', getMeetingMinutes);

// GET /api/ptsa/meetings/attendance - Get meeting attendance
router.get('/meetings/attendance', getMeetingAttendance);

// POST /api/ptsa/meetings - Create new meeting
router.post('/meetings', createMeeting);

// POST /api/ptsa/meetings/minutes - Upload meeting minutes
router.post('/meetings/minutes', uploadMeetingMinutes);

// POST /api/ptsa/meetings/:id/invite - Send meeting invitations
router.post('/meetings/:id/invite', sendMeetingInvitations);

// GET /api/ptsa/feedback - Get PTSA feedback
router.get('/feedback', getPtsaFeedback);

// ============================================================
// ACADEMIC PERFORMANCE
// ============================================================

// GET /api/ptsa/academic/grade-summaries - Get grade summaries
router.get('/academic/grade-summaries', getAcademicGradeSummaries);

// GET /api/ptsa/academic/grade-distributions - Get grade distributions
router.get('/academic/grade-distributions', getGradeDistributions);

// GET /api/ptsa/academic/attendance-summaries - Get attendance summaries
router.get('/academic/attendance-summaries', getAttendanceSummaries);

// GET /api/ptsa/academic/conduct-summaries - Get conduct summaries
router.get('/academic/conduct-summaries', getConductSummaries);

// GET /api/ptsa/academic/national-exam-results - Get national exam results
router.get('/academic/national-exam-results', getNationalExamResults);

// GET /api/ptsa/academic/performance-trends - Get performance trends
router.get('/academic/performance-trends', getPerformanceTrends);

// ============================================================
// FINANCIAL OVERSIGHT
// ============================================================

// GET /api/ptsa/financial/budget-summary - Get budget summary
router.get('/financial/budget-summary', getBudgetSummary);

// GET /api/ptsa/financial/expenditure-breakdown - Get expenditure breakdown
router.get('/financial/expenditure-breakdown', getExpenditureBreakdown);

// GET /api/ptsa/financial/ptsa-funds - Get PTSA funds
router.get('/financial/ptsa-funds', getPTSAFunds);

// GET /api/ptsa/financial/procurement-reports - Get procurement reports
router.get('/financial/procurement-reports', getProcurementReports);

// POST /api/ptsa/financial/budget-advisory - Submit budget advisory
router.post('/financial/budget-advisory', submitBudgetAdvisory);

// ============================================================
// SCHOOL IMPROVEMENT COMMITTEE (SIC)
// ============================================================

// GET /api/ptsa/sic/improvement-plan - Get school improvement plan
router.get('/sic/improvement-plan', getSchoolImprovementPlan);

// GET /api/ptsa/sic/progress - Get SIP progress
router.get('/sic/progress', getSIPProgress);

// GET /api/ptsa/sic/meeting-minutes - Get SIC meeting minutes
router.get('/sic/meeting-minutes', getSICMeetingMinutes);

// GET /api/ptsa/sic/annual-reports - Get annual reports
router.get('/sic/annual-reports', getAnnualReports);

// POST /api/ptsa/sic/feedback - Submit SIP feedback
router.post('/sic/feedback', submitSIPFeedback);

// ============================================================
// REPORTS
// ============================================================

// GET /api/ptsa/reports - Get reports
router.get('/reports', getReports);

// GET /api/ptsa/reports/ptsa-activities - Get PTSA activities
router.get('/reports/ptsa-activities', getPTSAActivities);

// POST /api/ptsa/reports/school-performance - Generate school performance report
router.post('/reports/school-performance', generateSchoolPerformanceReport);

// POST /api/ptsa/reports/ptsa-activity - Generate PTSA activity report
router.post('/reports/ptsa-activity', generatePTSAActivityReport);

// GET /api/ptsa/reports/:id/download - Download report
router.get('/reports/:id/download', downloadReport);

// ============================================================
// FEEDBACK & ANNOUNCEMENTS
// ============================================================

// GET /api/ptsa/feedback-items - Get feedback items
router.get('/feedback-items', getFeedbackItems);

// POST /api/ptsa/feedback-items - Submit feedback
router.post('/feedback-items', submitFeedbackItem);

// GET /api/ptsa/ptsa-announcements - Get PTSA announcements
router.get('/ptsa-announcements', getAnnouncements);

// POST /api/ptsa/ptsa-announcements - Post announcement
router.post('/ptsa-announcements', postAnnouncement);

// ============================================================
// GRIEVANCES
// ============================================================

// GET /api/ptsa/grievances - Get grievances
router.get('/grievances', getGrievances);

// POST /api/ptsa/grievances/:id/escalate - Escalate grievance
router.post('/grievances/:id/escalate', escalateGrievance);

// ============================================================
// CALENDAR
// ============================================================

// GET /api/ptsa/calendar - Get calendar events
router.get('/calendar', getCalendarEvents);

// ============================================================
// SURVEYS
// ============================================================

// GET /api/ptsa/surveys - Get surveys
router.get('/surveys', getSurveys);

// GET /api/ptsa/surveys/results - Get survey results
router.get('/surveys/results', getSurveyResults);

// POST /api/ptsa/surveys - Create survey
router.post('/surveys', createSurvey);

// POST /api/ptsa/surveys/:id/send - Send survey
router.post('/surveys/:id/send', sendSurvey);

// ============================================================
// COMPLIANCE
// ============================================================

// GET /api/ptsa/compliance/woreda-reports - Get Woreda reports
router.get('/compliance/woreda-reports', getWoredaReports);

// GET /api/ptsa/compliance/public-metrics - Get public metrics
router.get('/compliance/public-metrics', getPublicMetrics);

// GET /api/ptsa/compliance/policy-proposals - Get policy proposals
router.get('/compliance/policy-proposals', getPolicyProposals);

// POST /api/ptsa/compliance/policy-proposals - Submit policy proposal
router.post('/compliance/policy-proposals', submitPolicyProposal);

module.exports = router;
