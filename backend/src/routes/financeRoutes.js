const express = require('express');
const financeController = require('../controllers/financeController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate, authorizeRoles('FINANCIAL_OFFICER', 'VP_ADMINISTRATION', 'ADMIN', 'SUPER_ADMIN'));

router.get('/budgets', financeController.getBudgets);
router.get('/expenditures', financeController.getExpenditures);
router.post('/expenditures', financeController.createExpenditure);
router.get('/income', financeController.getIncome);
router.post('/income', financeController.createIncome);
router.get('/purchase-requests', financeController.getPurchaseRequests);
router.post('/purchase-requests', financeController.createPurchaseRequest);
router.post('/purchase-requests/:id/approve', financeController.approvePurchaseRequest);
router.post('/purchase-requests/:id/reject', financeController.rejectPurchaseRequest);

module.exports = router;
