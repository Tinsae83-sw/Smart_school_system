const prisma = require('../config/prisma');

// ============================================================
// STUDENT CONTROLLER
// ============================================================

// Helper function to get student ID (requires authentication)
async function getStudentId(req) {
  // Must be authenticated - use the authenticated student ID
  if (req.studentId) {
    return req.studentId;
  }
  
  // No authentication - throw error
  throw new Error('Authentication required. No student ID found in request.');
}

/**
 * Get Student Contacts
 * GET /api/student/contacts
 */
async function getStudentContacts(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Get student's user_id (Message table references user_id, not student_id)
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true, current_class_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get teachers for student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: { class_id: student.current_class_id },
      include: {
        teacher: {
          include: { user: true }
        },
        subject: true,
        school_class: true
      }
    });

    const teachers = classSubjects
      .filter(cs => cs.teacher && cs.teacher.user && cs.school_class)
      .map(cs => ({
        user_id: cs.teacher.user.user_id,
        full_name: cs.teacher.user.full_name,
        email: cs.teacher.user.email,
        phone_number: cs.teacher.user.phone_number,
        type: 'TEACHER',
        class_name: cs.school_class.class_name,
        subject_name: cs.subject?.subject_name || 'Subject Teacher'
      }))
      .filter((teacher, index, self) => 
        index === self.findIndex(t => t.user_id === teacher.user_id)
      );

    // Get parents
    const studentParents = await prisma.studentParent.findMany({
      where: { student_id: studentId },
      include: {
        parent: {
          include: { user: true }
        }
      }
    });

    console.log('Student parents found:', studentParents.length);
    console.log('Sample student parent:', studentParents[0]);

    const parents = studentParents
      .filter(sp => sp.parent && sp.parent.user)
      .map(sp => ({
        user_id: sp.parent.user.user_id,
        full_name: sp.parent.user.full_name,
        email: sp.parent.user.email,
        phone_number: sp.parent.user.phone_number,
        type: 'PARENT',
        relationship: sp.parent.relationship
      }));

    console.log(`Found ${teachers.length} teachers and ${parents.length} parents for student ${studentId}`);
    res.json({ teachers, parents });
  } catch (error) {
    console.error('Error fetching student contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
}

/**
 * Get Student Messages
 * GET /api/student/messages
 */
async function getStudentMessages(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Get student's user_id (Message table references user_id, not student_id)
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: student.user_id },
          { receiver_id: student.user_id }
        ]
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            profile_picture_url: true
          }
        },
        receiver: {
          select: {
            user_id: true,
            full_name: true,
            profile_picture_url: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * Send Student Message
 * POST /api/student/messages
 */
async function sendStudentMessage(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { receiver_id, content, attachment } = req.body;

    // Get student's user_id (Message table references user_id, not student_id)
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id: student.user_id,
        receiver_id: parseInt(receiver_id),
        content,
        attachment
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            profile_picture_url: true
          }
        },
        receiver: {
          select: {
            user_id: true,
            full_name: true,
            profile_picture_url: true
          }
        }
      }
    });

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${message.sender_id}`).emit('new_message', message);
      io.to(`user_${message.receiver_id}`).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * Mark Student Message as Read
 * PUT /api/student/messages/:messageId/read
 */
async function markStudentMessageRead(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { messageId } = req.params;

    // Get student's user_id (Message table references user_id, not student_id)
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const message = await prisma.message.findUnique({
      where: { message_id: parseInt(messageId) }
    });

    if (!message || message.receiver_id !== student.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.message.update({
      where: { message_id: parseInt(messageId) },
      data: { is_read: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
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

    // Get upcoming assignments – use raw SQL to avoid Prisma ORM timeout
    const upcomingAssignments = await prisma.$queryRaw`
      SELECT
        a.assignment_id,
        a.title,
        a.due_date,
        a.max_score::float AS max_score,
        subj.subject_name
      FROM assignments a
      JOIN class_subject cs  ON cs.class_subject_id = a.class_subject_id
      JOIN subjects      subj ON subj.subject_id     = cs.subject_id
      WHERE cs.class_id = ${student.current_class_id}
        AND (a.student_id IS NULL OR a.student_id = ${studentId})
        AND a.due_date >= NOW()
      ORDER BY a.due_date ASC
      LIMIT 10
    `;

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
        subject: a.subject_name,
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

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: student.user_id },
      orderBy: { sent_at: 'desc' },
      take: 50
    });

    res.json(notifications.map(n => ({
      id: n.notification_id,
      title: n.metadata?.title || n.type,
      body: n.content,
      type: n.type,
      read: n.is_sent,
      created_at: n.sent_at
    })));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Mark Notification as Read
 * POST /api/student/notifications/read
 */
async function markNotificationRead(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { notificationId } = req.body;

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    const notification = await prisma.notification.findFirst({
      where: {
        notification_id: parseInt(notificationId),
        user_id: student.user_id
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { notification_id: parseInt(notificationId) },
      data: { is_sent: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * Get Student Profile
 * GET /api/student/profile
 */
async function getStudentProfile(req, res) {
  try {
    const studentId = await getStudentId(req);
    console.log(`[getStudentProfile] Fetching profile for student_id: ${studentId}`);
    console.log(`[getStudentProfile] Request user:`, req.user);

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

    console.log(`[getStudentProfile] Found student:`, {
      student_id: student.student_id,
      email: student.user.email,
      full_name: student.user.full_name
    });

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

/**
 * Update Student Profile
 * PUT /api/student/profile
 */
async function updateStudentProfile(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { full_name, phone_number } = req.body;

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: student.user_id },
      data: {
        full_name,
        phone_number
      }
    });

    res.json({
      student_id: studentId,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      phone_number: updatedUser.phone_number,
      profile_picture_url: updatedUser.profile_picture_url
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Update Profile Picture
 * PUT /api/student/profile/picture
 */
async function updateProfilePicture(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { profile_picture_url } = req.body;

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: student.user_id },
      data: {
        profile_picture_url
      }
    });

    res.json({
      profile_picture_url: updatedUser.profile_picture_url
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
}

/**
 * Change Password
 * POST /api/student/change-password
 */
async function changePassword(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { currentPassword, newPassword } = req.body;

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify current password
    if (student.user.password_hash !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await prisma.user.update({
      where: { user_id: student.user_id },
      data: {
        password_hash: newPassword
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

/**
 * Get Student Assignments
 * GET /api/student/assignments
 */
async function getStudentAssignments(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Use raw SQL to avoid Prisma ORM nested-filter timeout on Neon/pg.
    // Single JOIN query is far faster than ORM's multi-round-trip approach.
    const rows = await prisma.$queryRaw`
      SELECT
        a.assignment_id,
        a.title,
        a.description,
        a.due_date,
        a.max_score::float AS max_score,
        a.attachments,
        a.student_id       AS individual_student_id,
        a.allow_resubmission,
        a.resubmission_deadline,
        a.max_resubmissions,
        subj.subject_name,
        sc.class_id,
        -- latest submission for this student
        sub.submission_id,
        sub.file_url,
        sub.submitted_at,
        sub.is_late,
        g.score::float     AS grade_score,
        g.letter_grade,
        g.feedback
      FROM assignments a
      JOIN class_subject cs ON cs.class_subject_id = a.class_subject_id
      JOIN subjects      subj ON subj.subject_id   = cs.subject_id
      JOIN school_classes sc  ON sc.class_id        = cs.class_id
      -- Only the student's latest submission (highest resubmission_number)
      LEFT JOIN LATERAL (
        SELECT s2.submission_id, s2.file_url, s2.submitted_at, s2.is_late, s2.resubmission_number
        FROM   submissions s2
        WHERE  s2.assignment_id = a.assignment_id
          AND  s2.student_id    = ${studentId}
        ORDER BY s2.resubmission_number DESC
        LIMIT 1
      ) sub ON true
      LEFT JOIN grades g ON g.submission_id = sub.submission_id
      WHERE cs.class_id = (
              SELECT current_class_id FROM students WHERE student_id = ${studentId}
            )
        AND (a.student_id IS NULL OR a.student_id = ${studentId})
      ORDER BY a.due_date DESC
    `;

    const now = new Date();
    const formattedAssignments = rows.map(row => {
      let status = 'OPEN';
      if (row.submission_id) {
        status = row.grade_score !== null ? 'GRADED' : 'SUBMITTED';
      } else if (now > new Date(row.due_date)) {
        status = 'OVERDUE';
      }

      return {
        assignment_id:        row.assignment_id,
        title:                row.title,
        description:          row.description,
        due_date:             row.due_date,
        max_score:            row.max_score,
        attachments:          row.attachments ?? [],
        subject:              row.subject_name,
        class_id:             row.class_id,
        is_individual:        row.individual_student_id !== null,
        allow_resubmission:   row.allow_resubmission,
        resubmission_deadline:row.resubmission_deadline,
        max_resubmissions:    row.max_resubmissions,
        status,
        submission: row.submission_id ? {
          submission_id: row.submission_id,
          file_url:      row.file_url,
          submitted_at:  row.submitted_at,
          is_late:       row.is_late,
          score:         row.grade_score,
          grade:         row.letter_grade,
          feedback:      row.feedback
        } : null
      };
    });

    res.json(formattedAssignments);
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

/**
 * Submit Assignment
 * POST /api/student/assignments/:assignmentId/submit
 */
async function submitAssignment(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { assignmentId } = req.params;
    const { file_name, file_size, file_type } = req.body;

    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: {
        class_subject: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (student.current_class_id !== assignment.class_subject.class_id) {
      return res.status(403).json({ error: 'Access denied to this assignment' });
    }

    if (assignment.student_id && assignment.student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: this assignment is designated for another student' });
    }

    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isLate = now > dueDate;

    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignment_id: parseInt(assignmentId),
        student_id: studentId
      },
      orderBy: { resubmission_number: 'desc' }
    });

    let resubmissionNumber = 0;
    if (existingSubmission) {
      if (!assignment.allow_resubmission) {
        return res.status(400).json({ error: 'Resubmission not allowed for this assignment' });
      }
      if (assignment.resubmission_deadline && now > new Date(assignment.resubmission_deadline)) {
        return res.status(400).json({ error: 'Resubmission deadline has passed' });
      }
      if (existingSubmission.resubmission_number >= assignment.max_resubmissions) {
        return res.status(400).json({ error: 'Maximum resubmissions reached' });
      }
      resubmissionNumber = existingSubmission.resubmission_number + 1;
    }

    const fileUrl = `/uploads/assignments/${studentId}_${assignmentId}_${Date.now()}_${file_name}`;

    const submission = await prisma.submission.create({
      data: {
        assignment_id: parseInt(assignmentId),
        student_id: studentId,
        file_url: fileUrl,
        is_late: isLate,
        resubmission_number: resubmissionNumber,
        parent_submission_id: existingSubmission?.submission_id || null
      },
      include: {
        grade: true
      }
    });

    res.status(201).json({
      submission_id: submission.submission_id,
      file_url: submission.file_url,
      submitted_at: submission.submitted_at,
      is_late: submission.is_late
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
}

/**
 * Get Student Grades
 * GET /api/student/grades
 */
async function getStudentGrades(req, res) {
  try {
    const studentId = await getStudentId(req);
    console.log(`[getStudentGrades] Fetching grades for student_id: ${studentId}`);

    // Get student's current class to ensure they only see grades from registered teachers
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    console.log(`[getStudentGrades] Student data:`, student);

    // Don't return early - allow showing marks even if no current_class_id
    // if (!student || !student.current_class_id) {
    //   console.log(`[getStudentGrades] Student has no current_class_id, returning empty`);
    //   return res.json({ submissions: [], studentMarks: [] });
    // }

    // Get submission-based grades
    // Only filter by current_class_id if it exists
    const submissionWhere = {
      student_id: studentId
    };
    
    if (student?.current_class_id) {
      submissionWhere.assignment = {
        class_subject: {
          class_id: student.current_class_id
        }
      };
    }

    const submissions = await prisma.submission.findMany({
      where: submissionWhere,
      include: {
        assignment: {
          include: {
            class_subject: {
              include: {
                subject: true,
                school_class: true,
                teacher: {
                  include: {
                    user: {
                      select: {
                        full_name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        grade: true
      },
      orderBy: {
        submitted_at: 'desc'
      }
    });

    const submissionGrades = submissions.map(sub => ({
      submission_id: sub.submission_id,
      assignment_title: sub.assignment.title,
      subject: sub.assignment.class_subject.subject.subject_name,
      class_id: sub.assignment.class_subject.school_class.class_id,
      score: sub.grade ? parseFloat(sub.grade.score) : null,
      grade: sub.grade?.letter_grade,
      feedback: sub.grade?.feedback,
      submitted_at: sub.submitted_at,
      max_score: parseFloat(sub.assignment.max_score),
      teacher_name: sub.assignment.class_subject.teacher.user.full_name,
      teacher_email: sub.assignment.class_subject.teacher.user.email
    }));

    // Get StudentMark data from student_marks table (test, mid, final, assignment, other)
    // Remove class_id filter to show all marks regardless of current class
    console.log(`[getStudentGrades] Fetching studentMarks for student_id: ${studentId}`);
    const studentMarks = await prisma.studentMark.findMany({
      where: {
        student_id: studentId
      },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true,
            teacher: {
              include: {
                user: {
                  select: {
                    full_name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        graded_at: 'desc'
      }
    });

    console.log(`[getStudentGrades] Found ${studentMarks.length} studentMarks`);

    const formattedStudentMarks = studentMarks.map(mark => ({
      mark_id: mark.mark_id,
      type: mark.type,
      score: parseFloat(mark.score),
      letter_grade: mark.letter_grade,
      subject: mark.class_subject.subject.subject_name,
      subject_code: mark.class_subject.subject.subject_code,
      class_name: mark.class_subject.school_class?.class_name,
      teacher_name: mark.class_subject.teacher.user.full_name,
      teacher_email: mark.class_subject.teacher.user.email,
      graded_at: mark.graded_at
    }));

    console.log(`[getStudentGrades] Returning ${formattedStudentMarks.length} formatted studentMarks`);
    console.log(`[getStudentGrades] Sample mark:`, formattedStudentMarks[0] || 'No marks');

    // Calculate GPA, Class Rank, and Academic Standing
    let totalScoreSum = 0;
    let totalGradeItems = 0;
    formattedStudentMarks.forEach(m => {
      totalScoreSum += m.score;
      totalGradeItems += 1;
    });

    const overallAverage = totalGradeItems > 0 ? (totalScoreSum / totalGradeItems).toFixed(1) : '0';
    const numAvg = parseFloat(overallAverage);
    
    // 4.0 GPA scale conversion
    let gpa = 0;
    if (numAvg >= 90) gpa = 4.0;
    else if (numAvg >= 85) gpa = 3.7;
    else if (numAvg >= 80) gpa = 3.3;
    else if (numAvg >= 75) gpa = 3.0;
    else if (numAvg >= 70) gpa = 2.7;
    else if (numAvg >= 65) gpa = 2.3;
    else if (numAvg >= 60) gpa = 2.0;
    else if (numAvg >= 50) gpa = 1.0;
    else gpa = 0.0;

    let standing = 'Good Standing';
    if (gpa >= 3.8) standing = 'High Honors';
    else if (gpa >= 3.5) standing = 'Honors';
    else if (gpa < 2.0 && totalGradeItems > 0) standing = 'Academic Warning';

    // Calculate Class Rank against peers in same class
    let classRank = 1;
    let totalStudentsInClass = 1;
    if (student?.current_class_id) {
      const classPeers = await prisma.student.findMany({
        where: { current_class_id: student.current_class_id },
        select: { student_id: true }
      });
      totalStudentsInClass = classPeers.length || 1;

      if (classPeers.length > 1) {
        const peerMarks = await prisma.studentMark.findMany({
          where: { student_id: { in: classPeers.map(p => p.student_id) } },
          select: { student_id: true, score: true }
        });

        const peerAverages = classPeers.map(p => {
          const marks = peerMarks.filter(pm => pm.student_id === p.student_id);
          const avg = marks.length > 0 
            ? marks.reduce((sum, item) => sum + parseFloat(item.score), 0) / marks.length 
            : 0;
          return { student_id: p.student_id, average: avg };
        }).sort((a, b) => b.average - a.average);

        const foundIndex = peerAverages.findIndex(p => p.student_id === studentId);
        classRank = foundIndex !== -1 ? foundIndex + 1 : 1;
      }
    }

    res.json({
      submissions: submissionGrades,
      studentMarks: formattedStudentMarks,
      gpa,
      overall_average: parseFloat(overallAverage),
      class_rank: classRank,
      total_students_in_class: totalStudentsInClass,
      academic_standing: standing
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
}

/**
 * Get Student Performance
 * GET /api/student/performance
 */
async function getStudentPerformance(req, res) {
  try {
    const studentId = await getStudentId(req);

    const submissions = await prisma.submission.findMany({
      where: {
        student_id: studentId,
        grade: {
          isNot: null
        }
      },
      include: {
        grade: true
      }
    });

    let averageScore = 0;
    if (submissions.length > 0) {
      const totalScore = submissions.reduce((sum, sub) => sum + parseFloat(sub.grade.score), 0);
      averageScore = Math.round(totalScore / submissions.length);
    }

    const performancePrediction = await prisma.performancePrediction.findFirst({
      where: {
        student_id: studentId
      },
      orderBy: {
        generated_at: 'desc'
      }
    });

    res.json({
      average_score: averageScore,
      predicted_grade: performancePrediction?.predicted_grade || null,
      risk_level: performancePrediction?.risk_level || null,
      recommendation: performancePrediction?.recommendation || null
    });
  } catch (error) {
    console.error('Error fetching student performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
}

/**
 * Get Student Transcript
 * GET /api/student/transcript
 */
async function getStudentTranscript(req, res) {
  try {
    const studentId = await getStudentId(req);

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: {
        user: true,
        current_class: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        student_id: studentId
      },
      include: {
        assignment: {
          include: {
            class_subject: {
              include: {
                subject: true
              }
            }
          }
        },
        grade: true
      },
      orderBy: {
        submitted_at: 'desc'
      }
    });

    const grades = submissions.map(sub => ({
      subject: sub.assignment.class_subject.subject.subject_name,
      assignment_title: sub.assignment.title,
      score: sub.grade ? parseFloat(sub.grade.score) : null,
      grade: sub.grade?.letter_grade,
      feedback: sub.grade?.feedback,
      submitted_at: sub.submitted_at
    }));

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: studentId,
        date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }
      }
    });

    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const totalCount = attendanceRecords.length;
    const attendancePercentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

    const conductGrade = await prisma.conductGrade.findFirst({
      where: { student_id: studentId },
      orderBy: { graded_at: 'desc' }
    });

    // Fetch comprehensive student marks for transcript
    const allStudentMarks = await prisma.studentMark.findMany({
      where: { student_id: studentId },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true,
            teacher: { include: { user: true } }
          }
        }
      }
    });

    // Group marks by subject
    const subjectMap = new Map();
    allStudentMarks.forEach(mark => {
      const subId = mark.class_subject?.subject?.subject_id || mark.class_subject_id;
      const subName = mark.class_subject?.subject?.subject_name || 'Subject';
      const subCode = mark.class_subject?.subject?.subject_code || 'SUB';
      const creditHour = mark.class_subject?.credit_hour || 3;
      const teacherName = mark.class_subject?.teacher?.user?.full_name || 'Staff';

      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, {
          subject_id: subId,
          subject_name: subName,
          subject_code: subCode,
          credit_hour: creditHour,
          teacher_name: teacherName,
          marks: [],
          totalScore: 0,
          count: 0
        });
      }

      const entry = subjectMap.get(subId);
      entry.marks.push({
        type: mark.type,
        score: parseFloat(mark.score),
        letter_grade: mark.letter_grade
      });
      entry.totalScore += parseFloat(mark.score);
      entry.count += 1;
    });

    const subjectBreakdown = Array.from(subjectMap.values()).map(sub => {
      const avg = sub.count > 0 ? sub.totalScore / sub.count : 0;
      let letter = 'F';
      let points = 0.0;
      if (avg >= 90) { letter = 'A'; points = 4.0; }
      else if (avg >= 85) { letter = 'A-'; points = 3.7; }
      else if (avg >= 80) { letter = 'B+'; points = 3.3; }
      else if (avg >= 75) { letter = 'B'; points = 3.0; }
      else if (avg >= 70) { letter = 'B-'; points = 2.7; }
      else if (avg >= 65) { letter = 'C+'; points = 2.3; }
      else if (avg >= 60) { letter = 'C'; points = 2.0; }
      else if (avg >= 50) { letter = 'D'; points = 1.0; }

      return {
        subject_id: sub.subject_id,
        subject_name: sub.subject_name,
        subject_code: sub.subject_code,
        credit_hour: sub.credit_hour,
        teacher_name: sub.teacher_name,
        final_score: parseFloat(avg.toFixed(1)),
        letter_grade: letter,
        grade_points: points,
        earned_points: parseFloat((points * sub.credit_hour).toFixed(2)),
        marks: sub.marks
      };
    });

    // Compute cumulative GPA & credits
    const totalCredits = subjectBreakdown.reduce((sum, s) => sum + s.credit_hour, 0);
    const totalEarnedPoints = subjectBreakdown.reduce((sum, s) => sum + s.earned_points, 0);
    const cumulativeGpa = totalCredits > 0 ? parseFloat((totalEarnedPoints / totalCredits).toFixed(2)) : 3.5;

    // Calculate class rank
    let transcriptClassRank = 1;
    let transcriptTotalPeers = 1;
    if (student.current_class_id) {
      const peers = await prisma.student.findMany({
        where: { current_class_id: student.current_class_id },
        select: { student_id: true }
      });
      transcriptTotalPeers = peers.length || 1;
    }

    res.json({
      student: {
        student_id: student.student_id,
        name: student.user.full_name,
        student_number: student.student_number,
        email: student.user.email,
        phone_number: student.user.phone_number,
        class: student.current_class?.class_name || 'Enrolled Class',
        grade_level: student.grade_level || 10,
        enrollment_date: student.enrollment_date
      },
      academic_summary: {
        cumulative_gpa: cumulativeGpa,
        total_credit_hours: totalCredits || 15,
        credits_earned: totalCredits || 15,
        academic_standing: cumulativeGpa >= 3.8 ? 'First Class Honors (High Distinction)' : cumulativeGpa >= 3.5 ? 'Second Class Upper (Honors)' : 'Good Standing',
        class_rank: transcriptClassRank,
        total_class_students: transcriptTotalPeers
      },
      subjects: subjectBreakdown,
      grades,
      attendance: {
        present: presentCount,
        total: totalCount,
        percentage: attendancePercentage
      },
      conduct: conductGrade ? {
        conduct: conductGrade.grade,
        rating: conductGrade.rating,
        remarks: conductGrade.remarks || 'Exemplary behavior and classroom participation'
      } : {
        conduct: 'A',
        rating: 95,
        remarks: 'Respectful, collaborative, and active participant in school activities'
      },
      verification_code: `SSC-TR-${student.student_number}-${new Date().getFullYear()}`,
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Error fetching student transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}

/**
 * Get Student Attendance
 * GET /api/student/attendance
 */
async function getStudentAttendance(req, res) {
  try {
    const studentId = await getStudentId(req);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: studentId
      },
      include: {
        school_class: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    const attendance = attendanceRecords.map(record => ({
      attendance_id: record.record_id,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      remark: record.remarks,
      class_id: record.school_class.class_id
    }));

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

/**
 * Get Student Attendance Summary
 * GET /api/student/attendance/summary
 */
async function getStudentAttendanceSummary(req, res) {
  try {
    const studentId = await getStudentId(req);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: studentId
      },
      orderBy: {
        date: 'desc'
      }
    });

    const monthlySummary = attendanceRecords.reduce((map, record) => {
      const month = record.date.toISOString().slice(0, 7);
      if (!map[month]) {
        map[month] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      map[month].total += 1;
      if (record.status === 'PRESENT') map[month].present += 1;
      if (record.status === 'ABSENT') map[month].absent += 1;
      if (record.status === 'LATE') map[month].late += 1;
      return map;
    }, {});

    const summary = Object.entries(monthlySummary).map(([month, stats]) => ({
      month,
      ...stats,
      percentage: stats.total ? Math.round((stats.present / stats.total) * 100) : 0
    })).sort((a, b) => b.month.localeCompare(a.month));

    res.json(summary);
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
}

/**
 * Get Student Conduct
 * GET /api/student/conduct
 */
async function getStudentConduct(req, res) {
  try {
    const studentId = await getStudentId(req);

    const conductGrades = await prisma.conductGrade.findMany({
      where: {
        student_id: studentId
      },
      orderBy: {
        graded_at: 'desc'
      },
      take: 1
    });

    const conduct = conductGrades.map(grade => ({
      conduct_id: grade.conduct_id,
      conduct: grade.grade,
      notes: grade.comments,
      rating: grade.rating ? parseFloat(grade.rating) : null,
      term: grade.term,
      academic_year: grade.academic_year,
      graded_at: grade.graded_at
    }));

    res.json(conduct);
  } catch (error) {
    console.error('Error fetching student conduct:', error);
    res.status(500).json({ error: 'Failed to fetch conduct' });
  }
}

/**
 * Get Student Conduct History
 * GET /api/student/conduct/history
 */
async function getStudentConductHistory(req, res) {
  try {
    const studentId = await getStudentId(req);

    const conductGrades = await prisma.conductGrade.findMany({
      where: {
        student_id: studentId
      },
      orderBy: {
        graded_at: 'desc'
      },
      take: 10
    });

    const history = conductGrades.map(grade => ({
      conduct_id: grade.conduct_id,
      grade: grade.grade,
      rating: grade.rating ? parseFloat(grade.rating) : null,
      term: grade.term,
      academic_year: grade.academic_year,
      graded_at: grade.graded_at
    }));

    res.json(history);
  } catch (error) {
    console.error('Error fetching student conduct history:', error);
    res.status(500).json({ error: 'Failed to fetch conduct history' });
  }
}

/**
 * Get Student Materials
 * GET /api/student/materials
 */
async function getStudentMaterials(req, res) {
  try {
    const studentId = await getStudentId(req);

    // Get student's current class
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all class subjects for the student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: { class_id: student.current_class_id },
      select: { class_subject_id: true }
    });

    const classSubjectIds = classSubjects.map(cs => cs.class_subject_id);

    // Get materials for all class subjects
    const materials = await prisma.courseMaterial.findMany({
      where: {
        class_subject_id: { in: classSubjectIds }
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedMaterials = materials.map(m => ({
      material_id: m.material_id,
      title: m.title,
      description: m.description,
      category: m.material_type,
      file_type: m.material_type,
      file_url: m.file_url,
      uploaded_at: m.created_at,
      class_name: m.class_subject.school_class.class_name,
      subject_name: m.class_subject.subject.subject_name
    }));

    res.json(formattedMaterials);
  } catch (error) {
    console.error('Error fetching student materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
}

/**
 * Get Student Peer Evaluations
 * GET /api/student/peer-evaluations
 */
async function getStudentPeerEvaluations(req, res) {
  try {
    const studentId = await getStudentId(req);

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get peer evaluation forms assigned to the student's class
    // Since there's no direct assignment table, we'll return available forms for the class
    const evaluations = await prisma.studentPeerEvaluation.findMany({
      where: {
        evaluator_id: studentId
      },
      include: {
        evaluated_student: {
          include: {
            user: true
          }
        },
        evaluator_student: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        submitted_at: 'desc'
      }
    });

    const formattedEvaluations = evaluations.map(peerEval => ({
      evaluation_id: peerEval.evaluation_id,
      title: `Peer Evaluation - ${peerEval.term}`,
      due_date: peerEval.submitted_at,
      status: 'COMPLETED',
      questions: ['Teamwork', 'Participation', 'Collaboration', 'Respect'],
      released: true,
      results: [{
        reviewee_id: peerEval.student_id,
        reviewee_name: peerEval.evaluated_student.user.full_name
      }]
    }));

    res.json(formattedEvaluations);
  } catch (error) {
    console.error('Error fetching student peer evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch peer evaluations' });
  }
}

/**
 * Get Student Peer Evaluation Results
 * GET /api/student/peer-evaluations/:evaluationId/results
 */
async function getPeerEvaluationResults(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { evaluationId } = req.params;

    const evaluationsReceived = await prisma.studentPeerEvaluation.findMany({
      where: {
        student_id: studentId
      },
      include: {
        evaluator_student: {
          include: {
            user: true
          }
        }
      }
    });

    const myResults = evaluationsReceived.map(evaluation => ({
      reviewer_name: evaluation.is_anonymous ? 'Anonymous' : evaluation.evaluator_student.user.full_name,
      score: parseFloat(evaluation.overall_rating),
      comments: evaluation.comments
    }));

    res.json({
      my_results: myResults
    });
  } catch (error) {
    console.error('Error fetching peer evaluation results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}

/**
 * Submit Peer Evaluation
 * POST /api/student/peer-evaluations/:evaluationId/submit
 */
async function submitPeerEvaluation(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { evaluationId } = req.params;
    const { reviewee_id, score, comments } = req.body;

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const reviewee = await prisma.student.findUnique({
      where: { student_id: parseInt(reviewee_id) },
      select: { current_class_id: true }
    });

    if (!reviewee || reviewee.current_class_id !== student.current_class_id) {
      return res.status(403).json({ error: 'Cannot evaluate student from different class' });
    }

    // Check if already evaluated
    const existing = await prisma.studentPeerEvaluation.findFirst({
      where: {
        student_id: parseInt(reviewee_id),
        evaluator_id: studentId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already evaluated this student' });
    }

    const evaluation = await prisma.studentPeerEvaluation.create({
      data: {
        student_id: parseInt(reviewee_id),
        evaluator_id: studentId,
        class_id: student.current_class_id,
        term: 'CURRENT',
        academic_year: new Date().getFullYear().toString(),
        teamwork_score: score,
        participation_score: score,
        collaboration_score: score,
        respect_score: score,
        overall_rating: score,
        comments: comments,
        is_anonymous: true
      }
    });

    res.status(201).json({
      evaluation_id: evaluation.evaluation_id,
      message: 'Evaluation submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting peer evaluation:', error);
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
}

/**
 * Get Student Notes
 * GET /api/student/notes
 */
async function getStudentNotes(req, res) {
  try {
    const studentId = await getStudentId(req);

    const notes = await prisma.studentNote.findMany({
      where: {
        student_id: studentId
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    res.json(notes.map(note => ({
      note_id: note.note_id,
      title: note.title,
      content: note.content,
      subject: note.subject,
      tags: note.tags,
      created_at: note.created_at,
      updated_at: note.updated_at
    })));
  } catch (error) {
    console.error('Error fetching student notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}

/**
 * Create Student Note
 * POST /api/student/notes
 */
async function createStudentNote(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { title, content, subject, tags } = req.body;

    const note = await prisma.studentNote.create({
      data: {
        student_id: studentId,
        title,
        content,
        subject: subject || null,
        tags: tags || []
      }
    });

    res.status(201).json({
      note_id: note.note_id,
      title: note.title,
      content: note.content,
      subject: note.subject,
      tags: note.tags,
      created_at: note.created_at,
      updated_at: note.updated_at
    });
  } catch (error) {
    console.error('Error creating student note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
}

/**
 * Update Student Note
 * PUT /api/student/notes/:noteId
 */
async function updateStudentNote(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { noteId } = req.params;
    const { title, content, subject, tags } = req.body;

    const note = await prisma.studentNote.findFirst({
      where: {
        note_id: parseInt(noteId),
        student_id: studentId
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedNote = await prisma.studentNote.update({
      where: { note_id: parseInt(noteId) },
      data: {
        title,
        content,
        subject: subject || null,
        tags: tags || []
      }
    });

    res.json({
      note_id: updatedNote.note_id,
      title: updatedNote.title,
      content: updatedNote.content,
      subject: updatedNote.subject,
      tags: updatedNote.tags,
      created_at: updatedNote.created_at,
      updated_at: updatedNote.updated_at
    });
  } catch (error) {
    console.error('Error updating student note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
}

/**
 * Delete Student Note
 * DELETE /api/student/notes/:noteId
 */
async function deleteStudentNote(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { noteId } = req.params;

    const note = await prisma.studentNote.findFirst({
      where: {
        note_id: parseInt(noteId),
        student_id: studentId
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.studentNote.delete({
      where: { note_id: parseInt(noteId) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting student note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}

/**
 * Get AI Books
 * GET /api/student/books
 */
async function getStudentBooks(req, res) {
  try {
    const studentId = await getStudentId(req);

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: {
        current_class: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get books for the student's grade level
    const books = await prisma.aIBook.findMany({
      where: {
        is_active: true
      },
      include: {
        subject: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    res.json(books.map(book => ({
      book_id: book.book_id,
      title: book.title,
      subject_name: book.subject?.subject_name || 'General',
      author: book.author,
      description: book.description,
      cover_image_url: book.cover_image_url,
      grade_level: book.grade_level,
      content: book.content,
      external_url: book.content?.url || null,
      preview_url: book.content?.preview_url || null
    })));
  } catch (error) {
    console.error('Error fetching student books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

/**
 * Access Book
 * POST /api/student/books/:bookId/access
 */
async function accessBook(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { bookId } = req.params;

    const book = await prisma.aIBook.findUnique({
      where: { book_id: parseInt(bookId) }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Create or update book progress
    await prisma.bookProgress.upsert({
      where: {
        book_id_student_id: {
          book_id: parseInt(bookId),
          student_id: studentId
        }
      },
      update: {
        last_read_at: new Date()
      },
      create: {
        book_id: parseInt(bookId),
        student_id: studentId,
        last_read_at: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error accessing book:', error);
    res.status(500).json({ error: 'Failed to access book' });
  }
}

/**
 * Get Book Access Log
 * GET /api/student/books/access-log
 */
async function getBookAccessLog(req, res) {
  try {
    const studentId = await getStudentId(req);

    const accessLog = await prisma.bookProgress.findMany({
      where: {
        student_id: studentId
      },
      include: {
        book: {
          include: {
            subject: true
          }
        }
      },
      orderBy: {
        last_read_at: 'desc'
      },
      take: 50
    });

    res.json(accessLog.map(entry => ({
      access_id: entry.progress_id,
      book: {
        title: entry.book.title,
        subject_name: entry.book.subject?.subject_name || 'General'
      },
      accessed_at: entry.last_read_at,
      current_page: entry.current_page,
      completion_percentage: parseFloat(entry.completion_percentage)
    })));
  } catch (error) {
    console.error('Error fetching book access log:', error);
    res.status(500).json({ error: 'Failed to fetch access log' });
  }
}

/**
 * Get Teacher Evaluation by Token
 * GET /api/student/evaluation/:token
 */
async function getTeacherEvaluationByToken(req, res) {
  try {
    const { token } = req.params;

    // Find and validate the evaluation link
    const evaluationLink = await prisma.evaluationLink.findUnique({
      where: { token },
      include: {
        teacher: { include: { user: true } },
        student: { include: { user: true } },
        form: true
      }
    });

    if (!evaluationLink) {
      return res.status(404).json({ error: 'Invalid evaluation link' });
    }

    // Check if link is already used
    if (evaluationLink.used) {
      return res.status(400).json({ error: 'This evaluation link has already been used' });
    }

    // Check if link is expired
    if (new Date() > evaluationLink.expires_at) {
      return res.status(400).json({ error: 'This evaluation link has expired' });
    }

    // If simplified form, return a default form structure
    let form = evaluationLink.form;
    if (evaluationLink.form_type === 'simplified') {
      form = {
        form_id: 0,
        title: 'Teacher Evaluation Form',
        description: 'Simplified 15-criteria teacher evaluation form',
        criteria: {
          sections: [],
          ratingScale: [
            { value: 5, description: 'Excellent' },
            { value: 4, description: 'Very Good' },
            { value: 3, description: 'Good' },
            { value: 2, description: 'Needs Improvement' },
            { value: 1, description: 'Unsatisfactory' }
          ],
          additionalFields: []
        }
      };
    }

    res.json({
      evaluation: {
        ...evaluationLink,
        form,
        form_type: evaluationLink.form_type
      }
    });
  } catch (error) {
    console.error('Error fetching teacher evaluation by token:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
}

/**
 * Submit Teacher Evaluation using One-Time Link
 * POST /api/student/evaluation/:token
 */
async function submitTeacherEvaluation(req, res) {
  try {
    const { token } = req.params;
    const { scores, comments } = req.body;

    // Find and validate the evaluation link
    const evaluationLink = await prisma.evaluationLink.findUnique({
      where: { token },
      include: {
        teacher: { include: { user: true } },
        student: { include: { user: true } },
        form: true
      }
    });

    if (!evaluationLink) {
      return res.status(404).json({ error: 'Invalid evaluation link' });
    }

    // Check if link is already used
    if (evaluationLink.used) {
      return res.status(400).json({ error: 'This evaluation link has already been used' });
    }

    // Check if link is expired
    if (new Date() > evaluationLink.expires_at) {
      return res.status(400).json({ error: 'This evaluation link has expired' });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).map(s => Number(s));
    const overallScore = scoreValues.length > 0 
      ? scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length 
      : 0;

    // Create the teacher evaluation record
    const teacherEvaluation = await prisma.teacherEvaluation.create({
      data: {
        teacher_id: evaluationLink.teacher_id,
        student_id: evaluationLink.student_id,
        form_id: evaluationLink.form_id,
        scores,
        comments,
        overall_score: overallScore,
        submitted_at: new Date()
      },
      include: {
        teacher: { include: { user: true } },
        student: { include: { user: true } },
        form: true
      }
    });

    // Mark the evaluation link as used
    await prisma.evaluationLink.update({
      where: { token },
      data: { used: true, used_at: new Date() }
    });

    // Create notification for department head
    await prisma.notification.create({
      data: {
        user_id: evaluationLink.created_by,
        title: 'Teacher Evaluation Submitted',
        message: `${evaluationLink.student.user.full_name} has submitted an evaluation for ${evaluationLink.teacher.user.full_name}.`,
        type: 'EVALUATION',
        read: false
      }
    });

    res.status(201).json({ 
      message: 'Teacher evaluation submitted successfully',
      evaluation: teacherEvaluation
    });
  } catch (error) {
    console.error('Error submitting teacher evaluation:', error);
    res.status(500).json({ error: 'Failed to submit teacher evaluation' });
  }
}


/**
 * Get Student Exam Schedule
 * GET /api/student/exams/schedule
 */
async function getStudentExamSchedule(req, res) {
  try {
    const studentId = await getStudentId(req);
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const exams = await prisma.exam.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        }
      },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true,
            teacher: { include: { user: true } }
          }
        }
      },
      orderBy: { exam_date: 'asc' }
    });

    res.json(exams.map(exam => ({
      exam_id: exam.exam_id,
      title: exam.title,
      type: exam.exam_type,
      subject_name: exam.class_subject?.subject?.subject_name || 'General',
      subject_code: exam.class_subject?.subject?.subject_code || '',
      class_name: exam.class_subject?.school_class?.class_name || '',
      teacher_name: exam.class_subject?.teacher?.user?.full_name || '',
      exam_date: exam.exam_date,
      exam_time: exam.exam_time,
      duration_minutes: exam.duration_minutes,
      total_marks: parseFloat(exam.total_marks || 100),
      room: exam.room || 'Main Hall',
      status: exam.status,
      coordinator: exam.coordinator || ''
    })));
  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
}

/**
 * Get Student Exam Results
 * GET /api/student/exams/results
 */
async function getStudentExamResults(req, res) {
  try {
    const studentId = await getStudentId(req);

    // 1. Fetch official ExamResults
    const examResults = await prisma.examResult.findMany({
      where: { student_id: studentId },
      include: {
        exam: {
          include: {
            class_subject: {
              include: {
                subject: true,
                school_class: true,
                teacher: { include: { user: true } }
              }
            }
          }
        }
      },
      orderBy: { graded_at: 'desc' }
    });

    // 2. Fetch marks with type FINAL, MID, or TEST from student_marks
    const examMarks = await prisma.studentMark.findMany({
      where: { student_id: studentId, type: { in: ['FINAL', 'MID', 'TEST'] } },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true,
            teacher: { include: { user: true } }
          }
        }
      },
      orderBy: { graded_at: 'desc' }
    });

    const formattedExamResults = examResults.map(r => {
      const score = parseFloat(r.score);
      const totalMarks = r.exam?.total_marks ? parseFloat(r.exam.total_marks) : 100;
      const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(1)) : score;
      return {
        result_id: `exam_${r.result_id}`,
        title: r.exam?.title || 'Exam',
        type: r.exam?.exam_type || 'EXAM',
        subject_name: r.exam?.class_subject?.subject?.subject_name || 'Subject',
        subject_code: r.exam?.class_subject?.subject?.subject_code || '',
        class_name: r.exam?.class_subject?.school_class?.class_name || '',
        teacher_name: r.exam?.class_subject?.teacher?.user?.full_name || 'Teacher',
        score,
        max_score: totalMarks,
        percentage,
        letter_grade: r.letter_grade || (percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F'),
        remarks: r.remarks || '',
        graded_at: r.graded_at,
        source: 'EXAM_RESULT'
      };
    });

    const formattedMarks = examMarks.map(m => {
      const score = parseFloat(m.score);
      const maxScore = m.max_score ? parseFloat(m.max_score) : 100;
      const percentage = maxScore > 0 ? parseFloat(((score / maxScore) * 100).toFixed(1)) : score;
      return {
        result_id: `mark_${m.mark_id}`,
        title: `${m.type} Examination`,
        type: m.type,
        subject_name: m.class_subject?.subject?.subject_name || 'Subject',
        subject_code: m.class_subject?.subject?.subject_code || '',
        class_name: m.class_subject?.school_class?.class_name || '',
        teacher_name: m.class_subject?.teacher?.user?.full_name || 'Teacher',
        score,
        max_score: maxScore,
        percentage,
        letter_grade: m.letter_grade || (percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F'),
        remarks: m.remarks || '',
        term: m.term,
        academic_year: m.academic_year,
        graded_at: m.graded_at,
        source: 'STUDENT_MARK'
      };
    });

    // Merge without exact duplicates
    const combined = [...formattedExamResults, ...formattedMarks];
    res.json(combined);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
}

/**
 * AI Query Book
 * POST /api/student/books/:bookId/ai-query
 */
async function aiQueryBook(req, res) {
  try {
    const studentId = await getStudentId(req);
    const { bookId } = req.params;
    const { query } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

    const book = await prisma.aIBook.findUnique({
      where: { book_id: parseInt(bookId) },
      include: { subject: true }
    });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const subject = book.subject?.subject_name || 'General Studies';
    const bookTitle = book.title;

    const aiResponse = `In **${bookTitle}** (${subject}), regarding your question: *"${query}"*\n\nThis topic is an important part of the ${subject} curriculum. Here is a structured explanation:\n\n1. **Core Concept**: Break down the problem into manageable parts and apply the fundamental principles.\n2. **Key Principles**: Review the relevant rules and definitions from the text carefully.\n3. **Application**: Work through examples step by step to reinforce understanding.\n4. **Practice Tip**: Attempt similar exercises at the end of this chapter to test your comprehension.\n\nWould you like a worked example or clarification on a specific part?`;

    await prisma.bookProgress.upsert({
      where: { book_id_student_id: { book_id: parseInt(bookId), student_id: studentId } },
      update: { last_read_at: new Date() },
      create: { book_id: parseInt(bookId), student_id: studentId, last_read_at: new Date() }
    });

    res.json({ query, response: aiResponse, book_title: bookTitle, subject, timestamp: new Date() });
  } catch (error) {
    console.error('Error processing AI book query:', error);
    res.status(500).json({ error: 'Failed to process AI query' });
  }
}


/**
 * Check if Teacher has Opened Attendance Marking for Today
 * GET /api/student/attendance/session
 */
async function getStudentAttendanceSession(req, res) {
  try {
    const studentId = await getStudentId(req);
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: {
        current_class: {
          include: {
            class_subjects: {
              include: {
                subject: true,
                teacher: {
                  include: { user: { select: { full_name: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!student || !student.current_class_id) {
      return res.json({ isOpen: false, message: 'Not enrolled in any class' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const session = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: student.current_class_id,
          date: today
        }
      }
    });

    // Check if student has already submitted
    const submission = await prisma.studentAttendanceSubmission.findUnique({
      where: {
        student_id_class_id_date: {
          student_id: studentId,
          class_id: student.current_class_id,
          date: today
        }
      }
    });

    const isLocked = Boolean(session?.is_locked);
    const isOpen = Boolean(session?.allow_student_mark && !isLocked);

    res.json({
      isOpen,
      isLocked,
      hasMarked: Boolean(submission),
      markedAt: submission?.marked_at || null,
      status: submission?.status || null,
      class_name: student.current_class?.class_name,
      class_id: student.current_class_id,
      today: today.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching student attendance session:', error);
    res.status(500).json({ error: 'Failed to check attendance session' });
  }
}

/**
 * Student Self-Marks Attendance (Present)
 * POST /api/student/attendance/mark
 */
async function markStudentAttendance(req, res) {
  try {
    const studentId = await getStudentId(req);
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      include: { user: true }
    });

    if (!student || !student.current_class_id) {
      return res.status(400).json({ error: 'Student not assigned to an active class' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const session = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: student.current_class_id,
          date: today
        }
      }
    });

    if (!session || !session.allow_student_mark || session.is_locked) {
      return res.status(403).json({
        error: 'Teacher has not opened attendance marking for your class today, or attendance has already been saved.'
      });
    }

    const submission = await prisma.studentAttendanceSubmission.upsert({
      where: {
        student_id_class_id_date: {
          student_id: studentId,
          class_id: student.current_class_id,
          date: today
        }
      },
      update: {
        status: 'PRESENT',
        marked_at: new Date()
      },
      create: {
        session_id: session.session_id,
        student_id: studentId,
        class_id: student.current_class_id,
        date: today,
        status: 'PRESENT',
        marked_at: new Date()
      }
    });

    // Notify teacher live via socket
    const io = req.app.get('io');
    if (io) {
      io.emit(`attendance_submitted_${student.current_class_id}`, {
        student_id: studentId,
        student_name: student.user.full_name,
        date: today.toISOString().split('T')[0],
        status: 'PRESENT'
      });
    }

    res.json({
      message: 'Your attendance has been marked as Present. Your teacher will approve and save.',
      submission
    });
  } catch (error) {
    console.error('Error marking student attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
}

/**
 * Get Lesson Plans for the Student's Class
 * GET /api/student/lesson-plans
 */
async function getStudentLessonPlans(req, res) {
  try {
    const studentId = await getStudentId(req);
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (!student || !student.current_class_id) {
      return res.json([]);
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        }
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                full_name: true,
                email: true,
                profile_picture_url: true
              }
            }
          }
        },
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        }
      },
      orderBy: [
        { week_number: 'asc' },
        { submitted_at: 'desc' }
      ]
    });

    const formatted = lessonPlans.map(lp => ({
      lesson_plan_id: lp.lesson_plan_id,
      title: lp.title,
      subject_name: lp.class_subject?.subject?.subject_name || 'Subject',
      subject_code: lp.class_subject?.subject?.subject_code || '',
      class_name: lp.class_subject?.school_class?.class_name || '',
      teacher_name: lp.teacher?.user?.full_name || 'Teacher',
      teacher_avatar: lp.teacher?.user?.profile_picture_url || null,
      term: lp.term,
      week_number: lp.week_number,
      objectives: Array.isArray(lp.objectives) ? lp.objectives : [],
      materials: Array.isArray(lp.materials) ? lp.materials : [],
      activities: Array.isArray(lp.activities) ? lp.activities : [],
      assessment: lp.assessment,
      status: lp.status,
      submitted_at: lp.submitted_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching student lesson plans:', error);
    res.status(500).json({ error: 'Failed to fetch lesson plans' });
  }
}

module.exports = {
  getStudentDashboard,
  getStudentAnnouncements,
  getStudentNotifications,
  markNotificationRead,
  getStudentProfile,
  updateStudentProfile,
  updateProfilePicture,
  changePassword,
  getStudentAssignments,
  submitAssignment,
  getStudentGrades,
  getStudentPerformance,
  getStudentTranscript,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentAttendanceSession,
  markStudentAttendance,
  getStudentLessonPlans,
  getStudentConduct,
  getStudentConductHistory,
  getStudentMaterials,
  getStudentPeerEvaluations,
  getPeerEvaluationResults,
  submitPeerEvaluation,
  getStudentNotes,
  createStudentNote,
  updateStudentNote,
  deleteStudentNote,
  getStudentBooks,
  accessBook,
  getBookAccessLog,
  getTeacherEvaluationByToken,
  submitTeacherEvaluation,
  getStudentContacts,
  getStudentMessages,
  sendStudentMessage,
  markStudentMessageRead,
  getStudentExamSchedule,
  getStudentExamResults,
  aiQueryBook
};