const crypto = require('crypto');
const prisma = require('../config/prisma');

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { academic_year: 'desc' },
    });
    res.json(budgets);
  } catch (error) {
    console.error('Get finance budgets error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

exports.getExpenditures = async (req, res) => {
  try {
    const expenditures = await prisma.expenditure.findMany({
      orderBy: { expenditure_date: 'desc' },
    });
    res.json(expenditures);
  } catch (error) {
    console.error('Get finance expenditures error:', error);
    res.status(500).json({ error: 'Failed to fetch expenditures' });
  }
};

exports.createExpenditure = async (req, res) => {
  try {
    const { budget_id, category, description, amount, expenditure_date } = req.body;
    const parsedBudgetId = Number(budget_id);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedBudgetId) || parsedBudgetId <= 0 ||
      typeof category !== 'string' || !category.trim() ||
      typeof description !== 'string' || !description.trim() ||
      !Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
      !isValidDate(expenditure_date)) {
      return res.status(400).json({ error: 'Valid budget, category, description, amount, and date are required' });
    }

    const budget = await prisma.budget.findUnique({
      where: { budget_id: parsedBudgetId },
      select: { budget_id: true, status: true },
    });
    if (!budget || budget.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'An active budget is required for this expenditure' });
    }

    const expenditure = await prisma.expenditure.create({
      data: {
        budget_id: parsedBudgetId,
        category: category.trim(),
        description: description.trim(),
        amount: parsedAmount,
        expenditure_date: new Date(expenditure_date),
      },
    });
    res.status(201).json(expenditure);
  } catch (error) {
    console.error('Create finance expenditure error:', error);
    res.status(500).json({ error: 'Failed to create expenditure' });
  }
};

exports.getIncome = async (req, res) => {
  try {
    const income = await prisma.incomeTransaction.findMany({
      orderBy: { income_date: 'desc' },
    });
    res.json(income);
  } catch (error) {
    console.error('Get finance income error:', error);
    res.status(500).json({ error: 'Failed to fetch income' });
  }
};

exports.createIncome = async (req, res) => {
  try {
    const { income_source, amount, description, income_date } = req.body;
    const parsedAmount = Number(amount);
    if (typeof income_source !== 'string' || !income_source.trim() ||
      !Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
      typeof description !== 'string' || !description.trim() ||
      !isValidDate(income_date)) {
      return res.status(400).json({ error: 'Valid source, description, amount, and date are required' });
    }

    const income = await prisma.incomeTransaction.create({
      data: {
        income_source: income_source.trim(),
        amount: parsedAmount,
        description: description.trim(),
        income_date: new Date(income_date),
        received_by: req.user.user_id,
      },
    });
    res.status(201).json(income);
  } catch (error) {
    console.error('Create finance income error:', error);
    res.status(500).json({ error: 'Failed to create income record' });
  }
};

exports.getPurchaseRequests = async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        supplier: { select: { supplier_name: true } },
        requester: { select: { full_name: true } },
      },
    });
    res.json(requests);
  } catch (error) {
    console.error('Get finance purchase requests error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
};

exports.createPurchaseRequest = async (req, res) => {
  try {
    const { item_name, quantity, unit_cost, category, priority, justification } = req.body;
    const parsedQuantity = Number(quantity);
    const parsedUnitCost = Number(unit_cost);
    if (typeof item_name !== 'string' || !item_name.trim() ||
      !Number.isInteger(parsedQuantity) || parsedQuantity <= 0 ||
      !Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0 ||
      typeof category !== 'string' || !category.trim() ||
      typeof justification !== 'string' || !justification.trim()) {
      return res.status(400).json({ error: 'Valid item, quantity, unit cost, category, and justification are required' });
    }

    const request = await prisma.purchaseRequest.create({
      data: {
        request_number: `PR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        item_name: item_name.trim(),
        quantity: parsedQuantity,
        unit_cost: parsedUnitCost,
        total_cost: parsedQuantity * parsedUnitCost,
        category: category.trim(),
        priority: priority || 'MEDIUM',
        requested_by: req.user.user_id,
        justification: justification.trim(),
      },
    });
    res.status(201).json(request);
  } catch (error) {
    console.error('Create finance purchase request error:', error);
    res.status(500).json({ error: 'Failed to create purchase request' });
  }
};

async function updatePurchaseRequestStatus(req, res, status) {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'Invalid purchase request ID' });
    }

    const result = await prisma.purchaseRequest.updateMany({
      where: { request_id: requestId, status: 'PENDING' },
      data: status === 'APPROVED'
        ? { status, approved_by: req.user.user_id, approved_at: new Date() }
        : { status },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Pending purchase request not found' });
    }

    const request = await prisma.purchaseRequest.findUnique({ where: { request_id: requestId } });
    res.json(request);
  } catch (error) {
    console.error(`Update finance purchase request status error:`, error);
    res.status(500).json({ error: 'Failed to update purchase request' });
  }
}

exports.approvePurchaseRequest = (req, res) => updatePurchaseRequestStatus(req, res, 'APPROVED');
exports.rejectPurchaseRequest = (req, res) => updatePurchaseRequestStatus(req, res, 'REJECTED');
