const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { hashPassword, randomPassword } = require("../utils/password");
const { audit } = require("../utils/audit");
const { validateFaydaId } = require("../utils/nationalId");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

// Roles that map to an extension table (same names as the DB enum).
const EXTENSION_INSERT = {
  ADMIN: 'INSERT INTO administrators (user_id, employee_id, access_level) VALUES ($1, $2, $3)',
  TEACHER: 'INSERT INTO teachers (user_id, employee_id, department) VALUES ($1, $2, $3)',
  STUDENT: 'INSERT INTO students (user_id, student_number, enrollment_date, current_class_id) VALUES ($1, $2, $3, $4)',
  PARENT: 'INSERT INTO parents (user_id, relationship) VALUES ($1, $2)',
  PRINCIPAL: 'INSERT INTO principals (user_id, employee_id) VALUES ($1, $2)',
  VP_ACADEMIC: 'INSERT INTO vp_academic (user_id, employee_id) VALUES ($1, $2)',
  VP_ADMINISTRATION: 'INSERT INTO vp_administration (user_id, employee_id) VALUES ($1, $2)',
  DEPARTMENT_HEAD: 'INSERT INTO department_heads (user_id, employee_id, department) VALUES ($1, $2, $3)',
  PTSA_REPRESENTATIVE: 'INSERT INTO ptsa_representatives (user_id, position) VALUES ($1, $2)',
  SIC_MEMBER: 'INSERT INTO sic_members (user_id, role) VALUES ($1, $2)',
};

const ALLOWED_ROLES = Object.keys(EXTENSION_INSERT).concat(["SUPER_ADMIN"]);

function employeeIdFor(role, userId) {
  const prefixes = {
    ADMIN: "ADM", TEACHER: "TCH", STUDENT: "STU", PARENT: "PA", PRINCIPAL: "PRN",
    VP_ACADEMIC: "VPA", VP_ADMINISTRATION: "VPD", DEPARTMENT_HEAD: "DH",
    PTSA_REPRESENTATIVE: "PTSA", SIC_MEMBER: "SIC",
  };
  return `${prefixes[role] || "USR"}${String(userId).padStart(4, "0")}`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT')::int AS student_count,
        (SELECT COUNT(*) FROM users WHERE role = 'TEACHER')::int AS teacher_count,
        (SELECT COUNT(*) FROM users WHERE role = 'PARENT')::int AS parent_count,
        (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN','SUPER_ADMIN'))::int AS admin_count,
        (SELECT COUNT(*) FROM users WHERE role NOT IN ('STUDENT','TEACHER','PARENT','ADMIN','SUPER_ADMIN'))::int AS staff_count,
        (SELECT COUNT(*) FROM school_classes)::int AS class_count,
        (SELECT COUNT(*) FROM users WHERE is_active = FALSE)::int AS disabled_count,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE)::int AS active_users
    `);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch dashboard metrics." });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { role, status } = req.query;
    const filters = [];
    const values = [];

    if (role) {
      values.push(role.toUpperCase());
      filters.push(`u.role = $${values.length}`);
    }
    if (status) {
      values.push(status.toLowerCase() === "active");
      filters.push(`u.is_active = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, u.national_id, u.is_active, u.status, u.created_at,
              a.employee_id AS admin_employee_id, a.access_level,
              t.department AS teacher_department, t.employee_id AS teacher_employee_id,
              s.student_number, s.enrollment_date, s.current_class_id,
              p.relationship AS parent_relationship,
              pr.employee_id AS principal_employee_id,
              dh.department AS dept_head_department,
              vpa.employee_id AS vp_academic_employee_id,
              vpd.employee_id AS vp_administration_employee_id
         FROM users u
         LEFT JOIN administrators a ON u.user_id = a.user_id
         LEFT JOIN teachers t ON u.user_id = t.user_id
         LEFT JOIN students s ON u.user_id = s.user_id
         LEFT JOIN parents p ON u.user_id = p.user_id
         LEFT JOIN principals pr ON u.user_id = pr.user_id
         LEFT JOIN department_heads dh ON u.user_id = dh.user_id
         LEFT JOIN vp_academic vpa ON u.user_id = vpa.user_id
         LEFT JOIN vp_administration vpd ON u.user_id = vpd.user_id
         ${whereClause}
         ORDER BY u.created_at DESC`,
      values
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch users." });
  }
});

router.post("/users", async (req, res) => {
  const {
    full_name, email, phone_number, role, department, employee_id,
    student_number, current_class_id, relationship, position, national_id,
  } = req.body || {};

  if (!full_name || !email || !role) {
    return res.status(400).json({ error: "full_name, email, and role are required." });
  }

  const userRole = role.toUpperCase();
  if (!ALLOWED_ROLES.includes(userRole)) {
    return res.status(400).json({ error: `Unsupported role: ${role}` });
  }

  let normalizedNationalId = null;
  if (national_id) {
    const check = validateFaydaId(national_id);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }
    normalizedNationalId = check.normalized;
  }

  const password = randomPassword(12);
  const password_hash = hashPassword(password);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, national_id, must_reset_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING user_id`,
      [full_name, email.trim().toLowerCase(), phone_number || null, password_hash, userRole, normalizedNationalId]
    );
    const userId = userResult.rows[0].user_id;

    const insert = EXTENSION_INSERT[userRole];
    if (insert) {
      if (userRole === "STUDENT") {
        await client.query(insert, [userId, student_number || `STU${String(userId).padStart(4, "0")}`, new Date(), current_class_id || null]);
      } else if (userRole === "TEACHER") {
        await client.query(insert, [userId, employee_id || employeeIdFor(userRole, userId), department || null]);
      } else if (userRole === "PARENT") {
        await client.query(insert, [userId, relationship || "Guardian"]);
      } else if (userRole === "DEPARTMENT_HEAD") {
        await client.query(insert, [userId, employee_id || employeeIdFor(userRole, userId), department || null]);
      } else if (userRole === "PTSA_REPRESENTATIVE") {
        await client.query(insert, [userId, position || null]);
      } else if (userRole === "SIC_MEMBER") {
        await client.query(insert, [userId, position || null]);
      } else {
        await client.query(insert, [userId, employee_id || employeeIdFor(userRole, userId)]);
      }
    }

    await audit(userId, "CREATE_USER", { role: userRole }, req, client);
    await client.query("COMMIT");

    res.status(201).json({
      user_id: userId,
      password,
      message: "User created. Share the generated password securely.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message = error.code === "23505" ? "A user with that email or ID already exists." : "Unable to create user.";
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

router.put("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { full_name, email, phone_number, department, current_class_id, relationship, national_id } = req.body || {};

  if (!userId) return res.status(400).json({ error: "Invalid user id." });

  let normalizedNationalId = undefined;
  if (national_id !== undefined) {
    if (national_id === null || national_id === "") {
      normalizedNationalId = null;
    } else {
      const check = validateFaydaId(national_id);
      if (!check.valid) {
        return res.status(400).json({ error: check.error });
      }
      normalizedNationalId = check.normalized;
    }
  }

  try {
    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email),
              phone_number = COALESCE($3, phone_number), national_id = $4
        WHERE user_id = $5`,
      [full_name || null, email || null, phone_number || null, normalizedNationalId, userId]
    );

    if (department) {
      await pool.query(`UPDATE teachers SET department = $1 WHERE user_id = $2`, [department, userId]);
      await pool.query(`UPDATE department_heads SET department = $1 WHERE user_id = $2`, [department, userId]);
    }
    if (current_class_id !== undefined) {
      await pool.query(`UPDATE students SET current_class_id = $1 WHERE user_id = $2`, [current_class_id, userId]);
    }
    if (relationship) {
      await pool.query(`UPDATE parents SET relationship = $1 WHERE user_id = $2`, [relationship, userId]);
    }

    await audit(userId, "UPDATE_USER", { fields: Object.keys(req.body || {}) }, req);

    res.json({ message: "User updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update user." });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { is_active } = req.body || {};

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be a boolean." });
  }

  try {
    await pool.query(`UPDATE users SET is_active = $1 WHERE user_id = $2`, [is_active, userId]);
    await audit(userId, is_active ? "ENABLE_USER" : "DISABLE_USER", {}, req);
    res.json({ message: `User ${is_active ? "enabled" : "disabled"}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update status." });
  }
});

router.post("/users/:id/reset-password", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const newPassword = randomPassword(12);

  try {
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [hashPassword(newPassword), userId]);
    await audit(userId, "RESET_PASSWORD", {}, req);
    res.json({ message: "Password reset successfully.", password: newPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to reset password." });
  }
});

router.post("/users/link-parent", async (req, res) => {
  const { student_user_id, parent_user_id, relationship } = req.body || {};
  if (!student_user_id || !parent_user_id) {
    return res.status(400).json({ error: "student_user_id and parent_user_id are required." });
  }

  try {
    const student = await pool.query(`SELECT student_id FROM students WHERE user_id = $1`, [student_user_id]);
    const parent = await pool.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [parent_user_id]);

    if (!student.rowCount || !parent.rowCount) {
      return res.status(404).json({ error: "Student or parent not found." });
    }

    await pool.query(
      `INSERT INTO student_parent (student_id, parent_id, relationship)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, parent_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
      [student.rows[0].student_id, parent.rows[0].parent_id, relationship || null]
    );

    await audit(req.user.user_id, "LINK_PARENT", { student_user_id, parent_user_id }, req);
    res.json({ message: "Parent linked to student." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to link parent and student." });
  }
});

// Dropdown data for the admin user-management UI.
router.get("/students", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, s.student_number
         FROM students s
         JOIN users u ON u.user_id = s.user_id
        WHERE u.is_active = TRUE
        ORDER BY u.full_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch students." });
  }
});

router.get("/parents", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, p.relationship
         FROM parents p
         JOIN users u ON u.user_id = p.user_id
        WHERE u.is_active = TRUE
        ORDER BY u.full_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch parents." });
  }
});

// ─── Registration approvals (self-service signup) ────────────────────────
// Self-service signup creates PENDING accounts. The registrar/admin reviews
// these, then either approves (activating + provisioning the role record) or
// rejects them.

router.get("/approvals", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, u.status,
              u.requested_class_id, u.requested_relationship, u.created_at,
              c.class_name AS requested_class_name
         FROM users u
         LEFT JOIN school_classes c ON u.requested_class_id = c.class_id
        WHERE u.status IN ('PENDING', 'REJECTED')
        ORDER BY u.created_at ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch registrations." });
  }
});

router.put("/approvals/:userId/approve", async (req, res) => {
  const userId = Number(req.params.userId);
  const { class_id, relationship, student_parent_user_id } = req.body || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT user_id, role, status, requested_class_id FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const user = rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Registration not found." });
    }
    if (user.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This registration is no longer pending." });
    }

    const role = user.role;

    // Provision the role extension row (students/parents) if it does not exist yet.
    if (role === "STUDENT") {
      const assignedClassId = Number(class_id) || user.requested_class_id;
      if (!assignedClassId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Assign a class to this student." });
      }
      const existing = await client.query(`SELECT student_id FROM students WHERE user_id = $1`, [userId]);
      if (!existing.rowCount) {
        await client.query(
          `INSERT INTO students (user_id, student_number, enrollment_date, current_class_id)
           VALUES ($1, $2, CURRENT_DATE, $3)`,
          [userId, `STU${String(userId).padStart(4, "0")}`, assignedClassId]
        );
      } else {
        await client.query(`UPDATE students SET current_class_id = $1 WHERE user_id = $2`, [assignedClassId, userId]);
      }
    } else if (role === "PARENT") {
      const rel = relationship || user.requested_relationship || "Guardian";
      const existing = await client.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [userId]);
      if (!existing.rowCount) {
        await client.query(`INSERT INTO parents (user_id, relationship) VALUES ($1, $2)`, [userId, rel]);
      } else {
        await client.query(`UPDATE parents SET relationship = $1 WHERE user_id = $2`, [rel, userId]);
      }

      // If the parent registered together with a student email, link them.
      if (student_parent_user_id) {
        const st = await client.query(`SELECT student_id FROM students WHERE user_id = $1`, [student_parent_user_id]);
        const pa = await client.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [userId]);
        if (st.rowCount && pa.rowCount) {
          await client.query(
            `INSERT INTO student_parent (student_id, parent_id, relationship)
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id, parent_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
            [st.rows[0].student_id, pa.rows[0].parent_id, rel]
          );
        }
      }
    }

    await client.query(
      `UPDATE users SET status = 'ACTIVE', is_active = TRUE, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
              requested_class_id = NULL
        WHERE user_id = $1`,
      [userId, req.user.user_id]
    );

    await audit(req.user.user_id, "APPROVE_REGISTRATION", { user_id: userId, role }, req, client);
    await client.query("COMMIT");
    res.json({ success: true, message: `${role} account approved and activated.` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Unable to approve registration." });
  } finally {
    client.release();
  }
});

router.delete("/approvals/:userId/approve", async (req, res) => {
  const userId = Number(req.params.userId);
  const { reason } = req.body || {};
  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET status = 'REJECTED', is_active = FALSE, approved_by = $2, approved_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND status = 'PENDING'`,
      [userId, req.user.user_id]
    );
    if (!rowCount) return res.status(404).json({ error: "Registration not found or already processed." });
    await audit(req.user.user_id, "REJECT_REGISTRATION", { user_id: userId, reason: reason || null }, req);
    res.json({ success: true, message: "Registration rejected." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to reject registration." });
  }
});

// ─── Classes ──────────────────────────────────────────────────────────────
router.get("/classes", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.class_id, c.class_name, c.academic_year, c.homeroom_teacher_id,
              t.user_id AS homeroom_teacher_user_id,
              u.full_name AS homeroom_teacher_name,
              (SELECT COUNT(*) FROM students s WHERE s.current_class_id = c.class_id)::int AS student_count
         FROM school_classes c
         LEFT JOIN teachers t ON c.homeroom_teacher_id = t.teacher_id
         LEFT JOIN users u ON t.user_id = u.user_id
         ORDER BY c.class_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classes." });
  }
});

router.post("/classes", async (req, res) => {
  const { class_name, academic_year, homeroom_teacher_id } = req.body || {};
  if (!class_name || !academic_year || !homeroom_teacher_id) {
    return res.status(400).json({ error: "class_name, academic_year, and homeroom_teacher_id are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO school_classes (class_name, academic_year, homeroom_teacher_id)
       VALUES ($1, $2, $3) RETURNING class_id`,
      [class_name, academic_year, homeroom_teacher_id]
    );
    await audit(req.user.user_id, "CREATE_CLASS", { class_id: result.rows[0].class_id }, req);
    res.status(201).json({ class_id: result.rows[0].class_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create class." });
  }
});

router.post("/classes/auto-generate", async (req, res) => {
  const { grade, academic_year, max_per_class, student_numbers } = req.body || {};
  const gradeNum = parseInt(grade, 10);
  if (!gradeNum || !academic_year || !Array.isArray(student_numbers)) {
    return res.status(400).json({ error: "grade, academic_year, and student_numbers are required." });
  }
  const capacity = Math.max(1, parseInt(max_per_class, 10) || 30);

  try {
    const hr = await pool.query(`SELECT MIN(teacher_id) AS tid FROM teachers`);
    const homeroom_teacher_id = hr.rows[0]?.tid || null;
    if (!homeroom_teacher_id) {
      return res.status(400).json({ error: "No teachers exist to assign as homeroom teachers." });
    }

    const nums = [...new Set((student_numbers || []).map((s) => String(s).trim()).filter(Boolean))];
    const classCount = Math.max(1, Math.ceil(nums.length / capacity));
    const created = [];

    for (let i = 0; i < classCount; i++) {
      const class_name = `Grade ${gradeNum} - ${String.fromCharCode(65 + i)}`;
      const r = await pool.query(
        `INSERT INTO school_classes (class_name, academic_year, homeroom_teacher_id)
         VALUES ($1, $2, $3) RETURNING class_id`,
        [class_name, academic_year, homeroom_teacher_id]
      );
      created.push({ class_id: r.rows[0].class_id, class_name });
      await audit(req.user.user_id, "AUTO_GENERATE_CLASS", { class_id: r.rows[0].class_id, class_name }, req);

      const slice = nums.slice(i * capacity, (i + 1) * capacity);
      if (slice.length) {
        await pool.query(
          `UPDATE students SET current_class_id = $1 WHERE student_number = ANY($2) AND current_class_id IS NULL`,
          [r.rows[0].class_id, slice]
        );
      }
    }

    await audit(req.user.user_id, "AUTO_GENERATE_CLASSES", { count: created.length, grade: gradeNum }, req);
    res.status(201).json({ classes: created, count: created.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to auto-generate classes." });
  }
});

router.put("/classes/:id", async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { class_name, academic_year, homeroom_teacher_id } = req.body || {};

  try {
    await pool.query(
      `UPDATE school_classes SET class_name = COALESCE($1, class_name),
              academic_year = COALESCE($2, academic_year),
              homeroom_teacher_id = COALESCE($3, homeroom_teacher_id)
        WHERE class_id = $4`,
      [class_name || null, academic_year || null, homeroom_teacher_id || null, classId]
    );
    await audit(req.user.user_id, "UPDATE_CLASS", { class_id: classId }, req);
    res.json({ message: "Class updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update class." });
  }
});

router.delete("/classes/:id", async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  try {
    await pool.query(`DELETE FROM school_classes WHERE class_id = $1`, [classId]);
    await audit(req.user.user_id, "DELETE_CLASS", { class_id: classId }, req);
    res.json({ message: "Class deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete class. It may still have students." });
  }
});

router.get("/classes/:id/roster", async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query(
      `SELECT s.student_id, u.user_id, u.full_name, u.email, u.phone_number, s.student_number
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         WHERE s.current_class_id = $1
         ORDER BY u.full_name ASC`,
      [classId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch class roster." });
  }
});

// ─── Subjects ─────────────────────────────────────────────────────────────
router.get("/subjects", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM subjects ORDER BY subject_name ASC`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch subjects." });
  }
});

router.post("/subjects", async (req, res) => {
  const { subject_name, subject_code } = req.body || {};
  if (!subject_name || !subject_code) {
    return res.status(400).json({ error: "subject_name and subject_code are required." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO subjects (subject_name, subject_code) VALUES ($1, $2) RETURNING subject_id`,
      [subject_name, subject_code.toUpperCase()]
    );
    await audit(req.user.user_id, "CREATE_SUBJECT", { subject_name }, req);
    res.status(201).json({ subject_id: result.rows[0].subject_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create subject." });
  }
});

router.put("/subjects/:id", async (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  const { subject_name, subject_code } = req.body || {};
  try {
    await pool.query(
      `UPDATE subjects SET subject_name = COALESCE($1, subject_name), subject_code = COALESCE($2, subject_code)
       WHERE subject_id = $3`,
      [subject_name || null, subject_code ? subject_code.toUpperCase() : null, subjectId]
    );
    res.json({ message: "Subject updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update subject." });
  }
});

router.delete("/subjects/:id", async (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  try {
    await pool.query(`DELETE FROM subjects WHERE subject_id = $1`, [subjectId]);
    res.json({ message: "Subject deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete subject." });
  }
});

router.post("/class-subject", async (req, res) => {
  const { class_id, subject_id, teacher_id } = req.body || {};
  if (!class_id || !subject_id || !teacher_id) {
    return res.status(400).json({ error: "class_id, subject_id, and teacher_id are required." });
  }
  try {
    await pool.query(
      `INSERT INTO class_subject (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)
       ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`,
      [class_id, subject_id, teacher_id]
    );
    await audit(req.user.user_id, "ASSIGN_TEACHER", { class_id, subject_id, teacher_id }, req);
    res.status(201).json({ message: "Teacher assigned." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to assign teacher." });
  }
});

router.get("/class-subject", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.class_subject_id, cs.class_id, cs.subject_id, cs.teacher_id,
              c.class_name, s.subject_name, u.full_name AS teacher_name
         FROM class_subject cs
         JOIN school_classes c ON cs.class_id = c.class_id
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         ORDER BY c.class_name, s.subject_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch class-subject assignments." });
  }
});

// ─── Class schedule ───────────────────────────────────────────────────────
router.get("/schedule/:classId", async (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  try {
    const { rows } = await pool.query(
      `SELECT cs.*, s.subject_name, u.full_name AS teacher_name
         FROM class_schedules cs
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         WHERE cs.class_id = $1
         ORDER BY cs.day_of_week, cs.period`,
      [classId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch schedule." });
  }
});

router.post("/schedule", async (req, res) => {
  const { class_id, day_of_week, period, subject_id, teacher_id, room_number, start_time, end_time } = req.body || {};
  if (!class_id || !day_of_week || !period || !subject_id || !teacher_id || !start_time || !end_time) {
    return res.status(400).json({ error: "Missing required schedule fields." });
  }
  try {
    try {
      await pool.query(
        `INSERT INTO class_schedules (class_id, day_of_week, period, subject_id, teacher_id, room_number, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (class_id, day_of_week, period)
         DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id,
                       room_number = EXCLUDED.room_number, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time`,
        [class_id, day_of_week, period, subject_id, teacher_id, room_number || null, start_time, end_time]
      );
    } catch (err) {
      if (err.code !== "42P01") throw err;
      return res.status(500).json({ error: "class_schedules table is not set up yet. Run the latest migrations." });
    }
    res.status(201).json({ message: "Schedule saved." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to save schedule." });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        (SELECT ROUND(AVG(score), 2) FROM grades) AS average_grade,
        (SELECT COUNT(*) FROM attendance_records WHERE status = 'ABSENT')::int AS total_absences,
        (SELECT COUNT(*) FROM attendance_records WHERE status = 'LATE')::int AS total_lates,
        (SELECT COUNT(*) FROM assignments)::int AS total_assignments,
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT')::int AS total_students
    `);

    const teacherPerformance = await pool.query(
      `SELECT u.user_id, u.full_name,
              COUNT(g.grade_id)::int AS graded_assignments,
              ROUND(AVG(g.score), 2) AS average_score
         FROM grades g
         JOIN teachers t ON g.graded_by = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         GROUP BY u.user_id, u.full_name
         ORDER BY average_score DESC NULLS LAST
         LIMIT 20`
    );

    res.json({ summary: summary.rows[0], teacherPerformance: teacherPerformance.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch analytics." });
  }
});

// ─── Audit log & settings ─────────────────────────────────────────────────
router.get("/audit-log", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.full_name AS user_name, u.email AS user_email
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.user_id
         ORDER BY a."timestamp" DESC
         LIMIT 200`  // "timestamp" is quoted (quoted identifier in migration)
    );
    res.json(rows);
  } catch (error) {
    // Fallback if column is created_at (hand-written schema variant).
    try {
      const { rows } = await pool.query(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`
      );
      return res.json(rows);
    } catch {
      console.error(error);
      return res.status(500).json({ error: "Unable to fetch audit log." });
    }
  }
});

router.get("/settings", async (req, res) => {
  try {
    try {
      const { rows } = await pool.query(`SELECT key_name, value FROM system_settings ORDER BY key_name ASC`);
      return res.json(rows);
    } catch (err) {
      if (err.code !== "42P01") throw err;
      return res.json([]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch settings." });
  }
});

router.put("/settings", async (req, res) => {
  const { key_name, value } = req.body || {};
  if (!key_name || value === undefined) {
    return res.status(400).json({ error: "key_name and value are required." });
  }
  try {
    try {
      await pool.query(
        `INSERT INTO system_settings (key_name, value) VALUES ($1, $2)
         ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key_name, JSON.stringify(value)]
      );
    } catch (err) {
      if (err.code !== "42P01") throw err;
    }
    await audit(req.user.user_id, "UPDATE_SETTING", { key_name }, req);
    res.json({ message: "Settings updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update settings." });
  }
});

// ─── Announcements ────────────────────────────────────────────────────────
router.get("/notifications", async (req, res) => {
  try {
    try {
      const { rows } = await pool.query(`SELECT * FROM announcements ORDER BY published_at DESC LIMIT 50`);
      return res.json(rows);
    } catch (err) {
      if (err.code !== "42P01") throw err;
      return res.json([]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.post("/announcements", async (req, res) => {
  const { title, message, target_roles, target_class_id } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ error: "title and message are required." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO announcements (title, message, created_by, target_roles, target_class_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING announcement_id`,
      [title, message, req.user.user_id, target_roles || "ALL", target_class_id || null]
    );
    await audit(req.user.user_id, "CREATE_ANNOUNCEMENT", { announcement_id: result.rows[0].announcement_id }, req);
    res.status(201).json({ announcement_id: result.rows[0].announcement_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create announcement." });
  }
});

module.exports = router;