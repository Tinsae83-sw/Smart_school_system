const express = require("express");
const multer = require("multer");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/password");
const { audit } = require("../utils/audit");
const storage = require("../utils/storage");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate, authorize("TEACHER", "SUPER_ADMIN"));

const CURRENT_YEAR = new Date().getFullYear();

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getClassSubjects(teacherId) {
  const { rows } = await pool.query(
    `SELECT cs.class_subject_id, cs.class_id, cs.subject_id, cs.teacher_id,
            c.class_name, c.academic_year,
            s.subject_name
       FROM class_subject cs
       JOIN school_classes c ON cs.class_id = c.class_id
       JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE cs.teacher_id = $1
      ORDER BY c.class_name, s.subject_name`,
    [teacherId]
  );

  return rows.map((row) => ({
    class_subject_id: row.class_subject_id,
    class_id: row.class_id,
    subject_id: row.subject_id,
    teacher_id: row.teacher_id,
    subject_name: row.subject_name,
    school_class: { class_name: row.class_name, academic_year: row.academic_year },
    subject: { subject_name: row.subject_name },
    class_name: row.class_name,
    subject: { subject_name: row.subject_name },
    subject_name: row.subject_name,
  }));
}

async function getRoster(classId) {
  const { rows } = await pool.query(
    `SELECT s.student_id, s.student_number, u.user_id, u.full_name, u.email,
            c.class_name
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN school_classes c ON s.current_class_id = c.class_id
      WHERE s.current_class_id = $1
      ORDER BY u.full_name ASC`,
    [classId]
  );
  return rows.map((r) => ({
    student_id: r.student_id,
    user_id: r.user_id,
    student_number: r.student_number,
    full_name: r.full_name,
    name: r.full_name,
    email: r.email,
    class_name: r.class_name,
    user: { full_name: r.full_name },
  }));
}

function letterGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ─── Profile & Auth ────────────────────────────────────────────────────────

router.get("/profile", (req, res) => {
  res.json({
    user_id: req.user.user_id,
    full_name: req.user.full_name,
    email: req.user.email,
    phone_number: req.user.phone_number,
    department: req.ext.department || req.user.department || "",
    profile_picture_url: req.user.profile_picture_url || "",
    employee_id: req.ext.employee_id || "",
    role: req.user.role,
  });
});

router.put("/profile", async (req, res) => {
  const { full_name, phone_number, department, profile_picture_url } = req.body || {};
  try {
    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name),
              phone_number = COALESCE($2, phone_number),
              profile_picture_url = COALESCE($3, profile_picture_url)
        WHERE user_id = $4`,
      [full_name || null, phone_number || null, profile_picture_url || null, req.user.user_id]
    );
    if (department) {
      await pool.query(`UPDATE teachers SET department = $1 WHERE teacher_id = $2`, [department, req.ext.teacher_id]);
    }
    await audit(req.user.user_id, "UPDATE_PROFILE", {}, req);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update profile." });
  }
});

router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new passwords are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  try {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (!verifyPassword(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [hashPassword(newPassword), req.user.user_id]);
    await audit(req.user.user_id, "CHANGE_PASSWORD", {}, req);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to change password." });
  }
});

router.post("/upload-profile-picture", async (req, res) => {
  const { profile_picture_url } = req.body || {};
  if (!profile_picture_url) return res.status(400).json({ error: "profile_picture_url is required." });
  try {
    await pool.query(`UPDATE users SET profile_picture_url = $1 WHERE user_id = $2`, [profile_picture_url, req.user.user_id]);
    res.json({ success: true, profile_picture_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to upload profile picture." });
  }
});

// ─── Dashboard ─────────────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  try {
    const myClassSubjects = await getClassSubjects(req.ext.teacher_id);
    const classIds = myClassSubjects.map((c) => c.class_id);

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDayName = dayNames[new Date().getDay()];

    let todayClasses = [];
    if (classIds.length) {
      const { rows } = await pool.query(
        `SELECT cs.schedule_id, cs.class_id, cs.day_of_week, cs.period, cs.room_number,
                cs.start_time, cs.end_time,
                c.class_name, s.subject_name
           FROM class_schedules cs
           JOIN school_classes c ON cs.class_id = c.class_id
           JOIN subjects s ON cs.subject_id = s.subject_id
          WHERE cs.class_id = ANY($1) AND cs.day_of_week = $2
          ORDER BY cs.period ASC`,
        [classIds, todayDayName]
      );
      todayClasses = rows.map((r) => ({
        schedule_id: r.schedule_id,
        class_id: r.class_id,
        class_name: r.class_name,
        subject: r.subject_name,
        room: r.room_number,
        start_time: r.start_time ? String(r.start_time).slice(0, 5) : "",
        end_time: r.end_time ? String(r.end_time).slice(0, 5) : "",
        period: r.period,
      }));
    }

    const ungradedResult = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM submissions su
         JOIN assignments a ON su.assignment_id = a.assignment_id
         LEFT JOIN grades g ON g.submission_id = su.submission_id
        WHERE a.teacher_id = $1 AND g.grade_id IS NULL`,
      [req.ext.teacher_id]
    );
    const ungraded = ungradedResult.rows[0].count;

    const unreadMessages = await pool.query(
      `SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [req.user.user_id]
    );

    const notificationsResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_sent = FALSE`,
      [req.user.user_id]
    );

    const onlineResult = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM live_sessions ls
         JOIN virtual_classes vc ON ls.virtual_class_id = vc.virtual_class_id
         JOIN class_subject cs ON vc.class_subject_id = cs.class_subject_id
        WHERE cs.teacher_id = $1 AND ls.status = 'SCHEDULED' AND ls.scheduled_start > NOW()`,
      [req.ext.teacher_id]
    );

    const totalClasses = myClassSubjects.length;

    let totalStudents = 0;
    const studentIds = new Set();
    if (classIds.length) {
      const studentResult = await pool.query(
        `SELECT s.student_id
           FROM students s
          WHERE s.current_class_id = ANY($1)`,
        [classIds]
      );
      studentResult.rows.forEach((r) => studentIds.add(r.student_id));
      totalStudents = studentIds.size;
    }

    let attendanceRate = 0;
    const attendanceResult = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present
         FROM attendance_records ar
        WHERE ar.student_id = ANY($1)`,
      [Array.from(studentIds)]
    );
    if (attendanceResult.rows[0].total > 0) {
      attendanceRate = Math.round((attendanceResult.rows[0].present / attendanceResult.rows[0].total) * 100);
    }

    let recentActivity = [];
    const activityResult = await pool.query(
      `SELECT sub.submitted_at AS ts, 'submission' AS type, u.full_name AS who
         FROM submissions sub
         JOIN assignments a ON sub.assignment_id = a.assignment_id
         JOIN students su ON sub.student_id = su.student_id
         JOIN users u ON su.user_id = u.user_id
        WHERE a.teacher_id = $1
        ORDER BY sub.submitted_at DESC
        LIMIT 5`,
      [req.ext.teacher_id]
    );
    recentActivity = activityResult.rows.map((r) => ({
      type: "submission",
      description: `${r.who || "A student"} submitted an assignment`,
      timestamp: r.ts,
    }));

    const todaySchedule = todayClasses.map((c) => ({
      ...c,
      class: c.class_name,
      time: c.start_time ? `${c.start_time}-${c.end_time}` : "",
    }));

    res.json({
      stats: {
        totalClasses,
        totalStudents,
        attendanceRate,
        pendingTasks: {
          ungradedSubmissions: ungraded,
          unreadMessages: unreadMessages.rows[0].count,
          upcomingOnlineClasses: onlineResult.rows[0].count,
        },
      },
      todaySchedule,
      recentActivity,
      // Legacy keys kept for any other consumer
      todayClasses,
      todayDayName,
      pendingTasks: {
        ungradedSubmissions: ungraded,
        unreadMessages: unreadMessages.rows[0].count,
        upcomingOnlineClasses: onlineResult.rows[0].count,
      },
      attendanceChart: [],
      classes: myClassSubjects,
      unreadNotifications: notificationsResult.rows[0].count,
      pendingAssignments: ungraded,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
});

// ─── Class management ──────────────────────────────────────────────────────

router.get("/classes", async (req, res) => {
  try {
    res.json(await getClassSubjects(req.ext.teacher_id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classes." });
  }
});

router.get("/classes/:classId/roster", async (req, res) => {
  try {
    res.json(await getRoster(Number(req.params.classId)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch roster." });
  }
});

router.get("/classes/:classId/timetable", async (req, res) => {
  const classId = Number(req.params.classId);
  try {
    const { rows } = await pool.query(
      `SELECT cs.*, s.subject_name, c.class_name, u.full_name AS teacher_name
         FROM class_schedules cs
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN school_classes c ON cs.class_id = c.class_id
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
        WHERE cs.class_id = $1
        ORDER BY cs.day_of_week, cs.period`,
      [classId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch timetable." });
  }
});

// ─── Attendance ────────────────────────────────────────────────────────────

router.get("/attendance", async (req, res) => {
  const classId = Number(req.query.classId);
  const date = req.query.date;
  if (!classId || !date) {
    return res.status(400).json({ error: "classId and date query params are required." });
  }

  try {
    const { rows: records } = await pool.query(
      `SELECT ar.record_id AS attendance_id, ar.class_id, ar."date"::text AS date,
              s.student_id, u.full_name AS student_name, s.student_number,
              ar.status, ar.remarks
         FROM attendance_records ar
         JOIN students s ON ar.student_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
        WHERE ar.class_id = $1 AND ar."date"::text = $2
        ORDER BY u.full_name`,
      [classId, date]
    );

    if (records.length) {
      return res.json({
        attendance_id: records[0].attendance_id,
        class_id: classId,
        date,
        entries: records.map((r) => ({
          student_id: r.student_id,
          student_number: r.student_number,
          student_name: r.student_name,
          name: r.student_name,
          status: r.status,
          remarks: r.remarks || "",
          remark: r.remarks || "",
        })),
      });
    }

    const roster = await getRoster(classId);
    const defaultAttendance = roster.map((student) => ({
      student_id: student.student_id,
      student_number: student.student_number,
      name: student.full_name,
      student_name: student.full_name,
      status: "PRESENT",
      remarks: "",
      remark: "",
    }));
    res.json({ attendance_id: null, class_id: classId, date, entries: defaultAttendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance." });
  }
});

router.post("/attendance", async (req, res) => {
  const { class_id, date, entries } = req.body || {};
  if (!class_id || !date || !Array.isArray(entries)) {
    return res.status(400).json({ error: "class_id, date and entries are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const entry of entries) {
      if (!entry.student_id) continue;
      await client.query(
        `INSERT INTO attendance_records (class_id, student_id, recorded_by, "date", status, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (class_id, student_id, "date")
         DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, recorded_by = EXCLUDED.recorded_by`,
        [class_id, entry.student_id, req.ext.teacher_id, date, entry.status || "PRESENT", entry.remarks || entry.remark || ""]
      );
    }
    await audit(req.user.user_id, "SAVE_ATTENDANCE", { class_id, date, count: entries.length }, req, client);
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Unable to save attendance." });
  } finally {
    client.release();
  }
});

router.get("/attendance/history", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;
  try {
    const clauses = [];
    const values = [];
    if (classId) {
      values.push(classId);
      clauses.push(`ar.class_id = $${values.length}`);
    }
    if (studentId) {
      values.push(studentId);
      clauses.push(`ar.student_id = $${values.length}`);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT ar.record_id AS attendance_id, ar.class_id, ar."date"::text AS date,
              ar.status, ar.remarks,
              u.full_name AS student_name, s.student_number
         FROM attendance_records ar
         JOIN students s ON ar.student_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
         ${whereClause}
         ORDER BY ar."date" DESC`,
      values
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance history." });
  }
});

router.get("/attendance/statistics", async (req, res) => {
  const classId = Number(req.query.classId);
  if (!classId) return res.status(400).json({ error: "classId query param is required." });

  try {
    const { rows } = await pool.query(
      `SELECT s.student_id, u.full_name AS student_name,
              SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
              SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
              SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END)::int AS late,
              COUNT(*)::int AS total
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN attendance_records ar ON ar.student_id = s.student_id AND ar.class_id = $1
        WHERE s.current_class_id = $1
        GROUP BY s.student_id, u.full_name
        ORDER BY u.full_name`,
      [classId]
    );
    const statistics = rows.map((r) => ({
      student_id: r.student_id,
      student_name: r.student_name,
      present: r.present,
      absent: r.absent,
      late: r.late,
      percentage: r.total ? Math.round((r.present / r.total) * 100) : 0,
    }));
    res.json({
      statistics,
      average: statistics.length
        ? Math.round(statistics.reduce((sum, item) => sum + item.percentage, 0) / statistics.length)
        : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance statistics." });
  }
});

router.get("/attendance/chart", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT "date"::text AS date,
              SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
              SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
              SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END)::int AS late,
              COUNT(*)::int AS total
         FROM attendance_records
        WHERE recorded_by = $1
        GROUP BY "date"
        ORDER BY "date" DESC
        LIMIT 10`,
      [req.ext.teacher_id]
    );
    res.json(rows.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance chart." });
  }
});

// ─── Assignments ───────────────────────────────────────────────────────────

async function assignmentShape(row) {
  return {
    assignment_id: row.assignment_id,
    class_subject_id: row.class_subject_id,
    class_id: row.class_id,
    subject_id: row.subject_id,
    title: row.title,
    description: row.description,
    due_date: row.due_date,
    max_score: Number(row.max_score),
    attachments: row.attachments || [],
    created_at: row.created_at,
    teacher_id: row.teacher_id,
    published: !!row.published_at,
    published_at: row.published_at || null,
    allow_resubmission: row.allow_resubmission,
    max_resubmissions: row.max_resubmissions,
    resubmission_deadline: row.resubmission_deadline || null,
    class_name: row.class_name,
    subject_name: row.subject_name,
  };
}

router.get("/assignments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, cs.class_id, s.subject_name, c.class_name
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN school_classes c ON cs.class_id = c.class_id
        WHERE cs.teacher_id = $1
        ORDER BY a.due_date DESC`,
      [req.ext.teacher_id]
    );
    res.json(await Promise.all(rows.map(assignmentShape)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch assignments." });
  }
});

router.post("/assignments", async (req, res) => {
  const { title, description, due_date, max_score, attachments, class_id, class_subject_id } = req.body || {};
  if (!title || !due_date || max_score == null || (!class_id && !class_subject_id)) {
    return res.status(400).json({ error: "Title, due date, max score, and class (id or class_subject_id) are required." });
  }

  try {
    let resolvedClassSubjectId = class_subject_id;
    if (!resolvedClassSubjectId && class_id) {
      const { rows } = await pool.query(
        `SELECT class_subject_id FROM class_subject WHERE class_id = $1 AND teacher_id = $2 LIMIT 1`,
        [class_id, req.ext.teacher_id]
      );
      if (!rows.length) {
        return res.status(400).json({ error: "You are not assigned to this class. Assign the class to your account first." });
      }
      resolvedClassSubjectId = rows[0].class_subject_id;
    }

    const result = await pool.query(
      `INSERT INTO assignments (class_subject_id, title, description, due_date, max_score, attachments, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [resolvedClassSubjectId, title, description || null, due_date, max_score, attachments || [], req.ext.teacher_id]
    );
    await audit(req.user.user_id, "CREATE_ASSIGNMENT", { assignment_id: result.rows[0].assignment_id }, req);
    res.json({ success: true, assignment: await assignmentShape(result.rows[0]) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create assignment." });
  }
});

router.put("/assignments/:assignmentId", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { title, description, due_date, max_score, attachments, published } = req.body || {};

  const client = await pool.connect();
  try {
    const own = await pool.query(
      `SELECT a.assignment_id, a.published_at
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
        WHERE a.assignment_id = $1 AND cs.teacher_id = $2`,
      [assignmentId, req.ext.teacher_id]
    );
    if (!own.rowCount) return res.status(404).json({ error: "Assignment not found." });

    await pool.query(
      `UPDATE assignments SET title = COALESCE($1, title), description = COALESCE($2, description),
              due_date = COALESCE($3, due_date), max_score = COALESCE($4, max_score),
              attachments = COALESCE($5, attachments)
        WHERE assignment_id = $6`,
      [title || null, description || null, due_date || null, max_score ?? null, attachments || null, assignmentId]
    );

    if (published === true) {
      await pool.query(`UPDATE assignments SET published_at = CURRENT_TIMESTAMP WHERE assignment_id = $1`, [assignmentId]);
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Unable to update assignment." });
  } finally {
    client.release();
  }
});

router.delete("/assignments/:assignmentId", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const result = await pool.query(
      `DELETE FROM assignments a USING class_subject cs
        WHERE a.assignment_id = $1 AND a.class_subject_id = cs.class_subject_id AND cs.teacher_id = $2`,
      [assignmentId, req.ext.teacher_id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Assignment not found." });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete assignment." });
  }
});

router.get("/assignments/:assignmentId/submissions", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const { rows } = await pool.query(
      `SELECT su.submission_id, su.assignment_id, su.student_id, su.submitted_at, su.file_url,
              su.is_late, su.resubmission_number, su.feedback_viewed,
              u.full_name AS student_name, s.student_number,
              g.score, g.grade, g.feedback, g.published_at
         FROM submissions su
         JOIN students s ON su.student_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN grades g ON g.submission_id = su.submission_id
        WHERE su.assignment_id = $1
        ORDER BY su.submitted_at DESC`,
      [assignmentId]
    );
    res.json(
      rows.map((r) => ({
        ...r,
        score: r.score == null ? null : Number(r.score),
        published: !!r.published_at,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch submissions." });
  }
});

router.post("/assignments/:assignmentId/grade", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { submission_id, score, grade, feedback, publish } = req.body || {};
  if (!submission_id || score == null || !grade) {
    return res.status(400).json({ error: "submission_id, score, and grade are required." });
  }

  try {
    const sub = await pool.query(
      `SELECT su.submission_id, a.teacher_id
         FROM submissions su
         JOIN assignments a ON su.assignment_id = a.assignment_id
        WHERE su.submission_id = $1 AND su.assignment_id = $2`,
      [submission_id, assignmentId]
    );
    if (!sub.rowCount) return res.status(404).json({ error: "Submission not found." });

    await pool.query(
      `INSERT INTO grades (submission_id, student_id, score, letter_grade, feedback, graded_by, published_at)
       VALUES ($1, (SELECT student_id FROM submissions WHERE submission_id = $1), $2, $3, $4, $5, CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END)
       ON CONFLICT (submission_id)
       DO UPDATE SET score = EXCLUDED.score, letter_grade = EXCLUDED.letter_grade,
                     feedback = EXCLUDED.feedback, graded_by = EXCLUDED.graded_by,
                     published_at = EXCLUDED.published_at`,
      [submission_id, score, grade, feedback || null, req.ext.teacher_id, publish === true]
    );
    await audit(req.user.user_id, "GRADE_SUBMISSION", { submission_id }, req);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to grade submission." });
  }
});

router.post("/assignments/:assignmentId/publish-grades", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { submission_ids } = req.body || {};
  if (!Array.isArray(submission_ids)) {
    return res.status(400).json({ error: "submission_ids array is required." });
  }

  try {
    const result = await pool.query(
      `UPDATE grades g SET published_at = CURRENT_TIMESTAMP
        FROM submissions su JOIN assignments a ON su.assignment_id = a.assignment_id
       WHERE g.submission_id = su.submission_id AND su.assignment_id = $1
         AND su.submission_id = ANY($2) AND g.score IS NOT NULL`,
      [assignmentId, submission_ids]
    );
    res.json({ success: true, published_count: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to publish grades." });
  }
});

// ─── Grades (class mark sheets) ────────────────────────────────────────────

router.get("/grades/:classId", async (req, res) => {
  const classId = Number(req.params.classId);
  try {
    const { rows } = await pool.query(
      `SELECT s.student_id, m.marks, m.total
         FROM students s
         LEFT JOIN student_marks m ON m.student_id = s.student_id AND m.class_id = $1
        WHERE s.current_class_id = $1
        ORDER BY (SELECT full_name FROM users WHERE user_id = s.user_id)`,
      [classId]
    );
    res.json({
      student_marks: rows.map((r) => ({
        student_id: r.student_id,
        marks: r.marks || {},
        total: r.total || 0,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch grades." });
  }
});

router.post("/grades/bulk", async (req, res) => {
  const { grades } = req.body || {};
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: "grades array is required." });
  }

  try {
    for (const entry of grades) {
      if (!entry.student_id || !entry.type || entry.score == null) continue;
      const type = String(entry.type).toUpperCase();
      const { rows } = await pool.query(
        `SELECT student_marks_id, marks FROM student_marks WHERE student_id = $1 AND (class_id IS NOT DISTINCT FROM $2)`,
        [entry.student_id, entry.class_id || null]
      );
      const existing = rows.length ? rows[0].marks || {} : {};
      existing[type] = Number(entry.score);
      const total = Object.values(existing).reduce((sum, v) => sum + Number(v || 0), 0);
      const marksJson = JSON.stringify(existing);
      if (rows.length) {
        await pool.query(`UPDATE student_marks SET marks = $1, total = $2 WHERE student_marks_id = $3`,
          [marksJson, total, rows[0].student_marks_id]);
      } else {
        await pool.query(
          `INSERT INTO student_marks (student_id, class_id, subject_id, marks, total)
           VALUES ($1, $2, NULL, $3, $4)`,
          [entry.student_id, entry.class_id || null, marksJson, total]
        );
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to save grades." });
  }
});

// ─── Conduct & Peer Evaluation ─────────────────────────────────────────────

router.get("/conduct", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  try {
    const { rows } = await pool.query(
      `SELECT cg.conduct_id, s.student_id, u.full_name AS student_name,
              s.current_class_id AS class_id, cg.grade AS conduct, cg.comments AS notes,
              cg.term, cg.academic_year, cg.rating
         FROM conduct_grades cg
         JOIN students s ON cg.student_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
        WHERE ($1::int IS NULL OR s.current_class_id = $1)
        ORDER BY u.full_name`,
      [classId || null]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch conduct records." });
  }
});

router.post("/conduct", async (req, res) => {
  const { student_id, student_name, class_id, conduct, notes } = req.body || {};
  if (!student_id || !conduct || !class_id) {
    return res.status(400).json({ error: "student_id, conduct, and class_id are required." });
  }

  try {
    await pool.query(
      `INSERT INTO conduct_grades (student_id, term, academic_year, grade, rating, teacher_id, comments, graded_at)
       VALUES ($1, $2, $3, $4, 3.00, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, term, academic_year, teacher_id)
       DO UPDATE SET grade = EXCLUDED.grade, comments = EXCLUDED.comments`,
      [student_id, "First Term", String(CURRENT_YEAR), conduct, req.ext.teacher_id, notes || ""]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to save conduct record." });
  }
});

router.post("/conduct/bulk", async (req, res) => {
  const { entries } = req.body || {};
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: "entries array is required." });
  }
  try {
    for (const entry of entries) {
      if (!entry.student_id || !entry.conduct) continue;
      await pool.query(
        `INSERT INTO conduct_grades (student_id, term, academic_year, grade, rating, teacher_id, comments)
         VALUES ($1, 'First Term', $2, $3, 3.00, $4, $5)
         ON CONFLICT (student_id, term, academic_year, teacher_id)
         DO UPDATE SET grade = EXCLUDED.grade, comments = EXCLUDED.comments`,
        [entry.student_id, String(CURRENT_YEAR), entry.conduct, req.ext.teacher_id, entry.notes || ""]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to save conduct records." });
  }
});

router.get("/peer-evaluations", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  try {
    const { rows } = await pool.query(
      `SELECT ef.form_id AS evaluation_id, ef.title, ef.description, ef.criteria AS questions,
              ef.is_active, c.class_id, c.class_name
         FROM peer_evaluation_forms ef
         LEFT JOIN peer_evaluations pe ON pe.form_id = ef.form_id
         LEFT JOIN students s ON s.student_id = pe.evaluatee_id
         LEFT JOIN school_classes c ON ($1::int IS NOT NULL AND c.class_id = $1)
        WHERE $1::int IS NULL OR c.class_id = $1
        GROUP BY ef.form_id, c.class_id, c.class_name
        ORDER BY ef.created_at DESC`,
      [classId || null]
    );
    res.json(
      rows.map((r) => ({
        evaluation_id: r.evaluation_id,
        class_id: r.class_id,
        class_name: r.class_name,
        title: r.title,
        description: r.description,
        due_date: null,
        status: r.is_active ? "OPEN" : "CLOSED",
        questions: r.questions,
        results: [],
        released: r.is_active,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch peer evaluations." });
  }
});

router.post("/peer-evaluations", async (req, res) => {
  const { class_id, title, due_date, questions } = req.body || {};
  if (!class_id || !title) {
    return res.status(400).json({ error: "class_id and title are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO peer_evaluation_forms (title, description, criteria, created_by)
       VALUES ($1, $2, $3, $4) RETURNING form_id`,
      [title, "", questions && questions.length ? JSON.stringify(questions) : "[]", req.user.user_id]
    );
    res.json({
      success: true,
      evaluation: { evaluation_id: rows[0].form_id, class_id, title, due_date: due_date || null, status: "OPEN", questions: questions || [], results: [], released: false },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create peer evaluation." });
  }
});

router.get("/peer-evaluations/:evaluationId/results", async (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  try {
    const form = await pool.query(`SELECT * FROM peer_evaluation_forms WHERE form_id = $1`, [evaluationId]);
    if (!form.rowCount) return res.status(404).json({ error: "Peer evaluation not found." });

    const { rows } = await pool.query(
      `SELECT pe.*, u.full_name AS evaluatee_name, e.full_name AS evaluator_name
         FROM peer_evaluations pe
         JOIN users u ON u.user_id = (SELECT user_id FROM students WHERE student_id = pe.evaluatee_id)
         LEFT JOIN users e ON e.user_id = (SELECT user_id FROM teachers WHERE teacher_id = pe.evaluator_id)
        WHERE pe.form_id = $1`,
      [evaluationId]
    );

    const aggregated = {};
    for (const r of rows) {
      if (!aggregated[r.evaluatee_id]) {
        aggregated[r.evaluatee_id] = { reviewee_id: r.evaluatee_id, reviewee_name: r.evaluatee_name, scores: [], comments: [] };
      }
      aggregated[r.evaluatee_id].scores.push(Number(r.overall_score));
      if (r.comments) aggregated[r.evaluatee_id].comments.push(r.comments);
    }

    const aggregatedResults = Object.values(aggregated).map((entry) => ({
      ...entry,
      average_score: entry.scores.length ? (entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(1) : 0,
    }));

    res.json({
      evaluation: {
        evaluation_id: evaluationId,
        title: form.rows[0].title,
        questions: form.rows[0].criteria,
        status: form.rows[0].is_active ? "OPEN" : "CLOSED",
      },
      aggregatedResults,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch evaluation results." });
  }
});

router.post("/peer-evaluations/:evaluationId/release", async (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  try {
    await pool.query(`UPDATE peer_evaluation_forms SET is_active = TRUE WHERE form_id = $1`, [evaluationId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to release evaluation." });
  }
});

// ─── Online classes (virtual classes + live sessions) ─────────────────────

router.get("/online-classes", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  try {
    const { rows } = await pool.query(
      `SELECT vc.virtual_class_id, vc.title, vc.description, vc.meeting_link,
              ls.scheduled_start, ls.status,
              COALESCE(EXTRACT(EPOCH FROM (ls.scheduled_end - ls.scheduled_start)) / 60, 0)::int AS duration_minutes,
              c.class_name, cs.class_id
         FROM virtual_classes vc
         JOIN class_subject cs ON vc.class_subject_id = cs.class_subject_id
         JOIN school_classes c ON cs.class_id = c.class_id
         LEFT JOIN LATERAL (
           SELECT status, scheduled_start, scheduled_end
             FROM live_sessions
            WHERE virtual_class_id = vc.virtual_class_id
            ORDER BY session_id DESC
            LIMIT 1
         ) ls ON true
        WHERE (vc.created_by = $1 OR cs.teacher_id = $1)
          AND ($2::int IS NULL OR cs.class_id = $2)
        ORDER BY ls.scheduled_start DESC NULLS LAST`,
      [req.ext.teacher_id, classId || null]
    );
    res.json(
      rows.map((r) => ({
        online_class_id: r.virtual_class_id,
        title: r.title,
        description: r.description,
        meeting_link: r.meeting_link,
        status: r.status || "SCHEDULED",
        scheduled_date: r.scheduled_start ? r.scheduled_start.toISOString().slice(0, 10) : null,
        scheduled_time: r.scheduled_start
          ? r.scheduled_start.toISOString().slice(11, 16)
          : null,
        duration_minutes: r.duration_minutes,
        class_id: r.class_id,
        class_name: r.class_name,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch online classes." });
  }
});

router.post("/online-classes", async (req, res) => {
  const { class_id, title, description, scheduled_date, scheduled_time, duration_minutes, meeting_link } = req.body || {};
  if (!class_id || !title) {
    return res.status(400).json({ error: "class_id and title are required." });
  }
  try {
    const classSubject = await pool.query(
      `SELECT class_subject_id FROM class_subject WHERE class_id = $1 AND teacher_id = $2 LIMIT 1`,
      [class_id, req.ext.teacher_id]
    );
    const classSubjectId = classSubject.rows[0]?.class_subject_id;
    if (!classSubjectId) {
      return res.status(403).json({ error: "You do not teach this class." });
    }
    const scheduledAt = scheduled_date
      ? new Date(`${scheduled_date}T${scheduled_time || "00:00:00"}`)
      : new Date();
    const duration = Math.max(Number(duration_minutes) || 60, 1);
    const sessionEnd = new Date(scheduledAt.getTime() + duration * 60000);

    const finalMeetingLink = meeting_link || `https://meet.educonnect.local/${classSubjectId}-${Date.now()}`;
    const inserted = await pool.query(
      `INSERT INTO virtual_classes (class_subject_id, title, description, meeting_link, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING virtual_class_id`,
      [classSubjectId, title, description || null, finalMeetingLink, req.ext.teacher_id]
    );
    const virtualClassId = inserted.rows[0].virtual_class_id;

    await pool.query(
      `INSERT INTO live_sessions (virtual_class_id, title, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, $4, 'SCHEDULED')`,
      [virtualClassId, title, scheduledAt, sessionEnd]
    );

    res.json({ success: true, meeting_id: virtualClassId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create online class." });
  }
});

router.put("/online-classes/:meetingId", async (req, res) => {
  const meetingId = Number(req.params.meetingId);
  const { title, description, meeting_link } = req.body || {};
  try {
    await pool.query(
      `UPDATE virtual_classes vc SET title = COALESCE($1, title), description = COALESCE($2, description),
              meeting_link = COALESCE($3, meeting_link)
        FROM class_subject cs
       WHERE vc.class_subject_id = cs.class_subject_id
         AND vc.virtual_class_id = $4 AND (vc.created_by = $5 OR cs.teacher_id = $5)`,
      [title || null, description || null, meeting_link || null, meetingId, req.ext.teacher_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update online class." });
  }
});

async function teacherOwnsVirtualClass(pool, virtualClassId, teacherId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM virtual_classes vc
      JOIN class_subject cs ON vc.class_subject_id = cs.class_subject_id
     WHERE vc.virtual_class_id = $1 AND (vc.created_by = $2 OR cs.teacher_id = $2)`,
    [virtualClassId, teacherId]
  );
  return rows.length > 0;
}

router.post("/online-classes/:meetingId/start", async (req, res) => {
  const meetingId = Number(req.params.meetingId);
  try {
    if (!(await teacherOwnsVirtualClass(pool, meetingId, req.ext.teacher_id))) {
      return res.status(403).json({ error: "You do not own this online class." });
    }
    await pool.query(
      `UPDATE live_sessions SET status = 'IN_PROGRESS', actual_start = COALESCE(actual_start, NOW())
        WHERE virtual_class_id = $1
        ORDER BY session_id DESC LIMIT 1`,
      [meetingId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to start online class." });
  }
});

router.post("/online-classes/:meetingId/end", async (req, res) => {
  const meetingId = Number(req.params.meetingId);
  try {
    if (!(await teacherOwnsVirtualClass(pool, meetingId, req.ext.teacher_id))) {
      return res.status(403).json({ error: "You do not own this online class." });
    }
    await pool.query(
      `UPDATE live_sessions SET status = 'COMPLETED', actual_end = COALESCE(actual_end, NOW())
        WHERE virtual_class_id = $1
        ORDER BY session_id DESC LIMIT 1`,
      [meetingId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to end online class." });
  }
});

// ─── Performance & analytics ───────────────────────────────────────────────

router.get("/performance", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;

  if (studentId) {
    try {
      const prediction = await pool.query(`SELECT * FROM performance_predictions WHERE student_id = $1 ORDER BY generated_at DESC LIMIT 1`, [studentId]);
      const g = await pool.query(
        `SELECT g.score, g.letter_grade AS grade, g.feedback FROM grades g WHERE g.student_id = $1`,
        [studentId]
      );
      const a = await pool.query(
        `SELECT COUNT(*)::int AS total,
                SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present
           FROM attendance_records WHERE student_id = $1`,
        [studentId]
      );
      const c = await pool.query(
        `SELECT * FROM conduct_grades WHERE student_id = $1 ORDER BY graded_at DESC LIMIT 1`,
        [studentId]
      );
      return res.json({
        student_id: studentId,
        grades: g.rows.map((r) => ({ score: Number(r.score), grade: r.grade, feedback: r.feedback })),
        attendance: {
          rate: a.rows[0].total ? Math.round((a.rows[0].present / a.rows[0].total) * 100) : 0,
          total: a.rows[0].total,
          present: a.rows[0].present,
        },
        conduct: c.rows[0] || null,
        prediction: prediction.rows[0] || null,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Unable to fetch student performance." });
    }
  }

  try {
    let predictions = [];
    let rows = [];
    if (classId) {
      const result = await pool.query(
        `SELECT pp.*, s.student_id, u.full_name AS student_name
           FROM performance_predictions pp
           JOIN students s ON pp.student_id = s.student_id
           JOIN users u ON s.user_id = u.user_id
          WHERE s.current_class_id = $1
          ORDER BY u.full_name`,
        [classId]
      );
      rows = result.rows;

      const summary = await pool.query(
        `SELECT ROUND(AVG(g.score), 1)::text AS avg_score, COUNT(DISTINCT g.student_id)::int AS counted_students
           FROM grades g
           JOIN students s ON g.student_id = s.student_id
          WHERE s.current_class_id = $1`,
        [classId]
      );
      const avg = parseFloat(summary.rows[0].avg_score) || 0;

      predictions = rows.map((r) => ({
        prediction_id: r.prediction_id,
        student_id: r.student_id,
        student_name: r.student_name,
        predicted_grade: r.predicted_grade,
        risk_level: r.risk_level,
        recommendation: r.recommendation,
      }));

      const gd = (letter) => predictions.filter((p) => String(p.predicted_grade || "").startsWith(letter)).length;
      return res.json({
        predictions,
        classSummary: {
          average_score: avg,
          total_students: predictions.length,
          grade_distribution: { A: gd("A"), B: gd("B"), C: gd("C"), D: gd("D"), F: gd("F") },
          risk_summary: {
            LOW: predictions.filter((p) => p.risk_level === "LOW").length,
            MEDIUM: predictions.filter((p) => p.risk_level === "MEDIUM").length,
            HIGH: predictions.filter((p) => p.risk_level === "HIGH").length,
          },
        },
      });
    }

    const result = await pool.query(`SELECT * FROM performance_predictions ORDER BY generated_at DESC LIMIT 100`);
    predictions = result.rows;
    return res.json({ predictions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch performance data." });
  }
});

// ─── Reports ───────────────────────────────────────────────────────────────

async function classReport(classId) {
  const rosterInfo = await pool.query(
    `SELECT s.student_id, u.full_name, COALESCE(AVG(g.score), 0) AS avg_score,
            SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
            COUNT(ar.record_id)::int AS attendance_total
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN grades g ON g.student_id = s.student_id
       LEFT JOIN attendance_records ar ON ar.student_id = s.student_id
      WHERE s.current_class_id = $1
      GROUP BY s.student_id, u.full_name
      ORDER BY avg_score DESC`,
    [classId]
  );

  const subject = await pool.query(
    `SELECT COALESCE(s.subject_name, 'General') AS subject_name,
            ROUND(AVG(m.total), 1)::text AS average,
            MAX(m.total)::text AS highest,
            MIN(m.total)::text AS lowest
       FROM student_marks m
       JOIN students st ON m.student_id = st.student_id
       LEFT JOIN subjects s ON m.subject_id = s.subject_id
      WHERE st.current_class_id = $1
      GROUP BY s.subject_name
      ORDER BY s.subject_name`,
    [classId]
  ).catch(() => ({ rows: [] }));

  const totalStudents = rosterInfo.rows.length;
  const avgAll = totalStudents
    ? rosterInfo.rows.reduce((sum, r) => sum + Number(r.avg_score), 0) / totalStudents
    : 0;
  const passed = rosterInfo.rows.filter((r) => Number(r.avg_score) >= 60).length;
  const topPerformers = rosterInfo.rows.slice(0, 5).map((r) => ({ name: r.full_name, average: Number(r.avg_score).toFixed(1) }));

  return {
    report_id: classId,
    class_id: classId,
    generated_at: new Date().toISOString(),
    class_average: avgAll ? avgAll.toFixed(1) : null,
    total_students: totalStudents,
    pass_rate: totalStudents ? Math.round((passed / totalStudents) * 100) : null,
    subject_performance: subject.rows.map((s) => ({
      subject: s.subject_name,
      average: s.average,
      highest: s.highest,
      lowest: s.lowest,
    })),
    top_performers: topPerformers,
  };
}

async function studentReport(studentId) {
  const g = await pool.query(
    `SELECT s.subject_name AS subject, g.letter_grade AS grade, g.score,
            CASE WHEN g.score >= 60 THEN 'PASS' ELSE 'FAIL' END AS status
       FROM grades g
       LEFT JOIN subjects s ON s.subject_id = g.subject_id
      WHERE g.student_id = $1`,
    [studentId]
  );
  const a = await pool.query(
    `SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present
       FROM attendance_records WHERE student_id = $1`,
    [studentId]
  );
  const avg = g.rows.length ? g.rows.reduce((sum, r) => sum + Number(r.score), 0) / g.rows.length : 0;
  const rank = await pool.query(
    `SELECT rank FROM (
       SELECT s.student_id, RANK() OVER (ORDER BY AVG(g.score) DESC)::int AS rank
         FROM grades g JOIN students s ON g.student_id = s.student_id
        GROUP BY s.student_id
     ) r WHERE r.student_id = $1`,
    [studentId]
  );

  return {
    student_id: studentId,
    generated_at: new Date().toISOString(),
    overall_average: g.rows.length ? avg.toFixed(1) : null,
    class_rank: rank.rows[0] ? rank.rows[0].rank : null,
    attendance_rate: a.rows[0].total ? Math.round((a.rows[0].present / a.rows[0].total) * 100) : null,
    subject_grades: g.rows,
    remarks:
      avg >= 85 ? "Outstanding performance. Keep it up!" :
      avg >= 60 ? "Good performance with room for improvement." :
      "Needs significant improvement. Please seek help.",
  };
}

router.get("/reports", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  try {
    const { rows } = await pool.query(
      `SELECT report_id, type, title, format, file_url, generated_at
         FROM reports
        WHERE ($1::int IS NULL OR class_id = $1) AND (generated_by = $2 OR $3 = TRUE)
        ORDER BY generated_at DESC`,
      [classId || null, req.user.user_id, req.user.role === "SUPER_ADMIN"]
    );
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.post("/reports/generate", async (req, res) => {
  const { class_id, type, format, metrics } = req.body || {};
  if (!class_id || !type) {
    return res.status(400).json({ error: "class_id and type are required." });
  }
  try {
    const report = {
      class_id,
      type,
      title: `${type} - Class ${class_id}`,
      format: format || "PDF",
      file_url: `/reports/${String(type).toLowerCase().replace(/\s+/g, "-")}-class${class_id}.${(format || "PDF").toLowerCase()}`,
      generated_at: new Date().toISOString(),
      metrics: metrics || {},
    };
    const { rows } = await pool.query(
      `INSERT INTO reports (generated_by, type, class_id, title, format, file_url, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING report_id`,
      [req.user.user_id, type, class_id, report.title, report.format, report.file_url, JSON.stringify(report.metrics)]
    );
    res.json({ success: true, report: { ...report, report_id: rows[0].report_id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to generate report." });
  }
});

router.get("/reports/class/:classId", async (req, res) => {
  try {
    res.json(await classReport(Number(req.params.classId)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to generate class report." });
  }
});

router.get("/reports/student/:studentId", async (req, res) => {
  try {
    res.json(await studentReport(Number(req.params.studentId)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to generate student report." });
  }
});

router.get("/reports/:reportId/download", async (req, res) => {
  const reportId = Number(req.params.reportId);
  try {
    const { rows } = await pool.query(`SELECT * FROM reports WHERE report_id = $1`, [reportId]);
    if (!rows.length) return res.status(404).json({ error: "Report not found." });
    res.json({ download_url: rows[0].file_url, format: rows[0].format });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: "Report not found." });
  }
});

// ─── Messages / Communication ──────────────────────────────────────────────

router.get("/messages", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.message_id, m.sender_id, m.receiver_id, m.content, m.timestamp, m.is_read, m.attachment
         FROM messages m
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.timestamp ASC`,
      [req.user.user_id]
    );

    const threads = {};
    for (const m of rows) {
      const otherId = m.sender_id === req.user.user_id ? m.receiver_id : m.sender_id;
      if (!threads[otherId]) {
        const other = await pool.query(
          `SELECT u.user_id, u.full_name, u.role FROM users u WHERE u.user_id = $1`,
          [otherId]
        );
        threads[otherId] = {
          thread_id: otherId,
          recipient_id: otherId,
          recipient_name: other.rows[0] ? other.rows[0].full_name : "User",
          recipient_role: other.rows[0] ? other.rows[0].role : "",
          last_message: "",
          unread: 0,
          read_by_recipient: true,
          messages: [],
        };
      }
      const thread = threads[otherId];
      thread.messages.push({
        sender: m.sender_id === req.user.user_id ? "teacher" : "other",
        body: m.content,
        attachment: m.attachment,
        created_at: m.timestamp,
      });
      thread.last_message = m.content;
      if (m.receiver_id === req.user.user_id && !m.is_read) thread.unread += 1;
    }

    const threadList = Object.values(threads).map((t) => ({
      ...t,
      unread: t.unread, // keep latest unread count at thread level
    }));
    res.json(threadList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch messages." });
  }
});

router.post("/messages", async (req, res) => {
  const { thread_id, body, attachment } = req.body || {};
  if (!thread_id || !body) {
    return res.status(400).json({ error: "thread_id and body are required." });
  }
  try {
    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, attachment)
       VALUES ($1, $2, $3, $4)`,
      [req.user.user_id, thread_id, body, attachment || null]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to send message." });
  }
});

router.post("/messages/new-thread", async (req, res) => {
  const { recipient_id, recipient_name, recipient_role, body, attachment } = req.body || {};
  if (!recipient_id || !body) {
    return res.status(400).json({ error: "recipient_id and body are required." });
  }
  try {
    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, attachment)
       VALUES ($1, $2, $3, $4)`,
      [req.user.user_id, recipient_id, body, attachment || null]
    );
    res.json({
      success: true,
      thread: {
        thread_id: recipient_id,
        recipient_id,
        recipient_name: recipient_name || "User",
        recipient_role: recipient_role || "",
        last_message: body,
        unread: 0,
        read_by_recipient: false,
        messages: [{ sender: "teacher", body, attachment: attachment || null, created_at: new Date().toISOString() }],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to start conversation." });
  }
});

router.post("/messages/:messageId/read", async (req, res) => {
  const messageId = Number(req.params.messageId);
  try {
    await pool.query(`UPDATE messages SET is_read = TRUE WHERE message_id = $1 AND receiver_id = $2`,
      [messageId, req.user.user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to mark message as read." });
  }
});

// ─── Announcements ─────────────────────────────────────────────────────────

router.get("/announcements", async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  try {
    const { rows } = await pool.query(
      `SELECT a.announcement_id, a.title, a.message AS body, a.target_class_id AS class_id,
              a.published_at, u.full_name AS teacher_name
         FROM announcements a
         LEFT JOIN users u ON a.created_by = u.user_id
        WHERE ($1::int IS NULL OR a.target_class_id = $1 OR a.target_roles = 'ALL')
        ORDER BY a.published_at DESC`,
      [classId || null]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.post("/announcements", async (req, res) => {
  const { title, body, class_id } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO announcements (title, message, created_by, target_roles, target_class_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING announcement_id`,
      [title, body, req.user.user_id, class_id ? "CLASS" : "ALL", class_id || null]
    );
    res.json({ success: true, announcement: { announcement_id: rows[0].announcement_id, title, body, class_id: class_id || null } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create announcement." });
  }
});

// ─── Notifications ─────────────────────────────────────────────────────────

router.get("/notifications", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT notification_id, type, content, is_sent AS read, sent_at, metadata
         FROM notifications
        WHERE user_id = $1
        ORDER BY sent_at DESC
        LIMIT 50`,
      [req.user.user_id]
    );
    res.json(rows.map((r) => ({ id: r.notification_id, notification_id: r.notification_id, type: r.type, title: r.type, body: r.content, read: r.read, sent_at: r.sent_at })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch notifications." });
  }
});

router.post("/notifications/read", async (req, res) => {
  const { notificationId } = req.body || {};
  try {
    if (notificationId) {
      await pool.query(`UPDATE notifications SET is_sent = TRUE WHERE notification_id = $1 AND user_id = $2`,
        [notificationId, req.user.user_id]);
    } else {
      await pool.query(`UPDATE notifications SET is_sent = TRUE WHERE user_id = $1`, [req.user.user_id]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update notifications." });
  }
});

router.post("/notifications/:notificationId/read", async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_sent = TRUE WHERE notification_id = $1 AND user_id = $2`,
      [Number(req.params.notificationId), req.user.user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update notification." });
  }
});

// ─── Lesson plans & materials ──────────────────────────────────────────────

function lessonPlanShape(row) {
  return {
    lesson_plan_id: row.lesson_plan_id,
    title: row.title,
    objectives: row.objectives || [],
    materials: row.materials || [],
    activities: row.activities || [],
    assessment: row.assessment,
    week_number: row.week_number,
    term: row.term,
    status: row.status,
    submitted_date: row.reviewed_at || (row.status === "SUBMITTED" ? row.submitted_at : null),
    class_subject: row.class_subject_id
      ? { class_subject_id: row.class_subject_id, school_class: { class_name: row.class_name }, subject: { subject_name: row.subject_name } }
      : undefined,
  };
}

router.get("/lesson-plans", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT lp.*, c.class_name, s.subject_name
         FROM lesson_plans lp
         LEFT JOIN class_subject cs ON lp.class_subject_id = cs.class_subject_id
         LEFT JOIN school_classes c ON cs.class_id = c.class_id
         LEFT JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE lp.teacher_id = $1
        ORDER BY lp.submitted_at DESC`,
      [req.ext.teacher_id]
    );
    res.json(rows.map(lessonPlanShape));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch lesson plans." });
  }
});

router.post("/lesson-plans", async (req, res) => {
  const { class_subject_id, title, objectives, materials, activities, assessment, week_number, term } = req.body || {};
  if (!class_subject_id || !title || !term) {
    return res.status(400).json({ error: "class_subject_id, title, and term are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO lesson_plans (teacher_id, class_subject_id, title, objectives, materials, activities, assessment, week_number, term, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING') RETURNING *`,
      [req.ext.teacher_id, class_subject_id, title, objectives || [], materials || [], activities || [], assessment || null, week_number || null, term]
    );
    const row = rows[0];
    const cls = await pool.query(
      `SELECT c.class_name, s.subject_name FROM class_subject cs
         JOIN school_classes c ON cs.class_id = c.class_id
         JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.class_subject_id = $1`,
      [class_subject_id]
    );
    res.json({ success: true, assignment: lessonPlanShape({ ...row, ...cls.rows[0] }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create lesson plan." });
  }
});

router.post("/lesson-plans/:planId/submit", async (req, res) => {
  const planId = Number(req.params.planId);
  try {
    await pool.query(
      `UPDATE lesson_plans SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP
        WHERE lesson_plan_id = $1 AND teacher_id = $2`,
      [planId, req.ext.teacher_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to submit lesson plan." });
  }
});

// Materials: mapped to the resources inventory.
router.get("/materials", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.resource_id, r.name, r.type, r.description, r.department,
              r.quantity, r.status, r.file_url, r.storage
         FROM resources r
        WHERE r.department = $1 OR r.resource_id IN (
              SELECT ra.resource_id FROM resource_allocations ra WHERE ra.teacher_id = $2
             )
        ORDER BY r.created_at DESC`,
      [req.ext.department || "General", req.ext.teacher_id]
    );
    res.json(rows.map((r) => ({
      material_id: r.resource_id,
      title: r.name,
      description: r.description || "",
      category: r.department,
      file_type: r.type,
      quantity: r.quantity,
      status: r.status,
      file_url: r.file_url || null,
      storage: r.storage || "local",
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch materials." });
  }
});

// Serve a stored study material file (download). Works with local-disk files;
// S3-backed materials should use the public URL returned in `file_url`.
router.get("/materials/:materialId/file", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT resource_id, name, type, file_url FROM resources WHERE resource_id = $1`,
      [Number(req.params.materialId)]
    );
    if (!rows.length) return res.status(404).json({ error: "Material not found." });
    const material = rows[0];
    if (!material.file_url) return res.status(404).json({ error: "This material has no file." });

    if (storage.s3Enabled()) {
      // Redirect to the object's public URL when using S3-compatible storage.
      return res.redirect(material.file_url);
    }

    const stream = await storage.read(material.file_url.replace(/^\/uploads\//, ""));
    const ext = (material.file_url.match(/\.[^.]+$/) || [""])[0];
    res.setHeader("Content-Type", material.type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${material.name}${ext}"`);
    stream.pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: "Unable to serve file." });
  }
});

router.post("/materials", upload.single("file"), async (req, res) => {
  const title = req.body.title;
  if (!title) return res.status(400).json({ error: "title is required." });
  try {
    const description = req.body.description || null;
    const department = req.body.category || req.ext.department || "General";

    let file_url = null;
    let fileStorage = "local";
    if (req.file) {
      const saved = await storage.save(req.file.buffer, {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      file_url = saved.url;
      fileStorage = saved.storage;
    }

    const { rows } = await pool.query(
      `INSERT INTO resources (name, type, description, quantity, department, status, file_url, storage)
       VALUES ($1, $2, $3, 1, $4, 'AVAILABLE', $5, $6) RETURNING resource_id`,
      [title, req.body.file_type || "FILE", description, department, file_url, fileStorage]
    );
    if (req.body.class_id) {
      await pool.query(
        `INSERT INTO resource_allocations (resource_id, teacher_id, quantity, notes)
         VALUES ($1, $2, 1, $3)`,
        [rows[0].resource_id, req.ext.teacher_id, `class ${req.body.class_id}`]
      );
    }
    res.json({ success: true, material_id: rows[0].resource_id, file_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create material." });
  }
});

router.put("/materials/:materialId", async (req, res) => {
  const materialId = Number(req.params.materialId);
  const { title, description, category, file_type } = req.body || {};
  try {
    await pool.query(
      `UPDATE resources SET name = COALESCE($1, name), description = COALESCE($2, description),
              department = COALESCE($3, department), type = COALESCE($4, type)
        WHERE resource_id = $5`,
      [title || null, description || null, category || null, file_type || null, materialId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update material." });
  }
});

router.delete("/materials/:materialId", async (req, res) => {
  try {
    await pool.query(`DELETE FROM resources WHERE resource_id = $1`, [Number(req.params.materialId)]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete material." });
  }
});

// ─── Exams ─────────────────────────────────────────────────────────────────

router.get("/exams", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.exam_id, e.class_subject_id, cs.class_id, c.class_name,
              s.subject_name, e.title, e.exam_type, e.exam_date, e.duration_minutes,
              e.total_marks, e.status, e.created_at
         FROM exams e
         JOIN class_subject cs ON e.class_subject_id = cs.class_subject_id
         JOIN school_classes c ON cs.class_id = c.class_id
         JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.teacher_id = $1
        ORDER BY e.exam_date DESC`,
      [req.ext.teacher_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch exams." });
  }
});

// ─── Activity log & settings ───────────────────────────────────────────────

router.get("/activity-log", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT action_log_id AS id, action_type AS type, description, created_at
         FROM sic_action_logs
        WHERE action_taken_by = $1
        ORDER BY created_at DESC LIMIT 100`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.get("/settings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT value FROM system_settings WHERE key_name = $1`,
      [`teacher_${req.user.user_id}`]
    );
    res.json(rows[0] ? rows[0].value : {});
  } catch {
    res.json({});
  }
});

router.post("/settings", async (req, res) => {
  const { notification_preferences } = req.body || {};
  try {
    await pool.query(
      `INSERT INTO system_settings (key_name, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [`teacher_${req.user.user_id}`, JSON.stringify(notification_preferences || {})]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update settings." });
  }
});

module.exports = router;