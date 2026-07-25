const prisma = require('../config/prisma');

/**
 * VP ACADEMIC CONTROLLER
 * Comprehensive controller for VP Academic operations
 * Focus: Curriculum, timetable, teachers, students, examinations, academic monitoring
 */

// Helper function to get VP academic ID (with or without authentication)
async function getVPAcademicId(req) {
  // If authenticated, use the authenticated VP academic ID
  if (req.user_id) {
    return req.user_id;
  }
  
  // For development without authentication, use the first VP academic in the database
  const vpAcademic = await prisma.vPAcademic.findFirst({
    where: { user: { role: 'VP_ACADEMIC' } },
    include: { user: true }
  });
  
  if (!vpAcademic) {
    throw new Error('No VP academic found in database');
  }
  
  return vpAcademic.user_id;
}

// ==================== DASHBOARD & OVERVIEW ====================

/**
 * Get Analytics Overview
 * GET /api/vp-academic/analytics
 */
async function getAnalyticsOverview(req, res) {
  try {
    const { academic_year, term } = req.query;

    // Get current academic year if not provided
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const yearToUse = academic_year || currentYear?.year_name || '2024-2025';

    // Student enrollment by grade
    const students = await prisma.student.findMany({
      include: {
        current_class: true
      }
    });

    const enrollmentByGrade = {};
    students.forEach(student => {
      const className = student.current_class?.class_name || 'Unassigned';
      const grade = className.match(/\d+/)?.[0] || 'Unknown';
      if (!enrollmentByGrade[grade]) {
        enrollmentByGrade[grade] = 0;
      }
      enrollmentByGrade[grade]++;
    });

    // Attendance statistics
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), 0, 1)
        }
      }
    });

    const attendanceStats = {
      total_records: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      attendance_rate: attendanceRecords.length > 0
        ? ((attendanceRecords.filter(r => r.status === 'PRESENT').length / attendanceRecords.length) * 100).toFixed(1)
        : 0
    };

    // Grade distribution
    const grades = await prisma.grade.findMany({
      include: {
        submission: {
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
            }
          }
        }
      }
    });

    const gradeDistribution = {
      A: grades.filter(g => Number(g.score) >= 90).length,
      B: grades.filter(g => Number(g.score) >= 80 && Number(g.score) < 90).length,
      C: grades.filter(g => Number(g.score) >= 70 && Number(g.score) < 80).length,
      D: grades.filter(g => Number(g.score) >= 60 && Number(g.score) < 70).length,
      F: grades.filter(g => Number(g.score) < 60).length,
      average_score: grades.length > 0
        ? (grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length).toFixed(2)
        : 0
    };

    // Subject performance
    const subjectPerformance = {};
    grades.forEach(grade => {
      const subjectName = grade.submission.assignment.class_subject.subject.subject_name;
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { total: 0, count: 0 };
      }
      subjectPerformance[subjectName].total += Number(grade.score);
      subjectPerformance[subjectName].count += 1;
    });

    const averageBySubject = {};
    Object.keys(subjectPerformance).forEach(subject => {
      averageBySubject[subject] = (
        subjectPerformance[subject].total / subjectPerformance[subject].count
      ).toFixed(2);
    });

    // Teacher workload
    const teacherWorkloads = await prisma.classSubject.groupBy({
      by: ['teacher_id'],
      _count: {
        teacher_id: true
      },
      orderBy: {
        _count: {
          teacher_id: 'desc'
        }
      }
    });

    // Exam statistics
    const exams = await prisma.exam.findMany({
      where: {
        exam_type: { in: ['MIDTERM', 'FINAL', 'NATIONAL'] }
      },
      include: {
        exam_results: true
      }
    });

    const examStats = {
      total_exams: exams.length,
      completed_exams: exams.filter(e => e.status === 'COMPLETED').length,
      average_exam_score: exams.reduce((sum, exam) => {
        const examAvg = exam.exam_results.length > 0
          ? exam.exam_results.reduce((s, r) => s + Number(r.score), 0) / exam.exam_results.length
          : 0;
        return sum + examAvg;
      }, 0) / (exams.length || 1)
    };

    // At-risk students (low attendance or low grades)
    const atRiskStudents = [];
    students.forEach(student => {
      const studentAttendance = attendanceRecords.filter(r => r.student_id === student.student_id);
      const attendanceRate = studentAttendance.length > 0
        ? (studentAttendance.filter(r => r.status === 'PRESENT').length / studentAttendance.length) * 100
        : 100;

      const studentGrades = grades.filter(g =>
        g.submission.assignment.class_subject.school_class.class_id === student.current_class_id
      );
      const avgGrade = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + Number(g.score), 0) / studentGrades.length
        : 100;

      if (attendanceRate < 75 || avgGrade < 60) {
        atRiskStudents.push({
          student_id: student.student_id,
          name: student.user?.full_name || 'Unknown',
          class: student.current_class?.class_name || 'Unassigned',
          attendance_rate: attendanceRate.toFixed(1),
          average_grade: avgGrade.toFixed(2),
          risk_factor: attendanceRate < 75 ? 'LOW_ATTENDANCE' : 'LOW_GRADES'
        });
      }
    });

    return res.json({
      academic_year: yearToUse,
      term: term || '1',
      enrollment_by_grade: enrollmentByGrade,
      attendance_statistics: attendanceStats,
      grade_distribution: gradeDistribution,
      subject_performance: averageBySubject,
      teacher_workload: teacherWorkloads,
      exam_statistics: examStats,
      at_risk_students: atRiskStudents.slice(0, 20), // Limit to top 20
      summary: {
        total_students: students.length,
        total_teachers: await prisma.teacher.count(),
        total_subjects: await prisma.subject.count(),
        overall_attendance_rate: parseFloat(attendanceStats.attendance_rate),
        overall_average_grade: parseFloat(gradeDistribution.average_score)
      }
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Dashboard Data
 * GET /api/vp-academic/dashboard
 */
async function getAcademicDashboard(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    // Total students
    const totalStudents = await prisma.student.count();

    // Total teachers
    const totalTeachers = await prisma.teacher.count();

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { date: new Date(today) }
    });
    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? ((presentCount / attendanceRecords.length) * 100).toFixed(1) 
      : 0;

    // Pass rate (national exams)
    const nationalExamResults = await prisma.examResult.findMany({
      where: {
        exam: {
          exam_type: { in: ['NATIONAL', 'EGSECE', 'ESSLCE'] }
        }
      }
    });
    const passCount = nationalExamResults.filter(r => {
      const score = Number(r.score);
      return score >= 50;
    }).length;
    const passRate = nationalExamResults.length > 0 
      ? ((passCount / nationalExamResults.length) * 100).toFixed(1)
      : 0;

    // Average grade per subject
    const grades = await prisma.grade.findMany({
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const subjectAverages = {};
    grades.forEach(grade => {
      const subjectName = grade.submission.assignment.class_subject.subject.subject_name;
      if (!subjectAverages[subjectName]) {
        subjectAverages[subjectName] = { total: 0, count: 0 };
      }
      subjectAverages[subjectName].total += Number(grade.score);
      subjectAverages[subjectName].count += 1;
    });

    const averageGradesBySubject = {};
    Object.keys(subjectAverages).forEach(subject => {
      averageGradesBySubject[subject] = (
        subjectAverages[subject].total / subjectAverages[subject].count
      ).toFixed(2);
    });

    // Teacher workload
    const teacherWorkloads = await prisma.classSubject.groupBy({
      by: ['teacher_id'],
      _count: {
        teacher_id: true
      }
    });

    // Pending lesson plan approvals
    const pendingLessonPlans = await prisma.lessonPlan.count({
      where: { status: 'PENDING' }
    });

    return res.json({
      total_students: totalStudents,
      total_teachers: totalTeachers,
      attendance_rate: parseFloat(attendanceRate),
      pass_rate: parseFloat(passRate),
      average_grades_by_subject: averageGradesBySubject,
      teacher_workload: teacherWorkloads,
      pending_lesson_plans: pendingLessonPlans,
      academic_year: currentYear?.year_name || '2024-2025'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Quick Stats Cards
 * GET /api/vp-academic/quick-stats
 */
async function getQuickStats(req, res) {
  try {
    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.teacher.count();
    
    const nationalExamResults = await prisma.examResult.findMany({
      where: {
        exam: {
          exam_type: { in: ['NATIONAL', 'EGSECE', 'ESSLCE'] }
        }
      }
    });
    const passCount = nationalExamResults.filter(r => Number(r.score) >= 50).length;
    const passRate = nationalExamResults.length > 0 
      ? ((passCount / nationalExamResults.length) * 100).toFixed(1)
      : 0;

    const grades = await prisma.grade.findMany({
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const subjectAverages = {};
    grades.forEach(grade => {
      const subjectName = grade.submission.assignment.class_subject.subject.subject_name;
      if (!subjectAverages[subjectName]) {
        subjectAverages[subjectName] = { total: 0, count: 0 };
      }
      subjectAverages[subjectName].total += Number(grade.score);
      subjectAverages[subjectName].count += 1;
    });

    const averageGradesBySubject = {};
    Object.keys(subjectAverages).forEach(subject => {
      averageGradesBySubject[subject] = (
        subjectAverages[subject].total / subjectAverages[subject].count
      ).toFixed(2);
    });

    const ratio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : 0;

    return res.json({
      total_students: totalStudents,
      total_teachers: totalTeachers,
      pass_rate: parseFloat(passRate),
      average_grade_by_subject: averageGradesBySubject,
      teacher_student_ratio: parseFloat(ratio)
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Calendar
 * GET /api/vp-academic/academic-calendar
 */
async function getAcademicCalendar(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true },
      include: {
        terms: true
      }
    });

    return res.json(currentYear);
  } catch (error) {
    console.error('Academic calendar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Recent Academic Activity
 * GET /api/vp-academic/recent-activity
 */
async function getRecentActivity(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentLessonPlans = await prisma.lessonPlan.findMany({
      take: limit,
      orderBy: { submitted_at: 'desc' },
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        }
      }
    });

    const recentExams = await prisma.exam.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        },
        creator: true
      }
    });

    const recentAssignments = await prisma.assignment.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        }
      }
    });

    return res.json({
      lesson_plans: recentLessonPlans,
      exams: recentExams,
      assignments: recentAssignments
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get VP Academic Notifications
 * GET /api/vp-academic/notifications
 */
async function getNotifications(req, res) {
  try {
    const userId = await getVPAcademicId(req);
    
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { sent_at: 'desc' },
      take: 20
    });

    const pendingLessonPlans = await prisma.lessonPlan.count({
      where: { status: 'PENDING' }
    });

    const examConflicts = await prisma.exam.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      }
    });

    const teacherLeaveRequests = await prisma.staffLeaveRequest.findMany({
      where: {
        status: 'PENDING',
        staff: {
          teacher: {
            isNot: null
          }
        }
      }
    });

    return res.json({
      notifications,
      pending_lesson_plans: pendingLessonPlans,
      exam_conflicts: examConflicts.length,
      teacher_leave_requests: teacherLeaveRequests.length
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== CURRICULUM MANAGEMENT ====================

/**
 * Get National Curriculum
 * GET /api/vp-academic/curriculum
 */
async function getCurriculum(req, res) {
  try {
    const curriculumMaps = await prisma.curriculumMap.findMany({
      include: {
        subject: true,
        creator: true
      }
    });

    return res.json(curriculumMaps);
  } catch (error) {
    console.error('Get curriculum error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create/Update Subject Offering
 * POST /api/vp-academic/curriculum/subjects
 */
async function manageSubjectOffering(req, res) {
  try {
    const { subject_id, grade_levels, is_active } = req.body;

    const subject = await prisma.subject.update({
      where: { subject_id },
      data: {}
    });

    return res.json(subject);
  } catch (error) {
    console.error('Manage subject offering error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Set Curriculum Objectives
 * POST /api/vp-academic/curriculum/objectives
 */
async function setCurriculumObjectives(req, res) {
  try {
    const { subject_id, grade_level, objectives, outcomes } = req.body;

    const curriculumMap = await prisma.curriculumMap.create({
      data: {
        subject_id,
        grade_level,
        objectives,
        outcomes,
        created_by: await getVPAcademicId(req)
      }
    });

    return res.json(curriculumMap);
  } catch (error) {
    console.error('Set curriculum objectives error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Map Subject to Department
 * PUT /api/vp-academic/curriculum/map-department
 */
async function mapSubjectToDepartment(req, res) {
  try {
    const { subject_id, department } = req.body;

    const updated = await prisma.subject.update({
      where: { subject_id },
      data: { department }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Map subject to department error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Curriculum Compliance
 * GET /api/vp-academic/curriculum/compliance
 */
async function getCurriculumCompliance(req, res) {
  try {
    const subjects = await prisma.subject.findMany();
    const curriculumMaps = await prisma.curriculumMap.findMany();

    const compliance = {
      total_subjects: subjects.length,
      mapped_subjects: curriculumMaps.length,
      compliance_rate: subjects.length > 0 
        ? ((curriculumMaps.length / subjects.length) * 100).toFixed(1)
        : 0,
      missing_mappings: subjects.length - curriculumMaps.length
    };

    return res.json(compliance);
  } catch (error) {
    console.error('Curriculum compliance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export Curriculum Guide
 * GET /api/vp-academic/curriculum/export
 */
async function exportCurriculumGuide(req, res) {
  try {
    const curriculumMaps = await prisma.curriculumMap.findMany({
      include: {
        subject: true
      }
    });

    return res.json({
      message: 'Curriculum guide export',
      data: curriculumMaps,
      format: req.query.format || 'json'
    });
  } catch (error) {
    console.error('Export curriculum guide error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== TIMETABLE & SCHEDULING MANAGEMENT ====================

/**
 * Create Master Timetable
 * POST /api/vp-academic/timetable/master
 */
async function createMasterTimetable(req, res) {
  try {
    const { academic_year, schedules } = req.body;

    const createdSchedules = await prisma.classSchedule.createMany({
      data: schedules
    });

    return res.json({
      message: 'Master timetable created',
      count: createdSchedules.count
    });
  } catch (error) {
    console.error('Create master timetable error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Teachers to Classes / Create Class Schedule
 * PUT /api/vp-academic/timetable/assign-teacher
 */
async function assignTeacherToClass(req, res) {
  try {
    const { class_id, subject_id, teacher_id, day_of_week, period, room_number, start_time, end_time } = req.body;

    // If class_subject_id is provided, update existing class_subject
    if (req.body.class_subject_id) {
      const classSubject = await prisma.classSubject.update({
        where: { class_subject_id: req.body.class_subject_id },
        data: { teacher_id }
      });
      return res.json(classSubject);
    }

    // Otherwise, create a new class schedule entry
    const schedule = await prisma.classSchedule.create({
      data: {
        class_id: parseInt(class_id),
        subject_id: parseInt(subject_id),
        teacher_id: parseInt(teacher_id),
        day_of_week,
        period: parseInt(period),
        room_number,
        start_time,
        end_time
      },
      include: {
        school_class: true,
        subject: true,
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    return res.status(201).json(schedule);
  } catch (error) {
    console.error('Assign teacher to class error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Manage Classrooms
 * PUT /api/vp-academic/timetable/assign-classroom
 */
async function assignClassroom(req, res) {
  try {
    const { schedule_id, room_number } = req.body;

    const schedule = await prisma.classSchedule.update({
      where: { schedule_id },
      data: { room_number }
    });

    return res.json(schedule);
  } catch (error) {
    console.error('Assign classroom error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Timetable Conflicts
 * GET /api/vp-academic/timetable/conflicts
 */
async function getTimetableConflicts(req, res) {
  try {
    const teacherConflicts = await prisma.classSchedule.groupBy({
      by: ['teacher_id', 'day_of_week', 'period'],
      having: {
        teacher_id: {
          _count: {
            gt: 1
          }
        }
      }
    });

    const classroomConflicts = await prisma.classSchedule.groupBy({
      by: ['room_number', 'day_of_week', 'period'],
      where: {
        room_number: {
          not: null
        }
      },
      having: {
        room_number: {
          _count: {
            gt: 1
          }
        }
      }
    });

    return res.json({
      teacher_conflicts: teacherConflicts,
      classroom_conflicts: classroomConflicts
    });
  } catch (error) {
    console.error('Get timetable conflicts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate Individual Timetables
 * GET /api/vp-academic/timetable/individual/:type/:id
 */
async function getIndividualTimetable(req, res) {
  try {
    const { type, id } = req.params;

    let schedules;
    if (type === 'teacher') {
      schedules = await prisma.classSchedule.findMany({
        where: { teacher_id: parseInt(id) },
        include: {
          school_class: true,
          subject: true
        }
      });
    } else if (type === 'class') {
      schedules = await prisma.classSchedule.findMany({
        where: { class_id: parseInt(id) },
        include: {
          school_class: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          }
        }
      });
    }

    return res.json(schedules);
  } catch (error) {
    console.error('Get individual timetable error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Edit Timetable
 * PUT /api/vp-academic/timetable/:id
 */
async function editTimetable(req, res) {
  try {
    const { id } = req.params;
    const { day_of_week, period, subject_id, teacher_id, room_number, start_time, end_time } = req.body;

    const schedule = await prisma.classSchedule.update({
      where: { schedule_id: parseInt(id) },
      data: {
        day_of_week,
        period,
        subject_id,
        teacher_id,
        room_number,
        start_time,
        end_time
      }
    });

    return res.json(schedule);
  } catch (error) {
    console.error('Edit timetable error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Substitute Teacher Assignments
 * GET /api/vp-academic/timetable/substitutes
 */
async function getSubstituteAssignments(req, res) {
  try {
    const teacherLeave = await prisma.staffLeaveRequest.findMany({
      where: {
        status: 'APPROVED',
        start_date: { lte: new Date() },
        end_date: { gte: new Date() }
      },
      include: {
        staff: {
          include: {
            user: true,
            teacher: true
          }
        }
      }
    });

    return res.json(teacherLeave);
  } catch (error) {
    console.error('Get substitute assignments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export Timetable
 * GET /api/vp-academic/timetable/export
 */
async function exportTimetable(req, res) {
  try {
    const { class_id, teacher_id, format } = req.query;

    let schedules;
    if (class_id) {
      schedules = await prisma.classSchedule.findMany({
        where: { class_id: parseInt(class_id) },
        include: {
          school_class: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          }
        }
      });
    } else if (teacher_id) {
      schedules = await prisma.classSchedule.findMany({
        where: { teacher_id: parseInt(teacher_id) },
        include: {
          school_class: true,
          subject: true
        }
      });
    } else {
      schedules = await prisma.classSchedule.findMany({
        include: {
          school_class: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          }
        }
      });
    }

    return res.json({
      message: 'Timetable export',
      data: schedules,
      format: format || 'json'
    });
  } catch (error) {
    console.error('Export timetable error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== TEACHER MANAGEMENT ====================

/**
 * Register New Teacher
 * POST /api/vp-academic/teachers/register
 */
async function registerTeacher(req, res) {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      department,
      degree_level,
      gender,
      age,
      experience_years,
      grade_levels,
      subjects,
      employee_id
    } = req.body;

    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        phone_number,
        password_hash: password,
        role: 'TEACHER',
        is_active: true
      }
    });

    const teacher = await prisma.teacher.create({
      data: {
        user_id: user.user_id,
        employee_id,
        department,
        degree_level,
        gender,
        age,
        experience_years,
        grade_levels,
        subjects,
        hire_date: new Date()
      }
    });

    return res.json({
      message: 'Teacher registered successfully',
      teacher: {
        ...teacher,
        user: {
          full_name: user.full_name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Register teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Register Teaching Assistant
 * POST /api/vp-academic/teachers/register-ta
 */
async function registerTeachingAssistant(req, res) {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      department,
      employee_id
    } = req.body;

    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        phone_number,
        password_hash: password,
        role: 'TEACHER',
        is_active: true
      }
    });

    const teacher = await prisma.teacher.create({
      data: {
        user_id: user.user_id,
        employee_id,
        department,
        degree_level: 'DIPLOMA',
        hire_date: new Date()
      }
    });

    return res.json({
      message: 'Teaching Assistant registered successfully',
      teacher
    });
  } catch (error) {
    console.error('Register TA error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View All Teachers
 * GET /api/vp-academic/teachers
 */
async function getAllTeachers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const teachers = await prisma.teacher.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
            is_active: true
          }
        },
        homeroom_classes: {
          select: {
            class_id: true,
            class_name: true,
            academic_year: true
          }
        },
        class_subjects: {
          select: {
            class_subject_id: true,
            class_id: true,
            subject_id: true,
            credit_hour: true,
            subject: {
              select: {
                subject_id: true,
                subject_name: true,
                subject_code: true
              }
            },
            school_class: {
              select: {
                class_id: true,
                class_name: true
              }
            }
          }
        }
      }
    });

    const total = await prisma.teacher.count();

    return res.json({
      teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all teachers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Edit Teacher Details
 * PUT /api/vp-academic/teachers/:id
 */
async function editTeacher(req, res) {
  try {
    const { id } = req.params;
    const {
      email,
      phone_number,
      department,
      degree_level,
      gender,
      age,
      experience_years,
      grade_levels,
      subjects
    } = req.body;

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        email,
        phone_number
      }
    });

    const teacher = await prisma.teacher.update({
      where: { teacher_id: parseInt(id) },
      data: {
        department,
        degree_level,
        gender,
        age,
        experience_years,
        grade_levels,
        subjects
      }
    });

    return res.json(teacher);
  } catch (error) {
    console.error('Edit teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Teacher to Department
 * PUT /api/vp-academic/teachers/:id/department
 */
async function assignTeacherToDepartment(req, res) {
  try {
    const { id } = req.params;
    const { department } = req.body;

    const teacher = await prisma.teacher.update({
      where: { teacher_id: parseInt(id) },
      data: { department }
    });

    return res.json(teacher);
  } catch (error) {
    console.error('Assign teacher to department error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Teacher to Classes (Homeroom)
 * PUT /api/vp-academic/teachers/:id/homeroom
 */
async function assignTeacherToHomeroom(req, res) {
  try {
    const { id } = req.params;
    const { class_id } = req.body;

    const schoolClass = await prisma.schoolClass.update({
      where: { class_id: parseInt(class_id) },
      data: { homeroom_teacher_id: parseInt(id) }
    });

    return res.json(schoolClass);
  } catch (error) {
    console.error('Assign homeroom error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Teacher to Subjects
 * PUT /api/vp-academic/teachers/:id/subjects
 */
async function assignTeacherToSubjects(req, res) {
  try {
    const { id } = req.params;
    const { class_subject_ids } = req.body;

    const updates = class_subject_ids.map(class_subject_id =>
      prisma.classSubject.update({
        where: { class_subject_id },
        data: { teacher_id: parseInt(id) }
      })
    );

    await prisma.$transaction(updates);

    return res.json({ message: 'Teacher assigned to subjects successfully' });
  } catch (error) {
    console.error('Assign teacher to subjects error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Remove/Transfer Teacher
 * DELETE /api/vp-academic/teachers/:id
 */
async function removeTeacher(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { is_active: false }
    });

    await prisma.auditLog.create({
      data: {
        user_id: await getVPAcademicId(req),
        action: `Teacher removed: ${reason}`,
        details: { teacher_id: id, reason }
      }
    });

    return res.json({ message: 'Teacher removed successfully' });
  } catch (error) {
    console.error('Remove teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Teacher Workload
 * GET /api/vp-academic/teachers/:id/workload
 */
async function getTeacherWorkload(req, res) {
  try {
    const { id } = req.params;

    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: parseInt(id) },
      include: {
        school_class: true,
        subject: true
      }
    });

    const schedules = await prisma.classSchedule.findMany({
      where: { teacher_id: parseInt(id) }
    });

    return res.json({
      class_subjects: classSubjects,
      total_periods: schedules.length,
      weekly_periods: schedules.length
    });
  } catch (error) {
    console.error('Get teacher workload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Teacher Performance
 * GET /api/vp-academic/teachers/:id/performance
 */
async function getTeacherPerformance(req, res) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid teacher ID' });
    }

    const teacherId = parseInt(id);

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: teacherId },
      include: { user: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: teacherId }
    });

    const classSubjectIds = classSubjects.map(cs => cs.class_subject_id);

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject_id: { in: classSubjectIds }
          }
        }
      }
    });

    const averageScore = grades.length > 0
      ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
      : 0;

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { recorded_by: teacherId }
    });

    const peerEvaluations = await prisma.peerEvaluation.findMany({
      where: { evaluatee_id: teacherId },
      include: {
        evaluator: {
          include: {
            user: true
          }
        }
      }
    });

    return res.json({
      teacher_id: teacherId,
      teacher_name: teacher.user?.full_name || 'Unknown',
      average_grade: parseFloat(averageScore.toFixed(2)),
      total_grades_recorded: grades.length,
      attendance_records_count: attendanceRecords.length,
      peer_evaluations: peerEvaluations,
      overall_peer_score: peerEvaluations.length > 0
        ? parseFloat((peerEvaluations.reduce((sum, e) => sum + Number(e.overall_score), 0) / peerEvaluations.length).toFixed(2))
        : 0
    });
  } catch (error) {
    console.error('Get teacher performance error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Get All Teachers Performance
 * GET /api/vp-academic/teachers/performance
 */
async function getAllTeachersPerformance(req, res) {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: true,
        class_subjects: true
      }
    });

    const performanceData = await Promise.all(
      teachers.map(async (teacher) => {
        const classSubjectIds = teacher.class_subjects.map(cs => cs.class_subject_id);

        const grades = await prisma.grade.findMany({
          where: {
            submission: {
              assignment: {
                class_subject_id: { in: classSubjectIds }
              }
            }
          }
        });

        const averageScore = grades.length > 0
          ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
          : 0;

        const attendanceRecords = await prisma.attendanceRecord.findMany({
          where: { recorded_by: teacher.teacher_id }
        });

        const peerEvaluations = await prisma.peerEvaluation.findMany({
          where: { evaluatee_id: teacher.teacher_id }
        });

        return {
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.user?.full_name || 'Unknown',
          email: teacher.user?.email || '',
          department: teacher.department || 'Unassigned',
          average_grade: parseFloat(averageScore.toFixed(2)),
          total_grades_recorded: grades.length,
          attendance_records_count: attendanceRecords.length,
          peer_evaluations_count: peerEvaluations.length,
          overall_peer_score: peerEvaluations.length > 0
            ? parseFloat((peerEvaluations.reduce((sum, e) => sum + Number(e.overall_score), 0) / peerEvaluations.length).toFixed(2))
            : 0
        };
      })
    );

    return res.json(performanceData);
  } catch (error) {
    console.error('Get all teachers performance error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// ==================== STUDENT MANAGEMENT ====================

/**
 * Register New Student
 * POST /api/vp-academic/students/register
 */
async function registerStudent(req, res) {
  try {
    const {
      // Personal Information
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      nationality,
      religion,
      home_address,
      
      // Contact Information
      email,
      phone_number,
      emergency_contact_name,
      emergency_contact_phone,
      
      // Academic Information
      grade_level,
      section,
      admission_date,
      
      // Guardian/Parent Information
      guardian_name,
      relationship,
      guardian_phone,
      guardian_email,
      guardian_password,
      
      // System Settings
      username,
      password,
      send_credentials,
      terms_agreed,
      
      // Legacy fields for compatibility
      full_name,
      student_number,
      current_class_id
    } = req.body;

    // Validate terms agreement
    if (!terms_agreed) {
      return res.status(400).json({ error: 'Terms and conditions must be agreed to' });
    }

    // Validate age (minimum 12 years)
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const minAgeDate = new Date();
      minAgeDate.setFullYear(minAgeDate.getFullYear() - 12);
      if (birthDate > minAgeDate) {
        return res.status(400).json({ error: 'Student must be at least 12 years old' });
      }
    }

    // Generate username if not provided
    const generatedUsername = username || `${first_name.toLowerCase()}.${last_name.toLowerCase()}`;
    
    // Generate password if not provided
    const bcrypt = require('bcrypt');
    const defaultPassword = password || 'Student123!';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    // Combine name parts for full_name
    const fullName = [first_name, middle_name, last_name].filter(Boolean).join(' ');

    // Create user
    const user = await prisma.user.create({
      data: {
        full_name: fullName,
        email: email.toLowerCase(),
        phone_number,
        password_hash,
        role: 'STUDENT',
        is_active: true
      }
    });

    // Create student record
    const student = await prisma.student.create({
      data: {
        user_id: user.user_id,
        student_number: student_number || `STU${Date.now()}`,
        enrollment_date: admission_date ? new Date(admission_date) : new Date(),
        current_class_id: current_class_id ? parseInt(current_class_id) : null,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        gender
      }
    });

    // Create parent/guardian record if provided
    if (guardian_name && guardian_email) {
      // Check if parent already exists by email
      const existingParentUser = await prisma.user.findFirst({
        where: {
          email: guardian_email.toLowerCase(),
          role: 'PARENT'
        }
      });

      let parent;

      if (existingParentUser) {
        // Parent exists, get their parent record
        parent = await prisma.parent.findFirst({
          where: { user_id: existingParentUser.user_id }
        });

        // Update parent information if needed
        if (parent) {
          await prisma.parent.update({
            where: { parent_id: parent.parent_id },
            data: {
              relationship,
              address: home_address
            }
          });
        }
      } else {
        // Create new parent user account
        const parentUsername = `${guardian_name.toLowerCase().replace(/\s/g, '.')}@parent`;
        const parentPassword = guardian_password || 'Parent123!';
        const parentPasswordHash = await bcrypt.hash(parentPassword, 10);

        const parentUser = await prisma.user.create({
          data: {
            full_name: guardian_name,
            email: guardian_email.toLowerCase(),
            phone_number: guardian_phone,
            password_hash: parentPasswordHash,
            role: 'PARENT',
            is_active: true
          }
        });

        // Create parent record
        parent = await prisma.parent.create({
          data: {
            user_id: parentUser.user_id,
            relationship,
            address: home_address
          }
        });
      }

      // Link parent to student using StudentParent junction table
      // Check if relationship already exists
      const existingRelationship = await prisma.studentParent.findFirst({
        where: {
          student_id: student.student_id,
          parent_id: parent.parent_id
        }
      });

      if (!existingRelationship) {
        await prisma.studentParent.create({
          data: {
            student_id: student.student_id,
            parent_id: parent.parent_id,
            relationship
          }
        });
      }
    }

    return res.json({
      message: 'Student registered successfully',
      student,
      username: generatedUsername,
      password: defaultPassword
    });
  } catch (error) {
    console.error('Register student error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      if (error.meta?.modelName === 'User') {
        return res.status(409).json({ 
          error: 'Email already exists. Please use a different email address.' 
        });
      }
    }
    
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Get Parent-Student Relationships
 * GET /api/vp-academic/parent-student-relationships
 */
async function getParentStudentRelationships(req, res) {
  try {
    // Get all parents with their students
    const parents = await prisma.parent.findMany({
      include: {
        user: true,
        student_parents: {
          include: {
            student: {
              include: {
                user: true,
                current_class: true
              }
            }
          }
        }
      }
    });

    // Transform the data to show parent with all their students
    const relationships = parents.map(parent => ({
      parent_id: parent.parent_id,
      parent_name: parent.user.full_name,
      parent_email: parent.user.email,
      parent_phone: parent.user.phone_number,
      relationship: parent.relationship,
      address: parent.address,
      students: parent.student_parents.map(sp => ({
        student_id: sp.student.student_id,
        student_name: sp.student.user.full_name,
        student_email: sp.student.user.email,
        student_number: sp.student.student_number,
        grade: sp.student.current_class?.class_name || 'Not assigned',
        relationship_to_parent: sp.relationship,
        linked_at: sp.linked_at
      }))
    }));

    return res.json(relationships);
  } catch (error) {
    console.error('Get parent-student relationships error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Bulk Import Students
 * POST /api/vp-academic/students/bulk-import
 */
async function bulkImportStudents(req, res) {
  try {
    const { students } = req.body;

    const createdStudents = [];
    for (const studentData of students) {
      const user = await prisma.user.create({
        data: {
          full_name: studentData.full_name,
          email: studentData.email,
          phone_number: studentData.phone_number,
          password_hash: studentData.password,
          role: 'STUDENT',
          is_active: true
        }
      });

      const student = await prisma.student.create({
        data: {
          user_id: user.user_id,
          student_number: studentData.student_number,
          enrollment_date: new Date(),
          current_class_id: studentData.class_id ? parseInt(studentData.class_id) : null,
          date_of_birth: studentData.date_of_birth ? new Date(studentData.date_of_birth) : null,
          gender: studentData.gender
        }
      });

      createdStudents.push(student);
    }

    return res.json({
      message: 'Bulk import completed',
      count: createdStudents.length,
      students: createdStudents
    });
  } catch (error) {
    console.error('Bulk import students error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Student to Class
 * PUT /api/vp-academic/students/:id/class
 */
async function assignStudentToClass(req, res) {
  try {
    const { id } = req.params;
    const { class_id } = req.body;

    const student = await prisma.student.update({
      where: { student_id: parseInt(id) },
      data: { current_class_id: parseInt(class_id) }
    });

    return res.json(student);
  } catch (error) {
    console.error('Assign student to class error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View All Students
 * GET /api/vp-academic/students
 */
async function getAllStudents(req, res) {
  try {
    const { grade_level } = req.query;

    // Build where clause for grade level filtering
    const whereClause = {};
    if (grade_level) {
      // Filter by grade level extracted from class_name (e.g., "Grade 9", "9A", "Grade 10")
      whereClause.current_class = {
        class_name: {
          contains: grade_level.toString(),
          mode: 'insensitive'
        }
      };
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: true,
        current_class: true,
        student_parents: {
          include: {
            parent: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        user: {
          full_name: 'asc'
        }
      }
    });

    // Group students by class
    const groupedStudents = students.reduce((acc, student) => {
      const className = student.current_class?.class_name || 'Unassigned';
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(student);
      return acc;
    }, {});

    return res.json({
      grouped: groupedStudents,
      all: students
    });
  } catch (error) {
    console.error('Get all students error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Edit Student Details
 * PUT /api/vp-academic/students/:id
 */
async function editStudent(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, class_id, gender } = req.body;

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        full_name,
        email,
        phone_number
      }
    });

    const student = await prisma.student.update({
      where: { student_id: parseInt(id) },
      data: {
        current_class_id: class_id ? parseInt(class_id) : null,
        gender
      }
    });

    return res.json(student);
  } catch (error) {
    console.error('Edit student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Promote Students
 * POST /api/vp-academic/students/promote
 */
async function promoteStudents(req, res) {
  try {
    const { from_grade, to_grade, academic_year } = req.body;

    const students = await prisma.student.findMany({
      where: {
        current_class: {
          class_name: { contains: from_grade.toString() }
        }
      },
      include: {
        current_class: true
      }
    });

    const targetClasses = await prisma.schoolClass.findMany({
      where: {
        class_name: { contains: to_grade.toString() },
        academic_year
      }
    });

    const promoted = [];
    for (const student of students) {
      const targetClass = targetClasses.find(c => 
        c.class_name.replace(/\d+/, to_grade.toString()) === 
        student.current_class.class_name.replace(/\d+/, to_grade.toString())
      );

      if (targetClass) {
        const updated = await prisma.student.update({
          where: { student_id: student.student_id },
          data: { current_class_id: targetClass.class_id }
        });
        promoted.push(updated);
      }
    }

    return res.json({
      message: 'Students promoted successfully',
      count: promoted.length,
      students: promoted
    });
  } catch (error) {
    console.error('Promote students error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Transfer Student
 * PUT /api/vp-academic/students/:id/transfer
 */
async function transferStudent(req, res) {
  try {
    const { id } = req.params;
    const { new_class_id, reason, transfer_date } = req.body;

    const student = await prisma.student.update({
      where: { student_id: parseInt(id) },
      data: { current_class_id: parseInt(new_class_id) }
    });

    await prisma.auditLog.create({
      data: {
        user_id: await getVPAcademicId(req),
        action: `Student transferred: ${reason}`,
        details: { student_id: id, new_class_id, reason, transfer_date }
      }
    });

    return res.json(student);
  } catch (error) {
    console.error('Transfer student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Archive Student
 * PUT /api/vp-academic/students/:id/archive
 */
async function archiveStudent(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { is_active: false }
    });

    await prisma.auditLog.create({
      data: {
        user_id: await getVPAcademicId(req),
        action: `Student archived: ${reason}`,
        details: { student_id: id, reason }
      }
    });

    return res.json({ message: 'Student archived successfully' });
  } catch (error) {
    console.error('Archive student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Student Academic History
 * GET /api/vp-academic/students/:id/history
 */
async function getStudentHistory(req, res) {
  try {
    const { id } = req.params;

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: parseInt(id)
        }
      },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const attendance = await prisma.attendanceRecord.findMany({
      where: { student_id: parseInt(id) },
      orderBy: { date: 'desc' }
    });

    const transcripts = await prisma.transcript.findMany({
      where: { student_id: parseInt(id) }
    });

    return res.json({
      grades,
      attendance,
      transcripts
    });
  } catch (error) {
    console.error('Get student history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== EXAMINATION & ASSESSMENT MANAGEMENT ====================

/**
 * Get All Exams
 * GET /api/vp-academic/exams
 */
async function getAllExams(req, res) {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        class_subject: {
          include: {
            school_class: {
              select: {
                class_name: true,
                class_id: true
              }
            },
            subject: {
              select: {
                subject_name: true,
                subject_code: true
              }
            }
          }
        },
        creator: {
          select: {
            full_name: true
          }
        },
        exam_results: true,
        exam_invigilators: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    full_name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { exam_date: 'desc' }
    });

    // Process exams with enhanced data
    const processedExams = exams.map(exam => {
      const className = exam.class_subject.school_class.class_name;
      const gradeLevel = className.match(/\d+/)?.[0] || 'Unknown';

      // Calculate exam statistics
      const totalStudents = exam.exam_results.length;
      const averageScore = totalStudents > 0
        ? exam.exam_results.reduce((sum, r) => sum + Number(r.score), 0) / totalStudents
        : 0;
      const passRate = totalStudents > 0
        ? (exam.exam_results.filter(r => Number(r.score) >= 50).length / totalStudents) * 100
        : 0;

      return {
        exam_id: exam.exam_id,
        title: exam.title,
        subject: exam.class_subject.subject.subject_name,
        subject_code: exam.class_subject.subject.subject_code,
        subject_department: exam.class_subject.subject.department,
        class: className,
        class_id: exam.class_subject.school_class.class_id,
        grade_level: gradeLevel,
        exam_type: exam.exam_type,
        exam_date: exam.exam_date,
        exam_time: exam.exam_time,
        duration_minutes: exam.duration_minutes,
        total_marks: Number(exam.total_marks),
        status: exam.status,
        room: exam.room,
        coordinator: exam.coordinator,
        created_by: exam.creator?.full_name || 'Unknown',
        created_at: exam.created_at,
        approved_at: exam.approved_at,
        invigilators: exam.exam_invigilators.map(inv => inv.teacher.user.full_name),
        statistics: {
          total_students: totalStudents,
          average_score: parseFloat(averageScore.toFixed(2)),
          pass_rate: parseFloat(passRate.toFixed(1))
        }
      };
    });

    // Organize exams by class level for table display
    const examsByClassLevel = {};
    processedExams.forEach(exam => {
      if (!examsByClassLevel[exam.grade_level]) {
        examsByClassLevel[exam.grade_level] = {
          grade_level: exam.grade_level,
          total_exams: 0,
          completed_exams: 0,
          pending_exams: 0,
          exams: []
        };
      }

      examsByClassLevel[exam.grade_level].exams.push(exam);
      examsByClassLevel[exam.grade_level].total_exams++;
      
      if (exam.status === 'COMPLETED') {
        examsByClassLevel[exam.grade_level].completed_exams++;
      } else if (exam.status === 'PENDING' || exam.status === 'DRAFT' || exam.status === 'PENDING_APPROVAL') {
        examsByClassLevel[exam.grade_level].pending_exams++;
      }
    });

    // Convert to array and sort by grade level
    const classLevelsArray = Object.values(examsByClassLevel).sort((a, b) => {
      const gradeA = parseInt(a.grade_level) || 0;
      const gradeB = parseInt(b.grade_level) || 0;
      return gradeA - gradeB;
    });

    return res.json({
      // Primary response - exams as array for backward compatibility
      exams: processedExams,
      
      // Additional structure for table display by class level
      class_levels: classLevelsArray,
      total_exams: processedExams.length
    });
  } catch (error) {
    console.error('Get all exams error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Create Examination Schedule
 * POST /api/vp-academic/exams
 */
async function createExamSchedule(req, res) {
  try {
    const {
      class_subject_id,
      title,
      exam_type,
      exam_date,
      exam_time,
      duration_minutes,
      total_marks,
      room,
      coordinator
    } = req.body;

    // Parse exam_time if provided (format: HH:MM)
    let examTimeDate = null;
    if (exam_time) {
      const [hours, minutes] = exam_time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      examTimeDate = date;
    }

    const exam = await prisma.exam.create({
      data: {
        class_subject_id,
        title,
        exam_type,
        exam_date: new Date(exam_date),
        exam_time: examTimeDate,
        duration_minutes,
        total_marks,
        room: room || null,
        coordinator: coordinator || null,
        created_by: await getVPAcademicId(req),
        status: 'DRAFT'
      }
    });

    return res.json(exam);
  } catch (error) {
    console.error('Create exam schedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete Exam
 * DELETE /api/vp-academic/exams/:exam_id
 */
async function deleteExam(req, res) {
  try {
    const { exam_id } = req.params;

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(exam_id) }
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Delete exam (cascade will handle related records)
    await prisma.exam.delete({
      where: { exam_id: parseInt(exam_id) }
    });

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Invigilators
 * POST /api/vp-academic/exams/:exam_id/invigilators
 */
async function assignInvigilators(req, res) {
  try {
    const { exam_id } = req.params;
    const { teacher_ids } = req.body;

    const invigilators = teacher_ids.map(teacher_id => ({
      exam_id: parseInt(exam_id),
      teacher_id
    }));

    await prisma.examInvigilator.createMany({
      data: invigilators
    });

    return res.json({ message: 'Invigilators assigned successfully' });
  } catch (error) {
    console.error('Assign invigilators error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Exam Papers
 * PUT /api/vp-academic/exams/:id/approve
 */
async function approveExamPaper(req, res) {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.update({
      where: { exam_id: parseInt(id) },
      data: {
        approved_by: await getVPAcademicId(req),
        approved_at: new Date(),
        status: 'APPROVED'
      }
    });

    return res.json(exam);
  } catch (error) {
    console.error('Approve exam paper error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Exam Results
 * GET /api/vp-academic/exams/:id/results
 */
async function getExamResults(req, res) {
  try {
    const { id } = req.params;

    const results = await prisma.examResult.findMany({
      where: { exam_id: parseInt(id) },
      include: {
        student: {
          include: {
            user: true,
            current_class: true
          }
        }
      }
    });

    return res.json(results);
  } catch (error) {
    console.error('Get exam results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Analyze Exam Performance
 * GET /api/vp-academic/exams/:id/analysis
 */
async function analyzeExamPerformance(req, res) {
  try {
    const { id } = req.params;

    const results = await prisma.examResult.findMany({
      where: { exam_id: parseInt(id) }
    });

    const scores = results.map(r => Number(r.score));
    const average = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
      : 0;
    const highest = Math.max(...scores, 0);
    const lowest = Math.min(...scores, 0);
    const passCount = scores.filter(s => s >= 50).length;
    const passRate = scores.length > 0 ? (passCount / scores.length) * 100 : 0;

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach(score => {
      if (score >= 90) gradeDistribution.A++;
      else if (score >= 80) gradeDistribution.B++;
      else if (score >= 70) gradeDistribution.C++;
      else if (score >= 60) gradeDistribution.D++;
      else gradeDistribution.F++;
    });

    return res.json({
      average: average.toFixed(2),
      highest,
      lowest,
      pass_rate: passRate.toFixed(1),
      grade_distribution: gradeDistribution,
      total_students: scores.length
    });
  } catch (error) {
    console.error('Analyze exam performance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate National Exam Results
 * POST /api/vp-academic/exams/national-results
 */
async function generateNationalExamResults(req, res) {
  try {
    const { exam_type, grade_level, results } = req.body;

    const created = await prisma.examResult.createMany({
      data: results.map(r => ({
        exam_id: r.exam_id,
        student_id: r.student_id,
        score: r.score,
        letter_grade: r.letter_grade
      }))
    });

    return res.json({
      message: 'National exam results generated',
      count: created.count
    });
  } catch (error) {
    console.error('Generate national exam results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Compare Results to Previous Years
 * GET /api/vp-academic/exams/comparison
 */
async function compareExamResults(req, res) {
  try {
    const { subject_id, years } = req.query;

    const yearArray = years ? years.split(',') : ['2023-2024', '2024-2025'];

    const comparison = {};
    for (const year of yearArray) {
      const results = await prisma.examResult.findMany({
        where: {
          exam: {
            class_subject: {
              subject_id: parseInt(subject_id)
            },
            created_at: {
              gte: new Date(year.split('-')[0], 0, 1),
              lte: new Date(year.split('-')[1], 11, 31)
            }
          }
        }
      });

      const scores = results.map(r => Number(r.score));
      const average = scores.length > 0 
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
        : 0;

      comparison[year] = {
        average: average.toFixed(2),
        total_exams: results.length
      };
    }

    return res.json(comparison);
  } catch (error) {
    console.error('Compare exam results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export Exam Results
 * GET /api/vp-academic/exams/export
 */
async function exportExamResults(req, res) {
  try {
    const { exam_id, format } = req.query;

    const results = await prisma.examResult.findMany({
      where: exam_id ? { exam_id: parseInt(exam_id) } : {},
      include: {
        student: {
          include: {
            user: true,
            current_class: true
          }
        },
        exam: {
          include: {
            class_subject: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    return res.json({
      message: 'Exam results export',
      data: results,
      format: format || 'json'
    });
  } catch (error) {
    console.error('Export exam results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== ACADEMIC MONITORING & REPORTING ====================

/**
 * Get Reports Overview
 * GET /api/vp-academic/reports
 */
async function getReportsOverview(req, res) {
  try {
    const { report_type, academic_year } = req.query;

    // Get current academic year if not provided
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const yearToUse = academic_year || currentYear?.year_name || '2024-2025';

    // Get all reports from database
    const reports = await prisma.report.findMany({
      where: report_type ? {
        data: {
          path: ['report_type'],
          equals: report_type
        }
      } : undefined,
      orderBy: { generated_at: 'desc' },
      take: 50
    });

    // Get compliance reports
    const complianceReports = await prisma.complianceReport.findMany({
      orderBy: { generated_at: 'desc' },
      take: 20
    });

    // Get recent academic activity for report generation
    const recentGrades = await prisma.grade.findMany({
      include: {
        submission: {
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
            }
          }
        }
      },
      orderBy: { graded_at: 'desc' },
      take: 100
    });

    // Get recent attendance records
    const recentAttendance = await prisma.attendanceRecord.findMany({
      include: {
        student: {
          include: {
            user: true
          }
        },
        school_class: true
      },
      orderBy: { date: 'desc' },
      take: 100
    });

    // Get recent exam results
    const recentExamResults = await prisma.examResult.findMany({
      include: {
        exam: {
          include: {
            class_subject: {
              include: {
                subject: true,
                school_class: true
              }
            }
          }
        },
        student: {
          include: {
            user: true
          }
        }
      },
      orderBy: { graded_at: 'desc' },
      take: 50
    });

    // Calculate summary statistics
    const gradeStats = {
      total_grades: recentGrades.length,
      average_score: recentGrades.length > 0
        ? (recentGrades.reduce((sum, g) => sum + Number(g.score), 0) / recentGrades.length).toFixed(2)
        : 0,
      pass_rate: recentGrades.length > 0
        ? ((recentGrades.filter(g => Number(g.score) >= 50).length / recentGrades.length) * 100).toFixed(1)
        : 0
    };

    const attendanceStats = {
      total_records: recentAttendance.length,
      present_rate: recentAttendance.length > 0
        ? ((recentAttendance.filter(r => r.status === 'PRESENT').length / recentAttendance.length) * 100).toFixed(1)
        : 0
    };

    return res.json({
      academic_year: yearToUse,
      summary: {
        total_reports: reports.length,
        total_compliance_reports: complianceReports.length,
        recent_grades_count: gradeStats.total_grades,
        average_grade: parseFloat(gradeStats.average_score),
        pass_rate: parseFloat(gradeStats.pass_rate),
        attendance_rate: parseFloat(attendanceStats.present_rate)
      },
      reports: reports.map(r => ({
        report_id: r.report_id,
        title: r.title,
        report_type: r.data?.report_type || 'GENERAL',
        generated_at: r.generated_at,
        generated_by: r.generated_by
      })),
      compliance_reports: complianceReports,
      recent_data: {
        grades: recentGrades.slice(0, 20),
        attendance: recentAttendance.slice(0, 20),
        exam_results: recentExamResults.slice(0, 20)
      }
    });
  } catch (error) {
    console.error('Get reports overview error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * View School-Wide Grades
 * GET /api/vp-academic/academic/grades
 */
async function getSchoolWideGrades(req, res) {
  try {
    const { grade_level, subject_id } = req.query;

    const grades = await prisma.grade.findMany({
      include: {
        submission: {
          include: {
            student: {
              include: {
                current_class: true
              }
            },
            assignment: {
              include: {
                class_subject: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let filtered = grades;
    if (grade_level) {
      filtered = filtered.filter(g => 
        g.submission.student.current_class?.class_name.includes(grade_level.toString())
      );
    }
    if (subject_id) {
      filtered = filtered.filter(g => 
        g.submission.assignment.class_subject.subject_id === parseInt(subject_id)
      );
    }

    return res.json(filtered);
  } catch (error) {
    console.error('Get school-wide grades error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Grade Distribution Charts
 * GET /api/vp-academic/academic/grade-distribution
 */
async function getGradeDistribution(req, res) {
  try {
    const grades = await prisma.grade.findMany();

    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => {
      const score = Number(g.score);
      if (score >= 90) distribution.A++;
      else if (score >= 80) distribution.B++;
      else if (score >= 70) distribution.C++;
      else if (score >= 60) distribution.D++;
      else distribution.F++;
    });

    return res.json(distribution);
  } catch (error) {
    console.error('Get grade distribution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Attendance Summary
 * GET /api/vp-academic/academic/attendance
 */
async function getAttendanceSummary(req, res) {
  try {
    const { grade_level, start_date, end_date } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.date = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    let filtered = attendanceRecords;
    if (grade_level) {
      filtered = filtered.filter(r => 
        r.student.current_class?.class_name.includes(grade_level.toString())
      );
    }

    const summary = {
      total_records: filtered.length,
      present: filtered.filter(r => r.status === 'PRESENT').length,
      absent: filtered.filter(r => r.status === 'ABSENT').length,
      late: filtered.filter(r => r.status === 'LATE').length,
      attendance_rate: filtered.length > 0 
        ? ((filtered.filter(r => r.status === 'PRESENT').length / filtered.length) * 100).toFixed(1)
        : 0
    };

    return res.json(summary);
  } catch (error) {
    console.error('Get attendance summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Identify At-Risk Students
 * GET /api/vp-academic/academic/at-risk
 */
async function getAtRiskStudents(req, res) {
  try {
    const { threshold_grade, threshold_attendance } = req.query;

    const gradeThreshold = parseFloat(threshold_grade) || 60;
    const attendanceThreshold = parseFloat(threshold_attendance) || 80;

    const grades = await prisma.grade.findMany({
      include: {
        submission: {
          include: {
            student: {
              include: {
                user: true,
                current_class: true
              }
            }
          }
        }
      }
    });

    const studentAverages = {};
    grades.forEach(g => {
      const studentId = g.submission.student_id;
      if (!studentAverages[studentId]) {
        studentAverages[studentId] = { total: 0, count: 0, student: g.submission.student };
      }
      studentAverages[studentId].total += Number(g.score);
      studentAverages[studentId].count += 1;
    });

    const atRiskByGrade = Object.values(studentAverages)
      .filter(s => (s.total / s.count) < gradeThreshold)
      .map(s => ({
        student: s.student,
        average_grade: (s.total / s.count).toFixed(2),
        risk_factor: 'LOW_GRADES'
      }));

    const attendanceRecords = await prisma.attendanceRecord.groupBy({
      by: ['student_id'],
      _count: {
        student_id: true
      },
      where: {
        status: 'PRESENT'
      }
    });

    const totalAttendance = await prisma.attendanceRecord.groupBy({
      by: ['student_id'],
      _count: {
        student_id: true
      }
    });

    const atRiskByAttendance = [];
    attendanceRecords.forEach(record => {
      const total = totalAttendance.find(t => t.student_id === record.student_id)?._count.student_id || 0;
      const rate = (record._count.student_id / total) * 100;
      if (rate < attendanceThreshold) {
        const student = grades.find(g => g.submission.student_id === record.student_id)?.submission.student;
        if (student) {
          atRiskByAttendance.push({
            student,
            attendance_rate: (rate).toFixed(1),
            risk_factor: 'POOR_ATTENDANCE'
          });
        }
      }
    });

    return res.json({
      at_risk_by_grade: atRiskByGrade,
      at_risk_by_attendance: atRiskByAttendance
    });
  } catch (error) {
    console.error('Get at-risk students error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate Academic Report
 * POST /api/vp-academic/academic/reports
 */
async function generateAcademicReport(req, res) {
  try {
    const { report_type, grade_level, subject_id, start_date, end_date } = req.body;

    const report = await prisma.report.create({
      data: {
        generated_by: await getVPAcademicId(req),
        title: `${report_type} Report`,
        data: {
          report_type,
          grade_level,
          subject_id,
          start_date,
          end_date,
          generated_at: new Date().toISOString()
        }
      }
    });

    return res.json(report);
  } catch (error) {
    console.error('Generate academic report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate Transcripts
 * POST /api/vp-academic/academic/transcripts
 */
async function generateTranscript(req, res) {
  try {
    const { student_id } = req.body;

    const transcript = await prisma.transcript.create({
      data: {
        student_id: parseInt(student_id),
        generated_by: await getVPAcademicId(req),
        data: {}
      }
    });

    return res.json(transcript);
  } catch (error) {
    console.error('Generate transcript error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== LESSON PLAN OVERSIGHT ====================

/**
 * View All Lesson Plans
 * GET /api/vp-academic/lesson-plans
 */
async function getAllLessonPlans(req, res) {
  try {
    const { status, teacher_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (teacher_id) where.teacher_id = parseInt(teacher_id);

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        },
        reviewer: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    return res.json(lessonPlans);
  } catch (error) {
    console.error('Get all lesson plans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Review Pending Lesson Plans
 * GET /api/vp-academic/lesson-plans/pending
 */
async function getPendingLessonPlans(req, res) {
  try {
    const lessonPlans = await prisma.lessonPlan.findMany({
      where: { status: 'PENDING' },
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    return res.json(lessonPlans);
  } catch (error) {
    console.error('Get pending lesson plans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve/Reject Lesson Plans
 * PUT /api/vp-academic/lesson-plans/:id/review
 */
async function reviewLessonPlan(req, res) {
  try {
    const { id } = req.params;
    const { status, review_comments } = req.body;

    const lessonPlan = await prisma.lessonPlan.update({
      where: { lesson_plan_id: parseInt(id) },
      data: {
        status,
        review_comments,
        reviewed_by: await getVPAcademicId(req),
        reviewed_at: new Date()
      }
    });

    return res.json(lessonPlan);
  } catch (error) {
    console.error('Review lesson plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Lesson Plan Statistics
 * GET /api/vp-academic/lesson-plans/statistics
 */
async function getLessonPlanStatistics(req, res) {
  try {
    const total = await prisma.lessonPlan.count();
    const approved = await prisma.lessonPlan.count({ where: { status: 'APPROVED' } });
    const rejected = await prisma.lessonPlan.count({ where: { status: 'REJECTED' } });
    const pending = await prisma.lessonPlan.count({ where: { status: 'PENDING' } });

    const byTeacher = await prisma.lessonPlan.groupBy({
      by: ['teacher_id'],
      _count: {
        teacher_id: true
      }
    });

    return res.json({
      total,
      approved,
      rejected,
      pending,
      approval_rate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
      by_teacher: byTeacher
    });
  } catch (error) {
    console.error('Get lesson plan statistics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export Lesson Plan Report
 * GET /api/vp-academic/lesson-plans/export
 */
async function exportLessonPlanReport(req, res) {
  try {
    const { start_date, end_date, format } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.submitted_at = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        class_subject: {
          include: {
            subject: true,
            school_class: true
          }
        }
      }
    });

    return res.json({
      message: 'Lesson plan report export',
      data: lessonPlans,
      format: format || 'json'
    });
  } catch (error) {
    console.error('Export lesson plan report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== PARENT-TEACHER COMMUNICATION ====================

/**
 * View Parent Feedback
 * GET /api/vp-academic/parent-feedback
 */
async function getParentFeedback(req, res) {
  try {
    const parentSurveys = await prisma.parentSurveyResponse.findMany({
      include: {
        parent: {
          include: {
            user: true
          }
        }
      }
    });

    return res.json(parentSurveys);
  } catch (error) {
    console.error('Get parent feedback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Schedule Parent-Teacher Conferences
 * POST /api/vp-academic/conferences
 */
async function scheduleConference(req, res) {
  try {
    const { title, description, scheduled_date, scheduled_time, location } = req.body;

    const meeting = await prisma.departmentMeeting.create({
      data: {
        department: 'ALL',
        title,
        description,
        scheduled_date: new Date(scheduled_date),
        scheduled_time,
        location,
        created_by: await getVPAcademicId(req),
        status: 'SCHEDULED'
      }
    });

    return res.json(meeting);
  } catch (error) {
    console.error('Schedule conference error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send Academic Alerts to Parents
 * POST /api/vp-academic/parent-alerts
 */
async function sendParentAlert(req, res) {
  try {
    const { student_ids, message, alert_type } = req.body;

    const notifications = student_ids.map(student_id =>
      prisma.notification.create({
        data: {
          user_id: student_id,
          type: 'GRADE',
          content: message,
          metadata: { alert_type }
        }
      })
    );

    await prisma.$transaction(notifications);

    return res.json({ message: 'Parent alerts sent successfully' });
  } catch (error) {
    console.error('Send parent alert error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== DEPARTMENT HEAD & TEACHER SUPERVISION ====================

/**
 * View All Department Heads
 * GET /api/vp-academic/department-heads
 */
async function getAllDepartmentHeads(req, res) {
  try {
    const departmentHeads = await prisma.departmentHead.findMany({
      include: {
        user: true
      }
    });

    return res.json(departmentHeads);
  } catch (error) {
    console.error('Get all department heads error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Assign Department Heads
 * POST /api/vp-academic/department-heads
 */
async function assignDepartmentHead(req, res) {
  try {
    const { user_id, department, employee_id } = req.body;

    const deptHead = await prisma.departmentHead.create({
      data: {
        user_id: parseInt(user_id),
        department,
        employee_id,
        appointment_date: new Date()
      }
    });

    return res.json(deptHead);
  } catch (error) {
    console.error('Assign department head error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Department Performance
 * GET /api/vp-academic/department-performance
 */
async function getDepartmentPerformance(req, res) {
  try {
    const { department } = req.query;

    const teachers = await prisma.teacher.findMany({
      where: department ? { department } : {},
      include: {
        user: true,
        class_subjects: {
          include: {
            subject: true
          }
        }
      }
    });

    const performance = teachers.map(teacher => ({
      teacher: teacher.user.full_name,
      department: teacher.department,
      subjects_taught: teacher.class_subjects.length
    }));

    return res.json(performance);
  } catch (error) {
    console.error('Get department performance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Conduct Teacher Evaluation
 * POST /api/vp-academic/teacher-evaluations
 */
async function createTeacherEvaluation(req, res) {
  try {
    const { form_id, evaluator_id, evaluatee_id, scores, comments, term } = req.body;

    const evaluation = await prisma.peerEvaluation.create({
      data: {
        form_id: parseInt(form_id),
        evaluator_id: parseInt(evaluator_id),
        evaluatee_id: parseInt(evaluatee_id),
        scores,
        comments,
        term,
        overall_score: Object.values(scores).reduce((sum, val) => sum + val, 0) / Object.keys(scores).length
      }
    });

    return res.json(evaluation);
  } catch (error) {
    console.error('Create teacher evaluation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== COMMUNICATION & ANNOUNCEMENTS ====================

/**
 * Post Academic Announcements
 * POST /api/vp-academic/announcements
 */
async function createAnnouncement(req, res) {
  try {
    const { title, message, target_roles, target_class_id } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        created_by: await getVPAcademicId(req),
        target_roles: target_roles || 'ALL',
        target_class_id: target_class_id ? parseInt(target_class_id) : null
      }
    });

    return res.json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Announcements
 * GET /api/vp-academic/announcements
 */
async function getAnnouncements(req, res) {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { is_active: true },
      orderBy: { published_at: 'desc' },
      take: 20
    });

    return res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== SETTINGS & PREFERENCES ====================

/**
 * Manage Academic Calendar
 * POST /api/vp-academic/settings/academic-calendar
 */
async function manageAcademicCalendar(req, res) {
  try {
    const { year_name, start_date, end_date, is_current, terms } = req.body;

    const academicYear = await prisma.academicYear.create({
      data: {
        year_name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        is_current,
        terms
      }
    });

    return res.json(academicYear);
  } catch (error) {
    console.error('Manage academic calendar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Manage Grading Rubrics
 * POST /api/vp-academic/settings/grading-scale
 */
async function manageGradingScale(req, res) {
  try {
    const { grade_level, scale } = req.body;

    const gradingScale = await prisma.gradingScale.create({
      data: {
        grade_level,
        scale
      }
    });

    return res.json(gradingScale);
  } catch (error) {
    console.error('Manage grading scale error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Personal Profile
 * PUT /api/vp-academic/settings/profile
 */
async function updateProfile(req, res) {
  try {
    const { full_name, email, phone_number } = req.body;

    const user = await prisma.user.update({
      where: { user_id: await getVPAcademicId(req) },
      data: {
        full_name,
        email,
        phone_number
      }
    });

    return res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== AUDIT LOG ====================

/**
 * View Academic Audit Log
 * GET /api/vp-academic/audit-log
 */
async function getAuditLog(req, res) {
  try {
    const { start_date, end_date, action } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.timestamp = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }
    if (action) {
      where.action = { contains: action };
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return res.json(auditLogs);
  } catch (error) {
    console.error('Get audit log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  // Dashboard
  getAnalyticsOverview,
  getAcademicDashboard,
  getQuickStats,
  getAcademicCalendar,
  getRecentActivity,
  getNotifications,
  
  // Curriculum
  getCurriculum,
  manageSubjectOffering,
  setCurriculumObjectives,
  mapSubjectToDepartment,
  getCurriculumCompliance,
  exportCurriculumGuide,
  
  // Timetable
  createMasterTimetable,
  assignTeacherToClass,
  assignClassroom,
  getTimetableConflicts,
  getIndividualTimetable,
  editTimetable,
  getSubstituteAssignments,
  exportTimetable,
  
  // Teachers
  registerTeacher,
  registerTeachingAssistant,
  getAllTeachers,
  editTeacher,
  assignTeacherToDepartment,
  assignTeacherToHomeroom,
  assignTeacherToSubjects,
  removeTeacher,
  getTeacherWorkload,
  getTeacherPerformance,
  getAllTeachersPerformance,
  
  // Students
  registerStudent,
  bulkImportStudents,
  assignStudentToClass,
  getAllStudents,
  editStudent,
  promoteStudents,
  transferStudent,
  archiveStudent,
  getStudentHistory,
  getParentStudentRelationships,
  
  // Exams
  getAllExams,
  createExamSchedule,
  deleteExam,
  assignInvigilators,
  approveExamPaper,
  getExamResults,
  analyzeExamPerformance,
  generateNationalExamResults,
  compareExamResults,
  exportExamResults,
  
  // Academic Monitoring
  getReportsOverview,
  getSchoolWideGrades,
  getGradeDistribution,
  getAttendanceSummary,
  getAtRiskStudents,
  generateAcademicReport,
  generateTranscript,
  
  // Lesson Plans
  getAllLessonPlans,
  getPendingLessonPlans,
  reviewLessonPlan,
  getLessonPlanStatistics,
  exportLessonPlanReport,
  
  // Parent Communication
  getParentFeedback,
  scheduleConference,
  sendParentAlert,
  
  // Department Supervision
  getAllDepartmentHeads,
  assignDepartmentHead,
  getDepartmentPerformance,
  createTeacherEvaluation,
  
  // Communication
  createAnnouncement,
  getAnnouncements,
  
  // Settings
  manageAcademicCalendar,
  manageGradingScale,
  updateProfile,
  
  // Audit
  getAuditLog
};
