const express = require("express");
const crypto = require("crypto");
const pool = require("../config/db");

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function randomPassword(length = 12) {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64").slice(0, length);
}

async function createAuditLog(client, userId, action, entity, entityId, req) {
  await client.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId || null, action, entity || null, entityId || null, req.ip || null, req.headers["user-agent"] || null]
  );
}

router.get("/dashboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS student_count,
        (SELECT COUNT(*) FROM users WHERE role = 'TEACHER') AS teacher_count,
        (SELECT COUNT(*) FROM users WHERE role = 'PARENT') AS parent_count,
        (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') AS admin_count,
        (SELECT COUNT(*) FROM school_classes) AS class_count,
        (SELECT COUNT(*) FROM users WHERE is_active = FALSE) AS disabled_count,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND role IN ('STUDENT','TEACHER','PARENT')) AS active_users,
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND is_active = FALSE) AS pending_students
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch dashboard metrics." });
  }
});

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
      const isActive = status.toLowerCase() === "active";
      values.push(isActive);
      filters.push(`u.is_active = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const users = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, u.is_active, u.created_at,
              a.employee_id AS admin_employee_id,
              t.department AS teacher_department, t.employee_id AS teacher_employee_id,
              s.student_number, s.enrollment_date, s.current_class_id,
              p.relationship AS parent_relationship
         FROM users u
         LEFT JOIN administrators a ON u.user_id = a.user_id
         LEFT JOIN teachers t ON u.user_id = t.user_id
         LEFT JOIN students s ON u.user_id = s.user_id
         LEFT JOIN parents p ON u.user_id = p.user_id
         ${whereClause}
         ORDER BY u.created_at DESC`,
      values
    );

    res.json(users.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch users." });
  }
});

router.post("/users", async (req, res) => {
  const {
    full_name,
    email,
    phone_number,
    role,
    department,
    employee_id,
    student_number,
    current_class_id,
    relationship,
  } = req.body;

  if (!full_name || !email || !role) {
    return res.status(400).json({ error: "full_name, email, and role are required." });
  }

  const userRole = role.toUpperCase();
  const password = randomPassword(10);
  const password_hash = hashPassword(password);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role)
        VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      [full_name, email, phone_number || null, password_hash, userRole]
    );

    const userId = userResult.rows[0].user_id;

    if (userRole === "ADMIN") {
      await client.query(
        `INSERT INTO administrators (user_id, employee_id, access_level)
          VALUES ($1, $2, $3)`,
        [userId, employee_id || `ADM${userId.toString().padStart(4, "0")}`, "SCHOOL"]
      );
    }

    if (userRole === "TEACHER") {
      await client.query(
        `INSERT INTO teachers (user_id, employee_id, department)
          VALUES ($1, $2, $3)`,
        [userId, employee_id || `TCH${userId.toString().padStart(4, "0")}`, department || null]
      );
    }

    if (userRole === "STUDENT") {
      await client.query(
        `INSERT INTO students (user_id, student_number, enrollment_date, current_class_id)
          VALUES ($1, $2, CURRENT_DATE, $3)`,
        [userId, student_number || `STU${userId.toString().padStart(4, "0")}`, current_class_id || null]
      );
    }

    if (userRole === "PARENT") {
      await client.query(
        `INSERT INTO parents (user_id, relationship)
          VALUES ($1, $2)`,
        [userId, relationship || "Guardian"]
      );
    }

    await createAuditLog(client, userId, "CREATE_USER", "users", userId, req);
    await client.query("COMMIT");

    res.status(201).json({
      user_id: userId,
      password,
      message: "User created successfully. Share the generated password securely.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Unable to create user." });
  } finally {
    client.release();
  }
});

router.put("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { full_name, email, phone_number, role, department, current_class_id } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  try {
    await pool.query(
      `UPDATE users SET full_name = $1, email = $2, phone_number = $3 WHERE user_id = $4`,
      [full_name, email, phone_number || null, userId]
    );

    if (role === "TEACHER") {
      await pool.query(
        `UPDATE teachers SET department = $1 WHERE user_id = $2`,
        [department || null, userId]
      );
    }

    if (role === "STUDENT") {
      await pool.query(
        `UPDATE students SET current_class_id = $1 WHERE user_id = $2`,
        [current_class_id || null, userId]
      );
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent)
         VALUES ($1, 'UPDATE_USER', 'users', $2, $3, $4)`,
      [userId, userId, req.ip || null, req.headers["user-agent"] || null]
    );

    res.json({ message: "User updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update user." });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { is_active } = req.body;

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be provided as a boolean." });
  }

  try {
    await pool.query(`UPDATE users SET is_active = $1 WHERE user_id = $2`, [is_active, userId]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent)
         VALUES ($1, $2, 'users', $3, $4, $5)`,
      [userId, is_active ? "ENABLE_USER" : "DISABLE_USER", userId, req.ip || null, req.headers["user-agent"] || null]
    );
    res.json({ message: `User ${is_active ? "enabled" : "disabled"}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update user status." });
  }
});

router.post("/users/link-parent", async (req, res) => {
  const { student_user_id, parent_user_id, relationship } = req.body;

  if (!student_user_id || !parent_user_id) {
    return res.status(400).json({ error: "student_user_id and parent_user_id are required." });
  }

  try {
    const studentResult = await pool.query(`SELECT student_id FROM students WHERE user_id = $1`, [student_user_id]);
    const parentResult = await pool.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [parent_user_id]);

    if (!studentResult.rowCount || !parentResult.rowCount) {
      return res.status(404).json({ error: "Student or parent not found." });
    }

    const studentId = studentResult.rows[0].student_id;
    const parentId = parentResult.rows[0].parent_id;

    await pool.query(
      `INSERT INTO student_parent (student_id, parent_id, relationship)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, parent_id) DO NOTHING`,
      [studentId, parentId, relationship || null]
    );

    res.json({ message: "Parent linked to student successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to link parent and student." });
  }
});

router.get("/classes", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.class_id, c.class_name, c.academic_year, c.homeroom_teacher_id,
              t.user_id AS homeroom_teacher_user_id,
              u.full_name AS homeroom_teacher_name
         FROM school_classes c
         LEFT JOIN teachers t ON c.homeroom_teacher_id = t.teacher_id
         LEFT JOIN users u ON t.user_id = u.user_id
         ORDER BY c.class_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classes." });
  }
});

router.post("/classes", async (req, res) => {
  const { class_name, academic_year, homeroom_teacher_id } = req.body;

  if (!class_name || !academic_year || !homeroom_teacher_id) {
    return res.status(400).json({ error: "class_name, academic_year, and homeroom_teacher_id are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO school_classes (class_name, academic_year, homeroom_teacher_id)
        VALUES ($1, $2, $3) RETURNING class_id`,
      [class_name, academic_year, homeroom_teacher_id]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent)
         VALUES (NULL, 'CREATE_CLASS', 'school_classes', $1, $2, $3)`,
      [result.rows[0].class_id, req.ip || null, req.headers["user-agent"] || null]
    );

    res.status(201).json({ class_id: result.rows[0].class_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create class." });
  }
});

router.put("/classes/:id", async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { class_name, academic_year, homeroom_teacher_id } = req.body;

  try {
    await pool.query(
      `UPDATE school_classes SET class_name = $1, academic_year = $2, homeroom_teacher_id = $3 WHERE class_id = $4`,
      [class_name, academic_year, homeroom_teacher_id, classId]
    );
    res.json({ message: "Class updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update class." });
  }
});

router.delete("/classes/:id", async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  try {
    await pool.query(`DELETE FROM school_classes WHERE class_id = $1`, [classId]);
    res.json({ message: "Class deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete class." });
  }
});

router.get("/classes/:id/roster", async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  try {
    const result = await pool.query(
      `SELECT s.student_id, u.user_id, u.full_name, u.email, u.phone_number, s.student_number
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         WHERE s.current_class_id = $1
         ORDER BY u.full_name ASC`,
      [classId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch class roster." });
  }
});

router.get("/subjects", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM subjects ORDER BY subject_name ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch subjects." });
  }
});

router.post("/subjects", async (req, res) => {
  const { subject_name, subject_code } = req.body;

  if (!subject_name || !subject_code) {
    return res.status(400).json({ error: "subject_name and subject_code are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO subjects (subject_name, subject_code) VALUES ($1, $2) RETURNING subject_id`,
      [subject_name, subject_code.toUpperCase()]
    );
    res.status(201).json({ subject_id: result.rows[0].subject_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create subject." });
  }
});

router.put("/subjects/:id", async (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  const { subject_name, subject_code } = req.body;

  try {
    await pool.query(
      `UPDATE subjects SET subject_name = $1, subject_code = $2 WHERE subject_id = $3`,
      [subject_name, subject_code.toUpperCase(), subjectId]
    );
    res.json({ message: "Subject updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update subject." });
  }
});

router.delete("/subjects/:id", async (req, res) => {
  const subjectId = parseInt(req.params.id, 10);

  try {
    await pool.query(`DELETE FROM subjects WHERE subject_id = $1`, [subjectId]);
    res.json({ message: "Subject deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete subject." });
  }
});

router.post("/class-subject", async (req, res) => {
  const { class_id, subject_id, teacher_id } = req.body;

  if (!class_id || !subject_id || !teacher_id) {
    return res.status(400).json({ error: "class_id, subject_id, and teacher_id are required." });
  }

  try {
    await pool.query(
      `INSERT INTO class_subject (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)
         ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`,
      [class_id, subject_id, teacher_id]
    );
    res.status(201).json({ message: "Teacher assigned to subject for class." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to assign teacher to class subject." });
  }
});

router.get("/schedule/:classId", async (req, res) => {
  const classId = parseInt(req.params.classId, 10);

  try {
    const result = await pool.query(
      `SELECT cs.*, s.subject_name, u.full_name AS teacher_name
         FROM class_schedules cs
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         WHERE cs.class_id = $1
         ORDER BY cs.day_of_week, cs.period`,
      [classId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch class schedule." });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        (SELECT ROUND(AVG(score), 2) FROM grades) AS average_grade,
        (SELECT COUNT(*) FROM attendance_records WHERE status = 'ABSENT') AS total_absences,
        (SELECT COUNT(*) FROM attendance_records WHERE status = 'LATE') AS total_lates,
        (SELECT COUNT(*) FROM assignments) AS total_assignments,
        (SELECT COUNT(*) FROM reports) AS total_reports
    `);

    const teacherPerformance = await pool.query(
      `SELECT u.user_id, u.full_name,
              COUNT(g.grade_id) AS graded_assignments,
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

router.get("/audit-log", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name AS user_name, u.email AS user_email
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.user_id
         ORDER BY a.created_at DESC
         LIMIT 200`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch audit log." });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(`SELECT key_name, value FROM system_settings ORDER BY key_name ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch settings." });
  }
});

router.put("/settings", async (req, res) => {
  const { key_name, value } = req.body;

  if (!key_name || value === undefined) {
    return res.status(400).json({ error: "key_name and value are required." });
  }

  try {
    await pool.query(
      `INSERT INTO system_settings (key_name, value)
         VALUES ($1, $2)
         ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key_name, value]
    );
    res.json({ message: "Settings updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update settings." });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM announcements ORDER BY published_at DESC LIMIT 50`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.post("/announcements", async (req, res) => {
  const { title, message, target_roles, target_class_id } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "title and message are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO announcements (title, message, created_by, target_roles, target_class_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING announcement_id`,
      [title, message, null, target_roles || "ALL", target_class_id || null]
    );
    res.status(201).json({ announcement_id: result.rows[0].announcement_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create announcement." });
  }
});

router.post("/users/:id/reset-password", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const newPassword = randomPassword(10);
  const password_hash = hashPassword(newPassword);

  try {
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [password_hash, userId]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent)
         VALUES ($1, 'RESET_PASSWORD', 'users', $2, $3, $4)`,
      [userId, userId, req.ip || null, req.headers["user-agent"] || null]
    );
    res.json({ message: "Password reset successfully.", password: newPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to reset password." });
  }
});

module.exports = router;
