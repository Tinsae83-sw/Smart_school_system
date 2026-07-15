const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');

/**
 * PRINCIPAL ROUTES
 * All routes are prefixed with /api/principal
 */

// ==================== DASHBOARD & OVERVIEW ====================

// Get Executive Dashboard
// GET /api/principal/dashboard
router.get('/dashboard', principalController.getExecutiveDashboard);

// Get Key Performance Indicators
// GET /api/principal/kpi
router.get('/kpi', principalController.getKPIs);

// Get Compliance Status
// GET /api/principal/compliance
router.get('/compliance', principalController.getComplianceStatus);

// Get Recent Alerts & Actions
// GET /api/principal/alerts
router.get('/alerts', principalController.getRecentAlerts);

// ==================== STAFF MANAGEMENT ====================

// Register Senior Staff (VP Academic, VP Admin, Department Head)
// POST /api/principal/staff/register
router.post('/staff/register', principalController.registerSeniorStaff);

// Get All Senior Staff
// GET /api/principal/staff/senior
router.get('/staff/senior', principalController.getSeniorStaff);

// Update Senior Staff Details
// PUT /api/principal/staff/senior/:id
router.put('/staff/senior/:id', principalController.updateSeniorStaff);

// Terminate/Transfer Senior Staff
// DELETE /api/principal/staff/senior/:id
router.delete('/staff/senior/:id', principalController.terminateSeniorStaff);

// View Staff Performance Summaries
// GET /api/principal/staff/performance
router.get('/staff/performance', principalController.getStaffPerformance);

// ==================== SCHOOL SETTINGS ====================

// Get School Profile
// GET /api/principal/settings/profile
router.get('/settings/profile', principalController.getSchoolProfile);

// Update School Profile
// PUT /api/principal/settings/profile
router.put('/settings/profile', principalController.updateSchoolProfile);

// Create Academic Year
// POST /api/principal/settings/academic-year
router.post('/settings/academic-year', principalController.createAcademicYear);

// Get Academic Years
// GET /api/principal/settings/academic-year
router.get('/settings/academic-year', principalController.getAcademicYears);

// Create Grading Scale
// POST /api/principal/settings/grading-scale
router.post('/settings/grading-scale', principalController.createGradingScale);

// Get Grading Scales
// GET /api/principal/settings/grading-scale
router.get('/settings/grading-scale', principalController.getGradingScales);

// Create School Fee
// POST /api/principal/settings/fees
router.post('/settings/fees', principalController.createSchoolFee);

// Get School Fees
// GET /api/principal/settings/fees
router.get('/settings/fees', principalController.getSchoolFees);

// Create Academic Policy
// POST /api/principal/settings/policies
router.post('/settings/policies', principalController.createAcademicPolicy);

// Get Academic Policies
// GET /api/principal/settings/policies
router.get('/settings/policies', principalController.getAcademicPolicies);

// ==================== FINANCIAL OVERSIGHT ====================

// Get Budget Summary
// GET /api/principal/financial/budget
router.get('/financial/budget', principalController.getBudgetSummary);

// Approve Expenditure
// PUT /api/principal/financial/expenditures/:id/approve
router.put('/financial/expenditures/:id/approve', principalController.approveExpenditure);

// Get Asset Inventory
// GET /api/principal/financial/assets
router.get('/financial/assets', principalController.getAssetInventory);

// Approve Facility Booking
// PUT /api/principal/financial/facilities/:id/approve
router.put('/financial/facilities/:id/approve', principalController.approveFacilityBooking);

// ==================== GOVERNANCE & COMPLIANCE ====================

// Get School Improvement Plans
// GET /api/principal/governance/sip
router.get('/governance/sip', principalController.getSIPs);

// Approve SIP
// PUT /api/principal/governance/sip/:id/approve
router.put('/governance/sip/:id/approve', principalController.approveSIP);

// Recognize PTSA Executive
// POST /api/principal/governance/ptsa/executive
router.post('/governance/ptsa/executive', principalController.recognizePTSAExecutive);

// Get PTSA Feedback
// GET /api/principal/governance/ptsa/feedback
router.get('/governance/ptsa/feedback', principalController.getPTSAFeedback);

// Respond to PTSA Feedback
// PUT /api/principal/governance/ptsa/feedback/:id/respond
router.put('/governance/ptsa/feedback/:id/respond', principalController.respondPTSAFeedback);

// ==================== GRIEVANCES & DISCIPLINE ====================

// Get All Grievances
// GET /api/principal/grievances
router.get('/grievances', principalController.getGrievances);

// Escalate Grievance to Woreda
// PUT /api/principal/grievances/:id/escalate
router.put('/grievances/:id/escalate', principalController.escalateGrievance);

// Approve Disciplinary Action
// PUT /api/principal/discipline/:id/approve
router.put('/discipline/:id/approve', principalController.approveDisciplinaryAction);

// ==================== STAFF WELFARE ====================

// Get Staff Leave Requests
// GET /api/principal/staff/leave
router.get('/staff/leave', principalController.getStaffLeaveRequests);

// Approve Senior Staff Leave
// PUT /api/principal/staff/leave/:id/approve
router.put('/staff/leave/:id/approve', principalController.approveStaffLeave);

// Get Staff Transfers
// GET /api/principal/staff/transfers
router.get('/staff/transfers', principalController.getStaffTransfers);

// Approve Staff Transfer
// PUT /api/principal/staff/transfers/:id/approve
router.put('/staff/transfers/:id/approve', principalController.approveStaffTransfer);

// ==================== COMMUNICATION ====================

// Create School Announcement
// POST /api/principal/communications/announcements
router.post('/communications/announcements', principalController.createAnnouncement);

// Get School Announcements
// GET /api/principal/communications/announcements
router.get('/communications/announcements', principalController.getAnnouncements);

// Send Urgent Alert
// POST /api/principal/communications/alerts
router.post('/communications/alerts', principalController.sendUrgentAlert);

// Get Communication Log
// GET /api/principal/communications/log
router.get('/communications/log', principalController.getCommunicationLog);

// ==================== REPORTING ====================

// Generate Annual School Report
// POST /api/principal/reports/annual
router.post('/reports/annual', principalController.generateAnnualReport);

// Get Annual Reports
// GET /api/principal/reports/annual
router.get('/reports/annual', principalController.getAnnualReports);

// Submit Report to Woreda
// PUT /api/principal/reports/annual/:id/submit
router.put('/reports/annual/:id/submit', principalController.submitReportToWoreda);

// Get Compliance Reports
// GET /api/principal/reports/compliance
router.get('/reports/compliance', principalController.getComplianceReports);

// Get National Exam Reports
// GET /api/principal/reports/national-exams
router.get('/reports/national-exams', principalController.getNationalExamReports);

// ==================== AUDIT LOG ====================

// Get Full Audit Log
// GET /api/principal/audit-log
router.get('/audit-log', principalController.getAuditLog);

// ==================== EXTERNAL RELATIONS ====================

// Create School Event
// POST /api/principal/events
router.post('/events', principalController.createSchoolEvent);

// Get School Events
// GET /api/principal/events
router.get('/events', principalController.getSchoolEvents);

// Create School Partnership
// POST /api/principal/partnerships
router.post('/partnerships', principalController.createSchoolPartnership);

// Get School Partnerships
// GET /api/principal/partnerships
router.get('/partnerships', principalController.getSchoolPartnerships);

module.exports = router;
