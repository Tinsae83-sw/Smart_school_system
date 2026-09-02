const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate, authorize("PARENT", "SUPER_ADMIN"));

async function loadChildOr404(req, res) {
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId)) {
    res.status(400).json({ error: "Invalid child id." });
    return null;
  }
  const { rows } = await pool.query(
    `SELECT sp.student_id, u.full_name, s.student_number, c.class_id, c.class_name,
            'Smart Valley Academy' AS school_name
       FROM student_parent sp
       JOIN students s ON sp.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN school_classes c ON s.current_class_id = c.class_id
      WHERE sp.parent_id = $1 AND sp.student_id = $2`,
    [req.ext.parent_id, childId]
  );
  if (!rows.length) {
    res.status(404).json({ error: "Child not linked to this account." });
    return null;
  }
  return rows[0];
}

// ─── Profile ───────────────────────────────────────────────────────────────

router.get("/profile", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.preferred_language,
              u.profile_picture_url, p.parent_id, p.relationship, pa.address
         FROM users u
         JOIN parents p ON p.user_id = u.user_id
         LEFT JOIN parents pa ON pa.parent_id = p.parent_id
        WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    const row = rows[0] || {};
    res.json({
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      phone_number: row.phone_number,
      preferred_language: row.preferred_language,
      profile_picture_url: row.profile_picture_url,
      parent_id: row.parent_id,
      relationship: row.relationship,
      address: row.address,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch profile." });
  }
});

router.put("/profile", async (req, res) => {
  const { full_name, phone_number, preferred_language, relationship, address } = req.body || {};
  try {
    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name),
              phone_number = COALESCE($2, phone_number),
              preferred_language = COALESCE($3, preferred_language)
        WHERE user_id = $4`,
      [full_name || null, phone_number || null, preferred_language || null, req.user.user_id]
    );
    await pool.query(
      `UPDATE parents SET relationship = COALESCE($1, relationship), address = COALESCE($2, address)
        WHERE parent_id = $3`,
      [relationship || null, address || null, req.ext.parent_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update profile." });
  }
});

router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required." });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  try {
    const { verifyPassword, hashPassword } = require("../utils/password");
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (!(await verifyPassword(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [
      await hashPassword(newPassword),
      req.user.user_id,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to change password." });
  }
});

// ─── Children ──────────────────────────────────────────────────────────────

router.get("/children", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sp.student_id, u.full_name, s.student_number,
              c.class_id, c.class_name, 'Smart Valley Academy' AS school_name
         FROM student_parent sp
         JOIN students s ON sp.student_id = s.student_id
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN school_classes c ON s.current_class_id = c.class_id
        WHERE sp.parent_id = $1
        ORDER BY u.full_name`,
      [req.ext.parent_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch children." });
  }
});

// ─── Child dashboard ───────────────────────────────────────────────────────

router.get("/children/:childId/dashboard", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const studentId = child.student_id;
  const classId = child.class_id;
  try {
    const avgResult = await pool.query(
      `SELECT COALESCE(AVG(g.score)::int, 0) AS average
         FROM grades g
         JOIN submissions su ON g.submission_id = su.submission_id
        WHERE su.student_id = $1 AND g.published_at IS NOT NULL`,
      [studentId]
    );

    const att = await pool.query(
      `SELECT COUNT(*)::int AS total,
              SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present
         FROM attendance_records WHERE student_id = $1`,
      [studentId]
    );
    const attTotal = att.rows[0].total;
    const attendanceRate = attTotal ? Math.round((att.rows[0].present / attTotal) * 100) : 0;

    const assign = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(su.submission_id)::int AS submitted
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         LEFT JOIN submissions su ON su.assignment_id = a.assignment_id AND su.student_id = $1
        WHERE cs.class_id = $2`,
      [studentId, classId]
    );

    const absent = await pool.query(
      `SELECT a.record_id, a.date FROM attendance_records a
        WHERE a.student_id = $1 AND a.status = 'ABSENT' ORDER BY a.date DESC LIMIT 3`,
      [studentId]
    );
    const lowGrades = await pool.query(
      `SELECT g.grade_id, g.score
         FROM grades g JOIN submissions su ON g.submission_id = su.submission_id
        WHERE su.student_id = $1 AND g.published_at IS NOT NULL AND g.score < 50
        ORDER BY g.graded_at DESC LIMIT 3`,
      [studentId]
    );
    const deadlines = await pool.query(
      `SELECT a.assignment_id, a.title, a.due_date
         FROM assignments a
         JOIN class_subject cs ON a.class_subject_id = cs.class_subject_id
         LEFT JOIN submissions su ON su.assignment_id = a.assignment_id AND su.student_id = $1
        WHERE cs.class_id = $2 AND su.submission_id IS NULL AND a.due_date > NOW()
        ORDER BY a.due_date ASC LIMIT 3`,
      [studentId, classId]
    );

    const trend = await pool.query(
      `SELECT TO_CHAR(g.graded_at, 'Mon') AS month,
              ROUND(AVG(g.score))::int AS score
         FROM grades g JOIN submissions su ON g.submission_id = su.submission_id
        WHERE su.student_id = $1 AND g.published_at IS NOT NULL
        GROUP BY TO_CHAR(g.graded_at, 'Mon'), EXTRACT(MONTH FROM g.graded_at)
        ORDER BY EXTRACT(MONTH FROM g.graded_at)`,
      [studentId]
    );

    const announcements = await pool.query(
      `SELECT announcement_id, title, message AS body, created_at
         FROM announcements
        WHERE is_active = TRUE AND (target_roles = 'ALL' OR target_roles LIKE '%PARENT%' OR target_class_id = $1)
        ORDER BY published_at DESC LIMIT 5`,
      [classId]
    );

    const alerts = [
      ...absent.rows.map((r) => ({ type: "ABSENCE", message: `Absence recorded on ${r.date ? r.date.toISOString().slice(0, 10) : "a recent day"}.` })),
      ...lowGrades.rows.map((r) => ({ type: "LOW_GRADE", message: `A recent score of ${Number(r.score)} is below the expected range.` })),
      ...deadlines.rows.map((r) => ({ type: "DEADLINE", message: `Upcoming deadline: ${r.title}.` })),
    ].slice(0, 5);

    res.json({
      student_id: studentId,
      summary: {
        average_grade: avgResult.rows[0].average,
        attendance_rate: attendanceRate,
        assignments_submitted: assign.rows[0].submitted,
        total_assignments: assign.rows[0].total,
      },
      alerts,
      performance_trend: trend.rows,
      announcements: announcements.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load child dashboard." });
  }
});

// ─── Attendance ────────────────────────────────────────────────────────────

router.get("/children/:childId/attendance", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const { rows } = await pool.query(
      `SELECT record_id AS attendance_id, class_id, date, status, remarks AS remark
         FROM attendance_records
        WHERE student_id = $1
        ORDER BY date DESC`,
      [child.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance." });
  }
});

router.get("/children/:childId/attendance/summary", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') AS month,
              COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
              COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent,
              COUNT(*) FILTER (WHERE status = 'LATE')::int AS late,
              COUNT(*)::int AS total,
              ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'PRESENT') / NULLIF(COUNT(*), 0))::int AS percentage
         FROM attendance_records
        WHERE student_id = $1
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC`,
      [child.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch attendance summary." });
  }
});

// ─── Assignments ───────────────────────────────────────────────────────────

router.get("/children/:childId/assignments", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const studentId = child.student_id;
  const classId = child.class_id;
  try {
    const { rows } = await pool.query(
      `SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_score, a.attachments,
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
        class_id: r.class_id,
        title: r.title,
        description: r.description,
        due_date: r.due_date,
        max_score: Number(r.max_score),
        subject: r.subject,
        class_name: r.class_name,
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

// ─── Grades ────────────────────────────────────────────────────────────────

router.get("/children/:childId/grades", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const studentId = child.student_id;
  try {
    const graded = await pool.query(
      `SELECT su.submission_id, a.title AS assignment_title, g.score, g.letter_grade AS grade,
              g.feedback, g.graded_at, su.is_late
         FROM assignments a
         JOIN submissions su ON su.assignment_id = a.assignment_id
         LEFT JOIN grades g ON g.submission_id = su.submission_id
        WHERE su.student_id = $1
        ORDER BY COALESCE(g.graded_at, su.submitted_at) DESC`,
      [studentId]
    );

    const assignmentGrades = graded.rows.map((r) => ({
      submission_id: r.submission_id,
      assignment_title: r.assignment_title,
      score: r.score == null ? null : Number(r.score),
      grade: r.grade,
      feedback: r.feedback,
      is_late: r.is_late,
      status: r.score != null ? "GRADED" : "SUBMITTED",
    }));

    const marks = await pool.query(
      `SELECT m.subject_id, s.subject_name AS subject, m.marks
         FROM student_marks m
         JOIN subjects s ON m.subject_id = s.subject_id
        WHERE m.student_id = $1
        ORDER BY s.subject_name`,
      [studentId]
    );

    const studentMarks = marks.rows.map((m) => {
      const mark = m.marks || {};
      const componentKeys = ["test", "mid", "final", "assignment", "other"];
      const extract = (key) => {
        const val = mark[key] ?? mark[key.replace("mid", "midterm")];
        return val != null && Number.isFinite(Number(val)) ? Number(val) : 0;
      };
      const test = extract("test");
      const mid = extract("mid");
      const final = extract("final");
      const assignment = extract("assignment");
      const other = extract("other");
      const total =
        mark.total != null && Number.isFinite(Number(mark.total))
          ? Number(mark.total)
          : test + mid + final + assignment + other;
      const average = total;
      const letter_grade =
        (mark.letter_grade) ||
        (average >= 90 ? "A+" : average >= 85 ? "A" : average >= 80 ? "A-" : average >= 75 ? "B+" : average >= 70 ? "B" : average >= 65 ? "B-" : average >= 60 ? "C+" : average >= 50 ? "C" : average >= 40 ? "D" : "F");
      return {
        subject: m.subject,
        subject_id: m.subject_id,
        class_name: child.class_name,
        test,
        mid,
        final,
        assignment,
        other,
        total,
        letter_grade,
      };
    });

    res.json({ assignment_grades: assignmentGrades, student_marks: studentMarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch grades." });
  }
});

// ─── Grade distribution / prediction ───────────────────────────────────────

router.get("/children/:childId/grade-distribution", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const studentId = child.student_id;
  try {
    const avgResult = await pool.query(
      `SELECT COALESCE(AVG(g.score), 0) AS average
         FROM grades g JOIN submissions su ON g.submission_id = su.submission_id
        WHERE su.student_id = $1 AND g.published_at IS NOT NULL`,
      [studentId]
    );
    const avg = Math.round(Number(avgResult.rows[0].average));

    const att = await pool.query(
      `SELECT COUNT(*)::int AS total,
              SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present
         FROM attendance_records WHERE student_id = $1`,
      [studentId]
    );
    const attTotal = att.rows[0].total;
    const attendanceRate = attTotal ? Math.round((att.rows[0].present / attTotal) * 100) : 100;

    const predicted_grade =
      avg >= 90 ? "A+" : avg >= 85 ? "A" : avg >= 80 ? "A-" : avg >= 75 ? "B+" : avg >= 70 ? "B" : avg >= 65 ? "B-" : avg >= 60 ? "C+" : avg >= 50 ? "C" : avg >= 40 ? "D" : "F";
    const risk_level = avg >= 75 ? "LOW" : avg >= 50 ? "MEDIUM" : "HIGH";

    res.json({
      student_id: studentId,
      student_name: child.full_name,
      predicted_grade,
      risk_level,
      recommendation:
        risk_level === "LOW"
          ? "Keep up the excellent work. Focus on consistent revision and past papers."
          : risk_level === "MEDIUM"
            ? "A targeted revision plan is recommended. Practice previous exams and seek help in weaker subjects."
            : "Immediate attention is recommended. Schedule extra help sessions and review core concepts.",
      average_score: avg,
      attendance_rate: attendanceRate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load grade distribution." });
  }
});

// ─── Transcript ────────────────────────────────────────────────────────────

router.get("/children/:childId/transcript", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const { rows } = await pool.query(
      `SELECT transcript_id, pdf_url FROM transcripts
        WHERE student_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [child.student_id]
    );
    res.json(rows[0] ? { pdf_url: rows[0].pdf_url } : { pdf_url: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch transcript." });
  }
});

// ─── Conduct & peer evaluations ────────────────────────────────────────────

router.get("/children/:childId/conduct", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (cg.student_id, cg.term, cg.academic_year)
              s.student_id, u.full_name AS student_name, cg.grade AS conduct, cg.comments AS notes,
              sp.current_class_id AS class_id
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN conduct_grades cg ON cg.student_id = s.student_id
         LEFT JOIN school_classes sp ON sp.class_id = s.current_class_id
        WHERE s.student_id = $1
        ORDER BY s.student_id, cg.term, cg.academic_year`,
      [child.student_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch conduct." });
  }
});

router.get("/children/:childId/peer-evaluations", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const rows = await pool.query(
      `SELECT sp.class_id, sp.term, sp.academic_year,
              sp.evaluator_id, u.full_name AS reviewer_name, sp.overall_rating::int AS score, sp.comments,
              c.class_name, p.title AS form_title
         FROM student_peer_evaluations sp
         JOIN users u ON sp.evaluator_id = u.user_id
         LEFT JOIN school_classes c ON sp.class_id = c.class_id
         LEFT JOIN peer_evaluations pe ON pe.evaluatee_id = sp.student_id AND pe.class_id = sp.class_id
         LEFT JOIN peer_evaluation_forms p ON p.form_id = pe.form_id
        WHERE sp.student_id = $1
        ORDER BY sp.submitted_at`,
      [child.student_id]
    );

    const byGroup = new Map();
    for (const r of rows.rows) {
      const key = `${r.class_id}-${r.term}-${r.academic_year}`;
      const group = byGroup.get(key) || {
        evaluation_id: key.length * 7919,
        class_id: r.class_id,
        class_name: r.class_name,
        title: `${r.class_name || "Class"} - ${r.form_title || "Peer Evaluation"} (${r.term})`,
        due_date: null,
        status: "CLOSED",
        released: true,
        questions: ["Contribution to the project", "Communication skills", "Teamwork and collaboration"],
        results: [],
      };
      group.results.push({
        reviewer_id: r.evaluator_id,
        reviewer_name: r.reviewer_name,
        score: r.score,
        comments: r.comments,
      });
      byGroup.set(key, group);
    }
    res.json([...byGroup.values()]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch peer evaluations." });
  }
});

// ─── Messages (threaded, parent ↔ child's teachers) ───────────────────────

router.get("/children/:childId/messages", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const parentUserId = req.user.user_id;
  try {
    const teachers = await pool.query(
      `SELECT DISTINCT u.user_id, u.full_name
         FROM class_subject cs
         JOIN teachers t ON cs.teacher_id = t.teacher_id
         JOIN users u ON t.user_id = u.user_id
        WHERE cs.class_id = $1
        ORDER BY u.full_name`,
      [child.class_id]
    );

    const threads = [];
    for (const teacher of teachers.rows) {
      const msgs = await pool.query(
        `SELECT msg.message_id, msg.content, msg.timestamp, msg.attachment, msg.is_read,
                       msg.sender_id, msg.receiver_id
          FROM messages msg
         WHERE (msg.sender_id = $1 AND msg.receiver_id = $2) OR (msg.sender_id = $2 AND msg.receiver_id = $1)
         ORDER BY msg.timestamp ASC`,
        [parentUserId, teacher.user_id]
      );
      const messages = msgs.rows.map((m) => ({
        sender: m.sender_id === parentUserId ? "parent" : "teacher",
        body: m.content,
        attachment: m.attachment,
        created_at: m.timestamp,
      }));
      const lastMessage = messages.length ? messages[messages.length - 1].body : "";
      const unread = msgs.rows.filter((m) => m.receiver_id === parentUserId && !m.is_read).length;
      threads.push({
        thread_id: teacher.user_id,
        recipient_name: teacher.full_name,
        recipient_role: "Teacher",
        student_id: child.student_id,
        last_message: lastMessage,
        unread,
        messages,
      });
    }
    res.json(threads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch messages." });
  }
});

router.post("/children/:childId/messages", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const { thread_id, body, attachment } = req.body || {};
  if (!thread_id || !body) {
    return res.status(400).json({ error: "thread_id and body are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, attachment)
       VALUES ($1, $2, $3, $4) RETURNING message_id`,
      [req.user.user_id, Number(thread_id), body, attachment || null]
    );
    res.json({ success: true, message_id: rows[0].message_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to send message." });
  }
});

// ─── Fees & payments ───────────────────────────────────────────────────────

router.get("/children/:childId/fees", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const year = new Date().getFullYear();
    const feesRes = await pool.query(
      `SELECT fee_id, fee_name, fee_type, amount, currency, academic_year
         FROM school_fees
        WHERE is_active = TRUE
          AND (academic_year LIKE $1 OR academic_year LIKE $2)
        ORDER BY fee_name`,
      [`%${year}%`, `%${year + 1}%`]
    );

    const paidRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid,
              COALESCE((SELECT currency FROM payments WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1), 'ETB') AS currency
         FROM payments WHERE student_id = $1 AND status = 'COMPLETED'`,
      [child.student_id]
    );

    const fees = feesRes.rows.map((f) => ({
      fee_id: f.fee_id,
      name: f.fee_name,
      type: f.fee_type,
      amount: Number(f.amount),
      currency: f.currency,
      term: f.academic_year,
    }));
    const currency = paidRes.rows[0].currency;
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = Number(paidRes.rows[0].total_paid);
    res.json({
      fees,
      totalFees,
      totalPaid,
      balance: Math.max(totalFees - totalPaid, 0),
      currency,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch fees." });
  }
});

router.get("/children/:childId/payments", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  try {
    const { rows } = await pool.query(
      `SELECT payment_id, amount, currency, status, payment_method, transaction_id, receipt_url, created_at
         FROM payments WHERE student_id = $1 ORDER BY created_at DESC`,
      [child.student_id]
    );
    res.json(rows.map((p) => ({ ...p, amount: Number(p.amount) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch payments." });
  }
});

router.post("/children/:childId/payments", async (req, res) => {
  const child = await loadChildOr404(req, res);
  if (!child) return;
  const { amount, payment_method } = req.body || {};
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "A positive amount is required." });
  }
  try {
    const currencyRes = await pool.query(
      `SELECT COALESCE((SELECT currency FROM payments WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1), 'ETB') AS currency`,
      [child.student_id]
    );
    const currency = currencyRes.rows[0].currency;
    const { rows } = await pool.query(
      `INSERT INTO payments (parent_id, student_id, amount, currency, status, transaction_id, payment_method, receipt_url)
       VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $6, $7) RETURNING *`,
      [
        req.ext.parent_id,
        child.student_id,
        Number(amount),
        currency,
        `CHP-${Date.now()}`,
        payment_method || "Chapa",
        `/receipts/student-${child.student_id}-${Date.now()}.pdf`,
      ]
    );
    res.json({
      success: true,
      payment: { ...rows[0], amount: Number(rows[0].amount) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to process payment." });
  }
});

// ─── Notifications ─────────────────────────────────────────────────────────

router.get("/notifications", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT notification_id, type, content, sent_at, metadata
         FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50`,
      [req.user.user_id]
    );
    const titles = {
      ATTENDANCE: "Attendance Alert",
      GRADE: "New Grade Published",
      ASSIGNMENT: "Assignment Update",
      SYSTEM: "System Update",
      MESSAGE: "New Message",
      PAYMENT: "Payment Update",
      ACADEMIC: "Academic Update",
    };
    res.json(
      rows.map((r) => ({
        id: r.notification_id,
        notification_id: r.notification_id,
        type: r.type,
        title: titles[r.type] || r.type,
        body: r.content,
        read: false,
        created_at: r.sent_at,
      }))
    );
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

module.exports = router;