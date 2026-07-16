const prisma = require('../config/prisma');

// ============================================================
// STUDENT CONTROLLER
// ============================================================

// Helper function to get student ID (with or without authentication)
async function getStudentId(req) {
  // If authenticated, use the authenticated student ID
  if (req.studentId) {
    return req.studentId;
  }
  
  // For development without authentication, use the first student in the database
  const student = await prisma.student.findFirst({
    where: { user: { role: 'STUDENT' } },
    include: { user: true }
  });
  
  if (!student) {
    throw new Error('No student found in database');
  }
  
  return student.student_id;
}

/**
 * Get Student Dashboard
 * GET /api/student/dashboard
 */
async function getStudentDashboard(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Get student's current class
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: {
        current_class: true,
        user: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get upcoming assignments
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        },
        due_date: { gte: new Date() }
      },
      include: {
        class_subject: {
          include: { subject: true }
        }
      },
      orderBy: { due_date: 'asc' },
      take: 10
    });

    // Get recent submissions with grades
    const recentSubmissions = await prisma.submission.findMany({
      where: {
        student_id: studentId
      },
      include: {
        assignment: {
          include: {
            class_subject: {
              include: { subject: true }
            }
          }
        },
        grade: true
      },
      orderBy: { submitted_at: 'desc' },
      take: 10
    });

    // Get attendance summary
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: studentId,
        date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }
      }
    });

    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const totalCount = attendanceRecords.length;
    const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

    // Get conduct grades
    const conductGrades = await prisma.conductGrade.findMany({
      where: { student_id: studentId },
      orderBy: { graded_at: 'desc' },
      take: 1
    });

    const recentGrades = recentSubmissions.map(sub => ({
      submission_id: sub.submission_id,
      assignment_title: sub.assignment.title,
      subject: sub.assignment.class_subject.subject.subject_name,
      score: sub.grade?.score,
      grade: sub.grade?.letter_grade
    }));

    res.json({
      upcoming_assignments: upcomingAssignments.map(a => ({
        assignment_id: a.assignment_id,
        title: a.title,
        subject: a.class_subject.subject.subject_name,
        due_date: a.due_date,
        max_score: a.max_score
      })),
      recent_grades: recentGrades,
      attendance_summary: {
        present: presentCount,
        total: totalCount,
        percentage: parseFloat(attendanceRate)
      },
      conduct: conductGrades.length > 0 ? {
        grade: conductGrades[0].grade,
        notes: conductGrades[0].rating ? `Rating: ${conductGrades[0].rating}` : null
      } : null
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
}

/**
 * Get Student Announcements
 * GET /api/student/announcements
 */
async function getStudentAnnouncements(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Get student's current class
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    // Get announcements for student's class or general announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { target_class_id: student?.current_class_id },
          { target_class_id: null }
        ],
        is_active: true,
        published_at: { lte: new Date() }
      },
      orderBy: { published_at: 'desc' },
      take: 20
    });

    res.json(announcements.map(a => ({
      announcement_id: a.announcement_id,
      title: a.title,
      body: a.message,
      created_at: a.published_at
    })));
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * Get Student Notifications
 * GET /api/student/notifications
 */
async function getStudentNotifications(req, res) {
  try {
    const studentId = await getStudentId(req);

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    const notifications = await prisma.notification.findMany({
      where: { user_id: student.user_id },
      orderBy: { sent_at: 'desc' },
      take: 50
    });

    res.json(notifications.map(n => ({
      notification_id: n.notification_id,
      content: n.content,
      read: n.is_sent,
      created_at: n.sent_at
    })));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Get Student Profile
 * GET /api/student/profile
 */
async function getStudentProfile(req, res) {
  try {
    const studentId = await getStudentId(req);

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true
          }
        },
        current_class: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student_id: student.student_id,
      full_name: student.user.full_name,
      email: student.user.email,
      phone_number: student.user.phone_number,
      profile_picture_url: student.user.profile_picture_url,
      student_number: student.student_number,
      class: student.current_class?.class_name || null
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports = {
  getStudentDashboard,
  getStudentAnnouncements,
  getStudentNotifications,
  getStudentProfile
};
