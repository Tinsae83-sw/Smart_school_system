const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

/**
 * Generate a random password of the given length (URL-safe, no ambiguous chars).
 */
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Generate a student number: STU-YYYY-NNNN (sequential within the year).
 */
async function generateStudentNumber() {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;
  const last = await prisma.student.findFirst({
    where: { student_number: { startsWith: prefix } },
    orderBy: { student_number: 'desc' },
    select: { student_number: true },
  });
  let seq = 1;
  if (last) {
    const m = last.student_number.match(/STU-\d{4}-(\d{4})/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Mock email sender. Real delivery requires SMTP config (nodemailer) which is
 * not wired up yet, so we log the credentials and return them to the caller.
 * TODO: replace with real email delivery once SMTP credentials are configured.
 */
function sendCredentialsEmail(to, subject, body) {
  console.log('--- MOCK EMAIL ---');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log(body);
  console.log('--- END MOCK EMAIL ---');
}

/**
 * POST /api/registration/students
 *
 * Comprehensive enrolment: creates the student account (+ optional parent/
 * guardian account and the parent-student link) in one transactional flow.
 * Passwords may be supplied or auto-generated; credentials are returned in
 * the response AND "sent" by email (mocked) so the registration officer can
 * hand them over.
 */
async function registerStudent(req, res) {
  const body = req.body || {};
  const {
    // Personal
    first_name, middle_name, last_name,
    date_of_birth, gender, nationality, religion, home_address,
    // Contact
    email, phone_number, emergency_contact_name, emergency_contact_phone,
    // Academic
    grade_level, department_id, admission_date, current_class_name,
    // Guardian / parent
    guardian_name, relationship, guardian_phone, guardian_email, guardian_password,
    // System
    username, password, send_credentials, terms_agreed,
    // legacy
    full_name, student_number,
  } = body;

  const fullName = (full_name && full_name.trim())
    || [first_name, middle_name, last_name].filter(Boolean).join(' ').trim();

  const studentPassword = (password && String(password).trim()) || generatePassword();
  const parentPassword = (guardian_password && String(guardian_password).trim()) || generatePassword();

  // ---- resolve class ----
  // ---- resolve class ----
  let schoolClass = null;
  const className = current_class_name
    ? String(current_class_name).trim()
    : (grade_level ? `Grade ${grade_level}` : null);
  if (className) {
    schoolClass = await prisma.schoolClass.findFirst({
      where: { class_name: className },
    });
  }
  if (!schoolClass && grade_level) {
    const className = `Grade ${grade_level}`;
    schoolClass = await prisma.schoolClass.findFirst({ where: { class_name: className } });
    if (!schoolClass) {
      const fallbackTeacher = await prisma.teacher.findFirst();
      if (fallbackTeacher) {
        schoolClass = await prisma.schoolClass.create({
          data: {
            class_name: className,
            academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            homeroom_teacher_id: fallbackTeacher.teacher_id,
          },
        });
      }
    }
  }

  // ---- create student user ----
  let newUser = null;
  let student = null;
  let parentUser = null;
  let parent = null;

  try {
    const password_hash = await bcrypt.hash(studentPassword, 10);

    // duplicate email check
    const existing = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    newUser = await prisma.user.create({
      data: {
        full_name: fullName,
        email: String(email).trim().toLowerCase(),
        phone_number: phone_number ? String(phone_number).trim() : null,
        password_hash,
        role: 'STUDENT',
        is_active: true,
        preferred_language: 'en',
      },
    });

    const number = (student_number && String(student_number).trim()) || await generateStudentNumber();
    const existingNumber = await prisma.student.findUnique({ where: { student_number: number } });
    if (existingNumber) {
      await prisma.user.delete({ where: { user_id: newUser.user_id } });
      return res.status(409).json({ error: 'Student number already exists' });
    }

    student = await prisma.student.create({
      data: {
        user_id: newUser.user_id,
        student_number: number,
        enrollment_date: admission_date ? new Date(admission_date) : new Date(),
        current_class_id: schoolClass ? schoolClass.class_id : null,
        grade_level: grade_level ? parseInt(grade_level, 10) : null,
        department_id: department_id ? parseInt(department_id, 10) : null,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        gender: gender || null,
        nationality: nationality || 'Ethiopian',
        religion: religion || null,
        home_address: home_address || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
      },
    });

    // ---- create/link parent (guardian) ----
    if (guardian_email && String(guardian_email).trim()) {
      const gEmail = String(guardian_email).trim().toLowerCase();
      let gUser = await prisma.user.findUnique({ where: { email: gEmail } });
      if (!gUser) {
        const gHash = await bcrypt.hash(parentPassword, 10);
        gUser = await prisma.user.create({
          data: {
            full_name: (guardian_name && String(guardian_name).trim()) || 'Guardian',
            email: gEmail,
            phone_number: guardian_phone ? String(guardian_phone).trim() : null,
            password_hash: gHash,
            role: 'PARENT',
            is_active: true,
            preferred_language: 'en',
          },
        });
        parentUser = gUser;
      }
      let gParent = await prisma.parent.findUnique({ where: { user_id: gUser.user_id } });
      if (!gParent) {
        gParent = await prisma.parent.create({
          data: {
            user_id: gUser.user_id,
            relationship: relationship || 'Guardian',
            address: home_address || null,
            preferred_language: 'English',
          },
        });
      }
      parent = gParent;

      // link parent <-> student
      const existingLink = await prisma.studentParent.findFirst({
        where: { student_id: student.student_id, parent_id: gParent.parent_id },
      });
      if (!existingLink) {
        await prisma.studentParent.create({
          data: {
            student_id: student.student_id,
            parent_id: gParent.parent_id,
            relationship: relationship || 'Guardian',
          },
        });
      }
    }

    // ---- mock email delivery ----
    if (send_credentials !== false) {
      const studentBody =
        `Hello ${fullName},\n\n` +
        `Your student account has been created.\n` +
        `Email: ${email}\nPassword: ${studentPassword}\nStudent Number: ${number}\n` +
        `Please change your password after first login.\n`;
      sendCredentialsEmail(String(email).trim(), 'Your Student Account Credentials', studentBody);

      if (guardian_email && String(guardian_email).trim()) {
        const parentBody =
          `Hello ${guardian_name || 'Guardian'},\n\n` +
          `A student account has been created for ${fullName} and linked to you.\n` +
          `Your parent account:\nEmail: ${guardian_email}\nPassword: ${parentPassword}\n` +
          `Please change your password after first login.\n`;
        sendCredentialsEmail(String(guardian_email).trim(), 'Your Parent Account Credentials', parentBody);
      }
    }

    const responseData = {
      message: 'STUDENT registered successfully',
      user_id: newUser.user_id,
      email: newUser.email,
      role: 'STUDENT',
      password: studentPassword,
      student_number: number,
      class_id: schoolClass ? schoolClass.class_id : null,
      class_name: schoolClass ? schoolClass.class_name : null,
      parent_created: !!parent,
      parent_email: guardian_email ? String(guardian_email).trim() : null,
      parent_password: parent && guardian_email ? parentPassword : null,
    };

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Registration error:', error);
    // rollback
    try {
      if (student) await prisma.student.delete({ where: { student_id: student.student_id } });
      if (newUser) await prisma.user.delete({ where: { user_id: newUser.user_id } });
      if (parent) await prisma.parent.delete({ where: { parent_id: parent.parent_id } });
      if (parentUser) await prisma.user.delete({ where: { user_id: parentUser.user_id } });
    } catch (rbErr) {
      console.error('Rollback error:', rbErr);
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email, student number, or ID already exists' });
    }
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

/**
 * GET /api/registration/dashboard
 */
async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalStudents, newThisYear, newThisMonth, recentRegistrations, classCounts] =
      await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { enrollment_date: { gte: startOfYear } } }),
        prisma.student.count({ where: { enrollment_date: { gte: startOfMonth } } }),
        prisma.student.findMany({
          orderBy: { student_id: 'desc' },
          take: 5,
          include: {
            user: { select: { full_name: true, email: true, is_active: true } },
            current_class: { select: { class_name: true } },
          },
        }),
        prisma.student.groupBy({ by: ['current_class_id'], _count: { _all: true } }),
      ]);

    const byClass = await Promise.all(
      classCounts.map(async (row) => {
        let className = 'Unassigned';
        if (row.current_class_id) {
          const cls = await prisma.schoolClass.findUnique({
            where: { class_id: row.current_class_id },
            select: { class_name: true },
          });
          if (cls) className = cls.class_name;
        }
        return { class_name: className, students: row._count._all };
      })
    );

    res.json({
      total_students: totalStudents,
      new_this_year: newThisYear,
      new_this_month: newThisMonth,
      classes: byClass.length,
      by_class: byClass.sort((a, b) => b.students - a.students),
      recent_registrations: recentRegistrations.map((s) => ({
        student_id: s.student_id,
        student_number: s.student_number,
        full_name: s.user?.full_name || 'Unknown',
        email: s.user?.email || null,
        is_active: s.user?.is_active ?? true,
        class_name: s.current_class?.class_name || 'Unassigned',
        enrollment_date: s.enrollment_date,
      })),
    });
  } catch (error) {
    console.error('Registration dashboard error:', error);
    res.status(500).json({ error: 'Failed to load registration dashboard' });
  }
}

/**
 * GET /api/registration/students
 */
async function getStudents(req, res) {
  try {
    const search = (req.query.search || '').toString().trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = search
      ? {
          OR: [
            { user: { full_name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { student_number: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: { student_id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { full_name: true, email: true, is_active: true, created_at: true } },
          current_class: { select: { class_name: true } },
        },
      }),
    ]);

    res.json({
      students: students.map((s) => ({
        student_id: s.student_id,
        student_number: s.student_number,
        full_name: s.user?.full_name || 'Unknown',
        email: s.user?.email || null,
        is_active: s.user?.is_active ?? true,
        class_name: s.current_class?.class_name || 'Unassigned',
        enrollment_date: s.enrollment_date,
        gender: s.gender,
        date_of_birth: s.date_of_birth,
      })),
      total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

module.exports = {
  getDashboard,
  registerStudent,
  getStudents,
};
