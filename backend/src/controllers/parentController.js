const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// 1. DASHBOARD & OVERVIEW
// ============================================

exports.getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user.parent_id;
    
    // Get all children associated with this parent
    const studentParents = await prisma.studentParent.findMany({
      where: { parent_id: parentId },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    const children = await Promise.all(studentParents.map(async (sp) => {
      const student = sp.student;
      
      // Calculate summary data for each child
      const grades = await prisma.grade.findMany({
        where: {
          submission: {
            student_id: student.student_id
          }
        },
        include: {
          submission: {
            include: {
              assignment: true
            }
          }
        }
      });

      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          student_id: student.student_id,
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
          }
        }
      });

      const averageGrade = grades.length > 0 
        ? grades.reduce((sum, g) => sum + parseFloat(g.score), 0) / grades.length 
        : 0;

      const presentDays = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
      const attendanceRate = attendanceRecords.length > 0 
        ? (presentDays / attendanceRecords.length) * 100 
        : 0;

      const assignments = await prisma.assignment.findMany({
        where: {
          class_subject: {
            class_id: student.current_class_id
          }
        }
      });

      const submissions = await prisma.submission.findMany({
        where: {
          student_id: student.student_id
        }
      });

      return {
        student_id: student.student_id,
        full_name: req.user.full_name,
        student_number: student.student_number,
        class_name: student.current_class?.class_name || 'Not assigned',
        school_name: 'Smart Valley Academy',
        summary: {
          average_grade: Math.round(averageGrade),
          attendance_rate: Math.round(attendanceRate),
          assignments_submitted: submissions.length,
          total_assignments: assignments.length,
          conduct_grade: 'Good'
        }
      };
    }));

    // Get announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        is_active: true,
        OR: [
          { target_roles: 'ALL' },
          { target_roles: { contains: 'PARENT' } }
        ]
      },
      orderBy: { published_at: 'desc' },
      take: 5
    });

    res.json({
      children,
      announcements: announcements.map(a => ({
        announcement_id: a.announcement_id,
        title: a.title,
        body: a.message,
        created_at: a.published_at
      }))
    });
  } catch (error) {
    console.error('Error in getParentDashboard:', error);
    res.status(500).json({ error: 'Failed to fetch parent dashboard' });
  }
};

exports.getChildDashboard = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify parent has access to this child
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    const student = studentParent.student;

    // Get grades and calculate average
    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: student.student_id
        }
      }
    });

    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, g) => sum + parseFloat(g.score), 0) / grades.length 
      : 0;

    // Get attendance
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: student.student_id,
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      }
    });

    const presentDays = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? (presentDays / attendanceRecords.length) * 100 
      : 0;

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        }
      },
      include: {
        submissions: {
          where: { student_id: student.student_id }
        }
      }
    });

    const submittedAssignments = assignments.filter(a => a.submissions.length > 0).length;
    const pendingAssignments = assignments.filter(a => {
      const dueDate = new Date(a.due_date);
      const now = new Date();
      return dueDate > now && a.submissions.length === 0;
    }).length;

    // Get upcoming exams
    const exams = await prisma.exam.findMany({
      where: {
        class_subject: {
          class_id: student.current_class_id
        },
        exam_date: {
          gte: new Date()
        },
        status: 'APPROVED'
      }
    });

    // Generate alerts
    const alerts = [];
    const recentAbsences = attendanceRecords.filter(ar => 
      ar.status === 'ABSENT' && 
      new Date(ar.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentAbsences.length > 0) {
      alerts.push({
        type: 'ABSENCE',
        message: `Recent absence recorded for your child on ${recentAbsences[0].date.toLocaleDateString()}.`
      });
    }

    const lowGrades = grades.filter(g => parseFloat(g.score) < 70);
    if (lowGrades.length > 0) {
      alerts.push({
        type: 'LOW_GRADE',
        message: 'A recent score is below the expected grade range.'
      });
    }

    const upcomingDeadlines = assignments.filter(a => {
      const dueDate = new Date(a.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3 && daysUntilDue > 0;
    });

    if (upcomingDeadlines.length > 0) {
      alerts.push({
        type: 'DEADLINE',
        message: `Upcoming deadline: ${upcomingDeadlines[0].title}.`
      });
    }

    // Performance trend (mock data - would be calculated from historical data)
    const performanceTrend = [
      { month: 'Aug', score: 72 },
      { month: 'Sep', score: 78 },
      { month: 'Oct', score: 85 },
      { month: 'Nov', score: 82 }
    ];

    // Get announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        is_active: true,
        OR: [
          { target_roles: 'ALL' },
          { target_roles: { contains: 'PARENT' } }
        ]
      },
      orderBy: { published_at: 'desc' },
      take: 3
    });

    res.json({
      child: {
        student_id: student.student_id,
        full_name: req.user.full_name,
        student_number: student.student_number,
        class_name: student.current_class?.class_name || 'Not assigned',
        school_name: 'Smart Valley Academy'
      },
      summary: {
        average_grade: Math.round(averageGrade),
        attendance_rate: Math.round(attendanceRate),
        assignments_submitted: submittedAssignments,
        total_assignments: assignments.length,
        conduct_grade: 'Good',
        pending_assignments: pendingAssignments,
        upcoming_exams: exams.length
      },
      alerts,
      performance_trend: performanceTrend,
      announcements: announcements.map(a => ({
        announcement_id: a.announcement_id,
        title: a.title,
        body: a.message,
        created_at: a.published_at
      }))
    });
  } catch (error) {
    console.error('Error in getChildDashboard:', error);
    res.status(500).json({ error: 'Failed to fetch child dashboard' });
  }
};

exports.getQuickStats = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate quick stats
    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: parseInt(childId)
        }
      }
    });

    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, g) => sum + parseFloat(g.score), 0) / grades.length 
      : 0;

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: parseInt(childId),
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      }
    });

    const presentDays = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? (presentDays / attendanceRecords.length) * 100 
      : 0;

    const assignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: studentParent.student.current_class_id
        }
      },
      include: {
        submissions: {
          where: { student_id: parseInt(childId) }
        }
      }
    });

    const pendingAssignments = assignments.filter(a => {
      const dueDate = new Date(a.due_date);
      const now = new Date();
      return dueDate > now && a.submissions.length === 0;
    }).length;

    const exams = await prisma.exam.findMany({
      where: {
        class_subject: {
          class_id: studentParent.student.current_class_id
        },
        exam_date: {
          gte: new Date()
        },
        status: 'APPROVED'
      }
    });

    res.json({
      current_gpa: (averageGrade / 25).toFixed(2), // Convert to 4.0 scale
      attendance_rate: Math.round(attendanceRate),
      conduct_grade: 'Good',
      pending_assignments: pendingAssignments,
      upcoming_exams: exams.length
    });
  } catch (error) {
    console.error('Error in getQuickStats:', error);
    res.status(500).json({ error: 'Failed to fetch quick stats' });
  }
};

exports.getActivityFeed = async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 10 } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get recent activities (mock implementation)
    const activities = [
      {
        type: 'GRADE_POSTED',
        message: 'New grade posted for Quadratic Equations: 85/100',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        type: 'ATTENDANCE_MARKED',
        message: 'Attendance marked: Present',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({ activities: activities.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Error in getActivityFeed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

// ============================================
// 2. VIEW CHILD'S ACADEMIC PERFORMANCE (READ-ONLY)
// ============================================

exports.getCurrentGrades = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term, subject_id } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get grades with subject information
    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: parseInt(childId)
        }
      },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: {
                    subject: true,
                    teacher: true
                  }
                }
              }
            }
          }
        },
        teacher: true
      }
    });

    // Group by subject
    const subjectGrades = {};
    grades.forEach(grade => {
      const subject = grade.submission.assignment.class_subject.subject;
      const teacher = grade.submission.assignment.class_subject.teacher;
      
      if (!subjectGrades[subject.subject_id]) {
        subjectGrades[subject.subject_id] = {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          teacher_name: teacher.user.full_name,
          term_grade: 0,
          letter_grade: null,
          exam_scores: [],
          continuous_assessment: []
        };
      }
      
      subjectGrades[subject.subject_id].term_grade += parseFloat(grade.score);
      if (grade.letter_grade) {
        subjectGrades[subject.subject_id].letter_grade = grade.letter_grade;
      }
    });

    // Calculate averages
    Object.values(subjectGrades).forEach(sg => {
      sg.term_grade = Math.round(sg.term_grade);
    });

    res.json({ grades: Object.values(subjectGrades) });
  } catch (error) {
    console.error('Error in getCurrentGrades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

exports.getGradeDistribution = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: parseInt(childId)
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

    // Group by subject
    const distribution = {};
    grades.forEach(grade => {
      const subject = grade.submission.assignment.class_subject.subject;
      
      if (!distribution[subject.subject_name]) {
        distribution[subject.subject_name] = { score: 0, count: 0 };
      }
      distribution[subject.subject_name].score += parseFloat(grade.score);
      distribution[subject.subject_name].count++;
    });

    const distributionArray = Object.entries(distribution).map(([subject, data]) => ({
      subject,
      score: Math.round(data.score / data.count),
      letter: data.score / data.count >= 90 ? 'A' : data.score / data.count >= 80 ? 'B+' : data.score / data.count >= 70 ? 'B' : 'C'
    }));

    res.json({
      distribution: distributionArray,
      chart_data: {
        labels: distributionArray.map(d => d.subject),
        data: distributionArray.map(d => d.score)
      }
    });
  } catch (error) {
    console.error('Error in getGradeDistribution:', error);
    res.status(500).json({ error: 'Failed to fetch grade distribution' });
  }
};

exports.getSubjectPerformance = async (req, res) => {
  try {
    const { childId, subjectId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const classSubject = await prisma.classSubject.findFirst({
      where: {
        subject_id: parseInt(subjectId),
        class_id: studentParent.student.current_class_id
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject_id: classSubject.class_subject_id
          },
          student_id: parseInt(childId)
        }
      }
    });

    const currentGrade = grades.length > 0 
      ? grades.reduce((sum, g) => sum + parseFloat(g.score), 0) / grades.length 
      : 0;

    // Mock class average and rank
    const classAverage = currentGrade - 5;
    const rankInClass = Math.floor(Math.random() * 10) + 1;
    const totalStudents = 40;

    res.json({
      subject: {
        subject_id: classSubject.subject.subject_id,
        subject_name: classSubject.subject.subject_name,
        subject_code: classSubject.subject.subject_code,
        teacher_name: classSubject.teacher.user.full_name
      },
      current_grade: Math.round(currentGrade),
      letter_grade: currentGrade >= 90 ? 'A' : currentGrade >= 80 ? 'B+' : currentGrade >= 70 ? 'B' : 'C',
      class_average: Math.round(classAverage),
      rank_in_class: rankInClass,
      total_students: totalStudents,
      trend: 'IMPROVING',
      performance_history: [
        { month: 'Aug', score: 72 },
        { month: 'Sep', score: 78 },
        { month: 'Oct', score: 85 }
      ]
    });
  } catch (error) {
    console.error('Error in getSubjectPerformance:', error);
    res.status(500).json({ error: 'Failed to fetch subject performance' });
  }
};

exports.getTermReports = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock term report data
    const reports = [
      {
        term: term || '2025/2026 - Semester 1',
        gpa: 3.2,
        average_grade: 82,
        subjects: [
          { subject: 'Mathematics', grade: 85, letter: 'B+' },
          { subject: 'English', grade: 92, letter: 'A-' },
          { subject: 'Physics', grade: 78, letter: 'B' }
        ],
        class_rank: 5,
        total_students: 40,
        attendance_rate: 88,
        conduct_grade: 'Good',
        pdf_url: `/reports/term-report-child${childId}.pdf`
      }
    ];

    res.json({ reports });
  } catch (error) {
    console.error('Error in getTermReports:', error);
    res.status(500).json({ error: 'Failed to fetch term reports' });
  }
};

exports.getGradeHistory = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock historical data
    const history = [
      {
        academic_year: '2024/2025',
        terms: [
          { term: 'Semester 1', gpa: 3.0, average_grade: 80 },
          { term: 'Semester 2', gpa: 3.1, average_grade: 81 }
        ]
      },
      {
        academic_year: '2025/2026',
        terms: [
          { term: 'Semester 1', gpa: 3.2, average_grade: 82 }
        ]
      }
    ];

    res.json({ history });
  } catch (error) {
    console.error('Error in getGradeHistory:', error);
    res.status(500).json({ error: 'Failed to fetch grade history' });
  }
};

exports.getClassComparison = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock comparison data
    const comparison = [
      { subject: 'Mathematics', child_score: 85, class_average: 78, difference: 7, percentile: 75 },
      { subject: 'English', child_score: 92, class_average: 85, difference: 7, percentile: 85 },
      { subject: 'Physics', child_score: 78, class_average: 75, difference: 3, percentile: 60 },
      { subject: 'Chemistry', child_score: 88, class_average: 82, difference: 6, percentile: 70 }
    ];

    res.json({ comparison });
  } catch (error) {
    console.error('Error in getClassComparison:', error);
    res.status(500).json({ error: 'Failed to fetch class comparison' });
  }
};

exports.getSubjectRanks = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock rank data
    const ranks = [
      { subject: 'Mathematics', rank: 5, total_students: 40, percentile: 87.5 },
      { subject: 'English', rank: 3, total_students: 40, percentile: 92.5 },
      { subject: 'Physics', rank: 12, total_students: 40, percentile: 70 },
      { subject: 'Chemistry', rank: 8, total_students: 40, percentile: 80 }
    ];

    res.json({ ranks });
  } catch (error) {
    console.error('Error in getSubjectRanks:', error);
    res.status(500).json({ error: 'Failed to fetch subject ranks' });
  }
};

exports.getProgressChart = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock chart data
    const chart_data = {
      labels: ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025'],
      datasets: [
        {
          label: 'Average Grade',
          data: [72, 78, 75, 80, 82, 85],
          color: '#10b981'
        }
      ]
    };

    res.json({ chart_data });
  } catch (error) {
    console.error('Error in getProgressChart:', error);
    res.status(500).json({ error: 'Failed to fetch progress chart' });
  }
};

// ============================================
// 3. VIEW CHILD'S ATTENDANCE (READ-ONLY)
// ============================================

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: parseInt(childId),
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      }
    });

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
    const absentDays = attendanceRecords.filter(ar => ar.status === 'ABSENT').length;
    const lateDays = attendanceRecords.filter(ar => ar.status === 'LATE').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    res.json({
      summary: {
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        attendance_rate: Math.round(attendanceRate),
        term: term || '2025/2026 - Semester 1'
      }
    });
  } catch (error) {
    console.error('Error in getAttendanceSummary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
};

exports.getDailyAttendance = async (req, res) => {
  try {
    const { childId } = req.params;
    const { start_date, end_date, page = 1, limit = 30 } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause = {
      student_id: parseInt(childId)
    };

    if (start_date && end_date) {
      whereClause.date = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.attendanceRecord.count({ where: whereClause });

    res.json({
      attendance: attendanceRecords.map(ar => ({
        attendance_id: ar.record_id,
        date: ar.date.toISOString().split('T')[0],
        status: ar.status,
        remarks: ar.remarks || '',
        class_name: studentParent.student.current_class?.class_name || 'Not assigned'
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getDailyAttendance:', error);
    res.status(500).json({ error: 'Failed to fetch daily attendance' });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { childId } = req.params;
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: parseInt(childId),
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Create calendar view
    const calendar = [];
    const daysInMonth = endDate.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const record = attendanceRecords.find(ar => 
        ar.date.toDateString() === date.toDateString()
      );
      
      calendar.push({
        day,
        date: date.toISOString().split('T')[0],
        status: record ? record.status : 'NOT_RECORDED',
        remarks: record?.remarks || ''
      });
    }

    const present = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
    const absent = attendanceRecords.filter(ar => ar.status === 'ABSENT').length;
    const late = attendanceRecords.filter(ar => ar.status === 'LATE').length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      month: `${year}-${month.toString().padStart(2, '0')}`,
      calendar,
      summary: {
        present,
        absent,
        late,
        total,
        percentage
      }
    });
  } catch (error) {
    console.error('Error in getMonthlyAttendance:', error);
    res.status(500).json({ error: 'Failed to fetch monthly attendance' });
  }
};

exports.getAttendanceTrends = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock trend data
    const trends = {
      monthly_data: [
        { month: '2025-08', present: 20, absent: 1, late: 0, percentage: 95 },
        { month: '2025-09', present: 18, absent: 2, late: 1, percentage: 86 },
        { month: '2025-10', present: 15, absent: 2, late: 1, percentage: 83 }
      ],
      pattern_analysis: {
        most_absent_day: 'Monday',
        most_late_day: 'Wednesday',
        improvement_needed: true
      }
    };

    res.json({ trends });
  } catch (error) {
    console.error('Error in getAttendanceTrends:', error);
    res.status(500).json({ error: 'Failed to fetch attendance trends' });
  }
};

exports.getAbsenceReasons = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const absences = await prisma.attendanceRecord.findMany({
      where: {
        student_id: parseInt(childId),
        status: 'ABSENT'
      },
      orderBy: { date: 'desc' }
    });

    res.json({
      absences: absences.map(absence => ({
        date: absence.date.toISOString().split('T')[0],
        status: absence.status,
        reason: absence.remarks || 'Not provided',
        reported_by: 'Parent'
      }))
    });
  } catch (error) {
    console.error('Error in getAbsenceReasons:', error);
    res.status(500).json({ error: 'Failed to fetch absence reasons' });
  }
};

exports.getAttendanceAlerts = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        student_id: parseInt(childId),
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      }
    });

    const presentDays = attendanceRecords.filter(ar => ar.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? (presentDays / attendanceRecords.length) * 100 
      : 0;

    const alerts = [];
    if (attendanceRate < 80) {
      alerts.push({
        type: 'LOW_ATTENDANCE',
        threshold: 80,
        current_rate: Math.round(attendanceRate),
        message: 'Attendance has dropped below 80% threshold',
        severity: attendanceRate < 70 ? 'HIGH' : 'MEDIUM'
      });
    }

    res.json({ alerts });
  } catch (error) {
    console.error('Error in getAttendanceAlerts:', error);
    res.status(500).json({ error: 'Failed to fetch attendance alerts' });
  }
};

exports.exportAttendanceReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { format = 'pdf', term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock file download response
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-child${childId}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    
    // In a real implementation, generate the actual file
    res.send('Mock attendance report file');
  } catch (error) {
    console.error('Error in exportAttendanceReport:', error);
    res.status(500).json({ error: 'Failed to export attendance report' });
  }
};

// ============================================
// 4. VIEW CHILD'S CONDUCT (READ-ONLY)
// ============================================

exports.getConductSummary = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock conduct data
    res.json({
      conduct: {
        current_grade: 'Good',
        rating: 3.5,
        scale: 5,
        term: '2025/2026 - Semester 1'
      }
    });
  } catch (error) {
    console.error('Error in getConductSummary:', error);
    res.status(500).json({ error: 'Failed to fetch conduct summary' });
  }
};

exports.getConductHistory = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock historical data
    const history = [
      {
        academic_year: '2024/2025',
        terms: [
          { term: 'Semester 1', grade: 'Good', rating: 3.5 },
          { term: 'Semester 2', grade: 'Excellent', rating: 4.2 }
        ]
      },
      {
        academic_year: '2025/2026',
        terms: [
          { term: 'Semester 1', grade: 'Good', rating: 3.8 }
        ]
      }
    ];

    res.json({ history });
  } catch (error) {
    console.error('Error in getConductHistory:', error);
    res.status(500).json({ error: 'Failed to fetch conduct history' });
  }
};

exports.getConductComments = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock comments data
    const comments = [
      {
        teacher_name: 'Alicia Gomez',
        subject: 'Mathematics',
        comment: 'Excellent participation, respectful',
        date: '2025-10-01',
        term: '2025/2026 - Semester 1'
      },
      {
        teacher_name: 'Mr. Johnson',
        subject: 'English',
        comment: 'Needs to improve focus in class',
        date: '2025-10-05',
        term: '2025/2026 - Semester 1'
      }
    ];

    res.json({ comments });
  } catch (error) {
    console.error('Error in getConductComments:', error);
    res.status(500).json({ error: 'Failed to fetch conduct comments' });
  }
};

exports.getConductIncidents = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock incidents data
    const incidents = [
      {
        incident_id: 1,
        date: '2025-09-15',
        type: 'Minor',
        description: 'Late to class',
        resolution: 'Warning issued',
        status: 'RESOLVED',
        reported_by: 'Teacher'
      }
    ];

    res.json({ incidents });
  } catch (error) {
    console.error('Error in getConductIncidents:', error);
    res.status(500).json({ error: 'Failed to fetch conduct incidents' });
  }
};

exports.getConductTrends = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock trend data
    const trends = {
      chart_data: {
        labels: ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
        data: [3.2, 3.5, 3.8, 3.7, 4.0]
      },
      trend: 'IMPROVING'
    };

    res.json({ trends });
  } catch (error) {
    console.error('Error in getConductTrends:', error);
    res.status(500).json({ error: 'Failed to fetch conduct trends' });
  }
};

// ============================================
// 5. VIEW CHILD'S TRANSCRIPT (READ-ONLY)
// ============================================

exports.getOfficialTranscript = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock transcript data
    const transcript = {
      student: {
        student_id: studentParent.student.student_id,
        full_name: req.user.full_name,
        student_number: studentParent.student.student_number,
        class_name: studentParent.student.current_class?.class_name || 'Not assigned'
      },
      term: term || '2025/2026 - Semester 1',
      gpa: 3.2,
      subjects: [
        { subject: 'Mathematics', grade: 85, letter_grade: 'B+', credits: 4 },
        { subject: 'English', grade: 92, letter_grade: 'A-', credits: 4 },
        { subject: 'Physics', grade: 78, letter_grade: 'B', credits: 4 },
        { subject: 'Chemistry', grade: 88, letter_grade: 'B+', credits: 4 }
      ],
      total_credits: 32,
      cumulative_gpa: 3.15
    };

    res.json({ transcript });
  } catch (error) {
    console.error('Error in getOfficialTranscript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
};

exports.getCumulativeTranscript = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock cumulative transcript
    const transcript = {
      student: {
        student_id: studentParent.student.student_id,
        full_name: req.user.full_name,
        student_number: studentParent.student.student_number
      },
      academic_history: [
        {
          grade_level: 'Grade 9',
          academic_year: '2023/2024',
          gpa: 3.0,
          subjects: [
            { subject: 'Mathematics', grade: 80, letter_grade: 'B+', credits: 4 },
            { subject: 'English', grade: 85, letter_grade: 'A-', credits: 4 }
          ]
        },
        {
          grade_level: 'Grade 10',
          academic_year: '2024/2025',
          gpa: 3.1,
          subjects: [
            { subject: 'Mathematics', grade: 82, letter_grade: 'B+', credits: 4 },
            { subject: 'English', grade: 88, letter_grade: 'A-', credits: 4 }
          ]
        }
      ],
      cumulative_gpa: 3.05,
      total_credits: 96
    };

    res.json({ transcript });
  } catch (error) {
    console.error('Error in getCumulativeTranscript:', error);
    res.status(500).json({ error: 'Failed to fetch cumulative transcript' });
  }
};

exports.downloadTranscript = async (req, res) => {
  try {
    const { childId } = req.params;
    const { type = 'current' } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transcript-${type}-child${childId}.pdf`);
    res.send('Mock transcript PDF file');
  } catch (error) {
    console.error('Error in downloadTranscript:', error);
    res.status(500).json({ error: 'Failed to download transcript' });
  }
};

exports.printTranscript = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock print URL
    res.json({
      print_url: `/transcripts/print/student-${childId}-${Date.now()}.pdf`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error in printTranscript:', error);
    res.status(500).json({ error: 'Failed to generate print transcript' });
  }
};

exports.verifyTranscript = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock verification data
    res.json({
      verification: {
        transcript_id: `TR-2025-${childId}`,
        qr_code: 'data:image/png;base64,mock_qr_code_data',
        unique_id: `UUID-${Date.now()}`,
        verified: true,
        issued_date: new Date().toISOString().split('T')[0],
        issuing_authority: 'Smart Valley Academy'
      }
    });
  } catch (error) {
    console.error('Error in verifyTranscript:', error);
    res.status(500).json({ error: 'Failed to verify transcript' });
  }
};

// ============================================
// 6. VIEW CHILD'S ASSIGNMENTS & SUBMISSIONS (READ-ONLY)
// ============================================

exports.getCurrentAssignments = async (req, res) => {
  try {
    const { childId } = req.params;
    const { status, subject_id } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause = {
      class_subject: {
        class_id: studentParent.student.current_class_id
      }
    };

    if (subject_id) {
      whereClause.class_subject.subject_id = parseInt(subject_id);
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        class_subject: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: true
              }
            }
          }
        },
        submissions: {
          where: { student_id: parseInt(childId) },
          include: {
            grade: true
          }
        }
      },
      orderBy: { due_date: 'asc' }
    });

    let filteredAssignments = assignments;
    if (status) {
      const now = new Date();
      filteredAssignments = assignments.filter(a => {
        const hasSubmission = a.submissions.length > 0;
        const isOverdue = new Date(a.due_date) < now;
        
        if (status === 'PENDING') return !hasSubmission && !isOverdue;
        if (status === 'SUBMITTED') return hasSubmission && !a.submissions[0].grade;
        if (status === 'GRADED') return hasSubmission && a.submissions[0].grade;
        if (status === 'OVERDUE') return !hasSubmission && isOverdue;
        return true;
      });
    }

    res.json({
      assignments: filteredAssignments.map(a => {
        const submission = a.submissions[0];
        const now = new Date();
        const dueDate = new Date(a.due_date);
        
        return {
          assignment_id: a.assignment_id,
          title: a.title,
          subject: a.class_subject.subject.subject_name,
          subject_code: a.class_subject.subject.subject_code,
          teacher_name: a.class_subject.teacher.user.full_name,
          due_date: a.due_date,
          max_score: parseFloat(a.max_score),
          status: submission 
            ? (submission.grade ? 'GRADED' : 'SUBMITTED')
            : (dueDate < now ? 'OVERDUE' : 'PENDING'),
          submission: submission ? {
            submitted_at: submission.submitted_at,
            is_late: submission.is_late,
            score: submission.grade ? parseFloat(submission.grade.score) : null,
            grade: submission.grade?.letter_grade || null,
            feedback: submission.grade?.feedback || null
          } : null
        };
      })
    });
  } catch (error) {
    console.error('Error in getCurrentAssignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

exports.getAssignmentDeadlines = async (req, res) => {
  try {
    const { childId } = req.params;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const assignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: studentParent.student.current_class_id
        },
        due_date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        class_subject: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { due_date: 'asc' }
    });

    // Group by date
    const deadlines = {};
    assignments.forEach(a => {
      const dateKey = a.due_date.toISOString().split('T')[0];
      if (!deadlines[dateKey]) {
        deadlines[dateKey] = [];
      }
      deadlines[dateKey].push({
        assignment_id: a.assignment_id,
        title: a.title,
        subject: a.class_subject.subject.subject_name,
        due_time: a.due_date.toTimeString().slice(0, 5)
      });
    });

    res.json({
      deadlines: Object.entries(deadlines).map(([date, assignments]) => ({
        date,
        assignments
      }))
    });
  } catch (error) {
    console.error('Error in getAssignmentDeadlines:', error);
    res.status(500).json({ error: 'Failed to fetch assignment deadlines' });
  }
};

exports.getSubmittedAssignments = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        student_id: parseInt(childId)
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
      orderBy: { submitted_at: 'desc' }
    });

    res.json({
      submissions: submissions.map(s => ({
        assignment_id: s.assignment_id,
        title: s.assignment.title,
        subject: s.assignment.class_subject.subject.subject_name,
        submitted_at: s.submitted_at,
        is_late: s.is_late,
        score: s.grade ? parseFloat(s.grade.score) : null,
        grade: s.grade?.letter_grade || null,
        feedback: s.grade?.feedback || null,
        file_url: s.file_url
      }))
    });
  } catch (error) {
    console.error('Error in getSubmittedAssignments:', error);
    res.status(500).json({ error: 'Failed to fetch submitted assignments' });
  }
};

exports.getAssignmentScores = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          student_id: parseInt(childId)
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

    res.json({
      scores: grades.map(g => ({
        assignment_id: g.submission.assignment_id,
        title: g.submission.assignment.title,
        subject: g.submission.assignment.class_subject.subject.subject_name,
        score: parseFloat(g.score),
        max_score: parseFloat(g.submission.assignment.max_score),
        percentage: Math.round((parseFloat(g.score) / parseFloat(g.submission.assignment.max_score)) * 100),
        grade: g.letter_grade,
        graded_at: g.graded_at
      }))
    });
  } catch (error) {
    console.error('Error in getAssignmentScores:', error);
    res.status(500).json({ error: 'Failed to fetch assignment scores' });
  }
};

exports.getMissingAssignments = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        class_subject: {
          class_id: studentParent.student.current_class_id
        }
      },
      include: {
        submissions: {
          where: { student_id: parseInt(childId) }
        }
      }
    });

    const now = new Date();
    const missing = assignments
      .filter(a => a.submissions.length === 0 && new Date(a.due_date) < now)
      .map(a => {
        const dueDate = new Date(a.due_date);
        const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
        
        return {
          assignment_id: a.assignment_id,
          title: a.title,
          subject: a.class_subject.subject.subject_name,
          due_date: a.due_date,
          days_overdue: daysOverdue,
          status: 'OVERDUE'
        };
      });

    res.json({ missing });
  } catch (error) {
    console.error('Error in getMissingAssignments:', error);
    res.status(500).json({ error: 'Failed to fetch missing assignments' });
  }
};

exports.downloadAssignmentFiles = async (req, res) => {
  try {
    const { childId, assignmentId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { assignment_id: parseInt(assignmentId) },
      include: {
        class_subject: {
          include: {
            class: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=assignment-${assignmentId}-files.pdf`);
    res.send('Mock assignment files');
  } catch (error) {
    console.error('Error in downloadAssignmentFiles:', error);
    res.status(500).json({ error: 'Failed to download assignment files' });
  }
};

// ============================================
// 7. VIEW CHILD'S EXAM RESULTS (READ-ONLY)
// ============================================

exports.getExamSchedule = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const exams = await prisma.exam.findMany({
      where: {
        class_subject: {
          class_id: studentParent.student.current_class_id
        },
        exam_date: {
          gte: new Date()
        },
        status: 'APPROVED'
      },
      include: {
        class_subject: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { exam_date: 'asc' }
    });

    res.json({
      exams: exams.map(e => ({
        exam_id: e.exam_id,
        subject: e.class_subject.subject.subject_name,
        exam_type: e.exam_type,
        date: e.exam_date.toISOString().split('T')[0],
        time: `${e.exam_date.toTimeString().slice(0, 5)}-${new Date(e.exam_date.getTime() + e.duration_minutes * 60000).toTimeString().slice(0, 5)}`,
        venue: 'Room 101',
        duration_minutes: e.duration_minutes
      }))
    });
  } catch (error) {
    console.error('Error in getExamSchedule:', error);
    res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
};

exports.getExamResults = async (req, res) => {
  try {
    const { childId } = req.params;
    const { exam_type, term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause = {
      student_id: parseInt(childId)
    };

    if (exam_type) {
      whereClause.exam = {
        exam_type: exam_type
      };
    }

    const examResults = await prisma.examResult.findMany({
      where: whereClause,
      include: {
        exam: {
          include: {
            class_subject: {
              include: {
                subject: true
              }
            }
          }
        }
      },
      orderBy: { graded_at: 'desc' }
    });

    res.json({
      results: examResults.map(er => ({
        exam_id: er.exam_id,
        subject: er.exam.class_subject.subject.subject_name,
        exam_type: er.exam.exam_type,
        score: parseFloat(er.score),
        max_score: parseFloat(er.exam.total_marks),
        percentage: Math.round((parseFloat(er.score) / parseFloat(er.exam.total_marks)) * 100),
        letter_grade: er.letter_grade,
        class_average: parseFloat(er.score) - 5, // Mock
        remarks: er.remarks,
        exam_date: er.exam.exam_date.toISOString().split('T')[0]
      }))
    });
  } catch (error) {
    console.error('Error in getExamResults:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
};

exports.getNationalExamResults = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock national exam results
    const national_exams = [
      {
        exam_type: 'EGSECE',
        grade_level: 'Grade 10',
        year: '2024',
        subjects: [
          { subject: 'Mathematics', score: 85, grade: 'A' },
          { subject: 'English', score: 90, grade: 'A' },
          { subject: 'Physics', score: 78, grade: 'B' },
          { subject: 'Chemistry', score: 82, grade: 'A' }
        ],
        overall_grade: 'A',
        division: 1
      }
    ];

    res.json({ national_exams });
  } catch (error) {
    console.error('Error in getNationalExamResults:', error);
    res.status(500).json({ error: 'Failed to fetch national exam results' });
  }
};

exports.getExamPerformanceAnalysis = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock analysis data
    const analysis = {
      chart_data: {
        labels: ['Mathematics', 'English', 'Physics', 'Chemistry'],
        child_scores: [82, 90, 75, 88],
        class_averages: [78, 85, 72, 80]
      },
      summary: {
        above_average_subjects: 3,
        below_average_subjects: 1,
        overall_performance: 'ABOVE_AVERAGE'
      }
    };

    res.json({ analysis });
  } catch (error) {
    console.error('Error in getExamPerformanceAnalysis:', error);
    res.status(500).json({ error: 'Failed to fetch exam performance analysis' });
  }
};

exports.downloadExamReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=exam-report-child${childId}.pdf`);
    res.send('Mock exam report PDF');
  } catch (error) {
    console.error('Error in downloadExamReport:', error);
    res.status(500).json({ error: 'Failed to download exam report' });
  }
};

// ============================================
// 8. COMMUNICATION WITH TEACHERS (WRITE)
// ============================================

exports.sendMessageToTeacher = async (req, res) => {
  try {
    const { receiver_id, student_id, subject, content, attachment_url } = req.body;
    const sender_id = req.user.user_id;

    // Verify parent has access to this student
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: req.user.parent_id,
        student_id: parseInt(student_id)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: parseInt(receiver_id),
        content,
        attachment: attachment_url
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in sendMessageToTeacher:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.sendMessageToVPAcademic = async (req, res) => {
  try {
    const { subject, content, student_id } = req.body;
    const sender_id = req.user.user_id;

    // Find VP Academic user
    const vpAcademic = await prisma.vPAcademic.findFirst();
    if (!vpAcademic) {
      return res.status(404).json({ error: 'VP Academic not found' });
    }

    // Verify parent has access to this student
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: req.user.parent_id,
        student_id: parseInt(student_id)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: vpAcademic.user_id,
        content: `${subject}: ${content}`
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in sendMessageToVPAcademic:', error);
    res.status(500).json({ error: 'Failed to send message to VP Academic' });
  }
};

exports.getMessageHistory = async (req, res) => {
  try {
    const { thread_id, student_id } = req.query;
    const sender_id = req.user.user_id;

    const whereClause = {
      OR: [
        { sender_id },
        { receiver_id: sender_id }
      ]
    };

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        receiver: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Group by thread (simplified grouping)
    const threads = {};
    messages.forEach(msg => {
      const otherUser = msg.sender_id === sender_id ? msg.receiver : msg.sender;
      const threadKey = `${Math.min(msg.sender_id, msg.receiver_id)}-${Math.max(msg.sender_id, msg.receiver_id)}`;
      
      if (!threads[threadKey]) {
        threads[threadKey] = {
          thread_id: threadKey,
          recipient_name: otherUser.full_name,
          recipient_role: otherUser.role,
          last_message: msg.content,
          unread_count: msg.receiver_id === sender_id && !msg.is_read ? 1 : 0,
          last_updated: msg.timestamp,
          messages: []
        };
      }
      
      threads[threadKey].messages.push({
        message_id: msg.message_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender.full_name,
        content: msg.content,
        timestamp: msg.timestamp,
        is_read: msg.is_read
      });
    });

    res.json({ threads: Object.values(threads) });
  } catch (error) {
    console.error('Error in getMessageHistory:', error);
    res.status(500).json({ error: 'Failed to fetch message history' });
  }
};

exports.getMessageThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const sender_id = req.user.user_id;

    const [id1, id2] = threadId.split('-').map(Number);
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { AND: [{ sender_id: id1 }, { receiver_id: id2 }] },
          { AND: [{ sender_id: id2 }, { receiver_id: id1 }] }
        ]
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        receiver: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    const participants = [
      { user_id: id1, name: messages[0]?.sender.full_name || 'Unknown', role: messages[0]?.sender.role || 'UNKNOWN' },
      { user_id: id2, name: messages[0]?.receiver.full_name || 'Unknown', role: messages[0]?.receiver.role || 'UNKNOWN' }
    ];

    res.json({
      thread_id: threadId,
      participants,
      messages: messages.map(m => ({
        message_id: m.message_id,
        sender_id: m.sender_id,
        sender_name: m.sender.full_name,
        content: m.content,
        timestamp: m.timestamp,
        is_read: m.is_read,
        attachment: m.attachment
      }))
    });
  } catch (error) {
    console.error('Error in getMessageThread:', error);
    res.status(500).json({ error: 'Failed to fetch message thread' });
  }
};

exports.replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, attachment_url } = req.body;
    const sender_id = req.user.user_id;

    const originalMessage = await prisma.message.findUnique({
      where: { message_id: parseInt(messageId) }
    });

    if (!originalMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const receiver_id = originalMessage.sender_id === sender_id ? originalMessage.receiver_id : originalMessage.sender_id;

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id,
        content,
        attachment: attachment_url,
        parent_message_id: parseInt(messageId)
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in replyToMessage:', error);
    res.status(500).json({ error: 'Failed to reply to message' });
  }
};

exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const sender_id = req.user.user_id;

    const message = await prisma.message.update({
      where: { message_id: parseInt(messageId) },
      data: { is_read: true }
    });

    res.json({
      message_id: message.message_id,
      is_read: message.is_read,
      read_at: new Date()
    });
  } catch (error) {
    console.error('Error in markMessageAsRead:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

exports.markAllMessagesAsRead = async (req, res) => {
  try {
    const sender_id = req.user.user_id;

    const result = await prisma.message.updateMany({
      where: {
        receiver_id: sender_id,
        is_read: false
      },
      data: { is_read: true }
    });

    res.json({
      updated_count: result.count,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in markAllMessagesAsRead:', error);
    res.status(500).json({ error: 'Failed to mark all messages as read' });
  }
};

// ============================================
// 9. COMMUNICATION WITH SCHOOL ADMINISTRATION (WRITE)
// ============================================

exports.sendMessageToPrincipal = async (req, res) => {
  try {
    const { subject, content, student_id } = req.body;
    const sender_id = req.user.user_id;

    // Find Principal user
    const principal = await prisma.principal.findFirst();
    if (!principal) {
      return res.status(404).json({ error: 'Principal not found' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: principal.user_id,
        content: `${subject}: ${content}`
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in sendMessageToPrincipal:', error);
    res.status(500).json({ error: 'Failed to send message to Principal' });
  }
};

exports.sendMessageToVPAdmin = async (req, res) => {
  try {
    const { subject, content, student_id } = req.body;
    const sender_id = req.user.user_id;

    // Find VP Admin user
    const vpAdmin = await prisma.vPAdministration.findFirst();
    if (!vpAdmin) {
      return res.status(404).json({ error: 'VP Administration not found' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: vpAdmin.user_id,
        content: `${subject}: ${content}`
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in sendMessageToVPAdmin:', error);
    res.status(500).json({ error: 'Failed to send message to VP Admin' });
  }
};

exports.submitGrievance = async (req, res) => {
  try {
    const { category, subject, description, student_id, priority } = req.body;
    const sender_id = req.user.user_id;

    // Create grievance record (using Message table for simplicity)
    const grievance = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: 1, // Would be VP Academic or Admin
        content: `[GRIEVANCE - ${category}] ${subject}: ${description}`
      }
    });

    res.json({
      grievance_id: grievance.message_id,
      status: 'PENDING',
      reference_number: `GRV-2025-${grievance.message_id}`,
      submitted_at: grievance.timestamp
    });
  } catch (error) {
    console.error('Error in submitGrievance:', error);
    res.status(500).json({ error: 'Failed to submit grievance' });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { category, subject, description, student_id } = req.body;
    const sender_id = req.user.user_id;

    const feedback = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: 1,
        content: `[FEEDBACK - ${category}] ${subject}: ${description}`
      }
    });

    res.json({
      feedback_id: feedback.message_id,
      status: 'RECEIVED',
      submitted_at: feedback.timestamp
    });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

exports.trackGrievanceStatus = async (req, res) => {
  try {
    const sender_id = req.user.user_id;

    const grievances = await prisma.message.findMany({
      where: {
        sender_id,
        content: {
          contains: '[GRIEVANCE'
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      grievances: grievances.map(g => ({
        grievance_id: g.message_id,
        reference_number: `GRV-2025-${g.message_id}`,
        category: g.content.match(/\[GRIEVANCE - ([^\]]+)\]/)?.[1] || 'GENERAL',
        subject: g.content.split(']:')[1]?.split(':')[0] || 'General',
        status: g.is_read ? 'IN_PROGRESS' : 'PENDING',
        submitted_at: g.timestamp,
        updated_at: g.timestamp,
        response: g.is_read ? 'Your grievance is being reviewed.' : null
      }))
    });
  } catch (error) {
    console.error('Error in trackGrievanceStatus:', error);
    res.status(500).json({ error: 'Failed to track grievance status' });
  }
};

exports.getGrievanceDetails = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const sender_id = req.user.user_id;

    const grievance = await prisma.message.findFirst({
      where: {
        message_id: parseInt(grievanceId),
        sender_id
      }
    });

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    res.json({
      grievance: {
        grievance_id: grievance.message_id,
        reference_number: `GRV-2025-${grievance.message_id}`,
        category: grievance.content.match(/\[GRIEVANCE - ([^\]]+)\]/)?.[1] || 'GENERAL',
        subject: grievance.content.split(']:')[1]?.split(':')[0] || 'General',
        description: grievance.content.split(':').slice(2).join(':').trim(),
        status: grievance.is_read ? 'IN_PROGRESS' : 'PENDING',
        priority: 'HIGH',
        submitted_at: grievance.timestamp,
        responses: grievance.is_read ? [
          {
            responder: 'VP Academic',
            message: 'Your grievance is being reviewed...',
            timestamp: grievance.timestamp
          }
        ] : []
      }
    });
  } catch (error) {
    console.error('Error in getGrievanceDetails:', error);
    res.status(500).json({ error: 'Failed to fetch grievance details' });
  }
};

// ============================================
// 10. VIEW ANNOUNCEMENTS & NOTICES (READ-ONLY)
// ============================================

exports.getSchoolAnnouncements = async (req, res) => {
  try {
    const { target, limit = 20 } = req.query;

    const whereClause = {
      is_active: true
    };

    if (target && target !== 'ALL') {
      whereClause.OR = [
        { target_roles: 'ALL' },
        { target_roles: { contains: target } }
      ];
    } else {
      whereClause.OR = [
        { target_roles: 'ALL' },
        { target_roles: { contains: 'PARENT' } }
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      orderBy: { published_at: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      announcements: announcements.map(a => ({
        announcement_id: a.announcement_id,
        title: a.title,
        message: a.message,
        created_by: 'Principal',
        published_at: a.published_at,
        target_roles: a.target_roles.split(','),
        is_active: a.is_active
      }))
    });
  } catch (error) {
    console.error('Error in getSchoolAnnouncements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

exports.getParentSpecificAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        is_active: true,
        target_roles: { contains: 'PARENT' }
      },
      orderBy: { published_at: 'desc' }
    });

    res.json({
      announcements: announcements.map(a => ({
        announcement_id: a.announcement_id,
        title: a.title,
        message: a.message,
        published_at: a.published_at
      }))
    });
  } catch (error) {
    console.error('Error in getParentSpecificAnnouncements:', error);
    res.status(500).json({ error: 'Failed to fetch parent-specific announcements' });
  }
};

exports.getPTSAAnnouncements = async (req, res) => {
  try {
    const ptsaAnnouncements = await prisma.pTSAAnnouncement.findMany({
      where: {
        is_active: true
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    res.json({
      announcements: ptsaAnnouncements.map(a => ({
        announcement_id: a.ptsa_announcement_id,
        title: a.title,
        message: a.content,
        published_at: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error in getPTSAAnnouncements:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA announcements' });
  }
};

exports.getUrgentNotices = async (req, res) => {
  try {
    // Mock urgent notices
    const notices = [
      {
        notice_id: 1,
        title: 'School Closure Due to Weather',
        message: 'School will be closed tomorrow due to heavy rain...',
        type: 'URGENT',
        published_at: new Date().toISOString()
      }
    ];

    res.json({ notices });
  } catch (error) {
    console.error('Error in getUrgentNotices:', error);
    res.status(500).json({ error: 'Failed to fetch urgent notices' });
  }
};

exports.getEventCalendar = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    // Mock event data
    const events = [
      {
        event_id: 1,
        title: 'Sports Day',
        date: `${year}-${month.toString().padStart(2, '0')}-20`,
        time: '09:00-16:00',
        location: 'School Ground',
        description: 'Annual sports competition...'
      }
    ];

    res.json({ events });
  } catch (error) {
    console.error('Error in getEventCalendar:', error);
    res.status(500).json({ error: 'Failed to fetch event calendar' });
  }
};

// ============================================
// 11. CHILD'S PEER EVALUATION RESULTS (READ-ONLY)
// ============================================

exports.getPeerEvaluationSummary = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock peer evaluation data
    const evaluations = [
      {
        evaluation_id: 1,
        title: 'Group Project Feedback',
        subject: 'Mathematics',
        due_date: '2025-10-15',
        average_rating: 9.3,
        total_evaluators: 3,
        max_rating: 10,
        status: 'RELEASED'
      }
    ];

    res.json({ evaluations });
  } catch (error) {
    console.error('Error in getPeerEvaluationSummary:', error);
    res.status(500).json({ error: 'Failed to fetch peer evaluation summary' });
  }
};

exports.getPeerEvaluationComments = async (req, res) => {
  try {
    const { childId, evaluationId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock comments
    const comments = [
      {
        evaluator_id: 1,
        anonymized_name: 'Peer 1',
        score: 9,
        comments: 'Strong leadership and clear communication.'
      },
      {
        evaluator_id: 3,
        anonymized_name: 'Peer 2',
        score: 9,
        comments: 'Very helpful in group tasks.'
      }
    ];

    res.json({ comments });
  } catch (error) {
    console.error('Error in getPeerEvaluationComments:', error);
    res.status(500).json({ error: 'Failed to fetch peer evaluation comments' });
  }
};

exports.getPeerRating = async (req, res) => {
  try {
    const { childId, evaluationId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock rating data
    const rating = {
      average_score: 9.3,
      max_score: 10,
      total_evaluations: 3,
      rating_breakdown: {
        leadership: 9.5,
        communication: 9.0,
        teamwork: 9.5,
        participation: 9.0
      }
    };

    res.json({ rating });
  } catch (error) {
    console.error('Error in getPeerRating:', error);
    res.status(500).json({ error: 'Failed to fetch peer rating' });
  }
};

exports.getPeerComparison = async (req, res) => {
  try {
    const { childId, evaluationId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock comparison data
    const comparison = {
      child_rating: 9.3,
      class_average: 8.5,
      difference: 0.8,
      percentile: 85,
      total_students: 40
    };

    res.json({ comparison });
  } catch (error) {
    console.error('Error in getPeerComparison:', error);
    res.status(500).json({ error: 'Failed to fetch peer comparison' });
  }
};

// ============================================
// 12. SCHOOL FEE & PAYMENT MANAGEMENT (MOCK / READ-ONLY)
// ============================================

exports.getFeeStructure = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock fee structure
    const fee_structure = [
      {
        fee_id: 1,
        name: 'Tuition Fee',
        amount: 15000,
        currency: 'ETB',
        term: '2025/2026 - Semester 1',
        description: 'Regular tuition fee'
      },
      {
        fee_id: 2,
        name: 'Lab Fee',
        amount: 2000,
        currency: 'ETB',
        term: '2025/2026 - Semester 1',
        description: 'Science laboratory fee'
      }
    ];

    const totalFees = fee_structure.reduce((sum, f) => sum + f.amount, 0);

    res.json({
      fee_structure,
      total_fees: totalFees,
      currency: 'ETB'
    });
  } catch (error) {
    console.error('Error in getFeeStructure:', error);
    res.status(500).json({ error: 'Failed to fetch fee structure' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await prisma.payment.findMany({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      payments: payments.map(p => ({
        payment_id: p.payment_id,
        amount: parseFloat(p.amount),
        currency: p.currency,
        status: p.status,
        payment_method: p.payment_method,
        transaction_id: p.transaction_id,
        receipt_url: p.receipt_url,
        created_at: p.created_at
      }))
    });
  } catch (error) {
    console.error('Error in getPaymentHistory:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

exports.getOutstandingBalance = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock balance calculation
    const balance = {
      total_fees: 17000,
      total_paid: 13000,
      outstanding_balance: 4000,
      currency: 'ETB',
      overdue_amount: 0,
      next_due_date: '2025-11-01'
    };

    res.json({ balance });
  } catch (error) {
    console.error('Error in getOutstandingBalance:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding balance' });
  }
};

exports.generateFeeReceipt = async (req, res) => {
  try {
    const { childId, paymentId } = req.params;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-payment${paymentId}.pdf`);
    res.send('Mock fee receipt PDF');
  } catch (error) {
    console.error('Error in generateFeeReceipt:', error);
    res.status(500).json({ error: 'Failed to generate fee receipt' });
  }
};

exports.requestFeeClarification = async (req, res) => {
  try {
    const { subject, content, student_id } = req.body;
    const sender_id = req.user.user_id;

    // Find VP Admin
    const vpAdmin = await prisma.vPAdministration.findFirst();
    if (!vpAdmin) {
      return res.status(404).json({ error: 'VP Administration not found' });
    }

    const message = await prisma.message.create({
      data: {
        sender_id,
        receiver_id: vpAdmin.user_id,
        content: `[FEE INQUIRY] ${subject}: ${content}`
      }
    });

    res.json({
      message_id: message.message_id,
      status: 'SENT',
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error in requestFeeClarification:', error);
    res.status(500).json({ error: 'Failed to request fee clarification' });
  }
};

// ============================================
// 13. PARENT PROFILE & SETTINGS
// ============================================

exports.getParentProfile = async (req, res) => {
  try {
    const parent = await prisma.parent.findUnique({
      where: { parent_id: req.user.parent_id },
      include: {
        user: true
      }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    res.json({
      profile: {
        user_id: parent.user_id,
        full_name: parent.user.full_name,
        email: parent.user.email,
        phone_number: parent.user.phone_number,
        address: parent.address,
        relationship: parent.relationship,
        preferred_language: parent.preferred_language || 'en',
        profile_picture_url: parent.user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Error in getParentProfile:', error);
    res.status(500).json({ error: 'Failed to fetch parent profile' });
  }
};

exports.updateParentProfile = async (req, res) => {
  try {
    const { full_name, phone_number, address, preferred_language } = req.body;

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: {
        full_name,
        phone_number
      }
    });

    await prisma.parent.update({
      where: { parent_id: req.user.parent_id },
      data: {
        address,
        preferred_language
      }
    });

    res.json({
      status: 'UPDATED',
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error in updateParentProfile:', error);
    res.status(500).json({ error: 'Failed to update parent profile' });
  }
};

exports.getNotificationPreferences = async (req, res) => {
  try {
    // Mock notification preferences
    const preferences = {
      email: {
        grades: true,
        attendance: true,
        conduct: true,
        assignments: true,
        announcements: true
      },
      sms: {
        grades: false,
        attendance: true,
        conduct: false,
        assignments: false,
        announcements: true
      },
      in_app: {
        grades: true,
        attendance: true,
        conduct: true,
        assignments: true,
        announcements: true
      }
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Error in getNotificationPreferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, in_app } = req.body;

    // In a real implementation, store these preferences in the database
    // For now, just return success
    res.json({
      status: 'UPDATED',
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // In a real implementation, verify current password and update
    // For now, just return success
    res.json({
      status: 'SUCCESS',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

exports.getAssociatedChildren = async (req, res) => {
  try {
    const parentId = req.user.parent_id;

    const studentParents = await prisma.studentParent.findMany({
      where: { parent_id: parentId },
      include: {
        student: {
          include: {
            current_class: true
          }
        }
      }
    });

    res.json({
      children: studentParents.map(sp => ({
        student_id: sp.student_id,
        full_name: sp.student.user?.full_name || 'Unknown',
        student_number: sp.student.student_number,
        class_name: sp.student.current_class?.class_name || 'Not assigned',
        relationship: sp.relationship,
        linked_at: sp.linked_at
      }))
    });
  } catch (error) {
    console.error('Error in getAssociatedChildren:', error);
    res.status(500).json({ error: 'Failed to fetch associated children' });
  }
};

exports.requestChildAssociation = async (req, res) => {
  try {
    const { student_number, relationship, reason } = req.body;

    // Find student by student number
    const student = await prisma.student.findFirst({
      where: { student_number }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create association request (using a message for simplicity)
    const message = await prisma.message.create({
      data: {
        sender_id: req.user.user_id,
        receiver_id: 1, // VP Academic
        content: `[CHILD ASSOCIATION REQUEST] Student: ${student_number}, Relationship: ${relationship}, Reason: ${reason}`
      }
    });

    res.json({
      request_id: message.message_id,
      status: 'PENDING_APPROVAL',
      submitted_at: message.timestamp
    });
  } catch (error) {
    console.error('Error in requestChildAssociation:', error);
    res.status(500).json({ error: 'Failed to request child association' });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const sessions = await prisma.userSession.findMany({
      where: { user_id: userId },
      orderBy: { login_time: 'desc' },
      take: 10
    });

    res.json({
      login_history: sessions.map(s => ({
        login_time: s.login_time,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        location: 'Addis Ababa, Ethiopia' // Mock location
      }))
    });
  } catch (error) {
    console.error('Error in getLoginHistory:', error);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
};

exports.requestAccountDeactivation = async (req, res) => {
  try {
    const { reason } = req.body;

    // Create deactivation request
    const message = await prisma.message.create({
      data: {
        sender_id: req.user.user_id,
        receiver_id: 1,
        content: `[ACCOUNT DEACTIVATION REQUEST] Reason: ${reason}`
      }
    });

    res.json({
      request_id: message.message_id,
      status: 'PENDING',
      submitted_at: message.timestamp
    });
  } catch (error) {
    console.error('Error in requestAccountDeactivation:', error);
    res.status(500).json({ error: 'Failed to request account deactivation' });
  }
};

// ============================================
// 14. PARENT-TEACHER CONFERENCE SCHEDULING
// ============================================

exports.getConferenceSchedule = async (req, res) => {
  try {
    // Mock conference schedule
    const conferences = [
      {
        conference_id: 1,
        title: 'Parent-Teacher Conference - Semester 1',
        date: '2025-10-25',
        time_slots: [
          { time: '09:00-09:30', available: true },
          { time: '09:30-10:00', available: false },
          { time: '10:00-10:30', available: true }
        ],
        location: 'Main Hall',
        teachers_available: ['Alicia Gomez', 'Mr. Johnson']
      }
    ];

    res.json({ conferences });
  } catch (error) {
    console.error('Error in getConferenceSchedule:', error);
    res.status(500).json({ error: 'Failed to fetch conference schedule' });
  }
};

exports.bookConferenceSlot = async (req, res) => {
  try {
    const { conference_id, time_slot, teacher_id, student_id } = req.body;

    // Verify parent has access to this student
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: req.user.parent_id,
        student_id: parseInt(student_id)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    // Create booking (using message for simplicity)
    const message = await prisma.message.create({
      data: {
        sender_id: req.user.user_id,
        receiver_id: parseInt(teacher_id),
        content: `[CONFERENCE BOOKING] Conference ID: ${conference_id}, Time: ${time_slot}, Student: ${student_id}`
      }
    });

    res.json({
      booking_id: message.message_id,
      status: 'CONFIRMED',
      conference_date: '2025-10-25',
      time_slot,
      teacher: 'Alicia Gomez',
      booked_at: message.timestamp
    });
  } catch (error) {
    console.error('Error in bookConferenceSlot:', error);
    res.status(500).json({ error: 'Failed to book conference slot' });
  }
};

exports.getConferenceHistory = async (req, res) => {
  try {
    // Mock conference history
    const history = [
      {
        booking_id: 5,
        conference_date: '2025-09-20',
        time_slot: '10:00-10:30',
        teacher: 'Alicia Gomez',
        student: 'Maya Patel',
        notes: 'Discussed academic progress in Mathematics',
        status: 'COMPLETED'
      }
    ];

    res.json({ history });
  } catch (error) {
    console.error('Error in getConferenceHistory:', error);
    res.status(500).json({ error: 'Failed to fetch conference history' });
  }
};

exports.cancelConferenceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Mock cancellation
    res.json({
      status: 'CANCELLED',
      cancelled_at: new Date()
    });
  } catch (error) {
    console.error('Error in cancelConferenceBooking:', error);
    res.status(500).json({ error: 'Failed to cancel conference booking' });
  }
};

exports.rescheduleConferenceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { new_time_slot, new_date } = req.body;

    // Mock rescheduling
    res.json({
      status: 'RESCHEDULED',
      new_date,
      new_time_slot,
      rescheduled_at: new Date()
    });
  } catch (error) {
    console.error('Error in rescheduleConferenceBooking:', error);
    res.status(500).json({ error: 'Failed to reschedule conference booking' });
  }
};

// ============================================
// 15. PTSA ENGAGEMENT (ADVISORY/PARTICIPATORY)
// ============================================

exports.getPTSADashboard = async (req, res) => {
  try {
    // Mock PTSA dashboard
    const dashboard = {
      upcoming_meetings: [
        {
          meeting_id: 1,
          title: 'PTSA Monthly Meeting',
          date: '2025-10-20',
          time: '18:00-20:00',
          location: 'School Auditorium'
        }
      ],
      recent_announcements: [],
      member_status: 'ACTIVE_MEMBER'
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Error in getPTSADashboard:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA dashboard' });
  }
};

exports.getPTSAMeetingSchedule = async (req, res) => {
  try {
    const meetings = await prisma.pTSAMeeting.findMany({
      where: {
        scheduled_date: {
          gte: new Date()
        }
      },
      orderBy: { scheduled_date: 'asc' }
    });

    res.json({
      meetings: meetings.map(m => ({
        meeting_id: m.ptsa_meeting_id,
        title: m.title,
        date: m.scheduled_date.toISOString().split('T')[0],
        time: `${m.scheduled_time.toTimeString().slice(0, 5)}`,
        location: m.location,
        agenda: m.description
      }))
    });
  } catch (error) {
    console.error('Error in getPTSAMeetingSchedule:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA meeting schedule' });
  }
};

exports.getPTSAMeetingMinutes = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.pTSAMeeting.findUnique({
      where: { ptsa_meeting_id: parseInt(meetingId) },
      include: {
        minutes: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({
      minutes: {
        meeting_id: meeting.ptsa_meeting_id,
        title: meeting.title,
        date: meeting.scheduled_date.toISOString().split('T')[0],
        content: meeting.minutes?.content || 'Minutes not yet available',
        action_items: meeting.minutes?.action_items || [],
        created_at: meeting.minutes?.created_at || null
      }
    });
  } catch (error) {
    console.error('Error in getPTSAMeetingMinutes:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA meeting minutes' });
  }
};

exports.submitPTSAFeedback = async (req, res) => {
  try {
    const { subject, content, category } = req.body;

    const feedback = await prisma.pTSAFeedback.create({
      data: {
        submitted_by: req.user.user_id,
        subject,
        content,
        category: category || 'GENERAL'
      }
    });

    res.json({
      feedback_id: feedback.ptsa_feedback_id,
      status: 'SUBMITTED',
      submitted_at: feedback.submitted_at
    });
  } catch (error) {
    console.error('Error in submitPTSAFeedback:', error);
    res.status(500).json({ error: 'Failed to submit PTSA feedback' });
  }
};

exports.getPTSAAnnouncementsRoute = async (req, res) => {
  try {
    const announcements = await prisma.pTSAAnnouncement.findMany({
      where: {
        is_active: true
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    res.json({
      announcements: announcements.map(a => ({
        announcement_id: a.ptsa_announcement_id,
        title: a.title,
        message: a.content,
        published_at: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error in getPTSAAnnouncementsRoute:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA announcements' });
  }
};

exports.getPTSAElectionInformation = async (req, res) => {
  try {
    // Mock election information
    const election = {
      election_id: 1,
      title: 'PTSA Executive Committee Election 2025',
      status: 'OPEN',
      closing_date: '2025-10-30',
      candidates: [
        {
          candidate_id: 1,
          name: 'John Doe',
          position: 'President',
          bio: 'Experienced parent volunteer...'
        }
      ],
      has_voted: false
    };

    res.json({ election });
  } catch (error) {
    console.error('Error in getPTSAElectionInformation:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA election information' });
  }
};

exports.submitPTSAElectionVote = async (req, res) => {
  try {
    const { electionId } = req.params;
    const { candidate_id, position } = req.body;

    // Mock vote recording
    res.json({
      status: 'VOTE_RECORDED',
      voted_at: new Date()
    });
  } catch (error) {
    console.error('Error in submitPTSAElectionVote:', error);
    res.status(500).json({ error: 'Failed to submit PTSA election vote' });
  }
};

// ============================================
// 16. MOBILE & ACCESSIBILITY
// ============================================

exports.getMobileSettings = async (req, res) => {
  try {
    // Mock mobile settings
    const settings = {
      push_notifications: {
        enabled: true,
        categories: ['grades', 'attendance', 'assignments']
      },
      offline_mode: {
        enabled: true,
        cache_size: '50MB'
      }
    };

    res.json({ settings });
  } catch (error) {
    console.error('Error in getMobileSettings:', error);
    res.status(500).json({ error: 'Failed to fetch mobile settings' });
  }
};

exports.updateMobileSettings = async (req, res) => {
  try {
    const { push_notifications, offline_mode } = req.body;

    // In a real implementation, store these settings
    res.json({
      status: 'UPDATED',
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error in updateMobileSettings:', error);
    res.status(500).json({ error: 'Failed to update mobile settings' });
  }
};

exports.getAccessibilitySettings = async (req, res) => {
  try {
    // Mock accessibility settings
    const settings = {
      high_contrast: false,
      screen_reader: false,
      font_size: 'medium',
      language: 'en'
    };

    res.json({ settings });
  } catch (error) {
    console.error('Error in getAccessibilitySettings:', error);
    res.status(500).json({ error: 'Failed to fetch accessibility settings' });
  }
};

exports.updateAccessibilitySettings = async (req, res) => {
  try {
    const { high_contrast, screen_reader, font_size, language } = req.body;

    // In a real implementation, store these settings
    res.json({
      status: 'UPDATED',
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error in updateAccessibilitySettings:', error);
    res.status(500).json({ error: 'Failed to update accessibility settings' });
  }
};

// ============================================
// 17. REPORTS & EXPORT
// ============================================

exports.generateAcademicReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term, include_charts, include_comments } = req.body;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create report record
    const report = await prisma.report.create({
      data: {
        generated_by: req.user.user_id,
        title: `Academic Report - Child ${childId}`,
        data: {
          type: 'ACADEMIC',
          child_id: childId,
          term,
          include_charts,
          include_comments
        }
      }
    });

    res.json({
      report_id: report.report_id,
      status: 'GENERATING',
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error in generateAcademicReport:', error);
    res.status(500).json({ error: 'Failed to generate academic report' });
  }
};

exports.generateAttendanceReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term, include_calendar } = req.body;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const report = await prisma.report.create({
      data: {
        generated_by: req.user.user_id,
        title: `Attendance Report - Child ${childId}`,
        data: {
          type: 'ATTENDANCE',
          child_id: childId,
          term,
          include_calendar
        }
      }
    });

    res.json({
      report_id: report.report_id,
      status: 'GENERATING',
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error in generateAttendanceReport:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
};

exports.generateConductReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term, include_comments } = req.body;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const report = await prisma.report.create({
      data: {
        generated_by: req.user.user_id,
        title: `Conduct Report - Child ${childId}`,
        data: {
          type: 'CONDUCT',
          child_id: childId,
          term,
          include_comments
        }
      }
    });

    res.json({
      report_id: report.report_id,
      status: 'GENERATING',
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error in generateConductReport:', error);
    res.status(500).json({ error: 'Failed to generate conduct report' });
  }
};

exports.generateCombinedReport = async (req, res) => {
  try {
    const { childId } = req.params;
    const { term, include_charts, include_comments } = req.body;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const report = await prisma.report.create({
      data: {
        generated_by: req.user.user_id,
        title: `Combined Report - Child ${childId}`,
        data: {
          type: 'COMBINED',
          child_id: childId,
          term,
          include_charts,
          include_comments
        }
      }
    });

    res.json({
      report_id: report.report_id,
      status: 'GENERATING',
      estimated_completion: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error in generateCombinedReport:', error);
    res.status(500).json({ error: 'Failed to generate combined report' });
  }
};

exports.exportDataToCSV = async (req, res) => {
  try {
    const { childId } = req.params;
    const { type = 'all', term } = req.query;
    const parentId = req.user.parent_id;

    // Verify access
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        parent_id: parentId,
        student_id: parseInt(childId)
      }
    });

    if (!studentParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock CSV data
    const csvData = 'Subject,Grade,Attendance\nMathematics,85,88%\nEnglish,92,90%';
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-child${childId}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error('Error in exportDataToCSV:', error);
    res.status(500).json({ error: 'Failed to export data to CSV' });
  }
};

exports.downloadGeneratedReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.report.findUnique({
      where: { report_id: parseInt(reportId) }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportId}.pdf`);
    res.send('Mock report PDF');
  } catch (error) {
    console.error('Error in downloadGeneratedReport:', error);
    res.status(500).json({ error: 'Failed to download generated report' });
  }
};

// ============================================
// 18. SUPPORT & HELP
// ============================================

exports.getUserGuide = async (req, res) => {
  try {
    // Mock user guide
    const guide = {
      sections: [
        {
          title: 'Getting Started',
          content: 'Welcome to the Parent Portal. This guide will help you navigate the system...'
        },
        {
          title: 'Viewing Grades',
          content: 'To view your child\'s grades, navigate to the Grades section from the dashboard...'
        },
        {
          title: 'Checking Attendance',
          content: 'Attendance records can be found in the Attendance section...'
        }
      ]
    };

    res.json({ guide });
  } catch (error) {
    console.error('Error in getUserGuide:', error);
    res.status(500).json({ error: 'Failed to fetch user guide' });
  }
};

exports.submitHelpRequest = async (req, res) => {
  try {
    const { category, subject, description, priority } = req.body;

    const message = await prisma.message.create({
      data: {
        sender_id: req.user.user_id,
        receiver_id: 1,
        content: `[HELP REQUEST - ${category}] ${subject}: ${description}`
      }
    });

    res.json({
      request_id: message.message_id,
      status: 'SUBMITTED',
      reference_number: `SUP-2025-${message.message_id}`,
      submitted_at: message.timestamp
    });
  } catch (error) {
    console.error('Error in submitHelpRequest:', error);
    res.status(500).json({ error: 'Failed to submit help request' });
  }
};

exports.getTroubleshootingTips = async (req, res) => {
  try {
    // Mock troubleshooting tips
    const tips = [
      {
        issue: 'Cannot view grades',
        solution: 'Ensure your child is linked to your account. Contact the school administration if needed.'
      },
      {
        issue: 'Notifications not working',
        solution: 'Check your notification preferences in the Settings section.'
      },
      {
        issue: 'Login issues',
        solution: 'Ensure you are using the correct email and password. Use the "Forgot Password" link if needed.'
      }
    ];

    res.json({ tips });
  } catch (error) {
    console.error('Error in getTroubleshootingTips:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting tips' });
  }
};

exports.getSupportContact = async (req, res) => {
  try {
    // Mock support contact information
    const contact = {
      phone: '+251911000000',
      email: 'support@smartschool.edu.et',
      hours: 'Monday-Friday, 8:00-17:00',
      emergency_contact: '+251911111111'
    };

    res.json({ contact });
  } catch (error) {
    console.error('Error in getSupportContact:', error);
    res.status(500).json({ error: 'Failed to fetch support contact' });
  }
};

// ============================================
// NOTIFICATIONS
// ============================================

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { sent_at: 'desc' },
      take: 20
    });

    res.json({
      notifications: notifications.map(n => ({
        id: n.notification_id,
        type: n.type,
        title: n.content.split(':')[0] || 'Notification',
        body: n.content,
        read: n.is_sent,
        created_at: n.sent_at
      }))
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
