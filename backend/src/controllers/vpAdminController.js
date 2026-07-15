const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [totalAssets, totalFacilities, totalStaff, disciplineCases, inventoryItems, pendingRequests] = await Promise.all([
      prisma.assetInventory.count(),
      prisma.facility.count(),
      prisma.nonAcademicStaff.count(),
      prisma.incident.count({ where: { status: { not: 'CLOSED' } } }),
      prisma.inventory.count(),
      prisma.purchaseRequest.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      total_assets: totalAssets,
      total_facilities: totalFacilities,
      total_staff: totalStaff,
      discipline_cases: disciplineCases,
      inventory_items: inventoryItems,
      pending_requests: pendingRequests,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Assets
exports.getAssets = async (req, res) => {
  try {
    const assets = await prisma.assetInventory.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

exports.createAsset = async (req, res) => {
  try {
    const asset = await prisma.assetInventory.create({
      data: req.body,
    });
    res.status(201).json(asset);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.assetInventory.update({
      where: { asset_id: parseInt(id) },
      data: req.body,
    });
    res.json(asset);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assetInventory.delete({
      where: { asset_id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Facilities
exports.getFacilities = async (req, res) => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { facility_name: 'asc' },
    });
    res.json(facilities);
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
};

exports.createFacility = async (req, res) => {
  try {
    const facility = await prisma.facility.create({
      data: req.body,
    });
    res.status(201).json(facility);
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
};

exports.updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = await prisma.facility.update({
      where: { facility_id: parseInt(id) },
      data: req.body,
    });
    res.json(facility);
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
};

exports.deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.facility.delete({
      where: { facility_id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
};

// Facility Bookings
exports.getFacilityBookings = async (req, res) => {
  try {
    const bookings = await prisma.facilityBooking.findMany({
      include: {
        facility: {
          select: { facility_name: true },
        },
      },
      orderBy: { booking_date: 'desc' },
    });

    const formatted = bookings.map(b => ({
      ...b,
      facility_name: b.facility?.facility_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.facilityBooking.update({
      where: { booking_id: parseInt(id) },
      data: { status: 'APPROVED', approved_by: req.user.id },
    });
    res.json(booking);
  } catch (error) {
    console.error('Approve booking error:', error);
    res.status(500).json({ error: 'Failed to approve booking' });
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.facilityBooking.update({
      where: { booking_id: parseInt(id) },
      data: { status: 'REJECTED' },
    });
    res.json(booking);
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({ error: 'Failed to reject booking' });
  }
};

// Facility Maintenance
exports.getFacilityMaintenance = async (req, res) => {
  try {
    const maintenance = await prisma.facilityMaintenance.findMany({
      include: {
        facility: {
          select: { facility_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = maintenance.map(m => ({
      ...m,
      facility_name: m.facility?.facility_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
};

// Budget
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { academic_year: 'desc' },
    });
    res.json(budgets);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

// Expenditures
exports.getExpenditures = async (req, res) => {
  try {
    const expenditures = await prisma.expenditure.findMany({
      orderBy: { expenditure_date: 'desc' },
    });
    res.json(expenditures);
  } catch (error) {
    console.error('Get expenditures error:', error);
    res.status(500).json({ error: 'Failed to fetch expenditures' });
  }
};

exports.createExpenditure = async (req, res) => {
  try {
    const expenditure = await prisma.expenditure.create({
      data: req.body,
    });
    res.status(201).json(expenditure);
  } catch (error) {
    console.error('Create expenditure error:', error);
    res.status(500).json({ error: 'Failed to create expenditure' });
  }
};

// Income
exports.getIncome = async (req, res) => {
  try {
    const income = await prisma.incomeTransaction.findMany({
      orderBy: { income_date: 'desc' },
    });
    res.json(income);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to fetch income' });
  }
};

exports.createIncome = async (req, res) => {
  try {
    const income = await prisma.incomeTransaction.create({
      data: req.body,
    });
    res.status(201).json(income);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income' });
  }
};

// Purchase Requests
exports.getPurchaseRequests = async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      include: {
        supplier: {
          select: { supplier_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = requests.map(r => ({
      ...r,
      requested_by: r.requested_by ? `User ${r.requested_by}` : 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get purchase requests error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
};

exports.createPurchaseRequest = async (req, res) => {
  try {
    const request = await prisma.purchaseRequest.create({
      data: {
        ...req.body,
        request_number: `PR-${Date.now()}`,
        requested_by: req.user.id,
      },
    });
    res.status(201).json(request);
  } catch (error) {
    console.error('Create purchase request error:', error);
    res.status(500).json({ error: 'Failed to create purchase request' });
  }
};

exports.approvePurchaseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.purchaseRequest.update({
      where: { request_id: parseInt(id) },
      data: { status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() },
    });
    res.json(request);
  } catch (error) {
    console.error('Approve purchase request error:', error);
    res.status(500).json({ error: 'Failed to approve purchase request' });
  }
};

exports.rejectPurchaseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.purchaseRequest.update({
      where: { request_id: parseInt(id) },
      data: { status: 'REJECTED' },
    });
    res.json(request);
  } catch (error) {
    console.error('Reject purchase request error:', error);
    res.status(500).json({ error: 'Failed to reject purchase request' });
  }
};

// Non-Academic Staff
exports.getNonAcademicStaff = async (req, res) => {
  try {
    const staff = await prisma.nonAcademicStaff.findMany({
      include: {
        user: {
          select: { full_name: true, email: true, phone_number: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = staff.map(s => ({
      staff_id: s.staff_id,
      user_id: s.user_id,
      employee_id: s.employee_id,
      full_name: s.user.full_name,
      email: s.user.email,
      phone_number: s.user.phone_number,
      role: s.role,
      department: s.department,
      hire_date: s.hire_date,
      salary: s.salary,
      is_active: s.is_active,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

exports.createNonAcademicStaff = async (req, res) => {
  try {
    const { full_name, email, password, ...staffData } = req.body;

    // Create user first
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        password_hash: password, // In production, hash this!
        role: 'NON_ACADEMIC_STAFF',
      },
    });

    // Then create staff record
    const staff = await prisma.nonAcademicStaff.create({
      data: {
        user_id: user.user_id,
        employee_id: `STAFF-${Date.now()}`,
        ...staffData,
      },
    });

    res.status(201).json(staff);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
};

exports.updateNonAcademicStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await prisma.nonAcademicStaff.update({
      where: { staff_id: parseInt(id) },
      data: req.body,
    });
    res.json(staff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
};

exports.toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const staff = await prisma.nonAcademicStaff.update({
      where: { staff_id: parseInt(id) },
      data: { is_active },
    });
    res.json(staff);
  } catch (error) {
    console.error('Toggle staff status error:', error);
    res.status(500).json({ error: 'Failed to toggle staff status' });
  }
};

// Staff Attendance
exports.getStaffAttendance = async (req, res) => {
  try {
    const attendance = await prisma.staffAttendance.findMany({
      include: {
        staff: {
          include: {
            user: {
              select: { full_name: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = attendance.map(a => ({
      attendance_id: a.attendance_id,
      staff_id: a.staff_id,
      full_name: a.staff?.user?.full_name || 'Unknown',
      date: a.date,
      status: a.status,
      check_in_time: a.check_in_time,
      check_out_time: a.check_out_time,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Staff Leave Requests
exports.getStaffLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await prisma.staffLeaveRequest.findMany({
      include: {
        staff: {
          include: {
            user: {
              select: { full_name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = leaveRequests.map(l => ({
      leave_id: l.leave_id,
      staff_id: l.staff_id,
      full_name: l.staff?.user?.full_name || 'Unknown',
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      total_days: l.total_days,
      reason: l.reason,
      status: l.status,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

exports.approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await prisma.staffLeaveRequest.update({
      where: { leave_id: parseInt(id) },
      data: { status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() },
    });
    res.json(leave);
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
};

exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await prisma.staffLeaveRequest.update({
      where: { leave_id: parseInt(id) },
      data: { status: 'REJECTED' },
    });
    res.json(leave);
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
};

// Incidents
exports.getIncidents = async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(incidents);
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const incident = await prisma.incident.create({
      data: {
        ...req.body,
        reported_by: req.user.id,
      },
    });
    res.status(201).json(incident);
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
};

exports.resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await prisma.incident.update({
      where: { incident_id: parseInt(id) },
      data: { status: 'RESOLVED', resolved_by: req.user.id, resolved_at: new Date() },
    });
    res.json(incident);
  } catch (error) {
    console.error('Resolve incident error:', error);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
};

exports.closeIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await prisma.incident.update({
      where: { incident_id: parseInt(id) },
      data: { status: 'CLOSED' },
    });
    res.json(incident);
  } catch (error) {
    console.error('Close incident error:', error);
    res.status(500).json({ error: 'Failed to close incident' });
  }
};

// Disciplinary Actions
exports.getDisciplinaryActions = async (req, res) => {
  try {
    const actions = await prisma.disciplinaryAction.findMany({
      include: {
        student: {
          include: {
            user: {
              select: { full_name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = actions.map(a => ({
      action_id: a.action_id,
      student_name: a.student?.user?.full_name || 'Unknown',
      action_type: a.action_type,
      reason: a.reason,
      start_date: a.start_date,
      end_date: a.end_date,
      duration_days: a.duration_days,
      status: a.status,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get disciplinary actions error:', error);
    res.status(500).json({ error: 'Failed to fetch disciplinary actions' });
  }
};

exports.createDisciplinaryAction = async (req, res) => {
  try {
    const action = await prisma.disciplinaryAction.create({
      data: {
        ...req.body,
        recommended_by: req.user.id,
      },
    });
    res.status(201).json(action);
  } catch (error) {
    console.error('Create disciplinary action error:', error);
    res.status(500).json({ error: 'Failed to create disciplinary action' });
  }
};

exports.approveDisciplinaryAction = async (req, res) => {
  try {
    const { id } = req.params;
    const action = await prisma.disciplinaryAction.update({
      where: { action_id: parseInt(id) },
      data: { status: 'APPROVED', approved_by: req.user.id },
    });
    res.json(action);
  } catch (error) {
    console.error('Approve disciplinary action error:', error);
    res.status(500).json({ error: 'Failed to approve disciplinary action' });
  }
};

exports.completeDisciplinaryAction = async (req, res) => {
  try {
    const { id } = req.params;
    const action = await prisma.disciplinaryAction.update({
      where: { action_id: parseInt(id) },
      data: { status: 'COMPLETED' },
    });
    res.json(action);
  } catch (error) {
    console.error('Complete disciplinary action error:', error);
    res.status(500).json({ error: 'Failed to complete disciplinary action' });
  }
};

// Inventory
exports.getInventory = async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: { item_name: 'asc' },
    });
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

exports.createInventory = async (req, res) => {
  try {
    const item = await prisma.inventory.create({
      data: {
        ...req.body,
        item_code: `INV-${Date.now()}`,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.inventory.update({
      where: { inventory_id: parseInt(id) },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

// Inventory Transactions
exports.getInventoryTransactions = async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        inventory: {
          select: { item_name: true },
        },
      },
      orderBy: { transaction_date: 'desc' },
    });

    const formatted = transactions.map(t => ({
      ...t,
      item_name: t.inventory?.item_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get inventory transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory transactions' });
  }
};

exports.createInventoryTransaction = async (req, res) => {
  try {
    const { inventory_id, transaction_type, quantity } = req.body;

    // Get current stock
    const inventory = await prisma.inventory.findUnique({
      where: { inventory_id: parseInt(inventory_id) },
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newStock = transaction_type === 'IN' 
      ? inventory.current_stock + quantity
      : inventory.current_stock - quantity;

    if (newStock < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        inventory_id: parseInt(inventory_id),
        transaction_type,
        quantity,
        remaining_stock: newStock,
        performed_by: req.user.id,
      },
    });

    // Update inventory stock
    await prisma.inventory.update({
      where: { inventory_id: parseInt(inventory_id) },
      data: { current_stock: newStock },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create inventory transaction error:', error);
    res.status(500).json({ error: 'Failed to create inventory transaction' });
  }
};

// Suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { supplier_name: 'asc' },
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({
      data: req.body,
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

// Announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.schoolAnnouncement.findMany({
      where: { announcement_type: { in: ['GENERAL', 'ADMINISTRATIVE', 'MAINTENANCE'] } },
      orderBy: { created_at: 'desc' },
    });

    const formatted = announcements.map(a => ({
      announcement_id: a.announcement_id,
      title: a.title,
      content: a.message,
      announcement_type: a.announcement_type,
      target_audience: a.target_audience,
      created_by: `User ${a.created_by}`,
      created_at: a.created_at,
      is_active: a.is_active,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = await prisma.schoolAnnouncement.create({
      data: {
        title: req.body.title,
        message: req.body.content,
        announcement_type: req.body.announcement_type,
        target_audience: req.body.target_audience,
        created_by: req.user.id,
        status: 'PUBLISHED',
      },
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

exports.toggleAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const announcement = await prisma.schoolAnnouncement.update({
      where: { announcement_id: parseInt(id) },
      data: { is_active },
    });
    res.json(announcement);
  } catch (error) {
    console.error('Toggle announcement error:', error);
    res.status(500).json({ error: 'Failed to toggle announcement' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.schoolAnnouncement.delete({
      where: { announcement_id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

// Messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: req.user.id },
          { receiver_id: req.user.id },
        ],
      },
      include: {
        sender: {
          select: { full_name: true },
        },
        receiver: {
          select: { full_name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const formatted = messages.map(m => ({
      message_id: m.message_id,
      sender_name: m.sender?.full_name || 'Unknown',
      receiver_name: m.receiver?.full_name || 'Unknown',
      content: m.content,
      timestamp: m.timestamp,
      is_read: m.is_read,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { user, action, date_from, date_to } = req.query;

    const where = {};
    if (user) where.user_id = parseInt(user);
    if (action) where.action = { contains: action };
    if (date_from || date_to) {
      where.timestamp = {};
      if (date_from) where.timestamp.gte = new Date(date_from);
      if (date_to) where.timestamp.lte = new Date(date_to);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { full_name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const formatted = logs.map(log => ({
      log_id: log.log_id,
      user_name: log.user?.full_name || 'System',
      action: log.action,
      timestamp: log.timestamp,
      ip_address: log.ip_address,
      details: log.details,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Settings - Categories
exports.getCategories = async (req, res) => {
  try {
    // Mock categories for now
    const categories = [
      { category_id: 1, name: 'LAB_EQUIPMENT', type: 'ASSET', is_active: true },
      { category_id: 2, name: 'FURNITURE', type: 'ASSET', is_active: true },
      { category_id: 3, name: 'COMPUTERS', type: 'ASSET', is_active: true },
      { category_id: 4, name: 'CLASSROOM', type: 'FACILITY', is_active: true },
      { category_id: 5, name: 'SALARIES', type: 'EXPENDITURE', is_active: true },
      { category_id: 6, name: 'OFFICE_SUPPLIES', type: 'INVENTORY', is_active: true },
    ];
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    // Mock implementation
    const category = {
      category_id: Date.now(),
      ...req.body,
      is_active: true,
    };
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

exports.toggleCategory = async (req, res) => {
  try {
    // Mock implementation
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle category error:', error);
    res.status(500).json({ error: 'Failed to toggle category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // Mock implementation
    res.status(204).send();
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Settings - Suppliers
exports.getSettingsSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { supplier_name: 'asc' },
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Get settings suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

exports.createSettingsSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({
      data: req.body,
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create settings supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

exports.toggleSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;
    const supplier = await prisma.supplier.update({
      where: { supplier_id: parseInt(id) },
      data: { is_approved },
    });
    res.json(supplier);
  } catch (error) {
    console.error('Toggle supplier error:', error);
    res.status(500).json({ error: 'Failed to toggle supplier' });
  }
};

// Settings - Preferences
exports.getPreferences = async (req, res) => {
  try {
    // Mock preferences
    const preferences = [
      { preference_key: 'email_notifications', preference_value: 'true', description: 'Receive email notifications for administrative updates' },
      { preference_key: 'push_notifications', preference_value: 'true', description: 'Receive push notifications for urgent matters' },
      { preference_key: 'low_stock_threshold', preference_value: '10', description: 'Minimum stock level before alert' },
      { preference_key: 'currency', preference_value: 'ETB', description: 'Default currency for financial reports' },
    ];
    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

exports.updatePreference = async (req, res) => {
  try {
    // Mock implementation
    res.json({ success: true });
  } catch (error) {
    console.error('Update preference error:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
};

// Security Personnel
exports.getSecurityPersonnel = async (req, res) => {
  try {
    const personnel = await prisma.securityPersonnel.findMany({
      include: {
        user: {
          select: { full_name: true, email: true, phone_number: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = personnel.map(p => ({
      security_id: p.security_id,
      user_id: p.user_id,
      employee_id: p.employee_id,
      full_name: p.user.full_name,
      shift: p.shift,
      patrol_route: p.patrol_route,
      assigned_area: p.assigned_area,
      is_active: p.is_active,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get security personnel error:', error);
    res.status(500).json({ error: 'Failed to fetch security personnel' });
  }
};

// Visitor Logs
exports.getVisitorLogs = async (req, res) => {
  try {
    const visitors = await prisma.visitorLog.findMany({
      orderBy: { check_in_time: 'desc' },
    });
    res.json(visitors);
  } catch (error) {
    console.error('Get visitor logs error:', error);
    res.status(500).json({ error: 'Failed to fetch visitor logs' });
  }
};

exports.createVisitorLog = async (req, res) => {
  try {
    const visitor = await prisma.visitorLog.create({
      data: {
        ...req.body,
        check_in_time: new Date(),
      },
    });
    res.status(201).json(visitor);
  } catch (error) {
    console.error('Create visitor log error:', error);
    res.status(500).json({ error: 'Failed to create visitor log' });
  }
};

exports.checkoutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.visitorLog.update({
      where: { visitor_id: parseInt(id) },
      data: { check_out_time: new Date() },
    });
    res.json(visitor);
  } catch (error) {
    console.error('Checkout visitor error:', error);
    res.status(500).json({ error: 'Failed to checkout visitor' });
  }
};

// Safety Equipment
exports.getSafetyEquipment = async (req, res) => {
  try {
    const equipment = await prisma.safetyEquipment.findMany({
      orderBy: { equipment_name: 'asc' },
    });
    res.json(equipment);
  } catch (error) {
    console.error('Get safety equipment error:', error);
    res.status(500).json({ error: 'Failed to fetch safety equipment' });
  }
};

exports.createSafetyEquipment = async (req, res) => {
  try {
    const equipment = await prisma.safetyEquipment.create({
      data: req.body,
    });
    res.status(201).json(equipment);
  } catch (error) {
    console.error('Create safety equipment error:', error);
    res.status(500).json({ error: 'Failed to create safety equipment' });
  }
};

// CCTV Cameras
exports.getCCTVCameras = async (req, res) => {
  try {
    const cameras = await prisma.cCTVCamera.findMany({
      orderBy: { camera_name: 'asc' },
    });
    res.json(cameras);
  } catch (error) {
    console.error('Get CCTV cameras error:', error);
    res.status(500).json({ error: 'Failed to fetch CCTV cameras' });
  }
};

exports.createCCTVCamera = async (req, res) => {
  try {
    const camera = await prisma.cCTVCamera.create({
      data: req.body,
    });
    res.status(201).json(camera);
  } catch (error) {
    console.error('Create CCTV camera error:', error);
    res.status(500).json({ error: 'Failed to create CCTV camera' });
  }
};

// Vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { vehicle_name: 'asc' },
    });
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({
      data: req.body,
    });
    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

// Vehicle Maintenance
exports.getVehicleMaintenance = async (req, res) => {
  try {
    const maintenance = await prisma.vehicleMaintenance.findMany({
      include: {
        vehicle: {
          select: { vehicle_name: true },
        },
      },
      orderBy: { scheduled_date: 'desc' },
    });

    const formatted = maintenance.map(m => ({
      ...m,
      vehicle_name: m.vehicle?.vehicle_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get vehicle maintenance error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle maintenance' });
  }
};

exports.createVehicleMaintenance = async (req, res) => {
  try {
    const maintenance = await prisma.vehicleMaintenance.create({
      data: req.body,
    });
    res.status(201).json(maintenance);
  } catch (error) {
    console.error('Create vehicle maintenance error:', error);
    res.status(500).json({ error: 'Failed to create vehicle maintenance' });
  }
};

// Driver Assignments
exports.getDriverAssignments = async (req, res) => {
  try {
    const assignments = await prisma.driverAssignment.findMany({
      include: {
        vehicle: {
          select: { vehicle_name: true },
        },
        driver: {
          include: {
            user: {
              select: { full_name: true },
            },
          },
        },
      },
      orderBy: { assigned_date: 'desc' },
    });

    const formatted = assignments.map(a => ({
      ...a,
      vehicle_name: a.vehicle?.vehicle_name || 'Unknown',
      driver_name: a.driver?.user?.full_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get driver assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch driver assignments' });
  }
};

exports.createDriverAssignment = async (req, res) => {
  try {
    const assignment = await prisma.driverAssignment.create({
      data: {
        ...req.body,
        assigned_date: new Date(),
      },
    });
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create driver assignment error:', error);
    res.status(500).json({ error: 'Failed to create driver assignment' });
  }
};

// Transport Schedules
exports.getTransportSchedules = async (req, res) => {
  try {
    const schedules = await prisma.transportSchedule.findMany({
      include: {
        vehicle: {
          select: { vehicle_name: true },
        },
      },
      orderBy: { departure_time: 'asc' },
    });

    const formatted = schedules.map(s => ({
      ...s,
      vehicle_name: s.vehicle?.vehicle_name || 'Unknown',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get transport schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch transport schedules' });
  }
};

exports.createTransportSchedule = async (req, res) => {
  try {
    const schedule = await prisma.transportSchedule.create({
      data: req.body,
    });
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create transport schedule error:', error);
    res.status(500).json({ error: 'Failed to create transport schedule' });
  }
};

// Meal Plans
exports.getMealPlans = async (req, res) => {
  try {
    const plans = await prisma.mealPlan.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(plans);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
};

exports.createMealPlan = async (req, res) => {
  try {
    const plan = await prisma.mealPlan.create({
      data: req.body,
    });
    res.status(201).json(plan);
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
};

// Food Inventory
exports.getFoodInventory = async (req, res) => {
  try {
    const inventory = await prisma.foodInventory.findMany({
      orderBy: { item_name: 'asc' },
    });
    res.json(inventory);
  } catch (error) {
    console.error('Get food inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch food inventory' });
  }
};

exports.createFoodInventory = async (req, res) => {
  try {
    const item = await prisma.foodInventory.create({
      data: req.body,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Create food inventory error:', error);
    res.status(500).json({ error: 'Failed to create food inventory item' });
  }
};

// Food Transactions
exports.getFoodTransactions = async (req, res) => {
  try {
    const transactions = await prisma.foodTransaction.findMany({
      orderBy: { transaction_date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    console.error('Get food transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch food transactions' });
  }
};

exports.createFoodTransaction = async (req, res) => {
  try {
    const { item_name, transaction_type, quantity, unit_cost } = req.body;

    const transaction = await prisma.foodTransaction.create({
      data: {
        item_name,
        transaction_type,
        quantity: parseFloat(quantity),
        unit_cost: parseFloat(unit_cost),
        total_cost: parseFloat(quantity) * parseFloat(unit_cost),
        transaction_date: new Date(),
        reference: req.body.reference || null,
        notes: req.body.notes || null,
      },
    });

    // Update inventory stock if applicable
    const inventory = await prisma.foodInventory.findFirst({
      where: { item_name },
    });

    if (inventory) {
      const newQuantity = transaction_type === 'RESTOCK'
        ? inventory.quantity + parseFloat(quantity)
        : inventory.quantity - parseFloat(quantity);

      await prisma.foodInventory.update({
        where: { inventory_id: inventory.inventory_id },
        data: { quantity: newQuantity },
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create food transaction error:', error);
    res.status(500).json({ error: 'Failed to create food transaction' });
  }
};
