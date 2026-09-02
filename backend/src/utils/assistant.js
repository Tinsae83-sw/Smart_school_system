/**
 * AI assistant prompt + context building.
 *
 * Compiles a role-aware system prompt for the chat endpoint by combining the
 * static knowledge base with live data from the database (school profile,
 * announcements, and the signed-in user's own records).
 */

const pool = require("../config/db");
const { KNOWLEDGE_BASE } = require("../config/assistantKnowledge");

async function safe(query, params = [], label) {
  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error(`Assistant context query failed (${label}):`, err.message);
    return [];
  }
}

async function loadSchoolProfile() {
  const rows = await safe("SELECT * FROM school_profile ORDER BY profile_id LIMIT 1", [], "school_profile");
  return rows[0] || null;
}

async function loadAnnouncements() {
  const rows = await safe(
    `SELECT title, content, announcement_type, target_audience, publish_date
       FROM school_announcements
      ORDER BY (publish_date IS NULL) ASC, publish_date DESC, announcement_id DESC
      LIMIT 5`,
    [],
    "school_announcements"
  );
  return rows;
}

async function loadFees() {
  const rows = await safe(
    `SELECT fee_name, fee_type, grade_level, amount, currency, academic_year, is_active
       FROM school_fees ORDER BY fee_id DESC LIMIT 5`,
    [],
    "school_fees"
  );
  return rows;
}

async function loadStudentData(userId) {
  const student = (
    await safe(
      `SELECT s.student_id, s.student_number, s.enrollment_date, c.class_name, y.year_name AS academic_year
         FROM students s
         LEFT JOIN school_classes c ON c.class_id = s.current_class_id
         LEFT JOIN academic_years y ON y.is_current = TRUE
        WHERE s.user_id = $1 LIMIT 1`,
      [userId],
      "students"
    )
  )[0];
  if (!student) return null;

  const sid = student.student_id;

  const [grades, marks, attendance, assignments, schedule] = await Promise.all([
    safe(
      `SELECT g.score, g.letter_grade, g.feedback, s.subject_name, g.published_at
         FROM grades g
         LEFT JOIN subjects s ON s.subject_id = g.subject_id
        WHERE g.student_id = $1
        ORDER BY g.published_at DESC NULLS LAST LIMIT 10`,
      [sid],
      "grades"
    ),
    safe(
      `SELECT s.subject_name, m.marks, m.total
         FROM student_marks m
         LEFT JOIN subjects s ON s.subject_id = m.subject_id
        WHERE m.student_id = $1 ORDER BY m.updated_at DESC LIMIT 10`,
      [sid],
      "student_marks"
    ),
    safe(
      `SELECT status, COUNT(*)::int AS count FROM attendance_records
        WHERE student_id = $1 GROUP BY status`,
      [sid],
      "attendance"
    ),
    safe(
      `SELECT a.title, a.description, a.due_date, a.max_score, sub.subject_name
         FROM assignments a
         JOIN class_subject cs ON cs.class_subject_id = a.class_subject_id
         JOIN subjects sub ON sub.subject_id = cs.subject_id
        WHERE cs.class_id = $1 AND a.due_date > CURRENT_TIMESTAMP
        ORDER BY a.due_date ASC LIMIT 5`,
      [student.class_id],
      "assignments"
    ),
    safe(
      `SELECT cs.day_of_week, cs.period, cs.start_time, cs.end_time, cs.room_number, sub.subject_name
         FROM class_schedules cs
         JOIN subjects sub ON sub.subject_id = cs.subject_id
        WHERE cs.class_id = $1 ORDER BY cs.day_of_week, cs.period LIMIT 20`,
      [student.class_id],
      "schedule"
    ),
  ]);

  return { student, grades, marks, attendance, assignments, schedule };
}

async function loadParentData(userId) {
  const parent = (
    await safe(
      `SELECT parent_id, relationship FROM parents WHERE user_id = $1 LIMIT 1`,
      [userId],
      "parents"
    )
  )[0];
  if (!parent) return null;

  const children = await safe(
    `SELECT u.full_name, s.student_number, c.class_name
       FROM student_parent sp
       JOIN students s ON s.student_id = sp.student_id
       JOIN users u ON u.user_id = s.user_id
       LEFT JOIN school_classes c ON c.class_id = s.current_class_id
      WHERE sp.parent_id = $1`,
    [parent.parent_id],
    "student_parent"
  );

  return { parent, children };
}

async function loadTeacherData(userId) {
  const teacher = (
    await safe(
      `SELECT teacher_id, employee_id, department FROM teachers WHERE user_id = $1 LIMIT 1`,
      [userId],
      "teachers"
    )
  )[0];
  if (!teacher) return null;

  const classes = await safe(
    `SELECT c.class_name, sub.subject_name
       FROM class_subject cs
       JOIN school_classes c ON c.class_id = cs.class_id
       JOIN subjects sub ON sub.subject_id = cs.subject_id
      WHERE cs.teacher_id = $1`,
    [teacher.teacher_id],
    "class_subject"
  );

  return { teacher, classes };
}

async function loadExtensionContext(user) {
  switch (user.role) {
    case "STUDENT":
      return loadStudentData(user.user_id);
    case "PARENT":
      return loadParentData(user.user_id);
    case "TEACHER":
      return loadTeacherData(user.user_id);
    default:
      return null;
  }
}

function fmtRows(rows) {
  return rows.length ? rows.map((r) => JSON.stringify(r)).join("\n") : "(none)";
}

async function buildSystemPrompt(user) {
  const [profile, announcements, fees, extension] = await Promise.all([
    loadSchoolProfile(),
    loadAnnouncements(),
    loadFees(),
    loadExtensionContext(user),
  ]);

  const schoolLines = profile
    ? Object.entries(profile)
        .filter(([k, v]) => v && !["profile_id", "updated_at", "logo_url"].includes(k))
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "(no school profile stored)";

  const parts = [];
  parts.push(
    `You are the EduConnect AI Assistant, a friendly and knowledgeable assistant for the school that uses EduConnect.`
  );
  parts.push(`Today's date: ${new Date().toISOString().slice(0, 10)}.`);
  parts.push(`You are talking to ${user.full_name}, whose role is ${user.role}.`);
  parts.push("");

  parts.push("SCHOOL PROFILE (report these facts as stored):");
  parts.push(schoolLines);

  if (announcements.length) {
    parts.push("");
    parts.push("RECENT SCHOOL ANNOUNCEMENTS:");
    parts.push(fmtRows(announcements));
  }

  if (fees.length) {
    parts.push("");
    parts.push("RECENTLY RECORDED FEES:");
    parts.push(fmtRows(fees));
  }

  if (extension) {
    parts.push("");
    parts.push("LIVE DATA FOR THIS USER (answer from these records only):");
    parts.push(fmtRows([extension]));
  } else {
    parts.push("");
    parts.push("No personal live data is available for this role.");
  }

  parts.push("");
  parts.push(KNOWLEDGE_BASE);

  return parts.join("\n");
}

module.exports = { buildSystemPrompt };