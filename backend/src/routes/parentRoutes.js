const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize(['PARENT']));

// ============================================
// 1. DASHBOARD & OVERVIEW
// ============================================
router.get('/dashboard', parentController.getParentDashboard);
router.get('/children/:childId/dashboard', parentController.getChildDashboard);
router.get('/children/:childId/quick-stats', parentController.getQuickStats);
router.get('/children/:childId/activity-feed', parentController.getActivityFeed);

// ============================================
// 2. VIEW CHILD'S ACADEMIC PERFORMANCE (READ-ONLY)
// ============================================
router.get('/children/:childId/grades', parentController.getCurrentGrades);
router.get('/children/:childId/grade-distribution', parentController.getGradeDistribution);
router.get('/children/:childId/subjects/:subjectId/performance', parentController.getSubjectPerformance);
router.get('/children/:childId/term-reports', parentController.getTermReports);
router.get('/children/:childId/grade-history', parentController.getGradeHistory);
router.get('/children/:childId/class-comparison', parentController.getClassComparison);
router.get('/children/:childId/subject-ranks', parentController.getSubjectRanks);
router.get('/children/:childId/progress-chart', parentController.getProgressChart);

// ============================================
// 3. VIEW CHILD'S ATTENDANCE (READ-ONLY)
// ============================================
router.get('/children/:childId/attendance/summary', parentController.getAttendanceSummary);
router.get('/children/:childId/attendance/daily', parentController.getDailyAttendance);
router.get('/children/:childId/attendance/monthly', parentController.getMonthlyAttendance);
router.get('/children/:childId/attendance/trends', parentController.getAttendanceTrends);
router.get('/children/:childId/attendance/absences', parentController.getAbsenceReasons);
router.get('/children/:childId/attendance/alerts', parentController.getAttendanceAlerts);
router.get('/children/:childId/attendance/export', parentController.exportAttendanceReport);

// ============================================
// 4. VIEW CHILD'S CONDUCT (READ-ONLY)
// ============================================
router.get('/children/:childId/conduct/summary', parentController.getConductSummary);
router.get('/children/:childId/conduct/history', parentController.getConductHistory);
router.get('/children/:childId/conduct/comments', parentController.getConductComments);
router.get('/children/:childId/conduct/incidents', parentController.getConductIncidents);
router.get('/children/:childId/conduct/trends', parentController.getConductTrends);

// ============================================
// 5. VIEW CHILD'S TRANSCRIPT (READ-ONLY)
// ============================================
router.get('/children/:childId/transcript', parentController.getOfficialTranscript);
router.get('/children/:childId/transcript/cumulative', parentController.getCumulativeTranscript);
router.get('/children/:childId/transcript/download', parentController.downloadTranscript);
router.post('/children/:childId/transcript/print', parentController.printTranscript);
router.get('/children/:childId/transcript/verify', parentController.verifyTranscript);

// ============================================
// 6. VIEW CHILD'S ASSIGNMENTS & SUBMISSIONS (READ-ONLY)
// ============================================
router.get('/children/:childId/assignments', parentController.getCurrentAssignments);
router.get('/children/:childId/assignments/deadlines', parentController.getAssignmentDeadlines);
router.get('/children/:childId/assignments/submitted', parentController.getSubmittedAssignments);
router.get('/children/:childId/assignments/scores', parentController.getAssignmentScores);
router.get('/children/:childId/assignments/missing', parentController.getMissingAssignments);
router.get('/children/:childId/assignments/:assignmentId/files', parentController.downloadAssignmentFiles);

// ============================================
// 7. VIEW CHILD'S EXAM RESULTS (READ-ONLY)
// ============================================
router.get('/children/:childId/exams/schedule', parentController.getExamSchedule);
router.get('/children/:childId/exams/results', parentController.getExamResults);
router.get('/children/:childId/exams/national', parentController.getNationalExamResults);
router.get('/children/:childId/exams/analysis', parentController.getExamPerformanceAnalysis);
router.get('/children/:childId/exams/report/download', parentController.downloadExamReport);

// ============================================
// 8. COMMUNICATION WITH TEACHERS (WRITE)
// ============================================
router.post('/messages/send', parentController.sendMessageToTeacher);
router.post('/messages/send-vp-academic', parentController.sendMessageToVPAcademic);
router.get('/messages', parentController.getMessageHistory);
router.get('/messages/:threadId', parentController.getMessageThread);
router.post('/messages/:messageId/reply', parentController.replyToMessage);
router.put('/messages/:messageId/read', parentController.markMessageAsRead);
router.put('/messages/read-all', parentController.markAllMessagesAsRead);

// ============================================
// 9. COMMUNICATION WITH SCHOOL ADMINISTRATION (WRITE)
// ============================================
router.post('/messages/principal', parentController.sendMessageToPrincipal);
router.post('/messages/vp-admin', parentController.sendMessageToVPAdmin);
router.post('/grievances', parentController.submitGrievance);
router.post('/feedback', parentController.submitFeedback);
router.get('/grievances', parentController.trackGrievanceStatus);
router.get('/grievances/:grievanceId', parentController.getGrievanceDetails);

// ============================================
// 10. VIEW ANNOUNCEMENTS & NOTICES (READ-ONLY)
// ============================================
router.get('/announcements', parentController.getSchoolAnnouncements);
router.get('/announcements/parent-specific', parentController.getParentSpecificAnnouncements);
router.get('/announcements/ptsa', parentController.getPTSAAnnouncements);
router.get('/announcements/urgent', parentController.getUrgentNotices);
router.get('/events/calendar', parentController.getEventCalendar);

// ============================================
// 11. CHILD'S PEER EVALUATION RESULTS (READ-ONLY)
// ============================================
router.get('/children/:childId/peer-evaluations', parentController.getPeerEvaluationSummary);
router.get('/children/:childId/peer-evaluations/:evaluationId/comments', parentController.getPeerEvaluationComments);
router.get('/children/:childId/peer-evaluations/:evaluationId/rating', parentController.getPeerRating);
router.get('/children/:childId/peer-evaluations/:evaluationId/comparison', parentController.getPeerComparison);

// ============================================
// 12. SCHOOL FEE & PAYMENT MANAGEMENT (MOCK / READ-ONLY)
// ============================================
router.get('/children/:childId/fees/structure', parentController.getFeeStructure);
router.get('/children/:childId/payments/history', parentController.getPaymentHistory);
router.get('/children/:childId/payments/balance', parentController.getOutstandingBalance);
router.get('/children/:childId/payments/:paymentId/receipt', parentController.generateFeeReceipt);
router.post('/messages/fee-inquiry', parentController.requestFeeClarification);

// ============================================
// 13. PARENT PROFILE & SETTINGS
// ============================================
router.get('/profile', parentController.getParentProfile);
router.put('/profile', parentController.updateParentProfile);
router.get('/notifications/preferences', parentController.getNotificationPreferences);
router.put('/notifications/preferences', parentController.updateNotificationPreferences);
router.post('/change-password', parentController.changePassword);
router.get('/children', parentController.getAssociatedChildren);
router.post('/children/request', parentController.requestChildAssociation);
router.get('/login-history', parentController.getLoginHistory);
router.post('/account/deactivate', parentController.requestAccountDeactivation);

// ============================================
// 14. PARENT-TEACHER CONFERENCE SCHEDULING
// ============================================
router.get('/conferences/schedule', parentController.getConferenceSchedule);
router.post('/conferences/book', parentController.bookConferenceSlot);
router.get('/conferences/history', parentController.getConferenceHistory);
router.delete('/conferences/:bookingId', parentController.cancelConferenceBooking);
router.put('/conferences/:bookingId/reschedule', parentController.rescheduleConferenceBooking);

// ============================================
// 15. PTSA ENGAGEMENT (ADVISORY/PARTICIPATORY)
// ============================================
router.get('/ptsa/dashboard', parentController.getPTSADashboard);
router.get('/ptsa/meetings/schedule', parentController.getPTSAMeetingSchedule);
router.get('/ptsa/meetings/:meetingId/minutes', parentController.getPTSAMeetingMinutes);
router.post('/ptsa/feedback', parentController.submitPTSAFeedback);
router.get('/ptsa/announcements', parentController.getPTSAAnnouncementsRoute);
router.get('/ptsa/elections', parentController.getPTSAElectionInformation);
router.post('/ptsa/elections/:electionId/vote', parentController.submitPTSAElectionVote);

// ============================================
// 16. MOBILE & ACCESSIBILITY
// ============================================
router.get('/mobile/settings', parentController.getMobileSettings);
router.put('/mobile/settings', parentController.updateMobileSettings);
router.get('/accessibility/settings', parentController.getAccessibilitySettings);
router.put('/accessibility/settings', parentController.updateAccessibilitySettings);

// ============================================
// 17. REPORTS & EXPORT
// ============================================
router.post('/children/:childId/reports/academic', parentController.generateAcademicReport);
router.post('/children/:childId/reports/attendance', parentController.generateAttendanceReport);
router.post('/children/:childId/reports/conduct', parentController.generateConductReport);
router.post('/children/:childId/reports/combined', parentController.generateCombinedReport);
router.get('/children/:childId/export/csv', parentController.exportDataToCSV);
router.get('/reports/:reportId/download', parentController.downloadGeneratedReport);

// ============================================
// 18. SUPPORT & HELP
// ============================================
router.get('/support/user-guide', parentController.getUserGuide);
router.post('/support/help-request', parentController.submitHelpRequest);
router.get('/support/troubleshooting', parentController.getTroubleshootingTips);
router.get('/support/contact', parentController.getSupportContact);

// ============================================
// NOTIFICATIONS
// ============================================
router.get('/notifications', parentController.getNotifications);

module.exports = router;
