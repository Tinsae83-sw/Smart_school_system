const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");

async function vpAdminDashboard(req, res) {
  try {
    const [assets, facilities, staff, discipline, inventory, pendingReq, budget, bookings, maintenance] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM asset_inventory`),
      pool.query(`SELECT COUNT(*)::int AS count FROM facilities`),
      pool.query(`SELECT COUNT(*)::int AS count FROM non_academic_staff`),
      pool.query(`SELECT COUNT(*)::int AS count FROM disciplinary_actions`),
      pool.query(`SELECT COUNT(*)::int AS count FROM inventory`),
      pool.query(`SELECT COUNT(*)::int AS count FROM purchase_requests WHERE status = 'PENDING'`),
      pool.query(`SELECT COALESCE(SUM(remaining_amount), 0)::numeric AS remaining, COALESCE(SUM(total_amount), 0)::numeric AS total FROM budgets`),
      pool.query(`SELECT COUNT(*)::int AS count FROM facility_bookings WHERE status = 'APPROVED' AND booking_date >= CURRENT_DATE - 7`),
      pool.query(`SELECT COUNT(*)::int AS count FROM facility_maintenance WHERE status = 'PENDING'`),
    ]);
    const total = Number(budget.rows[0].total);
    const remaining = Number(budget.rows[0].remaining);
    const spent = Math.max(total - remaining, 0);
    const utilization = total > 0 ? Math.round((spent / total) * 100) : 0;
    res.json({
      total_assets: assets.rows[0].count,
      total_facilities: facilities.rows[0].count,
      total_staff: staff.rows[0].count,
      discipline_cases: discipline.rows[0].count,
      inventory_items: inventory.rows[0].count,
      pending_requests: pendingReq.rows[0].count,
      budget_remaining: remaining,
      budget_utilization: utilization,
      facility_bookings_this_week: bookings.rows[0].count,
      pending_maintenance: maintenance.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
}

const router = makeGovernanceRouter({ role: "VP_ADMINISTRATION", extension: { table: "vp_administration" }, dashboard: vpAdminDashboard });

const { hashPassword } = require("../utils/password");

// ===== ASSETS =====
router.get("/assets", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT asset_id, asset_name, asset_code, category, quantity, unit_cost,
              purchase_date, location, condition, status, assigned_to, created_at
         FROM asset_inventory ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch assets." });
  }
});

router.post("/assets", async (req, res) => {
  const { asset_name, asset_code, category, quantity, unit_cost, purchase_date, location, condition, status, assigned_to } = req.body || {};
  if (!asset_name || !asset_code || !category) {
    return res.status(400).json({ error: "asset_name, asset_code, and category are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO asset_inventory (asset_name, asset_code, category, quantity, unit_cost, purchase_date, location, condition, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [asset_name, asset_code, category, quantity || 1, unit_cost || null, purchase_date || null, location || null,
       condition || "GOOD", status || "AVAILABLE", assigned_to || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create asset." });
  }
});

router.put("/assets/:id", async (req, res) => {
  const { id } = req.params;
  const { asset_name, asset_code, category, quantity, unit_cost, purchase_date, location, condition, status, assigned_to } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE asset_inventory
         SET asset_name = COALESCE($1, asset_name),
             asset_code = COALESCE($2, asset_code),
             category = COALESCE($3, category),
             quantity = COALESCE($4, quantity),
             unit_cost = COALESCE($5, unit_cost),
             purchase_date = COALESCE($6, purchase_date),
             location = COALESCE($7, location),
             condition = COALESCE($8, condition),
             status = COALESCE($9, status),
             assigned_to = COALESCE($10, assigned_to)
       WHERE asset_id = $11 RETURNING *`,
      [asset_name || null, asset_code || null, category || null, quantity || null, unit_cost || null,
       purchase_date || null, location || null, condition || null, status || null, assigned_to || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Asset not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update asset." });
  }
});

router.delete("/assets/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM asset_inventory WHERE asset_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Asset not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete asset." });
  }
});

router.post("/assets/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body || {};
  if (!assigned_to) {
    return res.status(400).json({ error: "assigned_to is required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO asset_assignments (asset_id, assigned_to, assigned_by, assigned_date, condition_on_assign)
       VALUES ($1, $2, $3, CURRENT_DATE, $4) RETURNING *`,
      [id, assigned_to, req.user.user_id, "GOOD"]
    );
    await pool.query(`UPDATE asset_inventory SET assigned_to = $1, status = 'IN_USE' WHERE asset_id = $2`, [assigned_to, id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to assign asset." });
  }
});

router.post("/assets/:id/maintenance", async (req, res) => {
  const { id } = req.params;
  const { maintenance_type, description, scheduled_date } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO asset_maintenance (asset_id, maintenance_type, description, scheduled_date, status)
       VALUES ($1, $2, $3, $4, 'SCHEDULED') RETURNING *`,
      [id, maintenance_type || "ROUTINE", description || "Scheduled maintenance", scheduled_date || new Date().toISOString().split("T")[0]]
    );
    await pool.query(`UPDATE asset_inventory SET status = 'MAINTENANCE' WHERE asset_id = $1`, [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to schedule asset maintenance." });
  }
});

// ===== FACILITIES =====
router.get("/facilities", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT facility_id, facility_name, facility_type, capacity, location, building, floor, amenities, status, created_at
         FROM facilities ORDER BY facility_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch facilities." });
  }
});

router.get("/facility-bookings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT fb.booking_id, fb.facility_id, f.facility_name, fb.booking_date, fb.start_time,
              fb.end_time, fb.purpose, fb.status, u.full_name AS booked_by, fb.created_at
         FROM facility_bookings fb
         LEFT JOIN facilities f ON f.facility_id = fb.facility_id
         LEFT JOIN users u ON u.user_id = fb.booked_by
         ORDER BY fb.booking_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch facility bookings." });
  }
});

router.post("/facility-bookings/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be approve or reject." });
  }
  try {
    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const { rows } = await pool.query(
      `UPDATE facility_bookings SET status = $1, approved_by = $2 WHERE booking_id = $3 RETURNING *`,
      [status, req.user.user_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Facility booking not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update facility booking." });
  }
});

router.get("/facility-maintenance", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT fm.maintenance_id, fm.facility_id, f.facility_name, fm.issue_type, fm.description,
              fm.priority, fm.status, fm.scheduled_date, fm.completed_date, fm.cost, fm.created_at
         FROM facility_maintenance fm
         LEFT JOIN facilities f ON f.facility_id = fm.facility_id
         ORDER BY fm.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch facility maintenance." });
  }
});

// ===== SECURITY =====
router.get("/security-personnel", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sp.security_id, sp.user_id, sp.employee_id, sp.shift, sp.patrol_route,
              sp.assigned_area, sp.is_active, u.full_name
         FROM security_personnel sp
         LEFT JOIN users u ON u.user_id = sp.user_id
         ORDER BY sp.security_id LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch security personnel." });
  }
});

router.get("/visitor-logs", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT visitor_id, visitor_name, visitor_type, purpose, person_to_visit, id_type,
              id_number, check_in_time, check_out_time, phone_number, vehicle_plate, notes
         FROM visitor_logs ORDER BY check_in_time DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch visitor logs." });
  }
});

router.post("/visitor-logs", async (req, res) => {
  const { visitor_name, visitor_type, purpose, person_to_visit, id_type, id_number, phone_number, vehicle_plate, notes } = req.body || {};
  if (!visitor_name || !person_to_visit) {
    return res.status(400).json({ error: "visitor_name and person_to_visit are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO visitor_logs (visitor_name, visitor_type, purpose, person_to_visit, id_type, id_number, phone_number, vehicle_plate, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [visitor_name, visitor_type || "OTHER", purpose || "", person_to_visit, id_type || null, id_number || null,
       phone_number || null, vehicle_plate || null, notes || null, req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create visitor log." });
  }
});

router.post("/visitor-logs/:id/checkout", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE visitor_logs SET check_out_time = CURRENT_TIMESTAMP WHERE visitor_id = $1 RETURNING *`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Visitor log not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to checkout visitor." });
  }
});

router.get("/safety-equipment", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT equipment_id, equipment_type, equipment_name, location, facility_id,
              installation_date, last_inspection, next_inspection, expiry_date, status, notes
         FROM safety_equipment ORDER BY equipment_id LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch safety equipment." });
  }
});

router.post("/safety-equipment", async (req, res) => {
  const { equipment_type, equipment_name, location, status, notes } = req.body || {};
  if (!equipment_type || !equipment_name || !location) {
    return res.status(400).json({ error: "equipment_type, equipment_name, and location are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO safety_equipment (equipment_type, equipment_name, location, status, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [equipment_type, equipment_name, location, status || "OPERATIONAL", notes || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create safety equipment." });
  }
});

router.get("/cctv-cameras", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT camera_id, camera_name, location, facility_id, camera_type, ip_address, status, last_checked, notes
         FROM cctv_cameras ORDER BY camera_id LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch CCTV cameras." });
  }
});

router.post("/cctv-cameras", async (req, res) => {
  const { camera_name, location, camera_type, ip_address, status, notes } = req.body || {};
  if (!camera_name || !location || !camera_type) {
    return res.status(400).json({ error: "camera_name, location, and camera_type are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO cctv_cameras (camera_name, location, camera_type, ip_address, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [camera_name, location, camera_type, ip_address || null, status || "OPERATIONAL", notes || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create CCTV camera." });
  }
});

// ===== CATERING =====
router.get("/meal-plans", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT meal_id AS plan_id, plan_name, meal_type AS plan_type, menu_items,
              NULL AS description, NULL AS daily_cost, is_active, created_at
         FROM meal_plans ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch meal plans." });
  }
});

router.post("/meal-plans", async (req, res) => {
  const { plan_name, plan_type, description, daily_cost } = req.body || {};
  if (!plan_name) {
    return res.status(400).json({ error: "plan_name is required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO meal_plans (plan_name, meal_type, academic_year, week_number, day_of_week, menu_items)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
      [plan_name, plan_type || "STANDARD", "2026", 1, "MONDAY",
       JSON.stringify([{ meal: description || "", cost: daily_cost || null }])]
    );
    res.json({
      plan_id: rows[0].meal_id,
      plan_name: rows[0].plan_name,
      plan_type: rows[0].meal_type,
      description: description || null,
      daily_cost: daily_cost || null,
      is_active: rows[0].is_active,
      created_at: rows[0].created_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create meal plan." });
  }
});

router.get("/food-inventory", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT fi.food_id AS inventory_id, fi.item_name, fi.category, fi.current_quantity AS quantity,
              fi.unit_of_measure AS unit, fi.reorder_level, fi.unit_cost,
              s.supplier_name AS supplier, fi.last_restocked, fi.expiry_date
         FROM food_inventory fi
         LEFT JOIN suppliers s ON s.supplier_id = fi.supplier_id
         ORDER BY fi.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch food inventory." });
  }
});

router.post("/food-inventory", async (req, res) => {
  const { item_name, category, quantity, unit, reorder_level, unit_cost, supplier, expiry_date } = req.body || {};
  if (!item_name) {
    return res.status(400).json({ error: "item_name is required." });
  }
  try {
    const sup = supplier ? await pool.query(`SELECT supplier_id FROM suppliers WHERE supplier_name = $1 LIMIT 1`, [supplier]) : null;
    const supplierId = sup && sup.rows[0] ? sup.rows[0].supplier_id : null;
    const { rows } = await pool.query(
      `INSERT INTO food_inventory (item_name, item_code, category, unit_of_measure, current_quantity, reorder_level, unit_cost, supplier_id, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [item_name, "FOOD-" + Date.now().toString().slice(-6), category || "GRAINS", unit || "KG",
       quantity || 0, reorder_level || 0, unit_cost || null, supplierId, expiry_date || null]
    );
    res.json({
      inventory_id: rows[0].food_id,
      item_name: rows[0].item_name,
      category: rows[0].category,
      quantity: rows[0].current_quantity,
      unit: rows[0].unit_of_measure,
      reorder_level: rows[0].reorder_level,
      unit_cost: rows[0].unit_cost,
      supplier,
      last_restocked: rows[0].last_restocked,
      expiry_date: rows[0].expiry_date,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create food inventory item." });
  }
});

router.get("/food-transactions", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ft.transaction_id, fi.item_name, ft.transaction_type, ft.quantity,
              ft.unit_cost, ft.total_cost, ft.transaction_date, ft.reference, ft.notes
         FROM food_transactions ft
         LEFT JOIN food_inventory fi ON fi.food_id = ft.food_id
         ORDER BY ft.transaction_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch food transactions." });
  }
});

router.post("/food-transactions", async (req, res) => {
  const { item_name, transaction_type, quantity, unit_cost, reference, notes } = req.body || {};
  if (!item_name) {
    return res.status(400).json({ error: "item_name is required." });
  }
  try {
    const food = await pool.query(`SELECT food_id FROM food_inventory WHERE item_name = $1 LIMIT 1`, [item_name]);
    let foodId = food.rows[0] ? food.rows[0].food_id : null;
    if (!foodId) {
      const created = await pool.query(
        `INSERT INTO food_inventory (item_name, item_code, category, unit_of_measure, current_quantity, reorder_level)
         VALUES ($1, $2, 'GRAINS', 'KG', 0, 0) RETURNING food_id`,
        [item_name, "FOOD-" + Date.now().toString().slice(-6)]
      );
      foodId = created.rows[0].food_id;
    }
    const qty = quantity || 0;
    const cost = unit_cost || 0;
    const change = transaction_type === "USAGE" || transaction_type === "WASTE" ? qty : (transaction_type === "RESTOCK" ? qty : 0);
    const newQty = transaction_type === "RESTOCK"
      ? (await pool.query(`SELECT current_quantity FROM food_inventory WHERE food_id = $1`, [foodId])).rows[0].current_quantity + qty
      : (transaction_type === "USAGE" || transaction_type === "WASTE")
        ? Math.max(0, (await pool.query(`SELECT current_quantity FROM food_inventory WHERE food_id = $1`, [foodId])).rows[0].current_quantity - qty)
        : null;
    if (newQty !== null) {
      await pool.query(`UPDATE food_inventory SET current_quantity = $1 WHERE food_id = $2`, [newQty, foodId]);
    }
    const { rows } = await pool.query(
      `INSERT INTO food_transactions (food_id, transaction_type, quantity, remaining_quantity, unit_cost, total_cost, reference, notes, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [foodId, transaction_type || "RESTOCK", qty, newQty === null ? 0 : newQty, cost, cost * qty, reference || null, notes || null, req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create food transaction." });
  }
});

// ===== FINANCE =====
router.get("/budgets", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT budget_id, budget_name, academic_year, total_amount, allocated_amount,
              spent_amount, remaining_amount, status, created_at
         FROM budgets ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch budgets." });
  }
});

router.get("/expenditures", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT expenditure_id, budget_id, category, description, amount, expenditure_date, status, created_at
         FROM expenditures ORDER BY expenditure_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch expenditures." });
  }
});

router.post("/expenditures", async (req, res) => {
  const { budget_id, category, description, amount, expenditure_date } = req.body || {};
  if (!budget_id || !category || !description || amount == null) {
    return res.status(400).json({ error: "budget_id, category, description, and amount are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO expenditures (budget_id, category, description, amount, expenditure_date, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, 'APPROVED', $6) RETURNING *`,
      [budget_id, category, description, amount, expenditure_date || new Date().toISOString().split("T")[0], req.user.user_id]
    );
    await pool.query(
      `UPDATE budgets SET spent_amount = spent_amount + $1, remaining_amount = remaining_amount - $1 WHERE budget_id = $2`,
      [amount, budget_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create expenditure." });
  }
});

router.get("/income", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT income_id, income_source, amount, description, income_date, created_at
         FROM income_transactions ORDER BY income_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch income transactions." });
  }
});

router.post("/income", async (req, res) => {
  const { income_source, amount, description, income_date } = req.body || {};
  if (!income_source || amount == null || !description) {
    return res.status(400).json({ error: "income_source, amount, and description are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO income_transactions (income_source, amount, description, income_date, received_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [income_source, amount, description, income_date || new Date().toISOString().split("T")[0], req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create income transaction." });
  }
});

router.get("/purchase-requests", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.request_id, pr.request_number, pr.item_name, pr.quantity, pr.total_cost,
              pr.category, pr.priority, pr.status, u.full_name AS requested_by, pr.created_at
         FROM purchase_requests pr
         LEFT JOIN users u ON u.user_id = pr.requested_by
         ORDER BY pr.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch purchase requests." });
  }
});

router.post("/purchase-requests", async (req, res) => {
  const { item_name, quantity, unit_cost, total_cost, category, priority, justification } = req.body || {};
  if (!item_name || !category || !justification) {
    return res.status(400).json({ error: "item_name, category, and justification are required." });
  }
  try {
    const requestNumber = "PR-" + Date.now().toString().slice(-6);
    const { rows } = await pool.query(
      `INSERT INTO purchase_requests (request_number, item_name, quantity, unit_cost, total_cost, category, priority, requested_by, justification, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING') RETURNING *`,
      [requestNumber, item_name, quantity || 1, unit_cost || null, total_cost || null, category,
       priority || "MEDIUM", req.user.user_id, justification]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create purchase request." });
  }
});

router.post("/purchase-requests/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be approve or reject." });
  }
  try {
    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const { rows } = await pool.query(
      `UPDATE purchase_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE request_id = $3 RETURNING *`,
      [status, req.user.user_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Purchase request not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update purchase request." });
  }
});

// ===== INVENTORY =====
router.get("/inventory", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.inventory_id, i.item_name, i.item_code, i.category, i.description,
              i.unit_of_measure, i.current_stock, i.reorder_level, i.max_stock, i.unit_cost,
              i.location, i.last_restocked, i.created_at, s.supplier_name AS supplier
         FROM inventory i
         LEFT JOIN suppliers s ON s.supplier_id = i.supplier_id
         ORDER BY i.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch inventory." });
  }
});

router.post("/inventory", async (req, res) => {
  const { item_name, item_code, category, description, unit_of_measure, current_stock, reorder_level, max_stock, unit_cost, location, supplier } = req.body || {};
  if (!item_name || !item_code || !category) {
    return res.status(400).json({ error: "item_name, item_code, and category are required." });
  }
  try {
    const sup = supplier ? await pool.query(`SELECT supplier_id FROM suppliers WHERE supplier_name = $1 LIMIT 1`, [supplier]) : null;
    const supplierId = sup && sup.rows[0] ? sup.rows[0].supplier_id : null;
    const { rows } = await pool.query(
      `INSERT INTO inventory (item_name, item_code, category, description, unit_of_measure, current_stock, reorder_level, max_stock, unit_cost, location, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [item_name, item_code, category, description || null, unit_of_measure || "PIECES",
       current_stock || 0, reorder_level || 10, max_stock || null, unit_cost || null,
       location || null, supplierId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create inventory item." });
  }
});

router.put("/inventory/:id", async (req, res) => {
  const { id } = req.params;
  const { item_name, item_code, category, description, unit_of_measure, current_stock, reorder_level, max_stock, unit_cost, location } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE inventory
         SET item_name = COALESCE($1, item_name),
             item_code = COALESCE($2, item_code),
             category = COALESCE($3, category),
             description = COALESCE($4, description),
             unit_of_measure = COALESCE($5, unit_of_measure),
             current_stock = COALESCE($6, current_stock),
             reorder_level = COALESCE($7, reorder_level),
             max_stock = COALESCE($8, max_stock),
             unit_cost = COALESCE($9, unit_cost),
             location = COALESCE($10, location)
       WHERE inventory_id = $11 RETURNING *`,
      [item_name || null, item_code || null, category || null, description || null, unit_of_measure || null,
       current_stock || null, reorder_level || null, max_stock || null, unit_cost || null, location || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Inventory item not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update inventory item." });
  }
});

router.get("/inventory-transactions", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT it.transaction_id, it.inventory_id, i.item_name, it.transaction_type, it.quantity,
              it.remaining_stock, it.unit_cost, it.total_cost, it.reference, it.transaction_date,
              it.performed_by, it.notes
         FROM inventory_transactions it
         LEFT JOIN inventory i ON i.inventory_id = it.inventory_id
         ORDER BY it.transaction_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch inventory transactions." });
  }
});

router.post("/inventory-transactions", async (req, res) => {
  const { inventory_id, transaction_type, quantity, unit_cost, total_cost, reference, notes, performed_by } = req.body || {};
  if (!inventory_id) {
    return res.status(400).json({ error: "inventory_id is required." });
  }
  try {
    const inv = await pool.query(`SELECT current_stock FROM inventory WHERE inventory_id = $1`, [inventory_id]);
    if (!inv.rows[0]) return res.status(404).json({ error: "Inventory item not found." });
    const qty = quantity || 0;
    const type = transaction_type || "IN";
    const currentStock = inv.rows[0].current_stock;
    let remaining = type === "IN" ? currentStock + qty : type === "OUT" ? Math.max(0, currentStock - qty) : currentStock;
    const cost = unit_cost || 0;
    const { rows } = await pool.query(
      `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, remaining_stock, unit_cost, total_cost, reference, performed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [inventory_id, type, qty, remaining, cost, total_cost || cost * qty, reference || null,
       performed_by || req.user.user_id, notes || null]
    );
    await pool.query(`UPDATE inventory SET current_stock = $1 WHERE inventory_id = $2`, [remaining, inventory_id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create inventory transaction." });
  }
});

router.delete("/inventory-transactions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM inventory_transactions WHERE transaction_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Transaction not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete transaction." });
  }
});

router.get("/suppliers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT supplier_id, supplier_name, contact_person, email, phone_number,
              address, products_services, is_approved, rating, notes, created_at
         FROM suppliers ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch suppliers." });
  }
});

router.post("/suppliers", async (req, res) => {
  const { supplier_name, contact_person, email, phone_number, address, products_services } = req.body || {};
  if (!supplier_name || !contact_person || !phone_number) {
    return res.status(400).json({ error: "supplier_name, contact_person, and phone_number are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (supplier_name, contact_person, email, phone_number, address, products_services, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [supplier_name, contact_person, email || null, phone_number, address || null,
       Array.isArray(products_services) ? products_services : null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create supplier." });
  }
});

router.put("/suppliers/:id", async (req, res) => {
  const { id } = req.params;
  const { supplier_name, contact_person, email, phone_number, address, products_services } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE suppliers
         SET supplier_name = COALESCE($1, supplier_name),
             contact_person = COALESCE($2, contact_person),
             email = COALESCE($3, email),
             phone_number = COALESCE($4, phone_number),
             address = COALESCE($5, address),
             products_services = COALESCE($6, products_services)
       WHERE supplier_id = $7 RETURNING *`,
      [supplier_name || null, contact_person || null, email || null, phone_number || null,
       address || null, Array.isArray(products_services) ? products_services : null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Supplier not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update supplier." });
  }
});

router.delete("/suppliers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM suppliers WHERE supplier_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Supplier not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete supplier." });
  }
});

// ===== STAFF =====
router.get("/non-academic-staff", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT nas.staff_id, nas.user_id, nas.employee_id, u.full_name, u.email, u.phone_number,
              nas.role, nas.hire_date, nas.is_active, nas.created_at
         FROM non_academic_staff nas
         LEFT JOIN users u ON u.user_id = nas.user_id
         ORDER BY nas.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch non-academic staff." });
  }
});

router.post("/non-academic-staff", async (req, res) => {
  const { full_name, email, phone_number, role, hire_date, password } = req.body || {};
  if (!full_name || !email) {
    return res.status(400).json({ error: "full_name and email are required." });
  }
  try {
    const roleVal = role || "LIBRARIAN";
    const user = await pool.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      [full_name, email, phone_number || null, await hashPassword(password || "default1234"), "ADMIN"]
    );
    const employeeId = "STAFF-" + Date.now().toString().slice(-6);
    const { rows } = await pool.query(
      `INSERT INTO non_academic_staff (user_id, employee_id, role, hire_date, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [user.rows[0].user_id, employeeId, roleVal, hire_date || null]
    );
    res.json({ ...rows[0], full_name, email, phone_number: phone_number || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create staff member." });
  }
});

router.put("/non-academic-staff/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone_number, role, hire_date } = req.body || {};
  try {
    const staffRow = await pool.query(`SELECT user_id FROM non_academic_staff WHERE staff_id = $1`, [id]);
    if (!staffRow.rows[0]) return res.status(404).json({ error: "Staff member not found." });
    const userId = staffRow.rows[0].user_id;
    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone_number = COALESCE($3, phone_number) WHERE user_id = $4`,
      [full_name || null, email || null, phone_number || null, userId]
    );
    const { rows } = await pool.query(
      `UPDATE non_academic_staff SET role = COALESCE($1, role), hire_date = COALESCE($2, hire_date) WHERE staff_id = $3 RETURNING *`,
      [role || null, hire_date || null, id]
    );
    res.json({ ...rows[0], full_name, email, phone_number: phone_number || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update staff member." });
  }
});

router.post("/non-academic-staff/:id/toggle-status", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE non_academic_staff SET is_active = $1 WHERE staff_id = $2 RETURNING *`,
      [is_active == null ? false : Boolean(is_active), id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Staff member not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to toggle staff status." });
  }
});

router.get("/staff-attendance", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sa.attendance_id, sa.staff_id, u.full_name, sa.date, sa.status,
              sa.check_in_time, sa.check_out_time, sa.created_at
         FROM staff_attendance sa
         LEFT JOIN non_academic_staff nas ON nas.staff_id = sa.staff_id
         LEFT JOIN users u ON u.user_id = nas.user_id
         ORDER BY sa.date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch staff attendance." });
  }
});

router.get("/staff-leave-requests", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT slr.leave_id, slr.staff_id, u.full_name, slr.leave_type, slr.start_date,
              slr.end_date, slr.total_days, slr.reason, slr.status, slr.created_at
         FROM staff_leave_requests slr
         LEFT JOIN non_academic_staff nas ON nas.staff_id = slr.staff_id
         LEFT JOIN users u ON u.user_id = nas.user_id
         ORDER BY slr.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch staff leave requests." });
  }
});

router.post("/staff-leave-requests/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be approve or reject." });
  }
  try {
    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const { rows } = await pool.query(
      `UPDATE staff_leave_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE leave_id = $3 RETURNING *`,
      [status, req.user.user_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Leave request not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update leave request." });
  }
});

// ===== DISCIPLINE =====
router.get("/incidents", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.incident_id, i.incident_type, u.full_name AS reported_by, i.incident_date,
              i.incident_time, i.involved_person_id, i.involved_person_type, i.description,
              i.location, i.witnesses, i.priority, i.status, i.action_taken, i.notes AS resolution_notes,
              i.created_at
         FROM incidents i
         LEFT JOIN users u ON u.user_id = i.reported_by
         ORDER BY i.created_at DESC LIMIT 200`
    );
    const out = rows.map(r => ({ ...r, involved_person_name: null, severity: null, immediate_action: null, follow_up_required: null, evidence_notes: null, reporter_contact: null }));
    res.json(out);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch incidents." });
  }
});

router.post("/incidents", async (req, res) => {
  const { incident_type, reported_by, incident_date, incident_time, involved_person_name, involved_person_type, description, location, witnesses, priority, status, action_taken } = req.body || {};
  if (!incident_type || !description) {
    return res.status(400).json({ error: "incident_type and description are required." });
  }
  try {
    const witnessArr = witnesses ? (Array.isArray(witnesses) ? witnesses : witnesses.split(",").map(w => w.trim())) : null;
    const { rows } = await pool.query(
      `INSERT INTO incidents (incident_type, reported_by, incident_date, incident_time, involved_person_type, description, location, witnesses, priority, status, action_taken)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [incident_type, reported_by || req.user.user_id, incident_date || new Date().toISOString().split("T")[0],
       incident_time || null, involved_person_type || "STUDENT", description, location || null, witnessArr,
       priority || "MEDIUM", status || "REPORTED", action_taken || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create incident." });
  }
});

router.put("/incidents/:id", async (req, res) => {
  const { id } = req.params;
  const { incident_type, incident_date, incident_time, involved_person_type, description, location, witnesses, priority, status } = req.body || {};
  try {
    const witnessArr = witnesses ? (Array.isArray(witnesses) ? witnesses : witnesses.split(",").map(w => w.trim())) : undefined;
    const { rows } = await pool.query(
      `UPDATE incidents
         SET incident_type = COALESCE($1, incident_type),
             incident_date = COALESCE($2, incident_date),
             incident_time = COALESCE($3, incident_time),
             involved_person_type = COALESCE($4, involved_person_type),
             description = COALESCE($5, description),
             location = COALESCE($6, location),
             witnesses = COALESCE($7, witnesses),
             priority = COALESCE($8, priority),
             status = COALESCE($9, status)
       WHERE incident_id = $10 RETURNING *`,
      [incident_type || null, incident_date || null, incident_time || null,
       involved_person_type || null, description || null, location || null,
       witnessArr === undefined ? null : witnessArr, priority || null, status || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Incident not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update incident." });
  }
});

router.post("/incidents/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  if (!["resolve", "close"].includes(action)) {
    return res.status(400).json({ error: "Action must be resolve or close." });
  }
  try {
    const status = action === "resolve" ? "RESOLVED" : "CLOSED";
    const { rows } = await pool.query(
      `UPDATE incidents SET status = $1, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP WHERE incident_id = $3 RETURNING *`,
      [status, req.user.user_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Incident not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update incident." });
  }
});

router.delete("/incidents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM incidents WHERE incident_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Incident not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete incident." });
  }
});

router.get("/disciplinary-actions", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT da.action_id, da.student_id, u.full_name AS student_name, da.action_type, da.reason,
              da.start_date, da.end_date, da.duration_days, da.status, da.notes, da.created_at
         FROM disciplinary_actions da
         LEFT JOIN students s ON s.student_id = da.student_id
         LEFT JOIN users u ON u.user_id = s.user_id
         ORDER BY da.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch disciplinary actions." });
  }
});

router.post("/disciplinary-actions", async (req, res) => {
  const { student_id, action_type, reason, start_date, end_date, duration_days } = req.body || {};
  if (!student_id || !action_type || !reason) {
    return res.status(400).json({ error: "student_id, action_type, and reason are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO disciplinary_actions (student_id, action_type, reason, start_date, end_date, duration_days, recommended_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING') RETURNING *`,
      [student_id, action_type, reason, start_date || new Date().toISOString().split("T")[0],
       end_date || null, duration_days || null, req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create disciplinary action." });
  }
});

router.put("/disciplinary-actions/:id", async (req, res) => {
  const { id } = req.params;
  const { student_id, action_type, reason, start_date, end_date, duration_days, status } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE disciplinary_actions
         SET student_id = COALESCE($1, student_id),
             action_type = COALESCE($2, action_type),
             reason = COALESCE($3, reason),
             start_date = COALESCE($4, start_date),
             end_date = COALESCE($5, end_date),
             duration_days = COALESCE($6, duration_days),
             status = COALESCE($7, status)
       WHERE action_id = $8 RETURNING *`,
      [student_id || null, action_type || null, reason || null, start_date || null,
       end_date || null, duration_days || null, status || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Disciplinary action not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update disciplinary action." });
  }
});

router.post("/disciplinary-actions/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  if (!["approve", "complete"].includes(action)) {
    return res.status(400).json({ error: "Action must be approve or complete." });
  }
  try {
    const status = action === "approve" ? "APPROVED" : "COMPLETED";
    const { rows } = await pool.query(
      `UPDATE disciplinary_actions SET status = $1, approved_by = $2 WHERE action_id = $3 RETURNING *`,
      [status, req.user.user_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Disciplinary action not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update disciplinary action." });
  }
});

router.delete("/disciplinary-actions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM disciplinary_actions WHERE action_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Disciplinary action not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete disciplinary action." });
  }
});

// ===== COMMUNICATIONS =====
router.get("/announcements", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sa.announcement_id, sa.title, sa.content, sa.announcement_type, sa.target_audience,
              u.full_name AS created_by, sa.created_at,
              CASE WHEN sa.status = 'PENDING' THEN false ELSE true END AS is_active
         FROM school_announcements sa
         LEFT JOIN users u ON u.user_id = sa.created_by
         ORDER BY sa.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.post("/announcements", async (req, res) => {
  const { title, content, announcement_type, target_audience } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO school_announcements (title, content, announcement_type, target_audience, created_by, status, publish_date)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', CURRENT_TIMESTAMP) RETURNING *`,
      [title, content, announcement_type || "GENERAL", target_audience || "ALL", req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create announcement." });
  }
});

router.post("/announcements/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};
  try {
    const status = is_active ? "PUBLISHED" : "PENDING";
    const { rows } = await pool.query(
      `UPDATE school_announcements SET status = $1 WHERE announcement_id = $2 RETURNING *`,
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Announcement not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to toggle announcement." });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM school_announcements WHERE announcement_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Announcement not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete announcement." });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cl.log_id AS message_id, u.full_name AS sender_name, cl.title AS receiver_name,
              cl.title AS content, cl.sent_at AS timestamp,
              CASE WHEN cl.status = 'SENT' THEN true ELSE false END AS is_read
         FROM communication_logs cl
         LEFT JOIN users u ON u.user_id = cl.sent_by
         ORDER BY cl.sent_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch messages." });
  }
});

router.post("/messages", async (req, res) => {
  const { title, content } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO communication_logs (communication_type, title, recipient_count, sent_by, status)
       VALUES ('MESSAGE', $1, 1, $2, 'SENT') RETURNING *`,
      [title || content || "Message", req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create message." });
  }
});

// ===== SETTINGS =====
router.get("/settings/categories", async (req, res) => {
  try {
    const [assets, inventory, food, facilities] = await Promise.all([
      pool.query(`SELECT DISTINCT category FROM asset_inventory ORDER BY category`),
      pool.query(`SELECT DISTINCT category FROM inventory ORDER BY category`),
      pool.query(`SELECT DISTINCT category FROM food_inventory ORDER BY category`),
      pool.query(`SELECT DISTINCT facility_type FROM facilities ORDER BY facility_type`),
    ]);
    const seen = new Set();
    const rows = [];
    let id = 1;
    const add = (name, type) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      rows.push({ category_id: id++, name, type, is_active: true });
    };
    assets.rows.forEach(r => add(r.category, "ASSET"));
    inventory.rows.forEach(r => add(r.category, "INVENTORY"));
    food.rows.forEach(r => add(r.category, "INVENTORY"));
    facilities.rows.forEach(r => add(r.facility_type, "FACILITY"));
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch categories." });
  }
});

router.post("/settings/categories", async (req, res) => {
  const { name, type } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "name is required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO department_settings (department, goals, grading_scale, academic_calendar, notification_preferences)
       VALUES ($1, '{}'::text[], '{}'::jsonb, '{}'::jsonb, '{}'::jsonb) RETURNING settings_id`,
      [name]
    );
    res.json({ category_id: rows[0].settings_id, name, type: type || "ASSET", is_active: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create category." });
  }
});

router.post("/settings/categories/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};
  try {
    const { rows } = await pool.query(
      `SELECT settings_id, department AS name FROM department_settings WHERE settings_id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found." });
    res.json({ category_id: rows[0].settings_id, name: rows[0].name, type: "ASSET", is_active: is_active == null ? false : Boolean(is_active) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to toggle category." });
  }
});

router.delete("/settings/categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`DELETE FROM department_settings WHERE settings_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Category not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete category." });
  }
});

router.get("/settings/suppliers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT supplier_id, supplier_name, contact_person, email, phone_number, is_approved, created_at
         FROM suppliers ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch suppliers." });
  }
});

router.post("/settings/suppliers", async (req, res) => {
  const { supplier_name, contact_person, email, phone_number, address } = req.body || {};
  if (!supplier_name || !contact_person || !phone_number) {
    return res.status(400).json({ error: "supplier_name, contact_person, and phone_number are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (supplier_name, contact_person, email, phone_number, address, is_approved)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [supplier_name, contact_person, email || null, phone_number, address || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create supplier." });
  }
});

router.post("/settings/suppliers/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE suppliers SET is_approved = $1 WHERE supplier_id = $2 RETURNING *`,
      [is_approved == null ? false : Boolean(is_approved), id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Supplier not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to toggle supplier." });
  }
});

router.get("/settings/preferences", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM school_profile LIMIT 1`);
    const profile = rows[0] || {};
    res.json([
      { preference_key: "email_notifications", preference_value: "true", description: "Send email notifications for administrative updates" },
      { preference_key: "push_notifications", preference_value: "true", description: "Send push notifications for urgent alerts" },
      { preference_key: "school_name", preference_value: profile.school_name || "", description: "School display name" },
      { preference_key: "school_address", preference_value: profile.address || "", description: "School address" },
      { preference_key: "school_phone", preference_value: profile.phone_number || "", description: "School phone number" },
      { preference_key: "academic_year", preference_value: "", description: "Current academic year" },
    ]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch preferences." });
  }
});

router.put("/settings/preferences", async (req, res) => {
  const { preference_key, preference_value } = req.body || {};
  res.json({ preference_key, preference_value, success: true });
});

// ===== REPORTS =====
router.get("/reports/:reportType", async (req, res) => {
  const { reportType } = req.params;
  try {
    let data;
    switch (reportType) {
      case "asset": {
        const { rows } = await pool.query(
          `SELECT asset_id, asset_name, asset_code, category, quantity, unit_cost,
                  (quantity * COALESCE(unit_cost, 0)) AS value, condition, status, location, assigned_to
             FROM asset_inventory ORDER BY created_at DESC LIMIT 500`
        );
        data = rows;
        break;
      }
      case "financial": {
        const [b, e, i] = await Promise.all([
          pool.query(`SELECT * FROM budgets ORDER BY created_at DESC LIMIT 50`),
          pool.query(`SELECT * FROM expenditures ORDER BY expenditure_date DESC LIMIT 500`),
          pool.query(`SELECT * FROM income_transactions ORDER BY income_date DESC LIMIT 500`),
        ]);
        data = { budgets: b.rows, expenditures: e.rows, income: i.rows };
        break;
      }
      case "facility": {
        const { rows } = await pool.query(
          `SELECT fb.booking_id, fb.facility_id, f.facility_name, fb.booking_date, fb.status, fb.purpose
             FROM facility_bookings fb
             LEFT JOIN facilities f ON f.facility_id = fb.facility_id
             ORDER BY fb.booking_date DESC LIMIT 500`
        );
        data = rows;
        break;
      }
      case "staff": {
        const { rows } = await pool.query(
          `SELECT sa.attendance_id, u.full_name, sa.date, sa.status, sa.check_in_time, sa.check_out_time
             FROM staff_attendance sa
             LEFT JOIN non_academic_staff nas ON nas.staff_id = sa.staff_id
             LEFT JOIN users u ON u.user_id = nas.user_id
             ORDER BY sa.date DESC LIMIT 500`
        );
        data = rows;
        break;
      }
      case "procurement": {
        const [p, i, s] = await Promise.all([
          pool.query(`SELECT * FROM purchase_requests ORDER BY created_at DESC LIMIT 500`),
          pool.query(`SELECT * FROM inventory ORDER BY created_at DESC LIMIT 500`),
          pool.query(`SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 500`),
        ]);
        data = { purchase_requests: p.rows, inventory: i.rows, suppliers: s.rows };
        break;
      }
      case "incident": {
        const { rows } = await pool.query(`SELECT * FROM incidents ORDER BY created_at DESC LIMIT 500`);
        data = rows;
        break;
      }
      default:
        return res.status(400).json({ error: "Unknown report type." });
    }
    res.json({ reportType, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to generate report." });
  }
});

// ===== DASHBOARD =====
// ===== ACTIVITIES =====
router.get("/activities", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT log_id AS id, action AS type, action AS description, timestamp
         FROM audit_logs ORDER BY timestamp DESC LIMIT 50`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch activities." });
  }
});

module.exports = router;
