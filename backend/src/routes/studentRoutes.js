const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/password");

const router = express.Router();

// ─── Public evaluation endpoints (token-based auth, no login required) ──────

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluation_links (
        link_id SERIAL PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES teachers(teacher_id),
        student_id INTEGER NOT NULL REFERENCES students(student_id),
        form_id INTEGER NOT NULL REFERENCES peer_evaluation_forms(form_id),
        form_type VARCHAR(20) DEFAULT 'comprehensive',
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_evaluations (
        evaluation_id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL UNIQUE REFERENCES evaluation_links(link_id),
        scores JSONB NOT NULL DEFAULT '{}',
        comments TEXT,
        additional_data JSONB DEFAULT '{}',
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Failed to ensure evaluation tables exist:", err.message);
  }
})();

router.get("/evaluation/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT el.link_id, el.token, el.form_type, el.expires_at, el.used,
              t.teacher_id, ut.full_name AS teacher_name,
              s.student_id, us.full_name AS student_name,
              pf.form_id, pf.title, pf.description, pf.criteria
         FROM evaluation_links el
         JOIN teachers t ON el.teacher_id = t.teacher_id
         JOIN users ut ON t.user_id = ut.user_id
         JOIN students s ON el.student_id = s.student_id
         JOIN users us ON s.user_id = us.user_id
         JOIN peer_evaluation_forms pf ON el.form_id = pf.form_id
        WHERE el.token = $1`,
      [token]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Invalid or expired evaluation link." });
    }
    const r = rows[0];
    if (new Date(r.expires_at) < new Date()) {
      return res.status(410).json({ error: "This evaluation link has expired." });
    }
    res.json({
      evaluation: {
        link_id: r.link_id,
        token: r.token,
        teacher: { teacher_id: r.teacher_id, user: { full_name: r.teacher_name } },
        student: { student_id: r.student_id, user: { full_name: r.student_name } },
        form: {
          form_id: r.form_id,
          title: r.title,
          description: r.description,
          criteria: r.criteria,
        },
        form_type: r.form_type,
        expires_at: r.expires_at,
        used: r.used,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load evaluation." });
  }
});

router.post("/evaluation/:token", async (req, res) => {
  const { token } = req.params;
  const { scores, comments, additional_data } = req.body || {};
  try {
    const { rows } = await pool.query(
      `SELECT link_id, used, expires_at FROM evaluation_links WHERE token = $1`,
      [token]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Invalid evaluation link." });
    }
    const link = rows[0];
    if (link.used) {
      return res.status(400).json({ error: "This evaluation has already been submitted." });
    }
    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This evaluation link has expired." });
    }

    await pool.query(
      `INSERT INTO student_evaluations (link_id, scores, comments, additional_data)
       VALUES ($1, $2, $3, $4)`,
      [link.link_id, JSON.stringify(scores || {}), comments || null, JSON.stringify(additional_data || {})]
    );
    await pool.query(`UPDATE evaluation_links SET used = true WHERE link_id = $1`, [link.link_id]);

    res.json({ success: true, message: "Evaluation submitted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to submit evaluation." });
  }
});

// ─── Authenticated routes below ────────────────────────────────────────────

router.use(authenticate, authorize("STUDENT", "SUPER_ADMIN"));

const CURRENT_TERM = "First Term";
const CURRENT_YEAR = String(new Date().getFullYear());

function letterGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ─── Profile ───────────────────────────────────────────────────────────────

router.get("/profile", (req, res) => {
  res.json({
    user_id: req.user.user_id,
    full_name: req.user.full_name,
    email: req.user.email,
    phone_number: req.user.phone_number,
    student_id: req.ext.student_id,
    student_number: req.ext.student_number,
    class_id: req.ext.current_class_id,
    profile_picture_url: req.user.profile_picture_url || "",
    preferred_language: req.ext.preferred_language || req.user.preferred_language || "en",
    role: req.user.role,
  });
});

router.put("/profile", async (req, res) => {
  const { full_name, phone_number, preferred_language } = req.body || {};
  try {
    await pool.query(
      `UPDATE users SET
          full_name = COALESCE($1, full_name),
          phone_number = COALESCE($2, phone_number),
          preferred_language = COALESCE($3, preferred_language)
        WHERE user_id = $4`,
      [full_name || null, phone_number || null, preferred_language || null, req.user.user_id]
    );
    if (preferred_language || phone_number) {
      await pool.query(
        `INSERT INTO student_profiles (student_id, phone_number, home_address, bio)
         VALUES ($1, COALESCE($2, phone_number), NULL, NULL)
         ON CONFLICT DO NOTHING`,
        [req.ext.student_id, phone_number || null]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update profile." });
  }
});

router.put("/profile/picture", async (req, res) => {
  const { profile_picture_url } = req.body || {};
  if (!profile_picture_url) return res.status(400).json({ error: "profile_picture_url is required." });
  try {
    await pool.query(`UPDATE users SET profile_picture_url = $1 WHERE user_id = $2`, [profile_picture_url, req.user.user_id]);
    await pool.query(
      `INSERT INTO student_profiles (student_id, profile_picture_url)
       VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET profile_picture_url = EXCLUDED.profile_picture_url`,
      [req.ext.student_id, profile_picture_url]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update picture." });
  }
});

router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new passwords are required." });
  }
  try {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (!verifyPassword(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [hashPassword(newPassword), req.user.user_id]);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to change password." });
  }
});

// ─── Dashboard ─────────────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  try {
    const studentId = req.ext.student_id;
    const classId = req.ext.current_class_id;

    const upcoming = await pool.query(
      `SELECT a.assignment_id, a.title, a.due_date, a.max_score, s.subject_name AS subject
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.class_id = $1 AND a.due_date > NOW()
        ORDER BY a.due_date ASC
        LIMIT 5`,
      [classId]
    );
    const upcoming_assignments = upcoming.rows.map((r) => ({
      ...r,
      max_score: Number(r.max_score),
    }));

    const recent = await pool.query(
      `SELECT g.grade_id, g.score, g.letter_grade AS grade, g.feedback,
              su.submission_id, a.title AS assignment_title, s2.subject_name AS subject,
              g.graded_at
         FROM grades g
         JOIN submissions su ON g.submission_id = su.submission_id
         JOIN assignments a ON su.assignment_id = a.assignment_id
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         JOIN subjects s2 ON cs.subject_id = s2.subject_id
        WHERE su.student_id = $1 AND g.published_at IS NOT NULL
        ORDER BY g.graded_at DESC
        LIMIT 5`,
      [studentId]
    );
    const recent_grades = recent.rows.map((r) => ({ ...r, score: r.score == null ? null : Number(r.score) }));

    const att = await pool.query(
      `SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present
         FROM attendance_records WHERE student_id = $1`,
      [studentId]
    );
    const total = att.rows[0].total;
    const present = att.rows[0].present;

    res.json({
      student_id: studentId,
      upcoming_assignments,
      recent_grades,
      attendance_summary: {
        present,
        total,
        percentage: total ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
});

// ─── Announcements & notifications ─────────────────────────────────────────

router.get("/announcements", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT announcement_id, title, message AS body, published_at AS created_at
         FROM announcements
        WHERE is_active = TRUE AND (target_roles = 'ALL' OR target_roles LIKE '%STUDENT%' OR target_class_id = $1)
        ORDER BY published_at DESC`,
      [req.ext.current_class_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT notification_id, type, content, is_sent AS read, sent_at, metadata
         FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50`,
      [req.user.user_id]
    );
    res.json(rows.map((r) => ({
      id: r.notification_id,
      notification_id: r.notification_id,
      type: r.type,
      title: r.type,
      body: r.content,
      read: r.read,
      sent_at: r.sent_at,
    })));
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

// ─── Assignments ───────────────────────────────────────────────────────────

router.get("/assignments", async (req, res) => {
  const studentId = req.ext.student_id;
  const classId = req.ext.current_class_id;
  try {
    const { rows } = await pool.query(
      `SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_score, a.attachments,
              a.allow_resubmission, a.max_resubmissions, a.resubmission_deadline,
              s.subject_name AS subject, c.class_id, c.class_name,
              su.submission_id, su.file_url, su.submitted_at, su.is_late,
              g.score, g.letter_grade AS grade, g.feedback, g.published_at
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN school_classes c ON cs.class_id = c.class_id
         LEFT JOIN submissions su ON su.assignment_id = a.assignment_id AND su.student_id = $1
         LEFT JOIN grades g ON g.submission_id = su.submission_id
        WHERE cs.class_id = $2
        ORDER BY a.due_date DESC`,
      [studentId, classId]
    );

    const list = rows.map((r) => {
      let status = "OPEN";
      const submission = r.submission_id
        ? {
            submission_id: r.submission_id,
            file_url: r.file_url,
            submitted_at: r.submitted_at,
            is_late: r.is_late,
            score: r.published_at != null && r.score != null ? Number(r.score) : null,
            grade: r.published_at != null ? r.grade : null,
            feedback: r.published_at != null ? r.feedback : null,
          }
        : null;
      if (submission && submission.score != null) status = "GRADED";
      else if (submission) status = "SUBMITTED";
      else if (new Date(r.due_date) < new Date()) status = "CLOSED";
      return {
        assignment_id: r.assignment_id,
        title: r.title,
        description: r.description,
        due_date: r.due_date,
        max_score: Number(r.max_score),
        attachments: r.attachments || [],
        subject: r.subject,
        class_id: r.class_id,
        class_name: r.class_name,
        allow_resubmission: r.allow_resubmission,
        status,
        submission,
      };
    });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch assignments." });
  }
});

router.post("/assignments/:assignmentId/submit", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const studentId = req.ext.student_id;
  const { file_name, file_size, file_type } = req.body || {};

  if (!file_name) {
    return res.status(400).json({ error: "A file name is required to submit." });
  }

  try {
    const assignment = await pool.query(
      `SELECT due_date, allow_resubmission, max_resubmissions FROM assignments WHERE assignment_id = $1`,
      [assignmentId]
    );
    if (!assignment.rowCount) return res.status(404).json({ error: "Assignment not found." });

    const a = assignment.rows[0];
    const isLate = new Date(a.due_date) < new Date();

    const existing = await pool.query(
      `SELECT submission_id, resubmission_number FROM submissions
        WHERE assignment_id = $1 AND student_id = $2
        ORDER BY resubmission_number DESC LIMIT 1`,
      [assignmentId, studentId]
    );

    const fileUrl = `/uploads/assignments/${assignmentId}/${file_name}`;

    if (existing.rowCount) {
      const baseResub = a.allow_resubmission ? existing.rows[0].resubmission_number + 1 : 0;
      if (!a.allow_resubmission && a.resubmission_deadline && new Date(a.resubmission_deadline) < new Date()) {
        return res.status(400).json({ error: "Resubmission window has closed." });
      }
      if (baseResub > (a.max_resubmissions || 0)) {
        return res.status(400).json({ error: "Resubmission limit reached." });
      }
      await pool.query(
        `INSERT INTO submissions (assignment_id, student_id, file_url, is_late, resubmission_number)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (assignment_id, student_id, resubmission_number)
         DO UPDATE SET file_url = EXCLUDED.file_url, submitted_at = CURRENT_TIMESTAMP, is_late = EXCLUDED.is_late`,
        [assignmentId, studentId, fileUrl, isLate, baseResub]
      );
    } else {
      await pool.query(
        `INSERT INTO submissions (assignment_id, student_id, file_url, is_late, resubmission_number)
         VALUES ($1, $2, $3, $4, 0)`,
        [assignmentId, studentId, fileUrl, isLate]
      );
    }

    res.json({ success: true, message: "Submission successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to submit assignment." });
  }
});

// ─── Attendance ────────────────────────────────────────────────────────────

router.get("/attendance", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ar.record_id AS attendance_id, ar."date"::text AS date, ar.class_id,
              ar.status, ar.remarks AS remark
         FROM attendance_records ar
        WHERE ar.student_id = $1
        ORDER BY ar."date" DESC`,
      [req.ext.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance." });
  }
});

router.get("/attendance/summary", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT TO_CHAR("date", 'YYYY-MM') AS month,
              SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
              SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
              SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END)::int AS late,
              COUNT(*)::int AS total
         FROM attendance_records
        WHERE student_id = $1
        GROUP BY TO_CHAR("date", 'YYYY-MM')
        ORDER BY month DESC`,
      [req.ext.student_id]
    );
    res.json(rows.map((r) => ({ ...r, percentage: r.total ? Math.round((r.present / r.total) * 100) : 0 })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance summary." });
  }
});

// ─── Grades ────────────────────────────────────────────────────────────────

router.get("/grades", async (req, res) => {
  const studentId = req.ext.student_id;
  try {
    const marks = await pool.query(
      `SELECT m.student_marks_id AS mark_id, m.marks, m.class_id, m.subject_id
         FROM student_marks m
        WHERE m.student_id = $1`,
      [studentId]
    );

    const studentMarks = [];
    for (const m of marks.rows) {
      const subjectInfo = m.subject_id
        ? await pool.query(`SELECT subject_name, subject_code FROM subjects WHERE subject_id = $1`, [m.subject_id])
        : { rows: [] };
      const teacher = m.class_id
        ? await pool.query(
            `SELECT u.full_name AS teacher_name, c.class_name FROM class_subject cs
               LEFT JOIN teachers t ON cs.teacher_id = t.teacher_id
               LEFT JOIN users u ON t.user_id = u.user_id
               LEFT JOIN school_classes c ON cs.class_id = c.class_id
              WHERE cs.class_id = $1 LIMIT 1`,
            [m.class_id]
          )
        : { rows: [] };
      const subjectName = subjectInfo.rows[0] ? subjectInfo.rows[0].subject_name : "General";
      const subjectCode = subjectInfo.rows[0] ? subjectInfo.rows[0].subject_code : "";
      const class_name = teacher.rows[0] ? teacher.rows[0].class_name : "";
      const teacher_name = teacher.rows[0] ? teacher.rows[0].teacher_name : "Teacher";
      const entries = Object.entries(m.marks || {});
      entries.forEach(([type, score], index) => {
        studentMarks.push({
          mark_id: m.mark_id * 1000 + index,
          score: Number(score),
          letter_grade: letterGrade(Number(score)),
          subject: subjectName,
          subject_code: subjectCode,
          class_name,
          teacher_name,
          graded_at: new Date().toISOString(),
        });
      });
    }

    const submissions = await pool.query(
      `SELECT su.submission_id, a.title AS assignment_title, s.subject_name AS subject,
              u.full_name AS teacher_name, g.score, a.max_score,
              g.letter_grade AS grade, g.feedback, su.submitted_at
         FROM submissions su
         JOIN assignments a ON su.assignment_id = a.assignment_id
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         JOIN subjects s ON cs.subject_id = s.subject_id
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
         LEFT JOIN grades g ON g.submission_id = su.submission_id AND g.published_at IS NOT NULL
        WHERE su.student_id = $1
        ORDER BY su.submitted_at DESC`,
      [studentId]
    );
    const submissionsList = submissions.rows.map((s) => ({
      submission_id: s.submission_id,
      assignment_title: s.assignment_title,
      subject: s.subject,
      teacher_name: s.teacher_name,
      score: s.score == null ? null : Number(s.score),
      max_score: Number(s.max_score),
      grade: s.grade,
      feedback: s.feedback,
      submitted_at: s.submitted_at,
    }));

    res.json({ studentMarks, submissions: submissionsList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch grades." });
  }
});

// ─── Messages ──────────────────────────────────────────────────────────────

router.get("/messages", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name AS other_name, u.role AS other_role
         FROM messages m
         LEFT JOIN users u ON u.user_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.timestamp ASC`,
      [req.user.user_id]
    );
    res.json(rows.map((m) => ({
      message_id: m.message_id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      content: m.content,
      timestamp: m.timestamp,
      is_read: m.is_read,
      attachment: m.attachment,
      other_name: m.other_name,
      other_role: m.other_role,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch messages." });
  }
});

router.post("/messages", async (req, res) => {
  const { recipient_id, content } = req.body || {};
  if (!recipient_id || !content) {
    return res.status(400).json({ error: "recipient_id and content are required." });
  }
  try {
    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)`,
      [req.user.user_id, recipient_id, content]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to send message." });
  }
});

// ─── Conduct & peer evaluation ─────────────────────────────────────────────

router.get("/conduct", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cg.conduct_id, cg.grade AS conduct, cg.rating, cg.term, cg.academic_year,
              cg.comments AS notes, cg.graded_at
         FROM conduct_grades cg
        WHERE cg.student_id = $1
        ORDER BY cg.graded_at DESC`,
      [req.ext.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch conduct." });
  }
});

router.get("/conduct/history", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cg.conduct_id, cg.grade, cg.rating, cg.term, cg.academic_year, cg.graded_at
         FROM conduct_grades cg
        WHERE cg.student_id = $1
        ORDER BY cg.graded_at DESC`,
      [req.ext.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch conduct history." });
  }
});

router.get("/peer-evaluations", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT form_id, title, description, criteria, is_active, created_at
         FROM peer_evaluation_forms
        ORDER BY created_at DESC`
    );
    res.json(rows.map((r) => ({
      evaluation_id: r.form_id,
      title: r.title,
      description: r.description,
      due_date: "Ongoing",
      status: r.is_active ? "OPEN" : "CLOSED",
      questions: r.criteria || [],
      released: !!r.is_active,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch peer evaluations." });
  }
});

router.get("/peer-evaluations/:evaluationId/results", async (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  const studentId = req.ext.student_id;
  try {
    const rows = await pool.query(
      `SELECT spe.overall_rating AS score, spe.comments, spe.is_anonymous,
              u.full_name AS reviewer_name
         FROM student_peer_evaluations spe
         JOIN students s ON spe.evaluator_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
        WHERE spe.student_id = $1`,
      [studentId]
    );
    res.json({
      my_results: rows.rows.map((r) => ({
        reviewer_name: r.is_anonymous ? "Anonymous" : r.reviewer_name,
        score: Number(r.score),
        comments: r.comments,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch evaluation results." });
  }
});

// ─── Classmates (same class, used by conduct & peer evaluations) ────────────

router.get("/classmates", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.student_id, u.full_name
         FROM students s
         JOIN users u ON s.user_id = u.user_id
        WHERE s.current_class_id = $1 AND s.student_id <> $2
        ORDER BY u.full_name`,
      [req.ext.current_class_id, req.ext.student_id]
    );
    res.json(rows.map((r) => ({ id: r.student_id, name: r.full_name })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch classmates." });
  }
});

router.post("/peer-evaluations/:evaluationId/submit", async (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  const revieweeId = Number(req.body?.reviewee_id);
  const { score, comments } = req.body || {};
  if (!evaluationId || !revieweeId || score == null) {
    return res.status(400).json({ error: "evaluation id, reviewee_id and score are required." });
  }
  try {
    const form = await pool.query(
      `SELECT form_id, criteria FROM peer_evaluation_forms WHERE form_id = $1 AND is_active = TRUE`,
      [evaluationId]
    );
    if (!form.rowCount) return res.status(404).json({ error: "Peer evaluation is closed." });

    const s = Number(score);
    const distributed = s / 4;
    await pool.query(
      `INSERT INTO student_peer_evaluations
        (student_id, evaluator_id, class_id, term, academic_year,
         teamwork_score, participation_score, collaboration_score, respect_score,
         overall_rating, comments, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $6, $6, $7, TRUE)
       ON CONFLICT (student_id, evaluator_id, term, academic_year)
       DO UPDATE SET teamwork_score = EXCLUDED.teamwork_score,
                     participation_score = EXCLUDED.participation_score,
                     collaboration_score = EXCLUDED.collaboration_score,
                     respect_score = EXCLUDED.respect_score,
                     overall_rating = EXCLUDED.overall_rating,
                     comments = EXCLUDED.comments,
                     submitted_at = CURRENT_TIMESTAMP`,
      [revieweeId, req.ext.student_id, req.ext.current_class_id, CURRENT_TERM, CURRENT_YEAR, distributed.toFixed(2), comments || null]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to submit review." });
  }
});

// ─── Learning center ───────────────────────────────────────────────────────

router.get("/virtual-classes", async (req, res) => {
  const classId = req.ext.current_class_id;
  try {
    const classes = await pool.query(
      `SELECT vc.*, s.subject_name
         FROM virtual_classes vc
         JOIN class_subject cs ON vc.class_subject_id = cs.class_subject_id
         LEFT JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.class_id = $1
        ORDER BY vc.created_at DESC`,
      [classId]
    );

    const sessionRows = await pool.query(
      `SELECT ls.* FROM live_sessions ls
         JOIN virtual_classes vc ON ls.virtual_class_id = vc.virtual_class_id
         JOIN class_subject cs ON vc.class_subject_id = cs.class_subject_id
        WHERE cs.class_id = $1
        ORDER BY ls.scheduled_start DESC`,
      [classId]
    );

    const virtualClasses = classes.rows.map((r) => ({
      virtual_class_id: r.virtual_class_id,
      title: r.subject_name ? `${r.subject_name} - ${r.title}` : r.title,
      description: r.description,
      meeting_link: r.meeting_link,
      is_active: r.is_active,
    }));
    const liveSessions = sessionRows.rows.map((r) => ({
      session_id: r.session_id,
      virtual_class_id: r.virtual_class_id,
      title: r.title,
      scheduled_start: r.scheduled_start,
      scheduled_end: r.scheduled_end,
      status: r.status,
      recording_url: r.recording_url,
    }));

    res.json({ virtualClasses, liveSessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch virtual classes." });
  }
});

router.get("/course-materials", async (req, res) => {
  const classId = req.ext.current_class_id;
  try {
    const { rows } = await pool.query(
      `SELECT cm.material_id, cm.title, cm.description, cm.material_type, cm.file_url,
              cm.file_size, cm.duration_minutes, cm."order"
         FROM course_materials cm
         JOIN class_subject cs ON cm.class_subject_id = cs.class_subject_id
        WHERE cs.class_id = $1 AND cm.is_published = TRUE
        ORDER BY cm."order" ASC`,
      [classId]
    );

    const progress = await pool.query(
      `SELECT material_id, completed, completion_percentage, time_spent_minutes
         FROM material_progress WHERE student_id = $1`,
      [req.ext.student_id]
    );
    const progressMap = {};
    for (const p of progress.rows) {
      progressMap[p.material_id] = {
        completed: p.completed,
        completion_percentage: Number(p.completion_percentage),
        time_spent_minutes: p.time_spent_minutes,
      };
    }

    const materials = rows.map((r) => ({
      material_id: r.material_id,
      title: r.title,
      description: r.description,
      material_type: r.material_type,
      file_url: r.file_url,
      duration_minutes: r.duration_minutes,
      order: r.order,
    }));

    res.json({ materials, progress: progressMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch course materials." });
  }
});

router.get("/ai-books", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.book_id, b.title, b.author, s.subject_name AS subject, b.grade_level,
              b.description, b.cover_image_url
         FROM ai_books b
         LEFT JOIN subjects s ON b.subject_id = s.subject_id
        WHERE b.is_active = TRUE
        ORDER BY b.title ASC`
    );
    const progress = await pool.query(
      `SELECT book_id, current_page, total_pages, completion_percentage
         FROM book_progress WHERE student_id = $1`,
      [req.ext.student_id]
    );
    const progressMap = {};
    for (const p of progress.rows) {
      progressMap[p.book_id] = {
        current_page: p.current_page,
        total_pages: p.total_pages,
        completion_percentage: Number(p.completion_percentage),
      };
    }
    const books = rows.map((r) => ({
      book_id: r.book_id,
      title: r.title,
      author: r.author,
      subject: r.subject || "General",
      grade_level: r.grade_level,
      description: r.description,
      cover_image_url: r.cover_image_url,
    }));
    res.json({ books, progress: progressMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch AI books." });
  }
});

// ─── Notes, materials & books ──────────────────────────────────────────────

router.get("/notes", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT note_id, title, content, subject, tags, created_at, updated_at
         FROM student_notes WHERE student_id = $1 ORDER BY updated_at DESC`,
      [req.ext.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch notes." });
  }
});

router.post("/notes", async (req, res) => {
  const { title, content, subject } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: "Title and content are required." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO student_notes (student_id, title, content, subject) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.ext.student_id, title, content, subject || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to save note." });
  }
});

router.put("/notes/:noteId", async (req, res) => {
  const noteId = Number(req.params.noteId);
  const { title, content, subject } = req.body || {};
  try {
    await pool.query(
      `UPDATE student_notes SET title = COALESCE($1, title), content = COALESCE($2, content),
              subject = COALESCE($3, subject), updated_at = CURRENT_TIMESTAMP
        WHERE note_id = $4 AND student_id = $5`,
      [title || null, content || null, subject || null, noteId, req.ext.student_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update note." });
  }
});

router.delete("/notes/:noteId", async (req, res) => {
  try {
    await pool.query(`DELETE FROM student_notes WHERE note_id = $1 AND student_id = $2`,
      [Number(req.params.noteId), req.ext.student_id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete note." });
  }
});

router.get("/materials", async (req, res) => {
  const classId = req.ext.current_class_id;
  try {
    const { rows } = await pool.query(
      `SELECT cm.material_id, cm.title, cm.description, cm.material_type AS file_type,
              cm.file_url, s.subject_name, c.class_name, cm.duration_minutes, cm.created_at AS uploaded_at
         FROM course_materials cm
         JOIN class_subject cs ON cm.class_subject_id = cs.class_subject_id
         LEFT JOIN subjects s ON cs.subject_id = s.subject_id
         LEFT JOIN school_classes c ON cs.class_id = c.class_id
        WHERE cs.class_id = $1 AND cm.is_published = TRUE
        ORDER BY cm."order" ASC LIMIT 50`,
      [classId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch materials." });
  }
});

router.get("/books", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.book_id, b.title, b.author, s.subject_name AS subject, b.grade_level,
              b.description, b.cover_image_url
         FROM ai_books b
         LEFT JOIN subjects s ON b.subject_id = s.subject_id
        WHERE b.is_active = TRUE
        ORDER BY b.title ASC`
    );
    res.json(rows.map((r) => ({ ...r, subject_name: r.subject })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch books." });
  }
});

router.get("/books/access-log", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bal.access_id, bal.accessed_at, b.book_id, b.title, s.subject_name AS subject_name
         FROM book_access_logs bal
         JOIN ai_books b ON bal.book_id = b.book_id
         LEFT JOIN subjects s ON b.subject_id = s.subject_id
        WHERE bal.student_id = $1
        ORDER BY bal.accessed_at DESC LIMIT 50`,
      [req.ext.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch access log." });
  }
});

router.post("/books/:bookId/access", async (req, res) => {
  const bookId = Number(req.params.bookId);
  try {
    const book = await pool.query(`SELECT book_id FROM ai_books WHERE book_id = $1`, [bookId]);
    if (!book.rowCount) return res.status(404).json({ error: "Book not found." });
    await pool.query(
      `INSERT INTO book_access_logs (student_id, book_id) VALUES ($1, $2)`,
      [req.ext.student_id, bookId]
    );
    await pool.query(
      `INSERT INTO book_progress (book_id, student_id, current_page, total_pages, completion_percentage)
       VALUES ($1, $2, 1, 0, 0)
       ON CONFLICT DO NOTHING`,
      [bookId, req.ext.student_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to log book access." });
  }
});

module.exports = router;