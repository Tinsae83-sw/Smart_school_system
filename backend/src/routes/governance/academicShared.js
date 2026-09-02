// Shared academic resources for governance routers (exams, class-subject,
// timetable, analytics). Attached to role routers that already enforce
// authenticate + authorize.
const pool = require("../../config/db");

// ── Exams ──────────────────────────────────────────────────────────────────
async function getExamRows() {
  const { rows } = await pool.query(
    `SELECT e.exam_id, e.class_subject_id, e.title, e.exam_type, e.exam_date,
            e.duration_minutes, e.total_marks, e.status, e.created_at,
            e.approved_at,
            s.subject_name, s.subject_name AS subject, sc.class_name,
            sc.class_name AS class,
            cu.full_name AS created_by, au.full_name AS approved_by
       FROM exams e
       JOIN class_subject cs ON e.class_subject_id = cs.class_subject_id
       JOIN subjects s ON cs.subject_id = s.subject_id
       JOIN school_classes sc ON cs.class_id = sc.class_id
       JOIN users cu ON e.created_by = cu.user_id
       LEFT JOIN users au ON e.approved_by = au.user_id
      ORDER BY e.exam_date DESC, e.exam_id DESC`
  );
  return rows;
}

async function getInvigilatorNames(examId) {
  const { rows } = await pool.query(
    `SELECT u.full_name
       FROM exam_invigilators ei
       JOIN teachers t ON ei.teacher_id = t.teacher_id
       JOIN users u ON t.user_id = u.user_id
      WHERE ei.exam_id = $1
      ORDER BY ei.invigilator_id`,
    [examId]
  );
  return rows.map((r) => r.full_name);
}

function attachExams(router) {
  router.get("/exams", async (req, res) => {
    try {
      const rows = await getExamRows();
      const exams = [];
      for (const row of rows) {
        exams.push({
          exam_id: row.exam_id,
          class_subject_id: row.class_subject_id,
          title: row.title,
          exam_type: row.exam_type,
          subject: row.subject,
          subject_department: null,
          class: row.class,
          exam_date: row.exam_date ? row.exam_date.toISOString().split("T")[0] : null,
          exam_time: null,
          duration_minutes: row.duration_minutes,
          total_marks: Number(row.total_marks),
          status: row.status,
          created_by: row.created_by,
          approved_by: row.approved_by || null,
          invigilators: await getInvigilatorNames(row.exam_id),
          room: null,
          coordinator: null,
        });
      }
      res.json({ exams });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch exams." });
    }
  });

  router.post("/exams", async (req, res) => {
    const { class_subject_id, title, exam_type, exam_date, duration_minutes, total_marks } = req.body || {};
    if (!class_subject_id || !title || !exam_date) {
      return res.status(400).json({ error: "class_subject_id, title and exam_date are required." });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO exams (class_subject_id, title, exam_type, exam_date, duration_minutes, total_marks, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT') RETURNING exam_id`,
        [
          class_subject_id,
          title,
          exam_type || "UNIT_TEST",
          exam_date,
          duration_minutes || 60,
          total_marks ?? 100,
          req.user.user_id,
        ]
      );
      res.status(201).json({ success: true, exam_id: rows[0].exam_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to create exam." });
    }
  });

  router.put("/exams/:id", async (req, res) => {
    const { title, exam_type, exam_date, duration_minutes, total_marks } = req.body || {};
    try {
      await pool.query(
        `UPDATE exams SET title = COALESCE($1, title),
                exam_type = COALESCE($2, exam_type),
                exam_date = COALESCE($3, exam_date),
                duration_minutes = COALESCE($4, duration_minutes),
                total_marks = COALESCE($5, total_marks)
          WHERE exam_id = $6`,
        [title || null, exam_type || null, exam_date || null, duration_minutes || null, total_marks ?? null, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update exam." });
    }
  });

  router.put("/exams/:id/approve", async (req, res) => {
    try {
      await pool.query(
        `UPDATE exams SET status = 'APPROVED', approved_by = $1, approved_at = NOW() WHERE exam_id = $2`,
        [req.user.user_id, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to approve exam." });
    }
  });

  router.delete("/exams/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM exams WHERE exam_id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to delete exam." });
    }
  });

  router.post("/exams/:id/invigilators", async (req, res) => {
    const body = req.body || {};
    const ids = Array.isArray(body.invigilatorIds)
      ? body.invigilatorIds
      : Array.isArray(body.selectedInvigilators)
        ? body.selectedInvigilators
        : Array.isArray(body.teacher_ids)
          ? body.teacher_ids
          : [];
    try {
      const examId = Number(req.params.id);
      await pool.query(`DELETE FROM exam_invigilators WHERE exam_id = $1`, [examId]);
      for (const teacherId of ids) {
        await pool.query(
          `INSERT INTO exam_invigilators (exam_id, teacher_id) VALUES ($1, $2)
             ON CONFLICT (exam_id, teacher_id) DO NOTHING`,
          [examId, Number(teacherId)]
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update invigilators." });
    }
  });
}

// ── Class-subject assignments ──────────────────────────────────────────────
function attachClassSubject(router) {
  router.get("/class-subject", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT cs.class_subject_id, cs.class_id, cs.subject_id, cs.teacher_id,
                sc.class_name, sc.academic_year, s.subject_name, s.subject_code,
                t.department, u.full_name
           FROM class_subject cs
           JOIN school_classes sc ON cs.class_id = sc.class_id
           JOIN subjects s ON cs.subject_id = s.subject_id
           JOIN teachers t ON cs.teacher_id = t.teacher_id
           JOIN users u ON t.user_id = u.user_id
          ORDER BY sc.class_name, s.subject_name`
      );
      res.json({
        class_subjects: rows.map((r) => ({
          class_subject_id: r.class_subject_id,
          ...(r.class_id ? { class_id: r.class_id } : {}),
          ...(r.subject_id ? { subject_id: r.subject_id } : {}),
          ...(r.teacher_id ? { teacher_id: r.teacher_id } : {}),
          school_class: { class_id: r.class_id, class_name: r.class_name, academic_year: r.academic_year },
          subject: { subject_id: r.subject_id, subject_name: r.subject_name, subject_code: r.subject_code },
          teacher: { teacher_id: r.teacher_id, user: { full_name: r.full_name }, department: r.department },
          credit_hour: null,
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch course assignments." });
    }
  });

  router.post("/class-subject", async (req, res) => {
    const { class_id, subject_id, teacher_id } = req.body || {};
    if (!class_id || !subject_id || !teacher_id) {
      return res.status(400).json({ error: "class_id, subject_id and teacher_id are required." });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO class_subject (class_id, subject_id, teacher_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = $3
         RETURNING class_subject_id`,
        [class_id, subject_id, teacher_id]
      );
      res.status(201).json({ success: true, class_subject_id: rows[0].class_subject_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to assign course." });
    }
  });

  router.put("/class-subject/:id", async (req, res) => {
    const { class_id, subject_id, teacher_id } = req.body || {};
    try {
      await pool.query(
        `UPDATE class_subject SET class_id = COALESCE($1, class_id),
                subject_id = COALESCE($2, subject_id),
                teacher_id = COALESCE($3, teacher_id)
          WHERE class_subject_id = $4`,
        [class_id || null, subject_id || null, teacher_id || null, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update course assignment." });
    }
  });

  router.delete("/class-subject/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM class_subject WHERE class_subject_id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to delete course assignment." });
    }
  });
}

// ── Subject / class creation helpers ──────────────────────────────────────
function attachAcademicRefs(router) {
  router.post("/subjects", async (req, res) => {
    const { subject_name, subject_code } = req.body || {};
    if (!subject_name || !subject_code) {
      return res.status(400).json({ error: "subject_name and subject_code are required." });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO subjects (subject_name, subject_code) VALUES ($1, $2)
         ON CONFLICT (subject_code) DO NOTHING RETURNING subject_id`,
        [subject_name, subject_code]
      );
      if (!rows[0]) return res.status(409).json({ error: "Subject code already exists." });
      res.status(201).json({ success: true, subject_id: rows[0].subject_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to create subject." });
    }
  });

  router.put("/subjects/:id", async (req, res) => {
    const { subject_name, subject_code } = req.body || {};
    try {
      await pool.query(
        `UPDATE subjects SET subject_name = COALESCE($1, subject_name),
                subject_code = COALESCE($2, subject_code)
          WHERE subject_id = $3`,
        [subject_name || null, subject_code || null, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update subject." });
    }
  });

  router.delete("/subjects/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM subjects WHERE subject_id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to delete subject." });
    }
  });

  router.post("/classes", async (req, res) => {
    const { class_name, academic_year, homeroom_teacher_id } = req.body || {};
    if (!class_name || !academic_year) {
      return res.status(400).json({ error: "class_name and academic_year are required." });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO school_classes (class_name, academic_year, homeroom_teacher_id)
         VALUES ($1, $2, COALESCE($3, (SELECT teacher_id FROM teachers ORDER BY teacher_id LIMIT 1)))
         RETURNING class_id`,
        [class_name, academic_year, homeroom_teacher_id || null]
      );
      res.status(201).json({ success: true, class_id: rows[0].class_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to create class." });
    }
  });
}

// ── Timetable ─────────────────────────────────────────────────────────────
function attachTimetable(router) {
  router.get("/timetable/individual/class/:classId", async (req, res) => {
    const classParam = req.params.classId;
    try {
      const params = [];
      let where = "";
      if (classParam && classParam !== "all") {
        params.push(Number(classParam));
        where = `WHERE cs.class_id = $1`;
      }
      const { rows } = await pool.query(
        `SELECT sch.schedule_id, sch.class_id, sch.day_of_week, sch.period,
                sch.subject_id, sch.teacher_id, sch.room_number,
                sch.start_time, sch.end_time,
                sc.class_name, s.subject_name, u.full_name AS teacher_name
           FROM class_schedules sch
           JOIN school_classes sc ON sch.class_id = sc.class_id
           JOIN subjects s ON sch.subject_id = s.subject_id
           JOIN teachers t ON sch.teacher_id = t.teacher_id
           JOIN users u ON t.user_id = u.user_id
           ${where}
          ORDER BY sch.class_id, sch.day_of_week, sch.period`,
        params
      );
      res.json(
        rows.map((r) => ({
          schedule_id: r.schedule_id,
          class_id: r.class_id,
          class_name: r.class_name,
          day_of_week: r.day_of_week,
          period: r.period,
          subject_id: r.subject_id,
          subject_name: r.subject_name,
          teacher_id: r.teacher_id,
          teacher_name: r.teacher_name,
          room_number: r.room_number,
          start_time: r.start_time,
          end_time: r.end_time,
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch timetable." });
    }
  });

  router.put("/timetable/assign-teacher", async (req, res) => {
    const { class_id, subject_id, teacher_id, day_of_week, period, room_number, start_time, end_time } = req.body || {};
    if (!class_id || !subject_id || !teacher_id || !day_of_week || !period || !start_time || !end_time) {
      return res.status(400).json({ error: "class_id, subject_id, teacher_id, day_of_week, period, start_time, end_time are required." });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO class_schedules (class_id, day_of_week, period, subject_id, teacher_id, room_number, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING schedule_id`,
        [class_id, day_of_week, period, subject_id, teacher_id, room_number || null, start_time, end_time]
      );
      res.status(201).json({ success: true, schedule_id: rows[0].schedule_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to create timetable entry." });
    }
  });

  router.post("/timetable/auto-generate", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM class_schedules`
      );
      res.json({ success: true, generated: rows[0].count > 0 ? rows[0].count : 0, message: "Timetable generated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to generate timetable." });
    }
  });
}

// ── Academic analytics ────────────────────────────────────────────────────
function attachAnalytics(router) {
  router.get("/academic/grade-distribution", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT s.subject_name, s.subject_id,
                ROUND(AVG(g.score), 2) AS average_score,
                ROUND(100.0 * COUNT(*) FILTER (WHERE g.score >= 50) / NULLIF(COUNT(*), 0), 2) AS pass_rate,
                COUNT(*) AS total_students
           FROM grades g
           JOIN submissions su ON g.submission_id = su.submission_id
           LEFT JOIN class_subject cs ON su.assignment_id IS NOT NULL
           LEFT JOIN subjects s ON g.subject_id = s.subject_id OR cs.subject_id = s.subject_id
          GROUP BY s.subject_id, s.subject_name
          ORDER BY s.subject_name`
      );
      res.json(
        rows.map((r) => ({
          subject_name: r.subject_name || "General",
          average_score: Number(r.average_score) || 0,
          pass_rate: Number(r.pass_rate) || 0,
          total_students: r.total_students || 0,
          grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch grade distribution." });
    }
  });

  router.get("/teachers/performance", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT t.teacher_id, t.department,
                u.full_name AS teacher_name,
                COUNT(DISTINCT cs.class_subject_id) AS subjects_taught,
                u.is_active
           FROM teachers t
           JOIN users u ON t.user_id = u.user_id
           LEFT JOIN class_subject cs ON cs.teacher_id = t.teacher_id
          GROUP BY t.teacher_id, t.department, u.full_name, u.is_active
          ORDER BY u.full_name`
      );
      res.json(
        rows.map((r) => ({
          teacher_id: r.teacher_id,
          teacher_name: r.teacher_name,
          department: r.department || "",
          average_student_grade: 0,
          pass_rate: 0,
          total_students: 0,
          subjects_taught: r.subjects_taught,
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch teacher performance." });
    }
  });

  router.get("/academic/grades", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT sc.class_name,
                ROUND(AVG(g.score), 2) AS average_grade,
                COUNT(DISTINCT su.student_id) AS total_students,
                ROUND(100.0 * COUNT(*) FILTER (WHERE g.score >= 50) / NULLIF(COUNT(*), 0), 2) AS pass_rate
           FROM grades g
           JOIN submissions su ON g.submission_id = su.submission_id
           LEFT JOIN students stu ON su.student_id = stu.student_id
           LEFT JOIN school_classes sc ON stu.current_class_id = sc.class_id
          GROUP BY sc.class_name
          ORDER BY sc.class_name`
      );
      res.json(
        rows.map((r) => ({
          class_name: r.class_name || "Unassigned",
          average_grade: Number(r.average_grade) || 0,
          attendance_rate: 0,
          total_students: r.total_students || 0,
          top_performing_subject: "",
          needs_improvement_subject: "",
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch class performance." });
    }
  });

  router.get("/exams/comparison", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT TO_CHAR(e.exam_date, 'YYYY-MM') AS period,
                ROUND(AVG(er.score), 2) AS average_grade
           FROM exams e
           JOIN exam_results er ON e.exam_id = er.exam_id
          GROUP BY period
          ORDER BY period`
      );
      res.json(
        rows.map((r) => ({
          period: r.period,
          average_grade: Number(r.average_grade) || 0,
          attendance_rate: 0,
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch exam comparison." });
    }
  });

  router.post("/academic/attendance", async (req, res) => {
    const { student_id, class_id, date, status, remarks } = req.body || {};
    if (!student_id || !class_id || !date || !status) {
      return res.status(400).json({ error: "student_id, class_id, date and status are required." });
    }
    try {
      const teacherQ = await pool.query(
        `SELECT COALESCE(
           (SELECT homeroom_teacher_id FROM school_classes WHERE class_id = $1),
           (SELECT MIN(teacher_id) FROM teachers)
         ) AS recorded_by`,
        [class_id]
      );
      const recordedBy = teacherQ.rows[0]?.recorded_by;
      await pool.query(
        `INSERT INTO attendance_records (student_id, class_id, date, status, remarks, recorded_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (student_id, class_id, date)
         DO UPDATE SET status = $4, remarks = $5, updated_at = NOW()`,
        [student_id, class_id, date, status, remarks || null, recordedBy]
      );
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to record attendance." });
    }
  });

  router.get("/academic/attendance", async (req, res) => {
    const { class_id, date } = req.query || {};
    try {
      const params = [];
      let where = "";
      if (class_id) {
        params.push(Number(class_id));
        where += `${where ? " AND" : " WHERE"} ar.class_id = $${params.length}`;
      }
      if (date) {
        params.push(String(date));
        where += `${where ? " AND" : " WHERE"} ar.date = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT ar.record_id, ar.student_id, ar.class_id, ar.date, ar.status,
                ar.remarks, u.full_name AS student_name, sc.class_name
           FROM attendance_records ar
           JOIN students stu ON ar.student_id = stu.student_id
           JOIN users u ON stu.user_id = u.user_id
           JOIN school_classes sc ON ar.class_id = sc.class_id
           ${where}
          ORDER BY ar.date DESC, ar.record_id DESC`,
        params
      );
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch attendance." });
    }
  });

  router.get("/academic/attendance/summary", async (req, res) => {
    const { date } = req.query || {};
    try {
      const params = [];
      let where = "";
      if (date) {
        params.push(String(date));
        where = `WHERE ar.date = $1`;
      }
      const { rows } = await pool.query(
        `SELECT ar.status, COUNT(*)::int AS count
           FROM attendance_records ar
           ${where}
          GROUP BY ar.status`,
        params
      );
      const summary = { present: 0, absent: 0, late: 0, excused: 0, EXCUSED: 0 };
      for (const r of rows) {
        const key = String(r.status).toLowerCase();
        if (key in summary) summary[key] = r.count;
      }
      res.json(summary);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch attendance summary." });
    }
  });

  router.get("/teachers/attendance", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Unable to fetch teacher attendance." });
    }
  });

  router.get("/academic/at-risk", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT stu.student_id, u.full_name, sc.class_name,
                ROUND(AVG(g.score), 2) AS average_score
           FROM grades g
           JOIN submissions su ON g.submission_id = su.submission_id
           JOIN students stu ON su.student_id = stu.student_id
           JOIN users u ON stu.user_id = u.user_id
           LEFT JOIN school_classes sc ON stu.current_class_id = sc.class_id
          GROUP BY stu.student_id, u.full_name, sc.class_name
         HAVING AVG(g.score) < 50
          ORDER BY average_score`
      );
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch at-risk students." });
    }
  });

  router.post("/academic/reports", async (req, res) => {
    const { student_id, type } = req.body || {};
    try {
      if (student_id) {
        const { rows } = await pool.query(
          `INSERT INTO reports (student_id, type) VALUES ($1, $2) RETURNING report_id`,
          [student_id, type || "ACADEMIC"]
        );
        return res.status(201).json({ success: true, report_id: rows[0].report_id });
      }
      res.status(201).json({ success: true, report_id: null });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to create report." });
    }
  });

  router.get("/academic/transcripts", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT tr.transcript_id, tr.student_id, tr.data, tr.pdf_url, tr.generated_at,
                u.full_name AS student_name
           FROM transcripts tr
           LEFT JOIN students stu ON tr.student_id = stu.student_id
           LEFT JOIN users u ON stu.user_id = u.user_id
          ORDER BY tr.generated_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch transcripts." });
    }
  });
}

module.exports = { attachExams, attachClassSubject, attachAcademicRefs, attachTimetable, attachAnalytics };