const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");
const { attachExams, attachClassSubject, attachAcademicRefs } = require("./governance/academicShared");

const router = makeGovernanceRouter({ role: "DEPARTMENT_HEAD", extension: { table: "department_heads" } });

attachAcademicRefs(router);
attachClassSubject(router);
attachExams(router);

router.get("/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM departments ORDER BY name`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch departments." });
  }
});

router.get("/classes", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sc.class_id, sc.class_name, sc.academic_year,
              u.full_name AS homeroom_teacher,
              (SELECT COUNT(*)::int FROM students s WHERE s.current_class_id = sc.class_id) AS student_count
         FROM school_classes sc
         JOIN teachers t ON sc.homeroom_teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
        ORDER BY sc.class_name`
    );
    res.json({ classes: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classes." });
  }
});

router.get("/subjects", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT subject_id, subject_name, subject_code FROM subjects ORDER BY subject_name`);
    res.json({ subjects: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch subjects." });
  }
});

router.get("/teachers", async (req, res) => {
  let department = "";
  try {
    const dh = await pool.query(`SELECT department FROM department_heads WHERE user_id = $1`, [req.user.user_id]);
    department = dh.rows[0]?.department || "";
    const { rows } = await pool.query(
      `SELECT t.teacher_id, t.department AS dept,
              u.full_name, u.email, u.phone_number, u.is_active,
              t.employee_id,
              COUNT(DISTINCT cs.class_subject_id)::int AS workload
         FROM teachers t
         JOIN users u ON t.user_id = u.user_id
         LEFT JOIN class_subject cs ON cs.teacher_id = t.teacher_id
        GROUP BY t.teacher_id, t.department, u.full_name, u.email, u.phone_number, u.is_active, t.employee_id
        ORDER BY u.full_name`
    );
    const teachers = [];
    for (const r of rows) {
      const subjectsRes = await pool.query(
        `SELECT s.subject_name FROM class_subject cs
           JOIN subjects s ON cs.subject_id = s.subject_id
          WHERE cs.teacher_id = $1 ORDER BY s.subject_name`,
        [r.teacher_id]
      );
      const classesRes = await pool.query(
        `SELECT sc.class_name, s.subject_name AS subject
           FROM class_subject cs
           JOIN school_classes sc ON cs.class_id = sc.class_id
           JOIN subjects s ON cs.subject_id = s.subject_id
          WHERE cs.teacher_id = $1 ORDER BY sc.class_name`,
        [r.teacher_id]
      );
      teachers.push({
        teacher_id: r.teacher_id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        department: r.dept || "",
        subjects: subjectsRes.rows.map((x) => x.subject_name),
        grade_levels: [],
        degree_level: null,
        experience_years: null,
        hire_date: null,
        workload: r.workload,
        classes: classesRes.rows,
        status: r.is_active ? "Active" : "Inactive",
        user: { user_id: r.user_id ?? null, full_name: r.full_name, email: r.email },
      });
    }
    res.json({ teachers, department });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch teachers." });
  }
});

router.post("/teachers/assign", async (req, res) => {
  const { teacher_id, class_id, subject_id } = req.body || {};
  if (!teacher_id || !class_id || !subject_id) {
    return res.status(400).json({ error: "teacher_id, class_id and subject_id are required." });
  }
  try {
    await pool.query(
      `INSERT INTO class_subject (class_id, subject_id, teacher_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = $3`,
      [class_id, subject_id, teacher_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to assign course." });
  }
});

router.get("/resources", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.resource_id, r.name, r.type, r.description, r.quantity, r.department, r.status, r.created_at,
              COALESCE((SELECT SUM(ra.quantity) FROM resource_allocations ra
                         WHERE ra.resource_id = r.resource_id AND ra.returned_at IS NULL), 0) AS allocated,
              COALESCE((SELECT json_agg(json_build_object(
                         'teacher', u.full_name,
                         'quantity', ra.quantity,
                         'allocated_at', ra.allocated_at,
                         'returned_at', ra.returned_at)
                         ORDER BY ra.allocated_at DESC)
                          FROM resource_allocations ra
                          LEFT JOIN teachers t ON ra.teacher_id = t.teacher_id
                          LEFT JOIN users u ON t.user_id = u.user_id
                         WHERE ra.resource_id = r.resource_id
                         LIMIT 10), '[]')::json AS allocations
         FROM resources r
        ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch resources." });
  }
});

router.get("/lesson-plans", async (req, res) => {
  try {
    const status = req.query.status;
    let where = "";
    const params = [];
    if (status && ["SUBMITTED", "APPROVED", "REJECTED", "PENDING"].includes(status)) {
      params.push(status);
      where = `WHERE lp.status = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT lp.lesson_plan_id AS plan_id, lp.title, lp.week_number, lp.term, lp.status,
              lp.submitted_at AS submitted_date, lp.reviewed_at, lp.review_comments,
              lp.objectives, lp.materials, lp.activities, lp.assessment,
              u.full_name AS teacher_name, s.subject_name AS subject,
              c.class_name AS class, lp.class_subject_id
         FROM lesson_plans lp
         JOIN teachers t ON lp.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         LEFT JOIN class_subject cs ON lp.class_subject_id = cs.class_subject_id
         LEFT JOIN subjects s ON cs.subject_id = s.subject_id
         LEFT JOIN school_classes c ON cs.class_id = c.class_id
         ${where}
        ORDER BY lp.submitted_at DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch lesson plans." });
  }
});

// Review (approve/reject) a teacher's lesson plan.
router.put("/lesson-plans/:planId", async (req, res) => {
  const planId = Number(req.params.planId);
  const { status, review_comments } = req.body || {};

  if (!Number.isInteger(planId) || planId <= 0) {
    return res.status(400).json({ error: "Invalid lesson plan id." });
  }
  if (!["SUBMITTED", "APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Invalid review status." });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE lesson_plans
          SET status = $1, review_comments = COALESCE($2, review_comments),
              reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $3
        WHERE lesson_plan_id = $4`,
      [status, review_comments || null, req.user.user_id, planId]
    );

    if (!rowCount) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update lesson plan." });
  }
});

module.exports = router;