const prisma = require('../config/prisma');
const userController = require('./userController');

/**
 * REGISTRATION actor controller
 *
 * The Registration officer is the only role whose job is to admit students
 * into the system: create the Student + User accounts, keep the register up
 * to date, and report enrolment numbers.
 *
 * Student creation itself is delegated to userController.registerUser, which
 * already implements the transactional create/rollback logic (User row first,
 * role record second, delete the User if the role record fails). Keeping a
 * single implementation avoids two divergent copies of the same rules — the
 * exact defect class documented in the impact map.
 */

/**
 * GET /api/registration/dashboard
 * Enrolment statistics for the registration office.
 */
async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
        prisma.student.groupBy({
          by: ['current_class_id'],
          _count: { _all: true },
        }),
      ]);

    const byClass = await Promise.all(
      classCounts.map(async (row) => {
        let className = 'Unassigned';
        if (row.current_class_id) {
          const cls = await prisma.schoolClass.findUnique({
            where: { class_id: row.current_class_id },
            select: { class_name: true },
          });
          className = cls ? cls.class_name : 'Unknown';
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
 * POST /api/registration/students
 * Register a new student (User with role STUDENT + Student record).
 * Input has already passed validateStudentRegistration.
 */
async function registerStudent(req, res) {
  // Force the role: this actor may only create students.
  req.body.role = 'STUDENT';
  return userController.registerUser(req, res);
}

/**
 * GET /api/registration/students?search=&class=&page=&limit=
 * List/search the student register.
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
