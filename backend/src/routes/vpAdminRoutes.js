const express = require('express');
const router = express.Router();
const vpAdminController = require('../controllers/vpAdminController');
const { authenticateVPAdmin } = require('../middleware/vpAdminAuth');

// Apply VP Admin authentication middleware to all routes (disabled for development)
// router.use(authenticateVPAdmin);

// Dashboard
router.get('/dashboard', vpAdminController.getDashboard);

// Assets
router.get('/assets', vpAdminController.getAssets);
router.post('/assets', vpAdminController.createAsset);
router.put('/assets/:id', vpAdminController.updateAsset);
router.delete('/assets/:id', vpAdminController.deleteAsset);

// Facilities
router.get('/facilities', vpAdminController.getFacilities);
router.post('/facilities', vpAdminController.createFacility);
router.put('/facilities/:id', vpAdminController.updateFacility);
router.delete('/facilities/:id', vpAdminController.deleteFacility);

// Facility Bookings
router.get('/facility-bookings', vpAdminController.getFacilityBookings);
router.post('/facility-bookings/:id/approve', vpAdminController.approveBooking);
router.post('/facility-bookings/:id/reject', vpAdminController.rejectBooking);

// Facility Maintenance
router.get('/facility-maintenance', vpAdminController.getFacilityMaintenance);

// Budget
router.get('/budgets', vpAdminController.getBudgets);

// Expenditures
router.get('/expenditures', vpAdminController.getExpenditures);
router.post('/expenditures', vpAdminController.createExpenditure);

// Income
router.get('/income', vpAdminController.getIncome);
router.post('/income', vpAdminController.createIncome);

// Purchase Requests
router.get('/purchase-requests', vpAdminController.getPurchaseRequests);
router.post('/purchase-requests', vpAdminController.createPurchaseRequest);
router.post('/purchase-requests/:id/approve', vpAdminController.approvePurchaseRequest);
router.post('/purchase-requests/:id/reject', vpAdminController.rejectPurchaseRequest);

// Non-Academic Staff
router.get('/non-academic-staff', vpAdminController.getNonAcademicStaff);
router.post('/non-academic-staff', vpAdminController.createNonAcademicStaff);
router.put('/non-academic-staff/:id', vpAdminController.updateNonAcademicStaff);
router.post('/non-academic-staff/:id/toggle-status', vpAdminController.toggleStaffStatus);

// Staff Attendance
router.get('/staff-attendance', vpAdminController.getStaffAttendance);

// Staff Leave Requests
router.get('/staff-leave-requests', vpAdminController.getStaffLeaveRequests);
router.post('/staff-leave-requests/:id/approve', vpAdminController.approveLeaveRequest);
router.post('/staff-leave-requests/:id/reject', vpAdminController.rejectLeaveRequest);

// Incidents
router.get('/incidents', vpAdminController.getIncidents);
router.post('/incidents', vpAdminController.createIncident);
router.put('/incidents/:id', vpAdminController.updateIncident);
router.delete('/incidents/:id', vpAdminController.deleteIncident);
router.post('/incidents/:id/resolve', vpAdminController.resolveIncident);
router.post('/incidents/:id/close', vpAdminController.closeIncident);

// Disciplinary Actions
router.get('/disciplinary-actions', vpAdminController.getDisciplinaryActions);
router.post('/disciplinary-actions', vpAdminController.createDisciplinaryAction);
router.put('/disciplinary-actions/:id', vpAdminController.updateDisciplinaryAction);
router.delete('/disciplinary-actions/:id', vpAdminController.deleteDisciplinaryAction);
router.post('/disciplinary-actions/:id/approve', vpAdminController.approveDisciplinaryAction);
router.post('/disciplinary-actions/:id/complete', vpAdminController.completeDisciplinaryAction);

// Inventory
router.get('/inventory', vpAdminController.getInventory);
router.post('/inventory', vpAdminController.createInventory);
router.put('/inventory/:id', vpAdminController.updateInventory);

// Inventory Transactions
router.get('/inventory-transactions', vpAdminController.getInventoryTransactions);
router.post('/inventory-transactions', vpAdminController.createInventoryTransaction);
router.put('/inventory-transactions/:id', vpAdminController.updateInventoryTransaction);
router.delete('/inventory-transactions/:id', vpAdminController.deleteInventoryTransaction);

// Suppliers
router.get('/suppliers', vpAdminController.getSuppliers);
router.post('/suppliers', vpAdminController.createSupplier);
router.put('/suppliers/:id', vpAdminController.updateSupplier);
router.delete('/suppliers/:id', vpAdminController.deleteSupplier);

// Announcements
router.get('/announcements', vpAdminController.getAnnouncements);
router.post('/announcements', vpAdminController.createAnnouncement);
router.post('/announcements/:id/toggle', vpAdminController.toggleAnnouncement);
router.delete('/announcements/:id', vpAdminController.deleteAnnouncement);

// Messages
router.get('/messages', vpAdminController.getMessages);

// Audit Logs
router.get('/audit-logs', vpAdminController.getAuditLogs);

// Settings - Categories
router.get('/settings/categories', vpAdminController.getCategories);
router.post('/settings/categories', vpAdminController.createCategory);
router.post('/settings/categories/:id/toggle', vpAdminController.toggleCategory);
router.delete('/settings/categories/:id', vpAdminController.deleteCategory);

// Settings - Suppliers
router.get('/settings/suppliers', vpAdminController.getSettingsSuppliers);
router.post('/settings/suppliers', vpAdminController.createSettingsSupplier);
router.post('/settings/suppliers/:id/toggle', vpAdminController.toggleSupplier);

// Settings - Preferences
router.get('/settings/preferences', vpAdminController.getPreferences);
router.put('/settings/preferences', vpAdminController.updatePreference);

module.exports = router;
