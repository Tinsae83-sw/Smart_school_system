const prisma = require('../config/prisma');

// ============================================================
// TEACHER CONTROLLER
// ============================================================

// Helper function to get teacher ID from authenticated request
async function getTeacherId(req) {
  if (!req.teacherId) {
    throw new Error('Teacher not authenticated');
  }
  
  console.log(`Using authenticated teacher_id: ${req.teacherId}, user: ${req.user?.email}`);
  return req.teacherId;
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

    // Map fields to match frontend expectations
    const profileData = {
      ...teacher,
      full_name: teacher.user?.full_name,
      email: teacher.user?.email,
      phone_number: teacher.user?.phone_number,
      profile_picture_url: teacher.user?.profile_picture_url,
      qualification: teacher.degree_level,
      joined_date: teacher.hire_date
    };

    res.json(profileData);
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
    const { full_name, phone_number, email, qualification, profile_picture_url } = req.body;

    // Get teacher's user_id
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { user_id: teacher.user_id },
      data: {
        ...(full_name && { full_name }),
        ...(phone_number !== undefined && { phone_number }),
        ...(email !== undefined && { email }),
        ...(profile_picture_url !== undefined && { profile_picture_url })
      }
    });

    // Update teacher qualification if provided
    if (qualification !== undefined) {
      await prisma.teacher.update({
        where: { teacher_id: teacherId },
        data: { degree_level: qualification }
      });
    }

    // Return updated profile
    const updatedProfile = await prisma.teacher.findUnique({
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

    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Upload Profile Picture
 * POST /api/teacher/upload-profile-picture
 */
async function uploadProfilePicture(req, res) {
  try {
    const teacherId = await getTeacherId(req);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct the file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/materials/${req.file.filename}`;

    // Update user's profile picture URL
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await prisma.user.update({
      where: { user_id: teacher.user_id },
      data: { profile_picture_url: fileUrl }
    });

    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
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
    console.log(`Fetching classes for teacher_id: ${teacherId}`);

    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      include: {
        school_class: true,
        subject: true
      }
    });

    console.log(`Found ${classSubjects.length} classes for teacher ${teacherId}`);
    classSubjects.forEach(cs => {
      console.log(`  - ${cs.school_class?.class_name} - ${cs.subject?.subject_name} (class_subject_id: ${cs.class_subject_id})`);
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

    if (!classId || !date) {
      return res.status(400).json({ error: 'classId and date are required' });
    }

    // Verify teacher has access to this class (classId is class_subject_id from frontend)
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_subject_id: parseInt(classId)
      },
      include: {
        school_class: true,
        subject: true
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check attendance session
    const session = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: attendanceDate
        }
      }
    });

    // Get existing finalized attendance records
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        class_id: classSubject.class_id,
        date: attendanceDate
      }
    });

    // Get any student self-attendance submissions for this date & class
    const studentSubmissions = await prisma.studentAttendanceSubmission.findMany({
      where: {
        class_id: classSubject.class_id,
        date: attendanceDate
      }
    });

    const isLocked = Boolean(session?.is_locked || existingRecords.length > 0);

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: { current_class_id: classSubject.class_id },
      include: { user: true },
      orderBy: { user: { full_name: 'asc' } }
    });

    // Merge students with attendance records and student self-submissions
    const entries = students.map(student => {
      const record = existingRecords.find(r => r.student_id === student.student_id);
      const submission = studentSubmissions.find(s => s.student_id === student.student_id);

      let status = 'PRESENT';
      let remarks = null;
      let self_marked = false;
      let marked_at = null;

      if (record) {
        status = record.status;
        remarks = record.remarks;
      } else if (submission) {
        status = submission.status || 'PRESENT';
        self_marked = true;
        marked_at = submission.marked_at;
      }

      return {
        student_id: student.student_id,
        student_name: student.user.full_name,
        student_number: student.student_number,
        status,
        remarks,
        self_marked,
        marked_at
      };
    });

    const attendanceId = existingRecords.length > 0 ? existingRecords[0].record_id : null;

    res.json({
      attendance_id: attendanceId,
      is_locked: isLocked,
      allow_student_mark: Boolean(session?.allow_student_mark && !isLocked),
      give_mark: Boolean(session?.give_mark),
      mark_value: session?.mark_value ? parseFloat(session.mark_value) : 10,
      entries
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

/**
 * Toggle Student Self-Marking Permission
 * POST /api/teacher/attendance/session/toggle
 */
async function toggleAttendanceSession(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { class_id, date, allow_student_mark } = req.body;

    if (!class_id || !date) {
      return res.status(400).json({ error: 'class_id and date are required' });
    }

    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_subject_id: parseInt(class_id),
        teacher_id: teacherId
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if session or records already locked/saved
    const existingCount = await prisma.attendanceRecord.count({
      where: {
        class_id: classSubject.class_id,
        date: attendanceDate
      }
    });

    const existingSession = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: attendanceDate
        }
      }
    });

    if (existingSession?.is_locked || existingCount > 0) {
      return res.status(400).json({
        error: 'Attendance for this date has already been finalized and saved. It cannot be changed.'
      });
    }

    const updatedSession = await prisma.attendanceSession.upsert({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: attendanceDate
        }
      },
      update: {
        allow_student_mark: Boolean(allow_student_mark),
        class_subject_id: classSubject.class_subject_id
      },
      create: {
        class_id: classSubject.class_id,
        class_subject_id: classSubject.class_subject_id,
        date: attendanceDate,
        allow_student_mark: Boolean(allow_student_mark),
        is_locked: false,
        created_by: teacherId
      }
    });

    // Broadcast real-time socket event
    const io = req.app.get('io');
    if (io) {
      io.emit(`attendance_session_${classSubject.class_id}`, {
        class_id: classSubject.class_id,
        date: attendanceDate.toISOString().split('T')[0],
        allow_student_mark: Boolean(allow_student_mark)
      });
    }

    res.json({
      message: Boolean(allow_student_mark)
        ? 'Students are now allowed to fill their attendance for today.'
        : 'Student attendance filling has been closed.',
      allow_student_mark: Boolean(updatedSession.allow_student_mark)
    });
  } catch (error) {
    console.error('Error toggling attendance session:', error);
    res.status(500).json({ error: 'Failed to update attendance session' });
  }
}

/**
 * Save Attendance (Approves student marks, saves finalized records, automatically awards marks if selected, and notifies parents of absent students)
 * Once saved, attendance CANNOT be changed.
 * POST /api/teacher/attendance
 */
async function saveAttendance(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { class_id, date, give_mark, mark_value } = req.body;
    const entries = req.body.entries || req.body.records;

    if (!class_id || isNaN(parseInt(class_id))) {
      return res.status(400).json({ error: 'Valid class ID is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (attendanceDate > now) {
      return res.status(400).json({ error: 'Attendance cannot be marked for a future date' });
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one student attendance record is required' });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    for (const entry of entries) {
      if (!entry.student_id || isNaN(parseInt(entry.student_id))) {
        return res.status(400).json({ error: 'Each attendance entry must have a valid student_id' });
      }
      if (!validStatuses.includes(entry.status)) {
        return res.status(400).json({ error: `Invalid status "${entry.status}". Must be PRESENT, ABSENT, LATE, or EXCUSED` });
      }
      if (entry.remarks && typeof entry.remarks === 'string' && entry.remarks.length > 200) {
        return res.status(400).json({ error: 'Attendance remarks cannot exceed 200 characters' });
      }
    }

    // Verify teacher has access to this class (class_id is class_subject_id from frontend)
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_subject_id: parseInt(class_id),
        teacher_id: teacherId
      },
      include: {
        school_class: true,
        subject: true
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Rule: Once the attendance is saved, it cannot be changed
    const existingCount = await prisma.attendanceRecord.count({
      where: {
        class_id: classSubject.class_id,
        date: attendanceDate
      }
    });

    const session = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: attendanceDate
        }
      }
    });

    if (session?.is_locked || existingCount > 0) {
      return res.status(400).json({
        error: 'Once the attendance is saved, it cannot be changed.'
      });
    }

    // Create new attendance records
    const records = await Promise.all(entries.map(entry =>
      prisma.attendanceRecord.create({
        data: {
          student_id: entry.student_id,
          class_id: classSubject.class_id,
          date: attendanceDate,
          status: entry.status,
          remarks: entry.remarks || '',
          recorded_by: teacherId
        }
      })
    ));

    // Lock the session so it cannot be modified and close student self-marking
    const markVal = give_mark ? (parseFloat(mark_value) || 10.00) : null;
    await prisma.attendanceSession.upsert({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: attendanceDate
        }
      },
      update: {
        is_locked: true,
        allow_student_mark: false,
        give_mark: Boolean(give_mark),
        mark_value: markVal,
        class_subject_id: classSubject.class_subject_id
      },
      create: {
        class_id: classSubject.class_id,
        class_subject_id: classSubject.class_subject_id,
        date: attendanceDate,
        is_locked: true,
        allow_student_mark: false,
        give_mark: Boolean(give_mark),
        mark_value: markVal,
        created_by: teacherId
      }
    });

    // Feature: If the teacher wants to give the attendance a mark the system will automatically give the mark
    if (give_mark) {
      const totalPoints = parseFloat(mark_value) || 10.00;
      for (const entry of entries) {
        let score = 0;
        let letterGrade = 'F';

        if (entry.status === 'PRESENT') {
          score = totalPoints;
          letterGrade = 'A';
        } else if (entry.status === 'LATE') {
          score = parseFloat((totalPoints * 0.5).toFixed(2));
          letterGrade = 'C';
        } else if (entry.status === 'EXCUSED') {
          score = totalPoints;
          letterGrade = 'A';
        } else {
          score = 0;
          letterGrade = 'F';
        }

        try {
          await prisma.studentMark.upsert({
            where: {
              student_id_class_subject_id_type: {
                student_id: entry.student_id,
                class_subject_id: classSubject.class_subject_id,
                type: 'ATTENDANCE'
              }
            },
            update: {
              score,
              letter_grade: letterGrade,
              graded_at: new Date()
            },
            create: {
              student_id: entry.student_id,
              class_subject_id: classSubject.class_subject_id,
              type: 'ATTENDANCE',
              score,
              letter_grade: letterGrade,
              graded_at: new Date()
            }
          });
        } catch (markErr) {
          console.error(`Failed to automatically award mark for student ${entry.student_id}:`, markErr);
        }
      }
    }

    // Feature: When a student is absent in certain class the system will automatically notify the parent or guardian
    const absentEntries = entries.filter(e => e.status === 'ABSENT');
    const io = req.app.get('io');
    const formattedDate = attendanceDate.toISOString().split('T')[0];
    const subjectTitle = classSubject.subject?.subject_name || classSubject.school_class?.class_name || 'Class';

    for (const absentEntry of absentEntries) {
      try {
        const studentInfo = await prisma.student.findUnique({
          where: { student_id: absentEntry.student_id },
          include: {
            user: true,
            student_parents: {
              include: {
                parent: {
                  include: { user: true }
                }
              }
            }
          }
        });

        if (studentInfo) {
          const studentName = studentInfo.user?.full_name || `Student #${studentInfo.student_id}`;

          for (const sp of studentInfo.student_parents) {
            if (sp.parent?.user_id) {
              const parentUserId = sp.parent.user_id;
              const notif = await prisma.notification.create({
                data: {
                  user_id: parentUserId,
                  type: 'ATTENDANCE',
                  title: 'Student Absence Notification',
                  content: `Attendance Alert: ${studentName} was marked ABSENT for ${subjectTitle} on ${formattedDate}.`,
                  is_sent: true,
                  sent_at: new Date(),
                  metadata: {
                    student_id: studentInfo.student_id,
                    student_name: studentName,
                    class_id: classSubject.class_id,
                    date: formattedDate,
                    status: 'ABSENT'
                  }
                }
              });

              if (io) {
                io.to(`user_${parentUserId}`).emit('new_notification', notif);
              }
            }
          }
        }
      } catch (notifErr) {
        console.error('Error sending absence notification to parent:', notifErr);
      }
    }

    res.json({
      message: 'Attendance saved and locked successfully.',
      records,
      is_locked: true,
      marks_awarded: Boolean(give_mark)
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
}

/**
 * Update Attendance (Rejected because saved attendance cannot be changed)
 * PUT /api/teacher/attendance/:attendanceId
 */
async function updateAttendance(req, res) {
  return res.status(400).json({
    error: 'Once the attendance is saved, it cannot be changed.'
  });
}

/**
 * Get Specific Day Attendance for History Search
 * GET /api/teacher/attendance/history-day
 */
async function getAttendanceByDay(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId, date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({ error: 'classId and date are required' });
    }

    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_subject_id: parseInt(classId),
        teacher_id: teacherId
      },
      include: {
        school_class: true,
        subject: true
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get attendance records for this specific day
    const records = await prisma.attendanceRecord.findMany({
      where: {
        class_id: classSubject.class_id,
        date: targetDate
      },
      include: {
        student: {
          include: {
            user: {
              select: { full_name: true, email: true, profile_picture_url: true }
            }
          }
        }
      },
      orderBy: { student: { user: { full_name: 'asc' } } }
    });

    const session = await prisma.attendanceSession.findUnique({
      where: {
        class_id_date: {
          class_id: classSubject.class_id,
          date: targetDate
        }
      }
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const excused = records.filter(r => r.status === 'EXCUSED').length;
    const attendanceRate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;

    res.json({
      date: targetDate.toISOString().split('T')[0],
      is_locked: Boolean(session?.is_locked || records.length > 0),
      give_mark: Boolean(session?.give_mark),
      mark_value: session?.mark_value ? parseFloat(session.mark_value) : null,
      stats: {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate
      },
      records: records.map(r => ({
        record_id: r.record_id,
        student_id: r.student_id,
        student_name: r.student.user.full_name,
        student_number: r.student.student_number,
        profile_picture_url: r.student.user.profile_picture_url,
        status: r.status,
        remarks: r.remarks,
        created_at: r.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching attendance for day:', error);
    res.status(500).json({ error: 'Failed to fetch attendance for day' });
  }
}

/**
 * Get Recorded Attendance Dates for a Class
 * GET /api/teacher/attendance/recorded-dates/:classId
 */
async function getRecordedAttendanceDates(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { classId } = req.params;

    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_subject_id: parseInt(classId),
        teacher_id: teacherId
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { class_id: classSubject.class_id },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 60
    });

    const dates = records.map(r => r.date.toISOString().split('T')[0]);
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching recorded attendance dates:', error);
    res.status(500).json({ error: 'Failed to fetch recorded dates' });
  }
}

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
        student: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true
              }
            }
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
 * Supports:
 *  - Single class-wide assignment
 *  - Multiple classes assignment (class_subject_ids: number[])
 *  - Individual assignments with different titles for different students (individual_assignments: Array<{ student_id, title, description?, max_score?, due_date? }>)
 *  - Single individual assignment (student_id: number)
 */
async function createAssignment(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const {
      class_subject_id,
      class_subject_ids,
      individual_assignments,
      student_id,
      title,
      description,
      due_date,
      max_score,
      attachments,
      allow_resubmission,
      resubmission_deadline,
      max_resubmissions
    } = req.body;

    // ========================================================
    // MODE 1: INDIVIDUAL ASSIGNMENTS WITH DIFFERENT TITLES FOR STUDENTS
    // ========================================================
    if (Array.isArray(individual_assignments) && individual_assignments.length > 0) {
      if (!class_subject_id || isNaN(parseInt(class_subject_id))) {
        return res.status(400).json({ error: 'Valid class subject ID is required for individual assignments' });
      }

      // Verify teacher has access to this class subject
      const classSubject = await prisma.classSubject.findUnique({
        where: { class_subject_id: parseInt(class_subject_id) }
      });

      if (!classSubject) {
        return res.status(404).json({ error: 'Class subject not found' });
      }

      if (classSubject.teacher_id !== teacherId) {
        return res.status(403).json({ error: 'Access denied to this class subject' });
      }

      const defaultDueDate = due_date ? new Date(due_date) : null;
      const defaultMaxScore = max_score !== undefined ? parseFloat(max_score) : 100;

      // Extract student IDs and verify they belong to this class
      const targetStudentIds = individual_assignments.map(item => parseInt(item.student_id)).filter(id => !isNaN(id));
      const enrolledStudents = await prisma.student.findMany({
        where: {
          student_id: { in: targetStudentIds },
          current_class_id: classSubject.class_id
        },
        select: { student_id: true }
      });
      const enrolledSet = new Set(enrolledStudents.map(s => s.student_id));

      const invalidStudent = targetStudentIds.find(id => !enrolledSet.has(id));
      if (invalidStudent) {
        return res.status(400).json({
          error: `Student ID ${invalidStudent} is not enrolled in class #${classSubject.class_id}`
        });
      }

      const createdList = [];
      for (const item of individual_assignments) {
        const itemDueDate = item.due_date ? new Date(item.due_date) : defaultDueDate;
        if (!itemDueDate || isNaN(itemDueDate.getTime()) || itemDueDate <= new Date()) {
          return res.status(400).json({ error: 'Due date must be a valid date in the future for each student assignment' });
        }

        const itemMaxScore = item.max_score !== undefined ? parseFloat(item.max_score) : defaultMaxScore;
        if (isNaN(itemMaxScore) || itemMaxScore <= 0 || itemMaxScore > 1000) {
          return res.status(400).json({ error: 'Maximum score must be a number between 1 and 1000' });
        }

        const itemTitle = (item.title || '').trim();
        if (!itemTitle || itemTitle.length < 3 || itemTitle.length > 200) {
          return res.status(400).json({ error: 'Each individual assignment title must be between 3 and 200 characters' });
        }

        const itemDesc = item.description !== undefined && item.description !== null && item.description.trim() !== ''
          ? item.description.trim()
          : (description ? description.trim() : null);

        const newAssign = await prisma.assignment.create({
          data: {
            class_subject_id: parseInt(class_subject_id),
            student_id: parseInt(item.student_id),
            title: itemTitle,
            description: itemDesc,
            due_date: itemDueDate,
            max_score: itemMaxScore,
            attachments: item.attachments || attachments || [],
            allow_resubmission: Boolean(allow_resubmission),
            resubmission_deadline: resubmission_deadline ? new Date(resubmission_deadline) : null,
            max_resubmissions: max_resubmissions ? parseInt(max_resubmissions) : 1
          },
          include: {
            class_subject: {
              include: { school_class: true, subject: true }
            },
            student: {
              include: {
                user: {
                  select: { user_id: true, full_name: true, email: true }
                }
              }
            }
          }
        });
        createdList.push(newAssign);
      }

      return res.status(201).json({
        message: `Successfully created ${createdList.length} individual assignments`,
        count: createdList.length,
        assignments: createdList,
        assignment: createdList[0]
      });
    }

    // ========================================================
    // MODE 2: MULTIPLE CLASSES OR SINGLE CLASS-WIDE ASSIGNMENT
    // ========================================================
    const targetClassSubjectIds = Array.isArray(class_subject_ids) && class_subject_ids.length > 0
      ? class_subject_ids.map(id => parseInt(id)).filter(id => !isNaN(id))
      : class_subject_id && !isNaN(parseInt(class_subject_id))
      ? [parseInt(class_subject_id)]
      : [];

    if (targetClassSubjectIds.length === 0) {
      return res.status(400).json({ error: 'At least one valid class subject ID is required' });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ error: 'Title must be between 3 and 200 characters' });
    }

    if (description && typeof description === 'string' && description.length > 2000) {
      return res.status(400).json({ error: 'Description cannot exceed 2000 characters' });
    }

    if (!due_date) {
      return res.status(400).json({ error: 'Due date is required' });
    }

    const parsedDueDate = new Date(due_date);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ error: 'Invalid due date format' });
    }

    if (parsedDueDate <= new Date()) {
      return res.status(400).json({ error: 'Due date must be in the future' });
    }

    const parsedMaxScore = parseFloat(max_score);
    if (isNaN(parsedMaxScore) || parsedMaxScore <= 0 || parsedMaxScore > 1000) {
      return res.status(400).json({ error: 'Maximum score must be a number between 1 and 1000' });
    }

    if (allow_resubmission && resubmission_deadline) {
      const parsedResubDeadline = new Date(resubmission_deadline);
      if (isNaN(parsedResubDeadline.getTime())) {
        return res.status(400).json({ error: 'Invalid resubmission deadline format' });
      }
      if (parsedResubDeadline < parsedDueDate) {
        return res.status(400).json({ error: 'Resubmission deadline must be after the original due date' });
      }
    }

    if (max_resubmissions !== undefined) {
      const parsedMaxResub = parseInt(max_resubmissions);
      if (isNaN(parsedMaxResub) || parsedMaxResub < 1 || parsedMaxResub > 10) {
        return res.status(400).json({ error: 'Maximum resubmissions must be an integer between 1 and 10' });
      }
    }

    // Verify teacher has access to all requested class subjects
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class_subject_id: { in: targetClassSubjectIds },
        teacher_id: teacherId
      },
      include: { school_class: true, subject: true }
    });

    if (classSubjects.length !== targetClassSubjectIds.length) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to one or more of the selected classes' });
    }

    const createdList = [];
    for (const cs of classSubjects) {
      const newAssign = await prisma.assignment.create({
        data: {
          class_subject_id: cs.class_subject_id,
          student_id: student_id ? parseInt(student_id) : null,
          title: title.trim(),
          description: description ? description.trim() : null,
          due_date: parsedDueDate,
          max_score: parsedMaxScore,
          attachments: attachments || [],
          allow_resubmission: Boolean(allow_resubmission),
          resubmission_deadline: resubmission_deadline ? new Date(resubmission_deadline) : null,
          max_resubmissions: max_resubmissions ? parseInt(max_resubmissions) : 1
        },
        include: {
          class_subject: {
            include: { school_class: true, subject: true }
          },
          student: {
            include: {
              user: {
                select: { user_id: true, full_name: true, email: true }
              }
            }
          }
        }
      });
      createdList.push(newAssign);
    }

    if (createdList.length === 1 && !Array.isArray(class_subject_ids)) {
      return res.status(201).json(createdList[0]);
    }

    res.status(201).json({
      message: `Successfully created assignment for ${createdList.length} classes`,
      count: createdList.length,
      assignments: createdList,
      assignment: createdList[0]
    });
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

    if (!assignmentId || isNaN(parseInt(assignmentId))) {
      return res.status(400).json({ error: 'Valid assignment ID is required' });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200)) {
      return res.status(400).json({ error: 'Title must be between 3 and 200 characters' });
    }

    if (description !== undefined && typeof description === 'string' && description.length > 2000) {
      return res.status(400).json({ error: 'Description cannot exceed 2000 characters' });
    }

    let parsedDueDate;
    if (due_date !== undefined) {
      parsedDueDate = new Date(due_date);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: 'Invalid due date format' });
      }
    }

    let parsedMaxScore;
    if (max_score !== undefined) {
      parsedMaxScore = parseFloat(max_score);
      if (isNaN(parsedMaxScore) || parsedMaxScore <= 0 || parsedMaxScore > 1000) {
        return res.status(400).json({ error: 'Maximum score must be a number between 1 and 1000' });
      }
    }

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
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(parsedDueDate !== undefined && { due_date: parsedDueDate }),
        ...(parsedMaxScore !== undefined && { max_score: parsedMaxScore }),
        ...(attachments !== undefined && { attachments }),
        ...(allow_resubmission !== undefined && { allow_resubmission: Boolean(allow_resubmission) }),
        ...(resubmission_deadline !== undefined && { resubmission_deadline: resubmission_deadline ? new Date(resubmission_deadline) : null }),
        ...(max_resubmissions !== undefined && { max_resubmissions: parseInt(max_resubmissions) })
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

    if (!assignmentId || isNaN(parseInt(assignmentId))) {
      return res.status(400).json({ error: 'Valid assignment ID is required' });
    }

    if (!submission_id || isNaN(parseInt(submission_id))) {
      return res.status(400).json({ error: 'Valid submission ID is required' });
    }

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > assignment.max_score) {
      return res.status(400).json({ error: `Score must be a number between 0 and ${assignment.max_score}` });
    }

    if (feedback && typeof feedback === 'string' && feedback.length > 1000) {
      return res.status(400).json({ error: 'Feedback cannot exceed 1000 characters' });
    }

    // Verify submission belongs to this assignment
    const submission = await prisma.submission.findUnique({
      where: { submission_id: parseInt(submission_id) }
    });

    if (!submission || submission.assignment_id !== assignment.assignment_id) {
      return res.status(404).json({ error: 'Submission not found for this assignment' });
    }

    const calculatedLetter = letter_grade || calculateLetterGrade((parsedScore / assignment.max_score) * 100);

    // Check if grade already exists
    const existingGrade = await prisma.grade.findUnique({
      where: { submission_id: parseInt(submission_id) }
    });

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { submission_id: parseInt(submission_id) },
        data: {
          score: parsedScore,
          letter_grade: calculatedLetter,
          feedback: feedback ? feedback.trim() : null,
          graded_by: teacherId,
          graded_at: new Date()
        }
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          submission_id: parseInt(submission_id),
          score: parsedScore,
          letter_grade: calculatedLetter,
          feedback: feedback ? feedback.trim() : null,
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

    if (!assignmentId || isNaN(parseInt(assignmentId))) {
      return res.status(400).json({ error: 'Valid assignment ID is required' });
    }

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'Grades array must contain at least one submission' });
    }

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: { class_subject: true }
    });

    if (!assignment || assignment.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    for (const g of grades) {
      if (!g.submission_id || isNaN(parseInt(g.submission_id))) {
        return res.status(400).json({ error: 'Each grade entry must have a valid submission_id' });
      }
      const parsedScore = parseFloat(g.score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > assignment.max_score) {
        return res.status(400).json({ error: `Score for submission #${g.submission_id} must be between 0 and ${assignment.max_score}` });
      }
      if (g.feedback && typeof g.feedback === 'string' && g.feedback.length > 1000) {
        return res.status(400).json({ error: `Feedback for submission #${g.submission_id} cannot exceed 1000 characters` });
      }
    }

    const results = await Promise.all(grades.map(g => {
      const parsedScore = parseFloat(g.score);
      const calculatedLetter = g.letter_grade || calculateLetterGrade((parsedScore / assignment.max_score) * 100);
      return prisma.grade.upsert({
        where: { submission_id: parseInt(g.submission_id) },
        update: {
          score: parsedScore,
          letter_grade: calculatedLetter,
          feedback: g.feedback ? g.feedback.trim() : null,
          graded_by: teacherId,
          graded_at: new Date()
        },
        create: {
          submission_id: parseInt(g.submission_id),
          score: parsedScore,
          letter_grade: calculatedLetter,
          feedback: g.feedback ? g.feedback.trim() : null,
          graded_by: teacherId
        }
      });
    }));

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
      },
      include: {
        school_class: true,
        subject: true
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: { current_class_id: parseInt(classId) },
      include: { user: true }
    });

    // Get all grades for this class
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
            assignment: true
          }
        }
      }
    });

    // Get student marks (test/mid/final/assignment/other)
    const studentMarks = await prisma.studentMark.findMany({
      where: {
        class_subject: {
          teacher_id: teacherId,
          class_id: parseInt(classId)
        }
      },
      include: {
        student: {
          include: { user: true }
        }
      }
    });

    // Group marks by student and calculate totals
    const marksByStudent = {};
    studentMarks.forEach(mark => {
      if (!marksByStudent[mark.student_id]) {
        marksByStudent[mark.student_id] = {
          student_id: mark.student_id,
          student: mark.student,
          marks: { TEST: 0, MID: 0, FINAL: 0, ASSIGNMENT: 0, OTHER: 0 },
          total: 0,
          letter_grade: null
        };
      }
      const type = mark.type.toUpperCase();
      if (marksByStudent[mark.student_id].marks[type] !== undefined) {
        marksByStudent[mark.student_id].marks[type] = parseFloat(mark.score);
        marksByStudent[mark.student_id].total += parseFloat(mark.score);
      }
      marksByStudent[mark.student_id].letter_grade = mark.letter_grade;
    });

    // Calculate performance metrics per student
    const studentPerformance = students.map(student => {
      const studentGrades = grades.filter(g => g.submission.student_id === student.student_id);
      const average = studentGrades.length > 0 
        ? studentGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) / studentGrades.length 
        : 0;
      
      const assignmentsCompleted = studentGrades.length;
      const status = average >= 70 ? "ON_TRACK" : average >= 50 ? "NEEDS_IMPROVEMENT" : "AT_RISK";

      return {
        student_id: student.student_id,
        user: student.user,
        name: student.user?.full_name,
        average: average.toFixed(1),
        assignments_completed: assignmentsCompleted,
        status: status
      };
    });

    // Calculate class metrics based on student marks
    const markTotals = Object.values(marksByStudent).map(m => m.total);
    const classAverage = markTotals.length > 0 
      ? (markTotals.reduce((sum, t) => sum + t, 0) / markTotals.length / 5).toFixed(1) 
      : "N/A";
    
    const topStudentMark = Object.values(marksByStudent).length > 0 
      ? Object.values(marksByStudent).reduce((top, current) => 
          current.total > top.total ? current : top
        )
      : null;
    const topStudent = topStudentMark?.student?.user?.full_name || "N/A";
    
    const atRiskCount = Object.values(marksByStudent).filter(m => {
      const avg = m.total / 5;
      return avg < 50;
    }).length;
    
    const passRate = markTotals.length > 0 
      ? ((Object.values(marksByStudent).filter(m => {
          const avg = m.total / 5;
          return avg >= 50;
        }).length / Object.values(marksByStudent).length) * 100).toFixed(0)
      : "N/A";

    const performanceData = {
      class_id: parseInt(classId),
      class_name: classSubject.school_class?.class_name,
      subject_name: classSubject.subject?.subject_name,
      average_grade: classAverage,
      top_student: topStudent,
      at_risk_count: atRiskCount,
      total_students: students.length,
      pass_rate: passRate,
      assignments_graded: grades.length,
      students: studentPerformance,
      student_marks: Object.values(marksByStudent)
    };

    res.json(performanceData);
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

    if (!exam_id || isNaN(parseInt(exam_id))) {
      return res.status(400).json({ error: 'Valid exam ID is required' });
    }

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'Grades array must contain at least one student result' });
    }

    // Verify teacher has access to this exam
    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(exam_id) },
      include: { class_subject: true }
    });

    if (!exam || exam.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    for (const g of grades) {
      if (!g.student_id || isNaN(parseInt(g.student_id))) {
        return res.status(400).json({ error: 'Each grade entry must have a valid student_id' });
      }
      const parsedScore = parseFloat(g.score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({ error: `Score for student #${g.student_id} must be between 0 and 100` });
      }
      if (g.remarks && typeof g.remarks === 'string' && g.remarks.length > 500) {
        return res.status(400).json({ error: 'Remarks cannot exceed 500 characters' });
      }
    }

    const results = await Promise.all(grades.map(g => {
      const parsedScore = parseFloat(g.score);
      const calculatedLetter = g.letter_grade || calculateLetterGrade(parsedScore);
      return prisma.examResult.upsert({
        where: {
          exam_id_student_id: {
            exam_id: parseInt(exam_id),
            student_id: parseInt(g.student_id)
          }
        },
        update: {
          score: parsedScore,
          letter_grade: calculatedLetter,
          remarks: g.remarks ? g.remarks.trim() : null,
          graded_at: new Date()
        },
        create: {
          exam_id: parseInt(exam_id),
          student_id: parseInt(g.student_id),
          score: parsedScore,
          letter_grade: calculatedLetter,
          remarks: g.remarks ? g.remarks.trim() : null
        }
      });
    }));

    res.json(results);
  } catch (error) {
    console.error('Error entering exam grades:', error);
    res.status(500).json({ error: 'Failed to enter exam grades' });
  }
}

/**
 * Bulk Enter Student Marks (Test/Mid/Final/Other)
 * POST /api/teacher/grades/bulk
 */
async function bulkEnterGrades(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { grades } = req.body; // grades: [{ student_id, type: 'TEST'|'MID'|'FINAL'|'ASSIGNMENT'|'OTHER', score, class_id }]

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'At least one grade entry is required' });
    }

    const classId = parseInt(grades[0]?.class_id);
    if (!classId || isNaN(classId)) {
      return res.status(400).json({ error: 'A valid class_id must be provided for all grade entries' });
    }

    const validMarkTypes = ['TEST', 'MID', 'FINAL', 'ASSIGNMENT', 'OTHER'];
    for (const g of grades) {
      if (!g.student_id || isNaN(parseInt(g.student_id))) {
        return res.status(400).json({ error: 'Each grade entry must have a valid student_id' });
      }
      if (!g.type || !validMarkTypes.includes(g.type)) {
        return res.status(400).json({ error: `Invalid assessment type "${g.type}". Must be one of: ${validMarkTypes.join(', ')}` });
      }
      const parsedScore = parseFloat(g.score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({ error: `Score for student #${g.student_id} must be a number between 0 and 100` });
      }
    }

    // Verify teacher has access to the class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        class_id: classId,
        teacher_id: teacherId
      }
    });

    if (!classSubject) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const results = await Promise.all(grades.map(g => {
      const parsedScore = parseFloat(g.score);
      return prisma.studentMark.upsert({
        where: {
          student_id_class_subject_id_type: {
            student_id: parseInt(g.student_id),
            class_subject_id: classSubject.class_subject_id,
            type: g.type
          }
        },
        update: {
          score: parsedScore,
          letter_grade: calculateLetterGrade(parsedScore),
          graded_at: new Date()
        },
        create: {
          student_id: parseInt(g.student_id),
          class_subject_id: classSubject.class_subject_id,
          type: g.type,
          score: parsedScore,
          letter_grade: calculateLetterGrade(parsedScore)
        }
      });
    }));

    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Error bulk entering grades:', error);
    res.status(500).json({ error: 'Failed to bulk enter grades' });
  }
}

function calculateLetterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
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

    if (!student_id || isNaN(parseInt(student_id))) {
      return res.status(400).json({ error: 'Valid student ID is required' });
    }

    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Term is required' });
    }

    if (!academic_year || typeof academic_year !== 'string' || academic_year.trim().length === 0) {
      return res.status(400).json({ error: 'Academic year is required' });
    }

    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    if (!grade || !validGrades.includes(grade.toUpperCase())) {
      return res.status(400).json({ error: `Invalid conduct grade. Must be one of: ${validGrades.join(', ')}` });
    }

    const parsedRating = parseFloat(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    if (comments && typeof comments === 'string' && comments.length > 500) {
      return res.status(400).json({ error: 'Comments cannot exceed 500 characters' });
    }

    // Verify teacher has access to this student
    const teacherClasses = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true }
    });

    const classIds = teacherClasses.map(cs => cs.class_id);
    const student = await prisma.student.findUnique({
      where: { student_id: parseInt(student_id) }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!classIds.includes(student.current_class_id)) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const conductGrade = await prisma.conductGrade.upsert({
      where: {
        student_id_term_academic_year: {
          student_id: parseInt(student_id),
          term: term.trim(),
          academic_year: academic_year.trim()
        }
      },
      update: {
        grade: grade.toUpperCase(),
        rating: parsedRating,
        teacher_id: teacherId,
        graded_at: new Date()
      },
      create: {
        student_id: parseInt(student_id),
        term: term.trim(),
        academic_year: academic_year.trim(),
        grade: grade.toUpperCase(),
        rating: parsedRating,
        teacher_id: teacherId
      }
    });

    // Add comment if provided
    if (comments && comments.trim().length > 0) {
      await prisma.conductComment.create({
        data: {
          conduct_id: conductGrade.conduct_id,
          teacher_id: teacherId,
          comment: comments.trim()
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

    if (!conductId || isNaN(parseInt(conductId))) {
      return res.status(400).json({ error: 'Valid conduct ID is required' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({ error: 'Comment cannot exceed 500 characters' });
    }

    const conductGrade = await prisma.conductGrade.findUnique({
      where: { conduct_id: parseInt(conductId) }
    });

    if (!conductGrade) {
      return res.status(404).json({ error: 'Conduct record not found' });
    }

    const newComment = await prisma.conductComment.create({
      data: {
        conduct_id: parseInt(conductId),
        teacher_id: teacherId,
        comment: comment.trim(),
        subject: subject ? subject.trim() : null
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

/**
 * Bulk Grade Student Conduct
 * POST /api/teacher/conduct/bulk
 */
async function bulkGradeConduct(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    const { grades } = req.body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'At least one conduct grade entry is required' });
    }

    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    for (const g of grades) {
      if (!g.student_id || isNaN(parseInt(g.student_id))) {
        return res.status(400).json({ error: 'Each conduct entry must have a valid student_id' });
      }
      if (!g.term || typeof g.term !== 'string') {
        return res.status(400).json({ error: `Term is required for student #${g.student_id}` });
      }
      if (!g.academic_year || typeof g.academic_year !== 'string') {
        return res.status(400).json({ error: `Academic year is required for student #${g.student_id}` });
      }
      if (!g.grade || !validGrades.includes(g.grade.toUpperCase())) {
        return res.status(400).json({ error: `Invalid conduct grade "${g.grade}" for student #${g.student_id}` });
      }
      const rating = parseFloat(g.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: `Rating for student #${g.student_id} must be between 1 and 5` });
      }
      if (g.comments && typeof g.comments === 'string' && g.comments.length > 500) {
        return res.status(400).json({ error: `Comments for student #${g.student_id} cannot exceed 500 characters` });
      }
    }

    const results = [];

    for (const gradeData of grades) {
      const { student_id, term, academic_year, grade, rating, comments } = gradeData;

      // Verify teacher has access to this student
      const student = await prisma.student.findUnique({
        where: { student_id: parseInt(student_id) },
        include: { current_class: true }
      });

      if (!student) {
        results.push({ student_id, error: 'Student not found' });
        continue;
      }

      // Check if teacher teaches this student's class
      const classSubject = await prisma.classSubject.findFirst({
        where: {
          class_id: student.current_class_id,
          teacher_id: teacherId
        }
      });

      if (!classSubject) {
        results.push({ student_id, error: 'Access denied to this student' });
        continue;
      }

      // Upsert conduct grade
      const conductGrade = await prisma.conductGrade.upsert({
        where: {
          student_id_term_academic_year: {
            student_id: parseInt(student_id),
            term: term.trim(),
            academic_year: academic_year.trim()
          }
        },
        update: {
          grade: grade.toUpperCase(),
          rating: parseFloat(rating),
          teacher_id: teacherId,
          graded_at: new Date()
        },
        create: {
          student_id: parseInt(student_id),
          term: term.trim(),
          academic_year: academic_year.trim(),
          grade: grade.toUpperCase(),
          rating: parseFloat(rating),
          teacher_id: teacherId,
          graded_at: new Date()
        }
      });

      // Add comment if provided
      if (comments && comments.trim().length > 0) {
        await prisma.conductComment.create({
          data: {
            conduct_id: conductGrade.conduct_id,
            teacher_id: teacherId,
            comment: comments.trim()
          }
        });
      }

      results.push(conductGrade);
    }

    res.json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (error) {
    console.error('Error bulk grading conduct:', error);
    res.status(500).json({ error: 'Failed to bulk grade conduct' });
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

    if (!class_subject_id || isNaN(parseInt(class_subject_id))) {
      return res.status(400).json({ error: 'Valid class subject ID is required' });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ error: 'Lesson plan title must be between 3 and 200 characters' });
    }

    const parsedWeek = parseInt(week_number);
    if (isNaN(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
      return res.status(400).json({ error: 'Week number must be an integer between 1 and 52' });
    }

    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Term is required' });
    }

    if (!objectives || (Array.isArray(objectives) && objectives.length === 0)) {
      return res.status(400).json({ error: 'At least one learning objective is required' });
    }

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
        title: title.trim(),
        objectives,
        materials: materials || [],
        activities: activities || [],
        assessment: assessment || null,
        week_number: parsedWeek,
        term: term.trim(),
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

    if (!lessonPlanId || isNaN(parseInt(lessonPlanId))) {
      return res.status(400).json({ error: 'Valid lesson plan ID is required' });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200)) {
      return res.status(400).json({ error: 'Lesson plan title must be between 3 and 200 characters' });
    }

    let parsedWeek;
    if (week_number !== undefined) {
      parsedWeek = parseInt(week_number);
      if (isNaN(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
        return res.status(400).json({ error: 'Week number must be an integer between 1 and 52' });
      }
    }

    if (term !== undefined && (typeof term !== 'string' || term.trim().length === 0)) {
      return res.status(400).json({ error: 'Term cannot be empty' });
    }

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
        ...(title !== undefined && { title: title.trim() }),
        ...(objectives !== undefined && { objectives }),
        ...(materials !== undefined && { materials }),
        ...(activities !== undefined && { activities }),
        ...(assessment !== undefined && { assessment }),
        ...(parsedWeek !== undefined && { week_number: parsedWeek }),
        ...(term !== undefined && { term: term.trim() }),
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

    if (!lessonPlanId || isNaN(parseInt(lessonPlanId))) {
      return res.status(400).json({ error: 'Valid lesson plan ID is required' });
    }

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

    const whereClause = { created_by: teacherId };

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
      orderBy: { created_at: 'desc' }
    });

    res.json(materials.map(m => ({
      material_id: m.material_id,
      title: m.title,
      description: m.description,
      category: m.material_type,
      file_type: m.material_type,
      file_url: m.file_url,
      uploaded_at: m.created_at,
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
    const { title, description, file_type, class_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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
        material_type: file_type || 'PDF',
        file_url: `/uploads/materials/${file.filename}`,
        file_size: file.size,
        created_by: teacherId
      }
    });

    res.status(201).json(material);
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

    const whereClause = {
      class_subject: { teacher_id: teacherId }
    };

    if (classId) {
      whereClause.class_subject.class_id = parseInt(classId);
    }

    const virtualClasses = await prisma.virtualClass.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        },
        live_sessions: {
          orderBy: { scheduled_start: 'desc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const onlineClasses = virtualClasses.map(vc => {
      const session = vc.live_sessions[0];
      return {
        online_class_id: vc.virtual_class_id,
        virtual_class_id: vc.virtual_class_id,
        title: vc.title,
        description: vc.description,
        meeting_link: vc.meeting_link,
        scheduled_date: session?.scheduled_start || vc.created_at,
        scheduled_time: session?.scheduled_start || vc.created_at,
        duration_minutes: session ? Math.round((new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime()) / 60000) : 60,
        status: session?.status || (vc.is_active ? 'SCHEDULED' : 'COMPLETED'),
        class_subject: vc.class_subject
      };
    });

    const filtered = status ? onlineClasses.filter(c => c.status === status) : onlineClasses;
    res.json(filtered);
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

    const startDate = new Date(scheduled_date || scheduled_time || new Date());
    const duration = parseInt(duration_minutes) || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const virtualClass = await prisma.virtualClass.create({
      data: {
        class_subject_id: parseInt(class_subject_id),
        title,
        description,
        meeting_link: 'https://meet.google.com/mock-live-session',
        created_by: teacherId,
        live_sessions: {
          create: {
            title,
            scheduled_start: startDate,
            scheduled_end: endDate,
            status: 'SCHEDULED'
          }
        }
      },
      include: {
        class_subject: {
          include: {
            school_class: true,
            subject: true
          }
        },
        live_sessions: true
      }
    });

    const created = {
      online_class_id: virtualClass.virtual_class_id,
      virtual_class_id: virtualClass.virtual_class_id,
      title: virtualClass.title,
      description: virtualClass.description,
      meeting_link: virtualClass.meeting_link,
      scheduled_date: startDate,
      scheduled_time: startDate,
      duration_minutes: duration,
      status: 'SCHEDULED',
      class_subject: virtualClass.class_subject
    };

    res.status(201).json(created);
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

    const virtualClass = await prisma.virtualClass.findUnique({
      where: { virtual_class_id: parseInt(onlineClassId) },
      include: {
        class_subject: true,
        live_sessions: { orderBy: { created_at: 'desc' }, take: 1 }
      }
    });

    if (!virtualClass || virtualClass.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.virtualClass.update({
      where: { virtual_class_id: parseInt(onlineClassId) },
      data: {
        meeting_link: meeting_link || virtualClass.meeting_link,
        meeting_password: meeting_password || virtualClass.meeting_password,
        is_active: true
      }
    });

    if (virtualClass.live_sessions && virtualClass.live_sessions[0]) {
      await prisma.liveSession.update({
        where: { session_id: virtualClass.live_sessions[0].session_id },
        data: {
          status: 'LIVE',
          actual_start: new Date()
        }
      });
    }

    res.json({
      online_class_id: updated.virtual_class_id,
      status: 'IN_PROGRESS',
      meeting_link: updated.meeting_link
    });
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

    const virtualClass = await prisma.virtualClass.findUnique({
      where: { virtual_class_id: parseInt(onlineClassId) },
      include: {
        class_subject: true,
        live_sessions: { orderBy: { created_at: 'desc' }, take: 1 }
      }
    });

    if (!virtualClass || virtualClass.class_subject.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.virtualClass.update({
      where: { virtual_class_id: parseInt(onlineClassId) },
      data: { is_active: false }
    });

    if (virtualClass.live_sessions && virtualClass.live_sessions[0]) {
      await prisma.liveSession.update({
        where: { session_id: virtualClass.live_sessions[0].session_id },
        data: {
          status: 'ENDED',
          actual_end: new Date(),
          recording_url: recording_url || null
        }
      });
    }

    res.json({
      online_class_id: virtualClass.virtual_class_id,
      status: 'COMPLETED'
    });
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
    console.log(`Fetching messages for teacher_id: ${teacherId}`);

    // Get teacher's user_id (Message table references user_id, not teacher_id)
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      select: { user_id: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    console.log(`Teacher's user_id: ${teacher.user_id}`);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: teacher.user_id },
          { receiver_id: teacher.user_id }
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

    console.log(`Found ${messages.length} messages for teacher ${teacherId}`);
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

    // Get teacher's user_id (Message table references user_id, not teacher_id)
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      select: { user_id: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id: teacher.user_id,
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

    console.log(`Message saved to database with ID: ${message.message_id}`);
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

    // Get teacher's user_id (Message table references user_id, not teacher_id)
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      select: { user_id: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const message = await prisma.message.findUnique({
      where: { message_id: parseInt(messageId) }
    });

    if (!message || message.receiver_id !== teacher.user_id) {
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
 * Get Related Students and Parents
 * GET /api/teacher/contacts
 */
async function getRelatedContacts(req, res) {
  try {
    const teacherId = await getTeacherId(req);
    console.log(`Fetching contacts for teacher_id: ${teacherId}`);

    // Get teacher's classes
    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true }
    });

    console.log(`Found ${classSubjects.length} class subjects for teacher ${teacherId}`);
    
    let students = [];
    let classIds = [];

    if (classSubjects.length > 0) {
      classIds = classSubjects.map(cs => cs.class_id);
      console.log(`Class IDs: ${classIds.join(', ')}`);

      // Get all students in teacher's classes
      students = await prisma.student.findMany({
        where: { current_class_id: { in: classIds } },
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone_number: true
            }
          },
          current_class: {
            select: {
              class_id: true,
              class_name: true
            }
          },
          student_parents: {
            include: {
              parent: {
                include: {
                  user: {
                    select: {
                      user_id: true,
                      full_name: true,
                      email: true,
                      phone_number: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`Found ${students.length} students in teacher's classes`);
    } else {
      console.log('Teacher has no classes assigned, fetching all students as fallback');
      
      // Fallback: Get all students if teacher has no classes
      students = await prisma.student.findMany({
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone_number: true
            }
          },
          current_class: {
            select: {
              class_id: true,
              class_name: true
            }
          },
          student_parents: {
            include: {
              parent: {
                include: {
                  user: {
                    select: {
                      user_id: true,
                      full_name: true,
                      email: true,
                      phone_number: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`Found ${students.length} students (fallback - all students)`);
    }

    // Extract unique parents from students
    const parentsMap = new Map();
    students.forEach(student => {
      student.student_parents.forEach(sp => {
        const parent = sp.parent;
        if (!parentsMap.has(parent.user_id)) {
          parentsMap.set(parent.user_id, {
            user_id: parent.user.user_id,
            full_name: parent.user.full_name,
            email: parent.user.email,
            phone_number: parent.user.phone_number,
            relationship: sp.relationship,
            type: 'PARENT'
          });
        }
      });
    });

    const parents = Array.from(parentsMap.values());
    console.log(`Found ${parents.length} unique parents`);

    // Format students with type
    const formattedStudents = students.map(student => ({
      user_id: student.user.user_id,
      full_name: student.user.full_name,
      email: student.user.email,
      phone_number: student.user.phone_number,
      class_name: student.current_class?.class_name,
      student_number: student.student_number,
      type: 'STUDENT'
    }));

    const result = {
      students: formattedStudents,
      parents: parents
    };
    
    console.log(`Returning ${result.students.length} students and ${result.parents.length} parents`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching related contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
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
      },
      include: {
        school_class: true,
        subject: true
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

    // Calculate student averages
    const studentAverages = students.map(student => {
      const grades = student.submissions
        .filter(s => s.grade)
        .map(s => parseFloat(s.grade.score));
      const average = grades.length > 0 
        ? grades.reduce((sum, g) => sum + g, 0) / grades.length 
        : 0;
      return {
        name: student.user?.full_name,
        average: average.toFixed(1)
      };
    });

    // Calculate class metrics
    const allAverages = studentAverages.map(s => parseFloat(s.average)).filter(a => a > 0);
    const classAverage = allAverages.length > 0 
      ? (allAverages.reduce((sum, a) => sum + a, 0) / allAverages.length).toFixed(1) 
      : "N/A";
    
    const passRate = allAverages.length > 0 
      ? ((studentAverages.filter(s => parseFloat(s.average) >= 50).length / studentAverages.length) * 100).toFixed(0)
      : "N/A";

    // Get top performers
    const topPerformers = [...studentAverages]
      .sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
      .slice(0, 5);

    // Calculate subject performance
    const subjectPerformance = {};
    students.forEach(student => {
      student.submissions.forEach(submission => {
        if (submission.grade && submission.assignment.class_subject) {
          const subjectName = submission.assignment.class_subject.subject?.subject_name || 'Unknown';
          if (!subjectPerformance[subjectName]) {
            subjectPerformance[subjectName] = { scores: [], subject: subjectName };
          }
          subjectPerformance[subjectName].scores.push(parseFloat(submission.grade.score));
        }
      });
    });

    const subjectPerformanceArray = Object.values(subjectPerformance).map((sp) => {
      const scores = sp.scores;
      const average = scores.length > 0 
        ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1) 
        : "N/A";
      return {
        subject: sp.subject,
        average: average,
        highest: scores.length > 0 ? Math.max(...scores).toFixed(1) : "N/A",
        lowest: scores.length > 0 ? Math.min(...scores).toFixed(1) : "N/A"
      };
    });

    res.json({
      class_id: parseInt(classId),
      class_name: classSubject.school_class?.class_name,
      subject_name: classSubject.subject?.subject_name,
      class_average: classAverage,
      total_students: students.length,
      pass_rate: passRate,
      subject_performance: subjectPerformanceArray,
      top_performers: topPerformers,
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

    // Calculate overall average
    const grades = student.submissions
      .filter(s => s.grade)
      .map(s => parseFloat(s.grade.score));
    const overallAverage = grades.length > 0 
      ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(1) 
      : "N/A";

    // Calculate attendance rate
    const attendanceRecords = student.attendance_records;
    const presentDays = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? ((presentDays / attendanceRecords.length) * 100).toFixed(0) 
      : "N/A";

    // Calculate class rank
    const classStudents = await prisma.student.findMany({
      where: { current_class_id: student.current_class_id },
      include: {
        submissions: {
          include: { grade: true }
        }
      }
    });

    const classAverages = classStudents.map(s => {
      const sGrades = s.submissions
        .filter(sub => sub.grade)
        .map(sub => parseFloat(sub.grade.score));
      return {
        student_id: s.student_id,
        average: sGrades.length > 0 
          ? sGrades.reduce((sum, g) => sum + g, 0) / sGrades.length 
          : 0
      };
    }).sort((a, b) => b.average - a.average);

    const classRank = classAverages.findIndex(s => s.student_id === student.student_id) + 1;

    // Calculate subject grades
    const subjectGrades = {};
    student.submissions.forEach(submission => {
      if (submission.grade && submission.assignment.class_subject) {
        const subjectName = submission.assignment.class_subject.subject?.subject_name || 'Unknown';
        if (!subjectGrades[subjectName]) {
          subjectGrades[subjectName] = [];
        }
        subjectGrades[subjectName].push({
          score: parseFloat(submission.grade.score),
          letter_grade: submission.grade.letter_grade
        });
      }
    });

    const subjectGradesArray = Object.entries(subjectGrades).map(([subject, grades]) => {
      const avgScore = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
      const letterGrade = avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 60 ? 'D' : 'F';
      return {
        subject: subject,
        grade: letterGrade,
        score: avgScore.toFixed(1),
        status: avgScore >= 50 ? 'PASS' : 'FAIL'
      };
    });

    // Generate remarks
    let remarks = "";
    if (parseFloat(overallAverage) >= 80) {
      remarks = "Excellent performance. Keep up the good work!";
    } else if (parseFloat(overallAverage) >= 70) {
      remarks = "Good performance with room for improvement.";
    } else if (parseFloat(overallAverage) >= 50) {
      remarks = "Satisfactory performance. Additional effort recommended.";
    } else {
      remarks = "Needs significant improvement. Consider seeking additional support.";
    }

    res.json({
      student_id: student.student_id,
      student_name: student.user?.full_name,
      class_name: student.current_class?.class_name,
      overall_average: overallAverage,
      class_rank: classRank,
      attendance_rate: attendanceRate,
      subject_grades: subjectGradesArray,
      remarks: remarks,
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
      language,
      theme
    } = req.body;

    const settings = await prisma.teacherSettings.upsert({
      where: { teacher_id: teacherId },
      update: {
        grading_rubric,
        assignment_defaults,
        notification_preferences,
        teaching_preferences,
        timezone,
        language,
        theme
      },
      create: {
        teacher_id: teacherId,
        grading_rubric,
        assignment_defaults,
        notification_preferences,
        teaching_preferences,
        timezone,
        language,
        theme
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

    // Get teacher record to get user_id
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      select: { user_id: true }
    });

    // Get audit logs using user_id
    const auditLogs = await prisma.auditLog.findMany({
      where: { user_id: teacher?.user_id },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Get recent attendance records
    const attendanceLogs = await prisma.attendanceRecord.findMany({
      where: { recorded_by: teacherId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        student: { include: { user: true } },
        school_class: true
      }
    });

    // Get recent assignments created
    const assignmentLogs = await prisma.assignment.findMany({
      where: {
        class_subject: {
          teacher_id: teacherId
        }
      },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        class_subject: {
          include: { subject: true }
        }
      }
    });

    // Get recent grade submissions
    const gradeLogs = await prisma.studentMark.findMany({
      where: {
        class_subject: {
          teacher_id: teacherId
        }
      },
      orderBy: { graded_at: 'desc' },
      take: 20,
      include: {
        student: { include: { user: true } },
        class_subject: { include: { subject: true } }
      }
    });

    // Get recent exam grades
    const examLogs = await prisma.examResult.findMany({
      where: {
        exam: {
          class_subject: {
            teacher_id: teacherId
          }
        }
      },
      orderBy: { graded_at: 'desc' },
      take: 20,
      include: {
        student: { include: { user: true } },
        exam: { include: { class_subject: { include: { subject: true } } } }
      }
    });

    // Combine and format all activities
    const activities = [];

    // Format audit logs
    auditLogs.forEach(log => {
      activities.push({
        id: `audit-${log.log_id}`,
        type: 'system',
        description: log.action,
        timestamp: log.timestamp
      });
    });

    // Format attendance logs
    attendanceLogs.forEach(record => {
      activities.push({
        id: `attendance-${record.record_id}`,
        type: 'attendance',
        description: `Marked ${record.student.user?.full_name} as ${record.status} for ${record.school_class?.class_name}`,
        timestamp: record.created_at
      });
    });

    // Format assignment logs
    assignmentLogs.forEach(assignment => {
      activities.push({
        id: `assignment-${assignment.assignment_id}`,
        type: 'assignment',
        description: `Created assignment: ${assignment.title} for ${assignment.class_subject.subject?.subject_name}`,
        timestamp: assignment.created_at
      });
    });

    // Format grade logs
    gradeLogs.forEach(grade => {
      activities.push({
        id: `grade-${grade.mark_id}`,
        type: 'grade',
        description: `Graded ${grade.student.user?.full_name}: ${grade.type} - ${grade.score} (${grade.letter_grade})`,
        timestamp: grade.graded_at
      });
    });

    // Format exam logs
    examLogs.forEach(examResult => {
      activities.push({
        id: `exam-${examResult.result_id}`,
        type: 'exam',
        description: `Graded ${examResult.student.user?.full_name} exam: ${examResult.score} (${examResult.letter_grade})`,
        timestamp: examResult.graded_at
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 100));
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
  uploadProfilePicture,
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
  toggleAttendanceSession,
  getAttendanceByDay,
  getRecordedAttendanceDates,
  
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
  bulkEnterGrades,
  
  // Conduct
  getClassConduct,
  gradeConduct,
  addConductComment,
  bulkGradeConduct,
  
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
  getRelatedContacts,
  
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
