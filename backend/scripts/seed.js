// Demo seed data. Run after migrations: node scripts/seed.js
// Credentials (password for every demo account): Password123!
//  - superadmin@example.com        role SUPER_ADMIN
//  - principal@example.com         role PRINCIPAL
//  - vpacademic@example.com        role VP_ACADEMIC
//  - vpadmin@example.com           role VP_ADMINISTRATION
//  - depthead@example.com          role DEPARTMENT_HEAD
//  - teacher@example.com           role TEACHER
//  - student@example.com           role STUDENT
//  - parent@example.com            role PARENT
//  - ptsa@example.com              role PTSA_REPRESENTATIVE
//  - sic@example.com               role SIC_MEMBER
const pool = require("../src/config/db");
const { hashPassword } = require("../src/utils/password");

const PASSWORD = "Password123!";

const USERS = [
  { email: "superadmin@example.com", full_name: "System Administrator", role: "SUPER_ADMIN" },
  { email: "principal@example.com", full_name: "Principal Admin", role: "PRINCIPAL" },
  { email: "vpacademic@example.com", full_name: "VP Academic", role: "VP_ACADEMIC" },
  { email: "vpadmin@example.com", full_name: "VP Administration", role: "VP_ADMINISTRATION" },
  { email: "depthead@example.com", full_name: "Department Head", role: "DEPARTMENT_HEAD" },
  { email: "teacher@example.com", full_name: "Teacher Demo", role: "TEACHER" },
  { email: "student@example.com", full_name: "Student Demo", role: "STUDENT" },
  { email: "parent@example.com", full_name: "Parent Demo", role: "PARENT" },
  { email: "ptsa@example.com", full_name: "PTSA Representative", role: "PTSA_REPRESENTATIVE" },
  { email: "sic@example.com", full_name: "SIC Member", role: "SIC_MEMBER" },
];

async function seed() {
  const hash = await hashPassword(PASSWORD);
  const ids = {};

  for (const u of USERS) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING user_id`,
      [u.email, u.full_name, hash, u.role]
    );
    ids[u.role] = ids[u.role] || [];
    ids[u.role].push(rows[0].user_id);
  }

  const userId = (role, index = 0) => ids[role][index];

  await pool.query(`INSERT INTO administrators (user_id, employee_id, access_level)
                    SELECT $1, 'ADM-0001', 'SUPER' WHERE NOT EXISTS (SELECT 1 FROM administrators WHERE user_id = $1)`, [userId("SUPER_ADMIN")]);
  await pool.query(`INSERT INTO principals (user_id, employee_id)
                    SELECT $1, 'PR-0001' WHERE NOT EXISTS (SELECT 1 FROM principals WHERE user_id = $1)`, [userId("PRINCIPAL")]);
  await pool.query(`INSERT INTO vp_academic (user_id, employee_id)
                    SELECT $1, 'VPA-0001' WHERE NOT EXISTS (SELECT 1 FROM vp_academic WHERE user_id = $1)`, [userId("VP_ACADEMIC")]);
  await pool.query(`INSERT INTO vp_administration (user_id, employee_id)
                    SELECT $1, 'VPA-0002' WHERE NOT EXISTS (SELECT 1 FROM vp_administration WHERE user_id = $1)`, [userId("VP_ADMINISTRATION")]);
  await pool.query(`INSERT INTO department_heads (user_id, employee_id, department)
                    SELECT $1, 'DH-0001', 'Science' WHERE NOT EXISTS (SELECT 1 FROM department_heads WHERE user_id = $1)`, [userId("DEPARTMENT_HEAD")]);
  const teacherRes = await pool.query(`INSERT INTO teachers (user_id, employee_id, department)
                                       SELECT $1, 'T-0001', 'Science' WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = $1) RETURNING teacher_id`,
    [userId("TEACHER")]);
  const teacherId = teacherRes.rows[0]?.teacher_id
    || (await pool.query(`SELECT teacher_id FROM teachers WHERE user_id = $1`, [userId("TEACHER")])).rows[0]?.teacher_id;
  await pool.query(`INSERT INTO parents (user_id, relationship)
                    SELECT $1, 'Guardian' WHERE NOT EXISTS (SELECT 1 FROM parents WHERE user_id = $1)`, [userId("PARENT")]);
  await pool.query(`INSERT INTO ptsa_representatives (user_id, position, term_start, term_end)
                    SELECT $1, 'Chairperson', '2026-01-01', '2027-12-31' WHERE NOT EXISTS (SELECT 1 FROM ptsa_representatives WHERE user_id = $1)`, [userId("PTSA_REPRESENTATIVE")]);
  await pool.query(`INSERT INTO sic_members (user_id, role, term_start, term_end)
                    SELECT $1, 'Member', '2026-01-01', '2027-12-31' WHERE NOT EXISTS (SELECT 1 FROM sic_members WHERE user_id = $1)`, [userId("SIC_MEMBER")]);

  const studentRes = await pool.query(`INSERT INTO students (user_id, student_number, enrollment_date)
                                       SELECT $1, 'S-1001', CURRENT_DATE WHERE NOT EXISTS (SELECT 1 FROM students WHERE user_id = $1) RETURNING student_id`,
    [userId("STUDENT")]);
  let studentId = studentRes.rows[0]?.student_id;
  if (!studentId) {
    studentId = (await pool.query(`SELECT student_id FROM students WHERE user_id = $1`, [userId("STUDENT")])).rows[0].student_id;
  }

  const parentRes = await pool.query(`SELECT parent_id FROM parents WHERE user_id = $1`, [userId("PARENT")]);
  const parentId = parentRes.rows[0].parent_id;

  const classRes = await pool.query(
    `INSERT INTO school_classes (class_name, academic_year, homeroom_teacher_id)
     SELECT 'Grade 10', '2025/2026', $1
      WHERE NOT EXISTS (SELECT 1 FROM school_classes WHERE class_name = 'Grade 10')
     RETURNING class_id`,
    [teacherId]
  );
  let classId = classRes.rows[0]?.class_id;
  if (!classId) {
    classId = (await pool.query(`SELECT class_id FROM school_classes WHERE class_name = 'Grade 10' LIMIT 1`)).rows[0].class_id;
  }

  const subjectRes = await pool.query(
    `INSERT INTO subjects (subject_name, subject_code)
     SELECT 'Mathematics', 'MATH101'
      WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE subject_name = 'Mathematics')
     RETURNING subject_id`
  );
  let subjectId = subjectRes.rows[0]?.subject_id;
  if (!subjectId) {
    subjectId = (await pool.query(`SELECT subject_id FROM subjects WHERE subject_name = 'Mathematics'`)).rows[0].subject_id;
  }

  await pool.query(`UPDATE students SET current_class_id = $1 WHERE student_id = $2`, [classId, studentId]);
  await pool.query(`INSERT INTO class_subject (class_id, subject_id, teacher_id)
                    SELECT $1, $2, $3
                     WHERE NOT EXISTS (SELECT 1 FROM class_subject WHERE class_id = $1 AND subject_id = $2)`,
    [classId, subjectId, teacherId]);
  await pool.query(`INSERT INTO student_parent (student_id, parent_id, relationship)
                    SELECT $1, $2, 'Guardian'
                     WHERE NOT EXISTS (SELECT 1 FROM student_parent WHERE student_id = $1 AND parent_id = $2)`,
    [studentId, parentId]);

  await pool.query(`INSERT INTO school_profile (school_name, motto, phone_number, email, address, school_code, woreda, zone, region, principal_name)
                    VALUES ('Smart Valley Academy', 'Learning for Life', '0911000000', 'info@smartvalley.edu', 'Addis Ababa', 'SVA-001', 'Arada', 'Addis Ababa', 'Addis Ababa', 'Principal Admin')
                    ON CONFLICT (school_code) DO NOTHING`);

  const studentRow = (await pool.query(`SELECT student_id, current_class_id FROM students WHERE user_id = $1`, [userId("STUDENT")])).rows[0];
  if (studentRow) {
    await pool.query(
      `INSERT INTO attendance_records (student_id, class_id, date, status, remarks, recorded_by)
       SELECT $1, $2, CURRENT_DATE - 1, 'PRESENT', '', $3
        WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = $1 AND class_id = $2 AND date = CURRENT_DATE - 1)`,
      [studentRow.student_id, studentRow.current_class_id, teacherId]
    );
    await pool.query(
      `INSERT INTO attendance_records (student_id, class_id, date, status, remarks, recorded_by)
       SELECT $1, $2, CURRENT_DATE - 2, 'PRESENT', '', $3
        WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = $1 AND class_id = $2 AND date = CURRENT_DATE - 2)`,
      [studentRow.student_id, studentRow.current_class_id, teacherId]
    );
    await pool.query(
      `INSERT INTO attendance_records (student_id, class_id, date, status, remarks, recorded_by)
       SELECT $1, $2, CURRENT_DATE - 3, 'ABSENT', 'Sick', $3
        WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = $1 AND class_id = $2 AND date = CURRENT_DATE - 3)`,
      [studentRow.student_id, studentRow.current_class_id, teacherId]
    );
  }

  console.log("Seed complete. Demo logins use");
  console.log("  password: Password123!");
  await pool.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});