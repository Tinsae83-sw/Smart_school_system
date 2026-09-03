const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");
const {
  attachExams,
  attachClassSubject,
  attachAcademicRefs,
  attachTimetable,
  attachAnalytics,
} = require("./governance/academicShared");

const router = makeGovernanceRouter({ role: "VP_ACADEMIC", extension: { table: "vp_academic" } });

attachExams(router);
attachClassSubject(router);
attachAcademicRefs(router);
attachTimetable(router);
attachAnalytics(router);

function gradeLevelFromName(name) {
  if (!name) return 0;
  const m = String(name).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function sectionFromName(name) {
  if (!name) return "";
  const m = String(name).match(/(\d+)\s*([A-Za-z]+)/);
  return m && m[2] ? m[2].trim() : "";
}

// ─── Students ───────────────────────────────────────────────────────────────

router.get("/students", async (req, res) => {
  try {
    const gradeFilter = req.query.grade_level;
    const { rows } = await pool.query(
      `SELECT s.student_id, s.student_number, s.enrollment_date, s.date_of_birth, s.gender,
              u.user_id, u.full_name, u.email, u.phone_number, u.is_active,
              c.class_id, c.class_name
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN school_classes c ON s.current_class_id = c.class_id
        ORDER BY c.class_name NULLS LAST, u.full_name`
    );

    const all = rows.map((r) => ({
      student_id: r.student_id,
      student_number: r.student_number,
      enrollment_date: r.enrollment_date,
      date_of_birth: r.date_of_birth,
      gender: r.gender,
      user: {
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        is_active: r.is_active,
      },
      current_class: r.class_id ? { class_id: r.class_id, class_name: r.class_name } : null,
    }));

    const filtered = gradeFilter
      ? all.filter((s) => gradeLevelFromName(s.current_class?.class_name) === Number(gradeFilter))
      : all;

    const grouped = filtered.reduce((acc, s) => {
      const key = s.current_class?.class_name || "Unassigned";
      (acc[key] = acc[key] || []).push(s);
      return acc;
    }, {});

    res.json({ all: filtered, grouped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch students." });
  }
});

router.get("/students/academic-options", async (req, res) => {
  try {
    const [classesRes, deptsRes] = await Promise.all([
      pool.query(`SELECT class_id, class_name, academic_year FROM school_classes ORDER BY class_name`),
      pool.query(`SELECT department_id, name, code FROM departments WHERE is_active = TRUE ORDER BY name`),
    ]);
    const gradeSet = new Set();
    classesRes.rows.forEach((c) => {
      const g = gradeLevelFromName(c.class_name);
      if (g > 0) gradeSet.add(String(g));
    });
    Array.from(["9", "10", "11", "12"]).forEach((g) => gradeSet.add(g));
    res.json({
      grade_levels: Array.from(gradeSet).sort((a, b) => Number(a) - Number(b)),
      departments: deptsRes.rows,
      classes: classesRes.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch academic options." });
  }
});

router.post("/students/register", async (req, res) => {
  const b = req.body || {};
  try {
    const { hashPassword } = require("../utils/password");
    const fullName = [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(" ") || b.full_name || "Student";
    const email = (b.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Student email is required." });
    if (!b.terms_agreed) return res.status(400).json({ error: "Terms must be agreed." });

    const password = b.password || "Password123!";

    const userRes = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role, phone_number, is_active)
       VALUES ($1, $2, $3, 'STUDENT', $4, TRUE)
       RETURNING user_id`,
      [email, fullName, await hashPassword(password), b.phone_number || null]
    );
    const userId = userRes.rows[0].user_id;

    const studentRes = await pool.query(
      `INSERT INTO students (user_id, student_number, enrollment_date, date_of_birth, gender)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5)
       RETURNING student_id`,
      [userId, b.student_number || `S-${Date.now()}`, b.admission_date || b.enrollment_date || null,
       b.date_of_birth || null, b.gender || "MALE"]
    );
    const studentId = studentRes.rows[0].student_id;

    if (b.current_class_id) {
      await pool.query(`UPDATE students SET current_class_id = $1 WHERE student_id = $2`, [b.current_class_id, studentId]);
    }

    if (b.guardian_name && b.guardian_email) {
      const parentEmail = String(b.guardian_email).trim().toLowerCase();
      const parentPassword = b.guardian_password || "Password123!";
      let parentId = null;
      const exists = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [parentEmail]);
      if (exists.rows.length) {
        const row = await pool.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [exists.rows[0].user_id]);
        parentId = row.rows[0]?.parent_id || null;
        if (!parentId) {
          const p = await pool.query(`INSERT INTO parents (user_id, relationship, address)
                                      VALUES ($1, $2, $3) RETURNING parent_id`,
            [exists.rows[0].user_id, b.relationship || "GUARDIAN", b.home_address || null]);
          parentId = p.rows[0].parent_id;
        }
      } else {
        const pu = await pool.query(
          `INSERT INTO users (email, full_name, password_hash, role, phone_number, is_active)
           VALUES ($1, $2, $3, 'PARENT', $4, TRUE) RETURNING user_id`,
          [parentEmail, b.guardian_name, await hashPassword(parentPassword), b.guardian_phone || null]
        );
        const p = await pool.query(`INSERT INTO parents (user_id, relationship, address)
                                    VALUES ($1, $2, $3) RETURNING parent_id`,
          [pu.rows[0].user_id, b.relationship || "GUARDIAN", b.home_address || null]);
        parentId = p.rows[0].parent_id;
      }
      await pool.query(
        `INSERT INTO student_parent (student_id, parent_id, relationship)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [studentId, parentId, b.relationship || "GUARDIAN"]
      );
    }

    res.status(201).json({ success: true, student_id: studentId, user_id: userId });
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "A user with this email already exists." });
    }
    res.status(500).json({ error: "Unable to register student." });
  }
});

router.put("/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  try {
    const existing = await pool.query(`SELECT user_id FROM students WHERE student_id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Student not found." });
    const userId = existing.rows[0].user_id;

    const fullName = [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(" ") || b.full_name;
    if (fullName) await pool.query(`UPDATE users SET full_name = $1 WHERE user_id = $2`, [fullName, userId]);
    if (b.email) await pool.query(`UPDATE users SET email = $1 WHERE user_id = $2`, [String(b.email).trim().toLowerCase(), userId]);
    if (b.phone_number) await pool.query(`UPDATE users SET phone_number = $1 WHERE user_id = $2`, [b.phone_number, userId]);
    await pool.query(`UPDATE students SET date_of_birth = COALESCE($1, date_of_birth), gender = COALESCE($2, gender)
                       WHERE student_id = $3`,
      [b.date_of_birth || null, b.gender || null, id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update student." });
  }
});

router.delete("/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await pool.query(`SELECT user_id FROM students WHERE student_id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Student not found." });
    await pool.query(`DELETE FROM student_parent WHERE student_id = $1`, [id]);
    await pool.query(`DELETE FROM students WHERE student_id = $1`, [id]);
    await pool.query(`DELETE FROM users WHERE user_id = $1`, [existing.rows[0].user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete student. They may have academic records." });
  }
});

router.put("/students/:id/class", async (req, res) => {
  const id = Number(req.params.id);
  const classId = Number(req.body?.class_id);
  if (!classId) return res.status(400).json({ error: "class_id is required." });
  try {
    await pool.query(`UPDATE students SET current_class_id = $1 WHERE student_id = $2`, [classId, id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to assign class." });
  }
});

router.put("/students/:id/archive", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await pool.query(`SELECT user_id FROM students WHERE student_id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Student not found." });
    await pool.query(`UPDATE users SET is_active = FALSE WHERE user_id = $1`, [existing.rows[0].user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to archive student." });
  }
});

router.get("/parent-student-relationships", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.parent_id, pu.full_name AS parent_name, pu.email AS parent_email, pu.phone_number AS parent_phone,
              p.address, p.relationship AS parent_relationship,
              s.student_id, su.full_name AS student_name, su.email AS student_email, s.student_number,
              c.class_name, sp.relationship AS relationship_to_parent, sp.linked_at
         FROM student_parent sp
         JOIN parents p ON p.parent_id = sp.parent_id
         JOIN users pu ON pu.user_id = p.user_id
         JOIN students s ON s.student_id = sp.student_id
         JOIN users su ON su.user_id = s.user_id
         LEFT JOIN school_classes c ON s.current_class_id = c.class_id
        ORDER BY pu.full_name, s.student_id`
    );

    const byParent = new Map();
    for (const r of rows) {
      if (!byParent.has(r.parent_id)) {
        byParent.set(r.parent_id, {
          parent_id: r.parent_id,
          parent_name: r.parent_name,
          parent_email: r.parent_email,
          parent_phone: r.parent_phone,
          relationship: r.parent_relationship,
          address: r.address,
          students: [],
        });
      }
      byParent.get(r.parent_id).students.push({
        student_id: r.student_id,
        student_name: r.student_name,
        student_email: r.student_email,
        student_number: r.student_number,
        grade: r.class_name ? `Grade ${gradeLevelFromName(r.class_name)}` : "N/A",
        relationship_to_parent: r.relationship_to_parent,
        linked_at: r.linked_at,
      });
    }
    res.json(Array.from(byParent.values()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch parent-student relationships." });
  }
});

// ─── Teachers ───────────────────────────────────────────────────────────────

router.get("/teachers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.teacher_id, t.employee_id, t.department, t.degree_level, t.experience_years, t.gender, t.hire_date,
              u.user_id, u.full_name, u.email, u.phone_number, u.is_active
         FROM teachers t JOIN users u ON t.user_id = u.user_id
        ORDER BY u.full_name`
    );
    res.json(rows.map((r) => ({
      teacher_id: r.teacher_id,
      employee_id: r.employee_id,
      department: r.department,
      degree_level: r.degree_level,
      experience_years: r.experience_years,
      gender: r.gender,
      hire_date: r.hire_date,
      grade_levels: [],
      subjects: [],
      user: {
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        is_active: r.is_active,
      },
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch teachers." });
  }
});

router.put("/teachers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  try {
    const existing = await pool.query(`SELECT user_id FROM teachers WHERE teacher_id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Teacher not found." });
    const userId = existing.rows[0].user_id;
    if (b.full_name) await pool.query(`UPDATE users SET full_name = $1 WHERE user_id = $2`, [b.full_name, userId]);
    if (b.email) await pool.query(`UPDATE users SET email = $1 WHERE user_id = $2`, [String(b.email).trim().toLowerCase(), userId]);
    if (b.phone_number) await pool.query(`UPDATE users SET phone_number = $1 WHERE user_id = $2`, [b.phone_number, userId]);
    await pool.query(
      `UPDATE teachers SET department = COALESCE($1, department),
              degree_level = COALESCE($2, degree_level),
              experience_years = COALESCE($3, experience_years),
              gender = COALESCE($4, gender)
        WHERE teacher_id = $5`,
      [b.department || null, b.degree_level || null,
       b.experience_years != null ? b.experience_years : null, b.gender || null, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update teacher." });
  }
});

router.delete("/teachers/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await pool.query(`SELECT user_id FROM teachers WHERE teacher_id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Teacher not found." });
    await pool.query(`DELETE FROM teachers WHERE teacher_id = $1`, [id]);
    await pool.query(`DELETE FROM users WHERE user_id = $1`, [existing.rows[0].user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete teacher. They may be assigned elsewhere." });
  }
});

router.get("/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT department_id, name, code FROM departments WHERE is_active = TRUE ORDER BY name`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch departments." });
  }
});

// ─── Classes ────────────────────────────────────────────────────────────────

router.get("/classes", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.class_id, c.class_name, c.academic_year, c.homeroom_teacher_id,
              hu.user_id, hu.full_name,
              COUNT(s.student_id)::int AS student_count
         FROM school_classes c
         LEFT JOIN teachers ht ON ht.teacher_id = c.homeroom_teacher_id
         LEFT JOIN users hu ON hu.user_id = ht.user_id
         LEFT JOIN students s ON s.current_class_id = c.class_id
        GROUP BY c.class_id, c.class_name, c.academic_year, c.homeroom_teacher_id, hu.user_id, hu.full_name
        ORDER BY c.class_name`
    );
    res.json(rows.map((r) => ({
      class_id: r.class_id,
      class_name: r.class_name,
      academic_year: r.academic_year,
      grade_level: gradeLevelFromName(r.class_name),
      section: sectionFromName(r.class_name),
      homeroom_teacher: r.user_id ? { user_id: r.user_id, full_name: r.full_name } : null,
      student_count: r.student_count,
      capacity: 40,
      status: "ACTIVE",
      created_at: r.created_at || null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classes." });
  }
});

router.put("/classes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  try {
    await pool.query(
      `UPDATE school_classes
          SET class_name = COALESCE($1, class_name),
              academic_year = COALESCE($2, academic_year),
              homeroom_teacher_id = COALESCE($3, homeroom_teacher_id)
        WHERE class_id = $4`,
      [b.class_name || null, b.academic_year || null,
       b.homeroom_teacher_id || null, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update class." });
  }
});

router.delete("/classes/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await pool.query(`DELETE FROM school_classes WHERE class_id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete class. Students or records may reference it." });
  }
});

// ─── Subjects ───────────────────────────────────────────────────────────────

router.get("/subjects", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT subject_id, subject_name, subject_code FROM subjects ORDER BY subject_name`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch subjects." });
  }
});

module.exports = router;