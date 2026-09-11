const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { makeGovernanceRouter } = require("./governance/common");
const { hashPassword } = require("../utils/password");

const STAFF_JOIN = `
  LEFT JOIN (
       SELECT user_id, employee_id, department FROM teachers
     UNION ALL
       SELECT user_id, employee_id, NULL::text AS department FROM vp_academic
     UNION ALL
       SELECT user_id, employee_id, NULL::text AS department FROM vp_administration
     UNION ALL
       SELECT user_id, employee_id, department FROM department_heads
  ) emp ON emp.user_id = u.user_id`;

async function fetchStaffRow(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role,
            CASE WHEN u.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
            emp.employee_id, emp.department
       FROM users u${STAFF_JOIN}
      WHERE u.user_id = $1`,
    [userId]
  );
  return rows[0];
}

async function selectTeacherRow(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role,
            CASE WHEN u.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
            t.employee_id, t.department, t.gender, t.age,
            t.degree_level AS qualification, t.experience_years AS years_of_experience
       FROM users u JOIN teachers t ON t.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId]
  );
  return rows[0];
}

function employeeIdFor(role, userId) {
  const prefixes = { TEACHER: "T", VP_ACADEMIC: "VPA", VP_ADMINISTRATION: "VPA2", DEPARTMENT_HEAD: "DH" };
  const prefix = prefixes[role] || "EMP";
  return `${prefix}-${String(10000 + userId).slice(1)}`;
}

function providedEmployeeId(employeeId, role, userId) {
  const value = (employeeId || "").trim();
  return value && value.length <= 20 ? value : employeeIdFor(role, userId);
}

async function principalDashboard(req, res) {
  try {
    const [students, staff, attendance, grades, budget, academicYear] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM students`),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role IN ('PRINCIPAL','VP_ACADEMIC','VP_ADMINISTRATION','DEPARTMENT_HEAD','TEACHER')`),
      pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present FROM attendance_records`),
      pool.query(`SELECT c.class_name AS level, ROUND(AVG(g.score)::numeric, 1)::text AS avg FROM grades g JOIN students s ON s.student_id = g.student_id JOIN school_classes c ON c.class_id = s.current_class_id GROUP BY c.class_name`),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0)::numeric AS total, COALESCE(SUM(spent_amount), 0)::numeric AS spent, COALESCE(SUM(remaining_amount), 0)::numeric AS remaining FROM budgets`),
      pool.query(`SELECT year_name FROM academic_years WHERE is_current = TRUE LIMIT 1`),
    ]);

    const att = attendance.rows[0];
    const attendanceRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

    const b = budget.rows[0];
    const totalBudget = Number(b.total);
    const spent = Number(b.spent);
    const remaining = Number(b.remaining);
    const hasBudget = totalBudget > 0;
    const utilization = hasBudget ? Math.round((spent / totalBudget) * 100) : 0;

    const gradesByLevel = {};
    for (const row of grades.rows) gradesByLevel[row.level] = row.avg;

    res.json({
      total_enrollment: students.rows[0].count,
      attendance_rate: attendanceRate,
      staff_count: staff.rows[0].count,
      average_grades_by_level: gradesByLevel,
      financial_health: hasBudget
        ? { total_budget: totalBudget, spent, remaining, utilization_rate: utilization }
        : null,
      academic_year: academicYear.rows[0] ? academicYear.rows[0].year_name : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
}

const router = makeGovernanceRouter({ role: "PRINCIPAL", extension: { table: "principals" }, dashboard: principalDashboard });

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

// ─── Senior staff (VPs, department heads) ────────────────────────────────────

router.get("/staff/senior", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role,
              CASE WHEN u.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
              emp.employee_id, emp.department
         FROM users u${STAFF_JOIN}
        WHERE u.role IN ('VP_ACADEMIC','VP_ADMINISTRATION','DEPARTMENT_HEAD')
        ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch senior staff." });
  }
});

router.post("/staff/senior", async (req, res) => {
  const { full_name, role, employee_id, email, password, phone_number, department } = req.body || {};
  const allowed = ["VP_ACADEMIC", "VP_ADMINISTRATION", "DEPARTMENT_HEAD"];
  if (!full_name || !role || !employee_id || !email) {
    return res.status(400).json({ error: "full_name, role, employee_id and email are required." });
  }
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: "Invalid senior staff role." });
  }
  try {
    const exists = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: "An account with this email already exists." });

    const pwd = password || "Password123!";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
        [full_name.trim(), email.trim().toLowerCase(), phone_number || null, hashPassword(pwd), role]
      );
      const userId = rows[0].user_id;
      const empId = providedEmployeeId(employee_id, role, userId);
      if (role === "VP_ACADEMIC") {
        await client.query(`INSERT INTO vp_academic (user_id, employee_id) VALUES ($1, $2)`, [userId, empId]);
      } else if (role === "VP_ADMINISTRATION") {
        await client.query(`INSERT INTO vp_administration (user_id, employee_id) VALUES ($1, $2)`, [userId, empId]);
      } else if (role === "DEPARTMENT_HEAD") {
        if (!department) throw new Error("department is required for DEPARTMENT_HEAD");
        await client.query(`INSERT INTO department_heads (user_id, employee_id, department) VALUES ($1, $2, $3)`, [userId, empId, department]);
      }
      await client.query("COMMIT");
      res.status(201).json(await fetchStaffRow(userId));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    if (error.message === "department is required for DEPARTMENT_HEAD") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Unable to create senior staff." });
  }
});

router.put("/staff/senior/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { full_name, email, phone_number, department, employee_id, is_active } = req.body || {};
  try {
    const user = await pool.query(`SELECT role FROM users WHERE user_id = $1`, [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: "Staff member not found." });
    const role = user.rows[0].role;

    const empId = (employee_id || "").trim();
    const sanitizedEmpId = empId && empId.length <= 20 ? empId : null;

    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email),
              phone_number = COALESCE($3, phone_number), is_active = COALESCE($4, is_active)
        WHERE user_id = $5`,
      [full_name || null, email ? email.trim().toLowerCase() : null, phone_number || null, is_active ?? null, userId]
    );
    if (role === "DEPARTMENT_HEAD") {
      await pool.query(
        `UPDATE department_heads SET department = COALESCE($1, department), employee_id = COALESCE($2, employee_id) WHERE user_id = $3`,
        [department || null, sanitizedEmpId, userId]
      );
    } else if (role === "VP_ACADEMIC") {
      await pool.query(`UPDATE vp_academic SET employee_id = COALESCE($1, employee_id) WHERE user_id = $2`, [sanitizedEmpId, userId]);
    } else if (role === "VP_ADMINISTRATION") {
      await pool.query(`UPDATE vp_administration SET employee_id = COALESCE($1, employee_id) WHERE user_id = $2`, [sanitizedEmpId, userId]);
    }
    res.json(await fetchStaffRow(userId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update senior staff." });
  }
});

router.delete("/staff/senior/:id", async (req, res) => {
  const userId = Number(req.params.id);
  try {
    const user = await pool.query(`SELECT role FROM users WHERE user_id = $1`, [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: "Staff member not found." });
    const role = user.rows[0].role;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (role === "VP_ACADEMIC") await client.query(`DELETE FROM vp_academic WHERE user_id = $1`, [userId]);
      else if (role === "VP_ADMINISTRATION") await client.query(`DELETE FROM vp_administration WHERE user_id = $1`, [userId]);
      else if (role === "DEPARTMENT_HEAD") await client.query(`DELETE FROM department_heads WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete senior staff." });
  }
});

// ─── Teachers ─────────────────────────────────────────────────────────────────

router.get("/staff/teachers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role,
              CASE WHEN u.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
              t.employee_id, t.department, t.gender, t.age,
              t.degree_level AS qualification, t.experience_years AS years_of_experience
         FROM users u JOIN teachers t ON t.user_id = u.user_id
        ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch teachers." });
  }
});

router.post("/staff/teachers", async (req, res) => {
  const { full_name, employee_id, email, password, phone_number, department, qualification, years_of_experience, gender, age } = req.body || {};
  if (!full_name || !employee_id || !email) {
    return res.status(400).json({ error: "full_name, employee_id and email are required." });
  }
  try {
    const exists = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: "An account with this email already exists." });

    const pwd = password || "Password123!";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role)
         VALUES ($1, $2, $3, $4, 'TEACHER') RETURNING user_id`,
        [full_name.trim(), email.trim().toLowerCase(), phone_number || null, hashPassword(pwd)]
      );
      const userId = rows[0].user_id;
      await client.query(
        `INSERT INTO teachers (user_id, employee_id, department, degree_level, experience_years, gender, age)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, providedEmployeeId(employee_id, "TEACHER", userId), department || null, qualification || null, years_of_experience || 0, gender || null, age || null]
      );
      await client.query("COMMIT");
      res.status(201).json(await selectTeacherRow(userId));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create teacher." });
  }
});

router.put("/staff/teachers/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { full_name, email, phone_number, department, qualification, years_of_experience, gender, age, employee_id, is_active } = req.body || {};
  try {
    const user = await pool.query(`SELECT user_id FROM users WHERE user_id = $1`, [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: "Teacher not found." });

    const empId = (employee_id || "").trim();
    const sanitizedEmpId = empId && empId.length <= 20 ? empId : null;

    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email),
              phone_number = COALESCE($3, phone_number), is_active = COALESCE($4, is_active)
        WHERE user_id = $5`,
      [full_name || null, email ? email.trim().toLowerCase() : null, phone_number || null, is_active ?? null, userId]
    );
    await pool.query(
      `UPDATE teachers SET employee_id = COALESCE($1, employee_id), department = COALESCE($2, department),
              degree_level = COALESCE($3, degree_level), experience_years = COALESCE($4, experience_years),
              gender = COALESCE($5, gender), age = COALESCE($6, age)
        WHERE user_id = $7`,
      [sanitizedEmpId, department || null, qualification || null, years_of_experience ?? null, gender || null, age || null, userId]
    );
    res.json(await selectTeacherRow(userId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update teacher." });
  }
});

router.delete("/staff/teachers/:id", async (req, res) => {
  const userId = Number(req.params.id);
  try {
    const user = await pool.query(`SELECT user_id FROM users WHERE user_id = $1`, [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: "Teacher not found." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM teachers WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete teacher." });
  }
});

// ─── Alerts ───────────────────────────────────────────────────────────────────

router.get("/alerts", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT alert_type, title, message, severity, sent_at
         FROM urgent_alerts
        WHERE status IS DISTINCT FROM 'RESOLVED'
        ORDER BY COALESCE(sent_at, NOW()) DESC
        LIMIT 20`
    );
    res.json(rows.map((r) => ({
      type: r.alert_type,
      message: r.message || r.title || "Urgent alert",
      priority: (r.severity || "LOW").toUpperCase(),
      created_at: r.sent_at ? new Date(r.sent_at).toISOString() : null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch alerts." });
  }
});

// ─── School settings ─────────────────────────────────────────────────────────

router.get("/settings", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM school_settings ORDER BY school_id LIMIT 1`);
    res.json(rows[0] || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch school settings." });
  }
});

router.put("/settings", async (req, res) => {
  const {
    school_name, address, phone, email, principal_name, academic_year, current_term,
    school_type, grades_offered, established_year, student_capacity, mission_statement, vision_statement,
  } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE school_settings SET
         school_name = COALESCE($1, school_name),
         address = COALESCE($2, address),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         principal_name = COALESCE($5, principal_name),
         academic_year = COALESCE($6, academic_year),
         current_term = COALESCE($7, current_term),
         school_type = COALESCE($8, school_type),
         grades_offered = COALESCE($9, grades_offered),
         established_year = COALESCE($10, established_year),
         student_capacity = COALESCE($11, student_capacity),
         mission_statement = COALESCE($12, mission_statement),
         vision_statement = COALESCE($13, vision_statement),
         updated_at = CURRENT_TIMESTAMP
       WHERE school_id = 1 RETURNING *`,
      [school_name || null, address || null, phone || null, email || null, principal_name || null,
       academic_year || null, current_term || null, school_type || null, grades_offered || null,
       established_year ?? null, student_capacity ?? null, mission_statement || null, vision_statement || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update school settings." });
  }
});

// ─── Academic calendar ────────────────────────────────────────────────────────

router.get("/academic-calendar", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM academic_calendar ORDER BY calendar_id LIMIT 1`);
    res.json(rows[0] || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch academic calendar." });
  }
});

router.put("/academic-calendar", async (req, res) => {
  const { academic_year, term_start_date, term_end_date, exam_period_start, exam_period_end, break_periods, status } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE academic_calendar SET
         academic_year = COALESCE($1, academic_year),
         term_start_date = COALESCE($2, term_start_date),
         term_end_date = COALESCE($3, term_end_date),
         exam_period_start = COALESCE($4, exam_period_start),
         exam_period_end = COALESCE($5, exam_period_end),
         break_periods = COALESCE($6, break_periods),
         status = COALESCE($7, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE calendar_id = 1 RETURNING *`,
      [academic_year || null, term_start_date || null, term_end_date || null,
       exam_period_start || null, exam_period_end || null, break_periods || null, status || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update academic calendar." });
  }
});

// ─── Academic policies ────────────────────────────────────────────────────────

router.get("/settings/policies", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM academic_policies WHERE is_active = TRUE ORDER BY policy_id DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch policies." });
  }
});

router.post("/settings/policies", async (req, res) => {
  const { policy_name, policy_type, content, effective_date } = req.body || {};
  if (!policy_name || !content) {
    return res.status(400).json({ error: "policy_name and content are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO academic_policies (policy_name, policy_type, content, effective_date, is_active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [policy_name, policy_type || "GENERAL", content, effective_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create policy." });
  }
});

router.put("/settings/policies/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { policy_name, policy_type, content, effective_date, is_active } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE academic_policies SET
         policy_name = COALESCE($1, policy_name),
         policy_type = COALESCE($2, policy_type),
         content = COALESCE($3, content),
         effective_date = COALESCE($4, effective_date),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE policy_id = $6 RETURNING *`,
      [policy_name || null, policy_type || null, content || null, effective_date || null, is_active ?? null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Policy not found." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update policy." });
  }
});

router.delete("/settings/policies/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rows } = await pool.query(`DELETE FROM academic_policies WHERE policy_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Policy not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete policy." });
  }
});

// ─── Announcements ────────────────────────────────────────────────────────────

router.get("/communications/announcements", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sa.announcement_id, sa.title, sa.content, sa.announcement_type, sa.target_audience,
              u.full_name AS created_by, sa.created_at, sa.status
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

router.post("/communications/announcements", async (req, res) => {
  const { title, content, target_audience } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO school_announcements (title, content, announcement_type, target_audience, created_by, status, publish_date)
       VALUES ($1, $2, 'GENERAL', $3, $4, 'PUBLISHED', CURRENT_TIMESTAMP) RETURNING *`,
      [title, content, target_audience || "ALL", req.user.user_id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create announcement." });
  }
});

router.delete("/communications/announcements/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rows } = await pool.query(`DELETE FROM school_announcements WHERE announcement_id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Announcement not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete announcement." });
  }
});