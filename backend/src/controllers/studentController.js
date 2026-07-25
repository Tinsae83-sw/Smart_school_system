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

    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { current_class_id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        }
      },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        },
        submissions: {
          where: {
            student_id: studentId
          },
          include: {
            grade: true
          },
          orderBy: {
            resubmission_number: 'desc'
          },
          take: 1
        }
      },
      orderBy: { due_date: 'desc' }
    });

    const formattedAssignments = assignments.map(assignment => {
      const submission = assignment.submissions[0];
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      
      let status = 'OPEN';
      if (submission) {
        if (submission.grade) {
          status = 'GRADED';
        } else {
          status = 'SUBMITTED';
        }
      } else if (now > dueDate) {
        status = 'OVERDUE';
      }

      return {
        assignment_id: assignment.assignment_id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        max_score: parseFloat(assignment.max_score),
        attachments: assignment.attachments,
        subject: assignment.class_subject.subject.subject_name,
        class_id: assignment.class_subject.school_class.class_id,
        status,
        submission: submission ? {
          submission_id: submission.submission_id,
          file_url: submission.file_url,
          submitted_at: submission.submitted_at,
          is_late: submission.is_late,
          score: submission.grade ? parseFloat(submission.grade.score) : null,
          grade: submission.grade?.letter_grade,
          feedback: submission.grade?.feedback
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

    const submissions = await prisma.submission.findMany({
      where: {
        student_id: studentId
      },
      include: {
        assignment: {
          include: {
            class_subject: {
              include: {
                subject: true,
                school_class: true
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
      submission_id: sub.submission_id,
      assignment_title: sub.assignment.title,
      subject: sub.assignment.class_subject.subject.subject_name,
      class_id: sub.assignment.class_subject.school_class.class_id,
      score: sub.grade ? parseFloat(sub.grade.score) : null,
      grade: sub.grade?.letter_grade,
      feedback: sub.grade?.feedback,
      submitted_at: sub.submitted_at,
      max_score: parseFloat(sub.assignment.max_score)
    }));

    res.json(grades);
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

    res.json({
      student: {
        name: student.user.full_name,
        student_number: student.student_number,
        email: student.user.email,
        class: student.current_class?.class_name
      },
      grades,
      attendance: {
        present: presentCount,
        total: totalCount,
        percentage: attendancePercentage
      },
      conduct: conductGrade ? {
        conduct: conductGrade.grade,
        rating: conductGrade.rating
      } : null,
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
  getStudentConduct,
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
  submitTeacherEvaluation
};
