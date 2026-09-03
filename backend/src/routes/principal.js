const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { makeGovernanceRouter } = require("./governance/common");

const router = makeGovernanceRouter({ role: "PRINCIPAL", extension: { table: "principals" } });

// ─── Departments ────────────────────────────────────────────────────────────

router.get("/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.department_id, d.name, d.code, d.description, d.head_of_department_id,
              d.is_active, d.created_at, d.updated_at,
              dh.dept_head_id, u.user_id, u.full_name
         FROM departments d
         LEFT JOIN department_heads dh ON d.head_of_department_id = dh.dept_head_id
         LEFT JOIN users u ON dh.user_id = u.user_id
        ORDER BY d.name`
    );
    res.json(rows.map((r) => ({
      department_id: r.department_id,
      name: r.name,
      code: r.code,
      description: r.description,
      head_of_department_id: r.head_of_department_id,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      head_of_department: r.user_id
        ? { dept_head_id: r.dept_head_id, user: { user_id: r.user_id, full_name: r.full_name } }
        : null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch departments." });
  }
});

router.post("/departments", async (req, res) => {
  const { name, code, description, head_of_department_id } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO departments (name, code, description, head_of_department_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code || null, description || null, head_of_department_id || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create department." });
  }
});

router.put("/departments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, code, description, head_of_department_id, is_active } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code),
              description = COALESCE($3, description),
              head_of_department_id = COALESCE($4, head_of_department_id),
              is_active = COALESCE($5, is_active), updated_at = CURRENT_TIMESTAMP
        WHERE department_id = $6 RETURNING *`,
      [name || null, code || null, description || null, head_of_department_id || null, is_active ?? null, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Department not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update department." });
  }
});

router.delete("/departments/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM departments WHERE department_id = $1`, [Number(req.params.id)]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete department." });
  }
});

// ─── Staff overview ─────────────────────────────────────────────────────────

router.get("/staff", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, u.is_active,
              t.employee_id, t.department, t.hire_date, t.experience_years
         FROM users u
         JOIN teachers t ON t.user_id = u.user_id
        ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch staff." });
  }
});

// ─── Compliance / reports ───────────────────────────────────────────────────

router.get("/reports", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.report_id, r.title, r.type, r.format, r.file_url, r.generated_at, u.full_name AS generated_by
         FROM reports r LEFT JOIN users u ON r.generated_by = u.user_id
        ORDER BY r.generated_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch reports." });
  }
});

module.exports = router;