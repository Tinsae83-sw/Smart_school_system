const prisma = require('../config/prisma');

// ============================================================
// TEACHER CONTROLLER
// ============================================================

// Helper function to get teacher ID (with or without authentication)
async function getTeacherId(req) {
  // If authenticated, use the authenticated teacher ID
  if (req.teacherId) {
    return req.teacherId;
  }
  
  // For development without authentication, use the first teacher in the database
  const teacher = await prisma.teacher.findFirst({
    where: { user: { role: 'TEACHER' } }
  });
  
  if (!teacher) {
    throw new Error('No teacher found in database');
  }
  
  return teacher.teacher_id;
}

/**
 * Get Teacher Profile
 * GET /api/teacher/profile
 */
async function getTeacherProfile(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true,
            preferred_language: true
          }
        },
        teacher_settings: true
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Update Teacher Profile
 * PUT /api/teacher/profile
 */
async function updateTeacherProfile(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { phone_number, email, profile_picture_url } = req.body;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { user_id: (await prisma.teacher.findUnique({ where: { teacher_id: teacherId } })).user_id },
      data: {
        phone_number,
        email,
        profile_picture_url
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Get Teacher Dashboard
 * GET /api/teacher/dashboard
 */
async function getTeacherDashboard(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    // Get teacher's classes
    let classSubjects = [];
    try {
      classSubjects = await prisma.classSubject.findMany({
        where: { teacher_id: teacherId },
        include: {
          school_class: true,
          subject: true
        }
      });
    } catch (e) {
      console.warn('Could not fetch class subjects:', e.message);
    }

    const classIds = classSubjects.map(cs => cs.class_id);

    // Get total students in teacher's classes
    let totalStudents = 0;
    if (classIds.length > 0) {
      try {
        totalStudents = await prisma.student.count({
          where: { current_class_id: { in: classIds } }
        });
      } catch (e) {
        console.warn('Could not count students:', e.message);
      }
    }

    // Get pending assignments to grade
    let pendingSubmissions = 0;
    try {
      pendingSubmissions = await prisma.submission.count({
        where: {
          assignment: {
            class_subject: { teacher_id: teacherId }
          },
          grade: null
        }
      });
    } catch (e) {
      console.warn('Could not count pending submissions:', e.message);
    }

    // Get today's attendance rate
    let attendanceRate = 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          date: new Date(today),
          school_class: { class_id: { in: classIds } }
        },
        _count: true
      });

      const totalAttendance = todayAttendance.reduce((sum, item) => sum + item._count, 0);
      const presentCount = todayAttendance.find(item => item.status === 'PRESENT')?._count || 0;
      attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : 0;
    } catch (e) {
      console.warn('Could not fetch attendance:', e.message);
    }

    // Get recent activity
    let recentSubmissions = [];
    try {
      recentSubmissions = await prisma.submission.findMany({
        where: {
          assignment: {
            class_subject: { teacher_id: teacherId }
          }
        },
        include: {
          student: {
            include: { user: true }
          },
          assignment: true
        },
        orderBy: { submitted_at: 'desc' },
        take: 5
      });
    } catch (e) {
      console.warn('Could not fetch recent submissions:', e.message);
    }

    // Get upcoming deadlines
    let upcomingAssignments = [];
    try {
      upcomingAssignments = await prisma.assignment.findMany({
        where: {
          class_subject: { teacher_id: teacherId },
          due_date: { gte: new Date() }
        },
        include: {
          class_subject: {
            include: { school_class: true, subject: true }
          }
        },
        orderBy: { due_date: 'asc' },
        take: 5
      });
    } catch (e) {
      console.warn('Could not fetch upcoming assignments:', e.message);
    }

    // Get today's schedule
    let todaySchedule = [];
    try {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      todaySchedule = await prisma.classSchedule.findMany({
        where: {
          teacher_id: teacherId,
          day_of_week: dayOfWeek
        },
        include: {
          school_class: true,
          subject: true
        },
        orderBy: { period: 'asc' }
      });
    } catch (e) {
      console.warn('Could not fetch today schedule:', e.message);
    }

    res.json({
      stats: {
        totalClasses: classSubjects.length,
        totalStudents,
        pendingTasks: {
          ungradedSubmissions: pendingSubmissions
        },
        attendanceRate: parseFloat(attendanceRate)
      },
      todaySchedule,
      recentActivity: recentSubmissions,
      upcomingDeadlines: upcomingAssignments
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    // Return empty dashboard data instead of error
    res.json({
      stats: {
        totalClasses: 0,
        totalStudents: 0,
        pendingTasks: {
          ungradedSubmissions: 0
        },
        attendanceRate: 0
      },
      todaySchedule: [],
      recentActivity: [],
      upcomingDeadlines: []
    });
  }
}

/**
 * Get Teacher's Classes
 * GET /api/teacher/classes
 */
async function getTeacherClasses(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      include: {
        school_class: true,
        subject: true
      }
    });

    res.json(classSubjects);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
}

/**
 * Get Class Roster
 * GET /api/teacher/classes/:classId/roster
 */
async function getClassRoster(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const students = await prisma.student.findMany({
      where: { current_class_id: parseInt(classId) },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true
          }
        },
        student_parents: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    full_name: true,
                    phone_number: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching class roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
}

/**
 * Get Student Profile
 * GET /api/teacher/students/:studentId
 */
async function getStudentProfile(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { studentId } = req.params;

    // Verify teacher has access to this student
    const teacherClasses = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true }
    });

    const classIds = teacherClasses.map(cs => cs.class_id);

    const student = await prisma.student.findUnique({
      where: { student_id: parseInt(studentId) },
      include: {
        user: true,
        current_class: true,
        attendance_records: {
          where: { school_class: { class_id: { in: classIds } } },
          orderBy: { date: 'desc' },
          take: 30
        },
        submissions: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: { subject: true }
                }
              }
            },
            grade: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!classIds.includes(student.current_class_id)) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
}

/**
 * Get Class Timetable
 * GET /api/teacher/classes/:classId/timetable
 */
async function getClassTimetable(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const timetable = await prisma.classSchedule.findMany({
      where: { class_id: parseInt(classId) },
      include: {
        subject: true,
        teacher: {
          include: { user: true }
        }
      },
      orderBy: [{ day_of_week: 'asc' }, { period: 'asc' }]
    });

    res.json(timetable);
  } catch (error) {
    console.error('Error fetching class timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
}

/**
 * Get Teacher's Personal Timetable
 * GET /api/teacher/timetable
 */
async function getTeacherTimetable(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const timetable = await prisma.classSchedule.findMany({
      where: { teacher_id: teacherId },
      include: {
        school_class: true,
        subject: true
      },
      orderBy: [{ day_of_week: 'asc' }, { period: 'asc' }]
    });

    res.json(timetable);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
}

// ============================================================
// ATTENDANCE MANAGEMENT
// ============================================================

/**
 * Get Attendance for a Class on a Date
 * GET /api/teacher/attendance?classId=X&date=Y
 */
async function getAttendance(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId, date } = req.query;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const attendanceDate = new Date(date);

    // Get existing attendance records
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        class_id: classSubject.class_id,
        date: attendanceDate
      }
    });

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: { current_class_id: classSubject.class_id },
      include: { user: true }
    });

    // Merge students with attendance records
    const entries = students.map(student => {
      const record = existingRecords.find(r => r.student_id === student.student_id);
      return {
        student_id: student.student_id,
        student_name: student.user.full_name,
        student_number: student.student_number,
        status: record ? record.status : 'PRESENT',
        remarks: record ? record.remarks : null
      };
    });

    const attendanceId = existingRecords.length > 0 ? existingRecords[0].record_id : null;

    res.json({
      attendance_id: attendanceId,
      entries
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

/**
 * Save Attendance
 * POST /api/teacher/attendance
 */
async function saveAttendance(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { class_id, date, entries } = req.body;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(class_id)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const attendanceDate = new Date(date);

    // Delete existing records for this class and date
    await prisma.attendanceRecord.deleteMany({
      where: {
        class_id: parseInt(class_id),
        date: attendanceDate
      }
    });

    // Create new attendance records
    const records = await Promise.all(entries.map(entry =>
      prisma.attendanceRecord.create({
        data: {
          student_id: entry.student_id,
          class_id: parseInt(class_id),
          date: attendanceDate,
          status: entry.status,
          remarks: entry.remarks,
          recorded_by: teacherId
        }
      })
    ));

    res.json({ message: 'Attendance saved successfully', records });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
}

/**
 * Update Attendance
 * PUT /api/teacher/attendance/:attendanceId
 */
async function updateAttendance(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { attendanceId } = req.params;
    const { class_id, date, entries } = req.body;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(class_id)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const attendanceDate = new Date(date);

    // Delete existing records
    await prisma.attendanceRecord.deleteMany({
      where: {
        class_id: parseInt(class_id),
        date: attendanceDate
      }
    });

    // Create new records
    const records = await Promise.all(entries.map(entry =>
      prisma.attendanceRecord.create({
        data: {
          student_id: entry.student_id,
          class_id: parseInt(class_id),
          date: attendanceDate,
          status: entry.status,
          remarks: entry.remarks,
          recorded_by: teacherId
        }
      })
    ));

    res.json({ message: 'Attendance updated successfully', records });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
}

/**
 * Get Attendance Summary for a Class
 * GET /api/teacher/attendance/summary/:classId
 */
async function getAttendanceSummary(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const summary = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { class_id: parseInt(classId) },
      _count: true
    });

    const total = summary.reduce((sum, item) => sum + item._count, 0);
    const present = summary.find(s => s.status === 'PRESENT')?._count || 0;
    const absent = summary.find(s => s.status === 'ABSENT')?._count || 0;
    const late = summary.find(s => s.status === 'LATE')?._count || 0;

    res.json({
      total,
      present,
      absent,
      late,
      attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

// ============================================================
// ASSIGNMENT MANAGEMENT
// ============================================================

/**
 * Get All Assignments
 * GET /api/teacher/assignments
 */
async function getAssignments(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classSubjectId } = req.query;

    const whereClause = {
      class_subject: { teacher_id: teacherId }
    };

    if (classSubjectId) {
      whereClause.class_subject_id = parseInt(classSubjectId);
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        },
        submissions: {
          include: {
            student: {
              include: { user: true }
            },
            grade: true
          }
        }
      },
      orderBy: { due_date: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

/**
 * Create Assignment
 * POST /api/teacher/assignments
 */
async function createAssignment(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      class_subject_id,
      title,
      description,
      due_date,
      max_score,
      attachments,
      allow_resubmission,
      resubmission_deadline,
      max_resubmissions
    } = req.body;

    // Verify teacher has access to this class subject
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(class_subject_id)
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied to this class subject' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        class_subject_id: parseInt(class_subject_id),
        title,
        description,
        due_date: new Date(due_date),
        max_score: parseFloat(max_score),
        attachments: attachments || [],
        allow_resubmission: allow_resubmission || false,
        resubmission_deadline: resubmission_deadline ? new Date(resubmission_deadline) : null,
        max_resubmissions: max_resubmissions || 1
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
}

/**
 * Update Assignment
 * PUT /api/teacher/assignments/:assignmentId
 */
async function updateAssignment(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { assignmentId } = req.params;
    const {
      title,
      description,
      due_date,
      max_score,
      attachments,
      allow_resubmission,
      resubmission_deadline,
      max_resubmissions
    } = req.body;

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.assignment.update({
      where: { assignment_id: parseInt(assignmentId) },
      data: {
        title,
        description,
        due_date: due_date ? new Date(due_date) : undefined,
        max_score: max_score ? parseFloat(max_score) : undefined,
        attachments,
        allow_resubmission,
        resubmission_deadline: resubmission_deadline ? new Date(resubmission_deadline) : undefined,
        max_resubmissions
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
}

/**
 * Delete Assignment
 * DELETE /api/teacher/assignments/:assignmentId
 */
async function deleteAssignment(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { assignmentId } = req.params;

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.assignment.delete({
      where: { assignment_id: parseInt(assignmentId) }
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
}

/**
 * Grade Assignment Submission
 * POST /api/teacher/assignments/:assignmentId/grade
 */
async function gradeSubmission(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { assignmentId } = req.params;
    const { submission_id, score, letter_grade, feedback } = req.body;

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if grade already exists
    const existingGrade = await prisma.grade.findUnique({
      where: { submission_id: parseInt(submission_id) }
    });

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { submission_id: parseInt(submission_id) },
        data: {
          score: parseFloat(score),
          letter_grade,
          feedback,
          graded_by: teacherId,
          graded_at: new Date()
        }
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          submission_id: parseInt(submission_id),
          score: parseFloat(score),
          letter_grade,
          feedback,
          graded_by: teacherId
        }
      });
    }

    res.json(grade);
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
}

/**
 * Bulk Grade Assignments
 * POST /api/teacher/assignments/:assignmentId/bulk-grade
 */
async function bulkGradeAssignments(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { assignmentId } = req.params;
    const { grades } = req.body; // Array of { submission_id, score, letter_grade, feedback }

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await Promise.all(grades.map(g =>
      prisma.grade.upsert({
        where: { submission_id: parseInt(g.submission_id) },
        update: {
          score: parseFloat(g.score),
          letter_grade: g.letter_grade,
          feedback: g.feedback,
          graded_by: teacherId,
          graded_at: new Date()
        },
        create: {
          submission_id: parseInt(g.submission_id),
          score: parseFloat(g.score),
          letter_grade: g.letter_grade,
          feedback: g.feedback,
          graded_by: teacherId
        }
      })
    ));

    res.json(results);
  } catch (error) {
    console.error('Error bulk grading:', error);
    res.status(500).json({ error: 'Failed to bulk grade' });
  }
}

// ============================================================
// GRADE MANAGEMENT
// ============================================================

/**
 * Get Grades for a Class
 * GET /api/teacher/grades/:classId
 */
async function getClassGrades(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher_id: teacherId,
              class_id: parseInt(classId)
            }
          }
        }
      },
      include: {
        submission: {
          include: {
            student: {
              include: { user: true }
            },
            assignment: {
              include: {
                class_subject: {
                  include: { subject: true }
                }
              }
            }
          }
        }
      }
    });

    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
}

/**
 * Enter Exam Grades
 * POST /api/teacher/exam-grades
 */
async function enterExamGrades(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { exam_id, grades } = req.body; // grades: [{ student_id, score, letter_grade, remarks }]

    // Verify teacher has access to this exam
    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(exam_id) },
      include: { class_subject: true }
    });

    if (!exam || exam.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await Promise.all(grades.map(g =>
      prisma.examResult.upsert({
        where: {
          exam_id_student_id: {
            exam_id: parseInt(exam_id),
            student_id: parseInt(g.student_id)
          }
        },
        update: {
          score: parseFloat(g.score),
          letter_grade: g.letter_grade,
          remarks: g.remarks,
          graded_at: new Date()
        },
        create: {
          exam_id: parseInt(exam_id),
          student_id: parseInt(g.student_id),
          score: parseFloat(g.score),
          letter_grade: g.letter_grade,
          remarks: g.remarks
        }
      })
    ));

    res.json(results);
  } catch (error) {
    console.error('Error entering exam grades:', error);
    res.status(500).json({ error: 'Failed to enter exam grades' });
  }
}

// ============================================================
// CONDUCT MANAGEMENT
// ============================================================

/**
 * Get Conduct Grades for Class
 * GET /api/teacher/conduct/:classId
 */
async function getClassConduct(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;
    const { term, academic_year } = req.query;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause = {
      student: { current_class_id: parseInt(classId) }
    };

    if (term) whereClause.term = term;
    if (academic_year) whereClause.academic_year = academic_year;

    const conductGrades = await prisma.conductGrade.findMany({
      where: whereClause,
      include: {
        student: {
          include: { user: true }
        },
        conduct_comments: {
          include: {
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    res.json(conductGrades);
  } catch (error) {
    console.error('Error fetching conduct grades:', error);
    res.status(500).json({ error: 'Failed to fetch conduct grades' });
  }
}

/**
 * Grade Student Conduct
 * POST /api/teacher/conduct
 */
async function gradeConduct(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { student_id, term, academic_year, grade, rating, comments } = req.body;

    // Verify teacher has access to this student
    const teacherClasses = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true }
    });

    const classIds = teacherClasses.map(cs => cs.class_id);
    const student = await prisma.student.findUnique({
      where: { student_id: parseInt(student_id) }
    });

    if (!classIds.includes(student.current_class_id)) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const conductGrade = await prisma.conductGrade.upsert({
      where: {
        student_id_term_academic_year: {
          student_id: parseInt(student_id),
          term,
          academic_year
        }
      },
      update: {
        grade,
        rating: parseFloat(rating),
        teacher_id: teacherId,
        graded_at: new Date()
      },
      create: {
        student_id: parseInt(student_id),
        term,
        academic_year,
        grade,
        rating: parseFloat(rating),
        teacher_id: teacherId
      },
      include: {
        student: {
          include: { user: true }
        }
      }
    });

    // Add comment if provided
    if (comments) {
      await prisma.conductComment.create({
        data: {
          conduct_id: conductGrade.conduct_id,
          teacher_id: teacherId,
          comment: comments
        }
      });
    }

    res.json(conductGrade);
  } catch (error) {
    console.error('Error grading conduct:', error);
    res.status(500).json({ error: 'Failed to grade conduct' });
  }
}

/**
 * Add Conduct Comment
 * POST /api/teacher/conduct/:conductId/comment
 */
async function addConductComment(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { conductId } = req.params;
    const { comment, subject } = req.body;

    const conductGrade = await prisma.conductGrade.findUnique({
      where: { conduct_id: parseInt(conductId) }
    });

    if (!conductGrade) {
      return res.status(404).json({ error: 'Conduct grade not found' });
    }

    const newComment = await prisma.conductComment.create({
      data: {
        conduct_id: parseInt(conductId),
        teacher_id: teacherId,
        comment,
        subject
      },
      include: {
        teacher: {
          include: { user: true }
        }
      }
    });

    res.json(newComment);
  } catch (error) {
    console.error('Error adding conduct comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

// ============================================================
// LESSON PLANS
// ============================================================

/**
 * Get Teacher's Lesson Plans
 * GET /api/teacher/lesson-plans
 */
async function getLessonPlans(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId, status } = req.query;

    const whereClause = { teacher_id: teacherId };

    if (classId) {
      whereClause.class_subject = { class_id: parseInt(classId) };
    }

    if (status) {
      whereClause.status = status;
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        },
        reviewer: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(lessonPlans);
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    res.status(500).json({ error: 'Failed to fetch lesson plans' });
  }
}

/**
 * Create Lesson Plan
 * POST /api/teacher/lesson-plans
 */
async function createLessonPlan(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      class_subject_id,
      title,
      objectives,
      materials,
      activities,
      assessment,
      week_number,
      term
    } = req.body;

    // Verify teacher has access to this class subject
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(class_subject_id)
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        teacher_id: teacherId,
        class_subject_id: parseInt(class_subject_id),
        title,
        objectives,
        materials,
        activities,
        assessment,
        week_number,
        term,
        status: 'PENDING'
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.status(201).json(lessonPlan);
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    res.status(500).json({ error: 'Failed to create lesson plan' });
  }
}

/**
 * Update Lesson Plan
 * PUT /api/teacher/lesson-plans/:lessonPlanId
 */
async function updateLessonPlan(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { lessonPlanId } = req.params;
    const {
      title,
      objectives,
      materials,
      activities,
      assessment,
      week_number,
      term
    } = req.body;

    // Verify teacher owns this lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { lesson_plan_id: parseInt(lessonPlanId) }
    });

    if (!lessonPlan || lessonPlan.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (lessonPlan.status !== 'PENDING' && lessonPlan.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Cannot update lesson plan that is already approved' });
    }

    const updated = await prisma.lessonPlan.update({
      where: { lesson_plan_id: parseInt(lessonPlanId) },
      data: {
        title,
        objectives,
        materials,
        activities,
        assessment,
        week_number,
        term,
        status: 'PENDING' // Reset to pending when updated
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating lesson plan:', error);
    res.status(500).json({ error: 'Failed to update lesson plan' });
  }
}

/**
 * Submit Lesson Plan for Approval
 * POST /api/teacher/lesson-plans/:lessonPlanId/submit
 */
async function submitLessonPlan(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { lessonPlanId } = req.params;

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { lesson_plan_id: parseInt(lessonPlanId) }
    });

    if (!lessonPlan || lessonPlan.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.lessonPlan.update({
      where: { lesson_plan_id: parseInt(lessonPlanId) },
      data: { status: 'PENDING' }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error submitting lesson plan:', error);
    res.status(500).json({ error: 'Failed to submit lesson plan' });
  }
}

// ============================================================
// COURSE MATERIALS
// ============================================================

/**
 * Get Course Materials
 * GET /api/teacher/materials
 */
async function getMaterials(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.query;

    const whereClause = { uploaded_by: teacherId };

    if (classId) {
      whereClause.class_subject = { class_id: parseInt(classId) };
    }

    const materials = await prisma.courseMaterial.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      },
      orderBy: { uploaded_at: 'desc' }
    });

    res.json(materials.map(m => ({
      material_id: m.material_id,
      title: m.title,
      description: m.description,
      category: m.material_type,
      file_type: m.material_type,
      file_url: m.file_url,
      uploaded_at: m.uploaded_at,
      class_name: m.class_subject.school_class.class_name,
      subject_name: m.class_subject.subject.subject_name
    })));
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
}

/**
 * Create Course Material
 * POST /api/teacher/materials
 */
async function createMaterial(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { class_id, title, description, category, file_type } = req.body;

    // Find class_subject for this class and teacher
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_id: parseInt(class_id),
        teacher_id: teacherId
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const material = await prisma.courseMaterial.create({
      data: {
        class_subject_id: classSubject.class_subject_id,
        title,
        description,
        material_type: file_type,
        file_url: `/uploads/materials/${Date.now()}-${title.replace(/\s+/g, '_')}.${file_type.toLowerCase()}`,
        uploaded_by: teacherId
      }
    });

    res.json(material);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
}

/**
 * Delete Course Material
 * DELETE /api/teacher/materials/:materialId
 */
async function deleteMaterial(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { materialId } = req.params;

    const material = await prisma.courseMaterial.findFirst({
      where: {
        material_id: parseInt(materialId),
        uploaded_by: teacherId
      }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    await prisma.courseMaterial.delete({
      where: { material_id: parseInt(materialId) }
    });

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
}

// ============================================================
// ONLINE CLASSES
// ============================================================

/**
 * Get Online Classes
 * GET /api/teacher/online-classes
 */
async function getOnlineClasses(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId, status } = req.query;

    const whereClause = { teacher_id: teacherId };

    if (classId) {
      whereClause.class_subject = { class_id: parseInt(classId) };
    }

    if (status) {
      whereClause.status = status;
    }

    const onlineClasses = await prisma.onlineClass.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      },
      orderBy: { scheduled_date: 'desc' }
    });

    res.json(onlineClasses);
  } catch (error) {
    console.error('Error fetching online classes:', error);
    res.status(500).json({ error: 'Failed to fetch online classes' });
  }
}

/**
 * Create Online Class
 * POST /api/teacher/online-classes
 */
async function createOnlineClass(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      class_subject_id,
      title,
      description,
      scheduled_date,
      scheduled_time,
      duration_minutes
    } = req.body;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(class_subject_id)
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const onlineClass = await prisma.onlineClass.create({
      data: {
        teacher_id: teacherId,
        class_subject_id: parseInt(class_subject_id),
        title,
        description,
        scheduled_date: new Date(scheduled_date),
        scheduled_time: new Date(scheduled_time),
        duration_minutes: parseInt(duration_minutes),
        status: 'SCHEDULED'
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.status(201).json(onlineClass);
  } catch (error) {
    console.error('Error creating online class:', error);
    res.status(500).json({ error: 'Failed to create online class' });
  }
}

/**
 * Start Online Class
 * POST /api/teacher/online-classes/:onlineClassId/start
 */
async function startOnlineClass(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { onlineClassId } = req.params;
    const { meeting_link, meeting_password } = req.body;

    const onlineClass = await prisma.onlineClass.findUnique({
      where: { online_class_id: parseInt(onlineClassId) }
    });

    if (!onlineClass || onlineClass.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.onlineClass.update({
      where: { online_class_id: parseInt(onlineClassId) },
      data: {
        meeting_link,
        meeting_password,
        status: 'IN_PROGRESS',
        started_at: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error starting online class:', error);
    res.status(500).json({ error: 'Failed to start online class' });
  }
}

/**
 * End Online Class
 * POST /api/teacher/online-classes/:onlineClassId/end
 */
async function endOnlineClass(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { onlineClassId } = req.params;
    const { recording_url } = req.body;

    const onlineClass = await prisma.onlineClass.findUnique({
      where: { online_class_id: parseInt(onlineClassId) }
    });

    if (!onlineClass || onlineClass.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.onlineClass.update({
      where: { online_class_id: parseInt(onlineClassId) },
      data: {
        recording_url,
        status: 'COMPLETED',
        ended_at: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error ending online class:', error);
    res.status(500).json({ error: 'Failed to end online class' });
  }
}

// ============================================================
// EXAMINATION MANAGEMENT
// ============================================================

/**
 * Get Exams
 * GET /api/teacher/exams
 */
async function getExams(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.query;

    const whereClause = {
      class_subject: { teacher_id: teacherId }
    };

    if (classId) {
      whereClause.class_subject.class_id = parseInt(classId);
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        },
        creator: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: { exam_date: 'desc' }
    });

    res.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
}

/**
 * Create Exam
 * POST /api/teacher/exams
 */
async function createExam(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      class_subject_id,
      title,
      exam_type,
      exam_date,
      duration_minutes,
      total_marks
    } = req.body;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(class_subject_id)
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const exam = await prisma.exam.create({
      data: {
        class_subject_id: parseInt(class_subject_id),
        title,
        exam_type,
        exam_date: new Date(exam_date),
        duration_minutes: parseInt(duration_minutes),
        total_marks: parseFloat(total_marks),
        created_by: teacherId,
        status: 'DRAFT'
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        }
      }
    });

    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
}

/**
 * Submit Exam for Approval
 * POST /api/teacher/exams/:examId/submit
 */
async function submitExam(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { examId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(examId) }
    });

    if (!exam || exam.created_by !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.exam.update({
      where: { exam_id: parseInt(examId) },
      data: { status: 'PENDING_APPROVAL' }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
}

/**
 * Get Exam Results
 * GET /api/teacher/exams/:examId/results
 */
async function getExamResults(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { examId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(examId) },
      include: { class_subject: true }
    });

    if (!exam || exam.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await prisma.examResult.findMany({
      where: { exam_id: parseInt(examId) },
      include: {
        student: {
          include: { user: true }
        }
      }
    });

    // Calculate statistics
    const scores = results.map(r => parseFloat(r.score));
    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = results.filter(r => parseFloat(r.score) >= parseFloat(exam.total_marks) * 0.5).length;
    const passRate = results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0;

    res.json({
      results,
      statistics: {
        total: results.length,
        average: parseFloat(average),
        highest,
        lowest,
        passCount,
        passRate: parseFloat(passRate)
      }
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
}

// ============================================================
// PEER EVALUATION
// ============================================================

/**
 * Get Peer Evaluation Forms
 * GET /api/teacher/peer-evaluation-forms
 */
async function getPeerEvaluationForms(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const forms = await prisma.peerEvaluationForm.findMany({
      where: { created_by: teacherId, is_active: true },
      include: {
        creator: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(forms);
  } catch (error) {
    console.error('Error fetching peer evaluation forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
}

/**
 * Create Peer Evaluation Form
 * POST /api/teacher/peer-evaluation-forms
 */
async function createPeerEvaluationForm(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { title, description, criteria } = req.body;

    const form = await prisma.peerEvaluationForm.create({
      data: {
        title,
        description,
        criteria,
        created_by: teacherId
      }
    });

    res.status(201).json(form);
  } catch (error) {
    console.error('Error creating peer evaluation form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
}

/**
 * Assign Peer Evaluation
 * POST /api/teacher/peer-evaluation-forms/:formId/assign
 */
async function assignPeerEvaluation(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { formId } = req.params;
    const { class_id, term } = req.body;

    // Verify teacher has access to this class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(class_id)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: { current_class_id: parseInt(class_id) }
    });

    // Create peer evaluations (each student evaluates every other student)
    const evaluations = [];
    for (const evaluator of students) {
      for (const evaluatee of students) {
        if (evaluator.student_id !== evaluatee.student_id) {
          const evaluation = await prisma.studentPeerEvaluation.create({
            data: {
              student_id: evaluatee.student_id,
              evaluator_id: evaluator.student_id,
              class_id: parseInt(class_id),
              term,
              academic_year: getAcademicYearString()
            }
          });
          evaluations.push(evaluation);
        }
      }
    }

    res.json({ message: 'Peer evaluations assigned', count: evaluations.length });
  } catch (error) {
    console.error('Error assigning peer evaluation:', error);
    res.status(500).json({ error: 'Failed to assign peer evaluation' });
  }
}

/**
 * Get Peer Evaluation Results
 * GET /api/teacher/peer-evaluation-results/:classId
 */
async function getPeerEvaluationResults(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;
    const { term } = req.query;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause = { class_id: parseInt(classId) };
    if (term) whereClause.term = term;

    const evaluations = await prisma.studentPeerEvaluation.findMany({
      where: whereClause,
      include: {
        evaluated_student: {
          include: { user: true }
        }
      }
    });

    // Aggregate results by student
    const aggregated = {};
    evaluations.forEach(evaluation => {
      if (!aggregated[evaluation.student_id]) {
        aggregated[evaluation.student_id] = {
          student_id: evaluation.student_id,
          student_name: evaluation.evaluated_student.user.full_name,
          evaluations: [],
          average_teamwork: 0,
          average_participation: 0,
          average_collaboration: 0,
          average_respect: 0,
          average_overall: 0
        };
      }
      aggregated[evaluation.student_id].evaluations.push(evaluation);
    });

    // Calculate averages
    Object.values(aggregated).forEach(student => {
      const count = student.evaluations.length;
      student.average_teamwork = (student.evaluations.reduce((sum, e) => sum + parseFloat(e.teamwork_score), 0) / count).toFixed(2);
      student.average_participation = (student.evaluations.reduce((sum, e) => sum + parseFloat(e.participation_score), 0) / count).toFixed(2);
      student.average_collaboration = (student.evaluations.reduce((sum, e) => sum + parseFloat(e.collaboration_score), 0) / count).toFixed(2);
      student.average_respect = (student.evaluations.reduce((sum, e) => sum + parseFloat(e.respect_score), 0) / count).toFixed(2);
      student.average_overall = (student.evaluations.reduce((sum, e) => sum + parseFloat(e.overall_rating), 0) / count).toFixed(2);
    });

    res.json(Object.values(aggregated));
  } catch (error) {
    console.error('Error fetching peer evaluation results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}

// ============================================================
// COMMUNICATION
// ============================================================

/**
 * Get Messages
 * GET /api/teacher/messages
 */
async function getMessages(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: teacherId },
          { receiver_id: teacherId }
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
 * Send Message
 * POST /api/teacher/messages
 */
async function sendMessage(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { receiver_id, content, attachment } = req.body;

    const message = await prisma.message.create({
      data: {
        sender_id: teacherId,
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

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * Mark Message as Read
 * PUT /api/teacher/messages/:messageId/read
 */
async function markMessageRead(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { message_id: parseInt(messageId) }
    });

    if (!message || message.receiver_id !== teacherId) {
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

// ============================================================
// NOTIFICATIONS
// ============================================================

/**
 * Get Notifications
 * GET /api/teacher/notifications
 */
async function getNotifications(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const notifications = await prisma.notification.findMany({
      where: { user_id: teacherId },
      orderBy: { sent_at: 'desc' },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Mark Notification as Read
 * PUT /api/teacher/notifications/:notificationId/read
 */
async function markNotificationRead(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { notificationId } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(notificationId) }
    });

    if (!notification || notification.user_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.notification.update({
      where: { notification_id: parseInt(notificationId) },
      data: { is_sent: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
}

// ============================================================
// REPORTS
// ============================================================

/**
 * Generate Class Academic Report
 * GET /api/teacher/reports/class/:classId
 */
async function generateClassReport(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    // Verify teacher has access
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        teacher_id: teacherId,
        class_id: parseInt(classId)
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const students = await prisma.student.findMany({
      where: { current_class_id: parseInt(classId) },
      include: {
        user: true,
        attendance_records: {
          where: { school_class: { class_id: parseInt(classId) } }
        },
        submissions: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: { subject: true }
                }
              }
            },
            grade: true
          }
        }
      }
    });

    res.json({
      class_id: parseInt(classId),
      students,
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Error generating class report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Generate Student Academic Report
 * GET /api/teacher/reports/student/:studentId
 */
async function generateStudentReport(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { studentId } = req.params;

    // Verify teacher has access to this student
    const teacherClasses = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true }
    });

    const classIds = teacherClasses.map(cs => cs.class_id);

    const student = await prisma.student.findUnique({
      where: { student_id: parseInt(studentId) },
      include: {
        user: true,
        current_class: true,
        attendance_records: {
          where: { school_class: { class_id: { in: classIds } } }
        },
        submissions: {
          where: {
            assignment: {
              class_subject: {
                teacher_id: teacherId
              }
            }
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
          }
        }
      }
    });

    if (!student || !classIds.includes(student.current_class_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      student,
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Error generating student report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

// ============================================================
// SETTINGS
// ============================================================

/**
 * Get Teacher Settings
 * GET /api/teacher/settings
 */
async function getTeacherSettings(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    let settings = await prisma.teacherSettings.findUnique({
      where: { teacher_id: teacherId }
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.teacherSettings.create({
        data: {
          teacher_id: teacherId
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching teacher settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * Update Teacher Settings
 * PUT /api/teacher/settings
 */
async function updateTeacherSettings(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      grading_rubric,
      assignment_defaults,
      notification_preferences,
      teaching_preferences,
      timezone,
      language
    } = req.body;

    const settings = await prisma.teacherSettings.upsert({
      where: { teacher_id: teacherId },
      update: {
        grading_rubric,
        assignment_defaults,
        notification_preferences,
        teaching_preferences,
        timezone,
        language
      },
      create: {
        teacher_id: teacherId,
        grading_rubric,
        assignment_defaults,
        notification_preferences,
        teaching_preferences,
        timezone,
        language
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating teacher settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

/**
 * Change Password
 * POST /api/teacher/change-password
 */
async function changePassword(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { current_password, new_password } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      include: { user: true }
    });

    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(current_password, teacher.user.password_hash);

    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { user_id: teacher.user_id },
      data: { password_hash: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

// ============================================================
// ACTIVITY LOG
// ============================================================

/**
 * Get Teacher Activity Log
 * GET /api/teacher/activity-log
 */
async function getActivityLog(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    const logs = await prisma.auditLog.findMany({
      where: { user_id: teacherId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
}

// Helper function
function getAcademicYearString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

module.exports = {
  // Profile & Dashboard
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherDashboard,
  
  // Classes & Students
  getTeacherClasses,
  getClassRoster,
  getStudentProfile,
  getClassTimetable,
  getTeacherTimetable,
  
  // Attendance
  getAttendance,
  saveAttendance,
  updateAttendance,
  getAttendanceSummary,
  
  // Assignments
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  bulkGradeAssignments,
  
  // Grades
  getClassGrades,
  enterExamGrades,
  
  // Conduct
  getClassConduct,
  gradeConduct,
  addConductComment,
  
  // Lesson Plans
  getLessonPlans,
  createLessonPlan,
  updateLessonPlan,
  submitLessonPlan,
  
  // Course Materials
  getMaterials,
  createMaterial,
  deleteMaterial,
  
  // Online Classes
  getOnlineClasses,
  createOnlineClass,
  startOnlineClass,
  endOnlineClass,
  
  // Exams
  getExams,
  createExam,
  submitExam,
  getExamResults,
  
  // Peer Evaluation
  getPeerEvaluationForms,
  createPeerEvaluationForm,
  assignPeerEvaluation,
  getPeerEvaluationResults,
  
  // Communication
  getMessages,
  sendMessage,
  markMessageRead,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  
  // Reports
  generateClassReport,
  generateStudentReport,
  
  // Settings
  getTeacherSettings,
  updateTeacherSettings,
  changePassword,
  
  // Activity Log
  getActivityLog
};
