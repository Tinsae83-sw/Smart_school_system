const prisma = require('../config/prisma');

/**
 * DEPARTMENT HEAD CONTROLLER
 * Comprehensive controller for all Department Head functionality
 */

// Helper function to get department head ID (with or without authentication)
async function getDepartmentHeadId(req) {
  // If authenticated, use the authenticated department head ID
  if (req.user?.user_id) {
    return req.user.user_id;
  }

  // For development without authentication, use the first department head with a department assigned
  const deptHead = await prisma.departmentHead.findFirst({
    where: {
      department: { not: null }
    }
  });

  if (!deptHead) {
    throw new Error('No department head with assigned department found in database');
  }

  return deptHead.user_id;
}

/**
 * Get All Subjects
 * GET /api/department-head/subjects
 */
async function getSubjectsByGrade(req, res) {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { subject_name: 'asc' }
    });

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

// ==================== DASHBOARD & OVERVIEW ====================

/**
 * Get Department Head Dashboard Metrics
 * GET /api/department-head/dashboard
 */
async function getDashboardMetrics(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    
    // Get department head info
    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id },
      include: { user: true }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const department = deptHead.department;

    // Get total teachers in department
    const totalTeachers = await prisma.teacher.count({
      where: { department }
    });

    // Get total students in department subjects
    const departmentSubjects = await prisma.subject.findMany({
      where: {
        class_subjects: {
          some: {
            teacher: { department }
          }
        }
      }
    });

    const subjectIds = departmentSubjects.map(s => s.subject_id);
    
    const classSubjectIds = await prisma.classSubject.findMany({
      where: { subject_id: { in: subjectIds } },
      select: { class_subject_id: true }
    });

    const classIds = await prisma.classSubject.findMany({
      where: { subject_id: { in: subjectIds } },
      select: { class_id: true },
      distinct: ['class_id']
    });

    const totalStudents = await prisma.student.count({
      where: { current_class_id: { in: classIds.map(cs => cs.class_id) } }
    });

    // Get pending lesson plans
    const pendingLessonPlans = await prisma.lessonPlan.count({
      where: {
        teacher: { department },
        status: 'PENDING'
      }
    });

    // Calculate department performance (average grades)
    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher: { department }
            }
          }
        }
      },
      select: { score: true }
    });

    const avgScore = grades.length > 0 
      ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length 
      : 0;
    const departmentPerformance = Math.round((avgScore / 100) * 100);

    // Get upcoming evaluations
    const upcomingEvaluations = await prisma.peerEvaluation.count({
      where: {
        evaluator: { department },
        submitted_at: { gte: new Date() }
      }
    });

    // Get pending resource requests
    const resourceRequests = await prisma.resourceRequest.count({
      where: {
        requester: { user_id },
        status: 'PENDING'
      }
    });

    res.json({
      total_teachers: totalTeachers,
      total_students: totalStudents,
      pending_lesson_plans: pendingLessonPlans,
      department_performance: departmentPerformance,
      upcoming_evaluations: upcomingEvaluations,
      resource_requests: resourceRequests
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
}

/**
 * Get Recent Activity Feed
 * GET /api/department-head/activity
 */
async function getActivityFeed(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    
    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const department = deptHead.department;

    // Get recent lesson plan submissions
    const recentLessonPlans = await prisma.lessonPlan.findMany({
      where: { teacher: { department } },
      include: {
        teacher: { include: { user: true } },
        class_subject: { include: { subject: true } }
      },
      orderBy: { submitted_at: 'desc' },
      take: 10
    });

    const activities = recentLessonPlans.map(lp => ({
      type: 'LESSON_PLAN',
      message: `${lp.teacher.user.full_name} submitted lesson plan for ${lp.class_subject.subject.subject_name}`,
      timestamp: lp.submitted_at,
      status: lp.status
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error getting activity feed:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
}

// ==================== TEACHER MANAGEMENT ====================

/**
 * Get All Teachers in Department
 * GET /api/department-head/teachers
 */
async function getDepartmentTeachers(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    
    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    if (!deptHead.department) {
      return res.status(400).json({ error: 'Department Head has no department assigned' });
    }

    console.log(`Department Head ${user_id} is in department: ${deptHead.department}`);

    const teachers = await prisma.teacher.findMany({
      where: { department: deptHead.department },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
            phone_number: true,
            is_active: true
          }
        }
      }
    });

    const teacherIds = teachers.map(t => t.teacher_id);

    const classSubjects = await prisma.classSubject.findMany({
      where: { teacher_id: { in: teacherIds } },
      include: {
        subject: {
          select: {
            subject_name: true
          }
        },
        school_class: {
          select: {
            class_name: true
          }
        }
      }
    });

    const classSubjectsByTeacher = {};
    classSubjects.forEach(cs => {
      if (!classSubjectsByTeacher[cs.teacher_id]) {
        classSubjectsByTeacher[cs.teacher_id] = [];
      }
      classSubjectsByTeacher[cs.teacher_id].push(cs);
    });

    console.log(`Found ${teachers.length} teachers in department ${deptHead.department}`);

    const teachersWithWorkload = teachers.map(teacher => {
      const teacherClassSubjects = classSubjectsByTeacher[teacher.teacher_id] || [];
      return {
        teacher_id: teacher.teacher_id,
        full_name: teacher.user.full_name,
        email: teacher.user.email,
        phone_number: teacher.user.phone_number,
        department: teacher.department,
        subjects: teacher.subjects,
        grade_levels: teacher.grade_levels,
        degree_level: teacher.degree_level,
        experience_years: teacher.experience_years,
        hire_date: teacher.hire_date,
        workload: teacherClassSubjects.length,
        classes: teacherClassSubjects.map(cs => ({
          class_name: cs.school_class.class_name,
          subject: cs.subject.subject_name
        })),
        status: teacher.user.is_active ? 'Active' : 'Inactive'
      };
    });

    res.json({
      department: deptHead.department,
      teachers: teachersWithWorkload
    });
  } catch (error) {
    console.error('Error getting department teachers:', error);
    res.status(500).json({ error: 'Failed to get department teachers' });
  }
}

/**
 * Add Teaching Assistant
 * POST /api/department-head/teachers/ta
 */
async function addTeachingAssistant(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { full_name, email, phone_number, password, subjects, grade_levels } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate employee ID
    const employee_id = `TA${Date.now().toString().slice(-6)}`;

    // Create user and teacher
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        phone_number,
        password_hash,
        role: 'TEACHER',
        teacher: {
          create: {
            employee_id,
            department: deptHead.department,
            subjects,
            grade_levels,
            degree_level: 'DIPLOMA',
            hire_date: new Date()
          }
        }
      },
      include: { teacher: true }
    });

    res.status(201).json({
      message: 'Teaching Assistant added successfully',
      teacher: {
        teacher_id: user.teacher.teacher_id,
        full_name: user.full_name,
        email: user.email,
        employee_id: user.teacher.employee_id
      }
    });
  } catch (error) {
    console.error('Error adding teaching assistant:', error);
    res.status(500).json({ error: 'Failed to add teaching assistant' });
  }
}

/**
 * Assign Teacher to Course
 * POST /api/department-head/teachers/assign
 */
async function assignTeacherToCourse(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { teacher_id, class_id, subject_id } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check if teacher is in department
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id }
    });

    if (!teacher || teacher.department !== deptHead.department) {
      return res.status(400).json({ error: 'Teacher not found in your department' });
    }

    // Check if assignment already exists
    const existing = await prisma.classSubject.findUnique({
      where: {
        class_id_subject_id: {
          class_id,
          subject_id
        }
      }
    });

    if (existing) {
      // Update existing assignment
      const updated = await prisma.classSubject.update({
        where: { class_subject_id: existing.class_subject_id },
        data: { teacher_id }
      });
      return res.json({ message: 'Teacher assigned to course', assignment: updated });
    }

    // Create new assignment
    const assignment = await prisma.classSubject.create({
      data: {
        class_id,
        subject_id,
        teacher_id
      },
      include: {
        teacher: { include: { user: true } },
        subject: true,
        school_class: true
      }
    });

    res.status(201).json({ message: 'Teacher assigned to course', assignment });
  } catch (error) {
    console.error('Error assigning teacher to course:', error);
    res.status(500).json({ error: 'Failed to assign teacher to course' });
  }
}

/**
 * Get Teacher Performance Overview
 * GET /api/department-head/teachers/:id/performance
 */
async function getTeacherPerformance(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: parseInt(id) },
      include: { user: true }
    });

    if (!teacher || teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Teacher not found in your department' });
    }

    // Get grades for this teacher
    const grades = await prisma.grade.findMany({
      where: {
        teacher: { teacher_id: parseInt(id) }
      },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class_subject: {
                  include: { subject: true, school_class: true }
                }
              }
            }
          }
        }
      }
    });

    const avgScore = grades.length > 0 
      ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length 
      : 0;

    // Get attendance records marked by this teacher
    const attendanceRecords = await prisma.attendanceRecord.count({
      where: { recorded_by: parseInt(id) }
    });

    res.json({
      teacher_id: teacher.teacher_id,
      full_name: teacher.user.full_name,
      average_score: Math.round(avgScore),
      total_grades: grades.length,
      attendance_records_marked: attendanceRecords,
      performance_score: Math.round((avgScore / 100) * 100)
    });
  } catch (error) {
    console.error('Error getting teacher performance:', error);
    res.status(500).json({ error: 'Failed to get teacher performance' });
  }
}

// ==================== LESSON PLAN MANAGEMENT ====================

/**
 * Get Pending Lesson Plans
 * GET /api/department-head/lesson-plans
 */
async function getLessonPlans(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { status } = req.query;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const where = {
      teacher: { department: deptHead.department }
    };

    if (status) {
      where.status = status;
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: { include: { user: true } },
        class_subject: {
          include: { subject: true, school_class: true }
        },
        reviewer: { select: { full_name: true } }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(lessonPlans.map(lp => ({
      plan_id: lp.lesson_plan_id,
      teacher_name: lp.teacher.user.full_name,
      teacher_id: lp.teacher_id,
      subject: lp.class_subject.subject.subject_name,
      class: lp.class_subject.school_class.class_name,
      title: lp.title,
      objectives: lp.objectives,
      materials: lp.materials,
      activities: lp.activities,
      assessment: lp.assessment,
      status: lp.status,
      submitted_date: lp.submitted_at,
      reviewed_at: lp.reviewed_at,
      reviewed_by: lp.reviewer?.full_name,
      review_comments: lp.review_comments,
      week_number: lp.week_number,
      term: lp.term
    })));
  } catch (error) {
    console.error('Error getting lesson plans:', error);
    res.status(500).json({ error: 'Failed to get lesson plans' });
  }
}

/**
 * Approve/Reject Lesson Plan
 * PUT /api/department-head/lesson-plans/:id
 */
async function reviewLessonPlan(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;
    const { status, review_comments } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { lesson_plan_id: parseInt(id) },
      include: { teacher: true }
    });

    if (!lessonPlan || lessonPlan.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Lesson plan not found in your department' });
    }

    const updated = await prisma.lessonPlan.update({
      where: { lesson_plan_id: parseInt(id) },
      data: {
        status,
        review_comments,
        reviewed_by: user_id,
        reviewed_at: new Date()
      },
      include: {
        teacher: { include: { user: true } },
        class_subject: { include: { subject: true } }
      }
    });

    res.json({
      message: `Lesson plan ${status.toLowerCase()}`,
      lesson_plan: updated
    });
  } catch (error) {
    console.error('Error reviewing lesson plan:', error);
    res.status(500).json({ error: 'Failed to review lesson plan' });
  }
}

// ==================== ACADEMIC MONITORING ====================

/**
 * Get Department Grades
 * GET /api/department-head/academics/grades
 */
async function getDepartmentGrades(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { class_id, subject_id } = req.query;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const where = {
      submission: {
        assignment: {
          class_subject: {
            teacher: { department: deptHead.department }
          }
        }
      }
    };

    if (class_id) {
      where.submission.assignment.class_subject.class_id = parseInt(class_id);
    }

    if (subject_id) {
      where.submission.assignment.class_subject.subject_id = parseInt(subject_id);
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        submission: {
          include: {
            student: { include: { user: true } },
            assignment: {
              include: {
                class_subject: {
                  include: { subject: true, school_class: true }
                }
              }
            }
          }
        },
        teacher: { include: { user: true } }
      }
    });

    res.json(grades.map(g => ({
      grade_id: g.grade_id,
      student_name: g.submission.student.user.full_name,
      student_id: g.submission.student.student_id,
      subject: g.submission.assignment.class_subject.subject.subject_name,
      class: g.submission.assignment.class_subject.school_class.class_name,
      teacher: g.teacher.user.full_name,
      score: Number(g.score),
      letter_grade: g.letter_grade,
      feedback: g.feedback,
      graded_at: g.graded_at
    })));
  } catch (error) {
    console.error('Error getting department grades:', error);
    res.status(500).json({ error: 'Failed to get department grades' });
  }
}

/**
 * Get Grade Distribution
 * GET /api/department-head/academics/grade-distribution
 */
async function getGradeDistribution(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher: { department: deptHead.department }
            }
          }
        }
      },
      select: { score: true, letter_grade: true }
    });

    const distribution = {
      A: grades.filter(g => g.letter_grade === 'A' || Number(g.score) >= 90).length,
      B: grades.filter(g => g.letter_grade === 'B' || (Number(g.score) >= 80 && Number(g.score) < 90)).length,
      C: grades.filter(g => g.letter_grade === 'C' || (Number(g.score) >= 70 && Number(g.score) < 80)).length,
      D: grades.filter(g => g.letter_grade === 'D' || (Number(g.score) >= 60 && Number(g.score) < 70)).length,
      F: grades.filter(g => g.letter_grade === 'F' || Number(g.score) < 60).length
    };

    const total = grades.length;
    const percentages = {};
    for (const [grade, count] of Object.entries(distribution)) {
      percentages[grade] = total > 0 ? Math.round((count / total) * 100) : 0;
    }

    res.json({
      distribution,
      percentages,
      total
    });
  } catch (error) {
    console.error('Error getting grade distribution:', error);
    res.status(500).json({ error: 'Failed to get grade distribution' });
  }
}

/**
 * Get Subject-wise Performance
 * GET /api/department-head/academics/subject-performance
 */
async function getSubjectPerformance(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher: { department: deptHead.department }
            }
          }
        }
      },
      include: {
        submission: {
          include: {
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

    // Group by subject
    const subjectGrades = {};
    grades.forEach(g => {
      const subjectName = g.submission.assignment.class_subject.subject.subject_name;
      if (!subjectGrades[subjectName]) {
        subjectGrades[subjectName] = [];
      }
      subjectGrades[subjectName].push(Number(g.score));
    });

    const performance = Object.entries(subjectGrades).map(([subject, scores]) => {
      const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      return {
        subject,
        avg: Math.round(avg),
        trend: "+0%" // Could be calculated by comparing with previous period
      };
    });

    res.json(performance);
  } catch (error) {
    console.error('Error getting subject performance:', error);
    res.status(500).json({ error: 'Failed to get subject performance' });
  }
}

/**
 * Get Attendance Trends
 * GET /api/department-head/academics/attendance-trends
 */
async function getAttendanceTrends(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Get attendance records for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: sixMonthsAgo },
        school_class: {
          class_subjects: {
            some: {
              teacher: { department: deptHead.department }
            }
          }
        }
      },
      select: {
        date: true,
        status: true
      }
    });

    // Group by month
    const monthlyData = {};
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    
    attendanceRecords.forEach(record => {
      const month = months[new Date(record.date).getMonth()] || 'Other';
      if (!monthlyData[month]) {
        monthlyData[month] = { present: 0, total: 0 };
      }
      monthlyData[month].total++;
      if (record.status === 'PRESENT') {
        monthlyData[month].present++;
      }
    });

    const trends = months.map(month => {
      const data = monthlyData[month] || { present: 0, total: 0 };
      const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
      return {
        month,
        rate
      };
    });

    res.json(trends);
  } catch (error) {
    console.error('Error getting attendance trends:', error);
    res.status(500).json({ error: 'Failed to get attendance trends' });
  }
}

// ==================== RESOURCE MANAGEMENT ====================

/**
 * Get Department Resources
 * GET /api/department-head/resources
 */
async function getResources(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const resources = await prisma.resource.findMany({
      where: { department: deptHead.department },
      include: {
        resource_allocations: {
          include: { teacher: { include: { user: true } } }
        }
      }
    });

    res.json(resources.map(r => ({
      resource_id: r.resource_id,
      name: r.name,
      type: r.type,
      description: r.description,
      quantity: r.quantity,
      status: r.status,
      allocated: r.resource_allocations.length,
      allocations: r.resource_allocations.map(a => ({
        teacher: a.teacher.user.full_name,
        quantity: a.quantity,
        allocated_at: a.allocated_at,
        returned_at: a.returned_at
      }))
    })));
  } catch (error) {
    console.error('Error getting resources:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
}

/**
 * Add Resource
 * POST /api/department-head/resources
 */
async function addResource(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { name, type, description, quantity } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        type,
        description,
        quantity: quantity || 1,
        department: deptHead.department
      }
    });

    res.status(201).json({ message: 'Resource added successfully', resource });
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({ error: 'Failed to add resource' });
  }
}

/**
 * Delete Resource
 * DELETE /api/department-head/resources/:id
 */
async function deleteResource(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const resource_id = parseInt(req.params.id);

    if (!resource_id || isNaN(resource_id)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check if resource exists and belongs to department
    const resource = await prisma.resource.findUnique({
      where: { resource_id }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.department !== deptHead.department) {
      return res.status(403).json({ error: 'You can only delete resources from your department' });
    }

    // Delete resource allocations first
    await prisma.resourceAllocation.deleteMany({
      where: { resource_id }
    });

    // Delete the resource
    await prisma.resource.delete({
      where: { resource_id }
    });

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
}

/**
 * Allocate Resource to Teacher
 * POST /api/department-head/resources/allocate
 */
async function allocateResource(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { resource_id, teacher_id, quantity, notes } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check resource belongs to department
    const resource = await prisma.resource.findUnique({
      where: { resource_id: parseInt(resource_id) }
    });

    if (!resource || resource.department !== deptHead.department) {
      return res.status(404).json({ error: 'Resource not found in your department' });
    }

    // Check teacher is in department
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: parseInt(teacher_id) }
    });

    if (!teacher || teacher.department !== deptHead.department) {
      return res.status(400).json({ error: 'Teacher not found in your department' });
    }

    const allocation = await prisma.resourceAllocation.create({
      data: {
        resource_id: parseInt(resource_id),
        teacher_id: parseInt(teacher_id),
        quantity: quantity || 1,
        notes
      },
      include: {
        resource: true,
        teacher: { include: { user: true } }
      }
    });

    res.status(201).json({ message: 'Resource allocated successfully', allocation });
  } catch (error) {
    console.error('Error allocating resource:', error);
    res.status(500).json({ error: 'Failed to allocate resource' });
  }
}

/**
 * Request New Resource
 * POST /api/department-head/resources/request
 */
async function requestResource(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { name, type, quantity, reason } = req.body;

    const request = await prisma.resourceRequest.create({
      data: {
        requested_by: user_id,
        name,
        type,
        quantity,
        reason,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Resource request submitted', request });
  } catch (error) {
    console.error('Error requesting resource:', error);
    res.status(500).json({ error: 'Failed to request resource' });
  }
}

// ==================== EXAM MANAGEMENT ====================

/**
 * Get Department Exams
 * GET /api/department-head/exams
 */
async function getExams(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exams = await prisma.exam.findMany({
      where: {
        class_subject: {
          teacher: { department: deptHead.department }
        }
      },
      include: {
        class_subject: {
          include: { subject: true, school_class: true }
        },
        creator: { select: { full_name: true } },
        approver: { select: { full_name: true } },
        exam_invigilators: {
          include: { teacher: { include: { user: true } } }
        }
      },
      orderBy: { exam_date: 'desc' }
    });

    res.json(exams.map(e => ({
      exam_id: e.exam_id,
      title: e.title,
      type: e.exam_type,
      subject: e.class_subject.subject.subject_name,
      class: e.class_subject.school_class.class_name,
      exam_date: e.exam_date,
      duration_minutes: e.duration_minutes,
      total_marks: Number(e.total_marks),
      status: e.status,
      created_by: e.creator.full_name,
      approved_by: e.approver?.full_name,
      invigilators: e.exam_invigilators.map(i => i.teacher.user.full_name)
    })));
  } catch (error) {
    console.error('Error getting exams:', error);
    res.status(500).json({ error: 'Failed to get exams' });
  }
}

/**
 * Create Exam
 * POST /api/department-head/exams
 */
async function createExam(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { title, exam_type, grade, selected_subjects, exam_date, duration_minutes, total_marks } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Find classes matching the grade
    const classes = await prisma.schoolClass.findMany({
      where: {
        class_name: {
          contains: `Grade ${grade}`
        }
      }
    });

    const classIds = classes.map(c => c.class_id);

    // Get class subjects for these classes and selected subjects that belong to department
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class_id: { in: classIds },
        subject_id: { in: selected_subjects },
        teacher: { department: deptHead.department }
      },
      include: {
        subject: true,
        school_class: true
      }
    });

    if (classSubjects.length === 0) {
      return res.status(400).json({ error: 'No class subjects found for the selected grade and subjects in your department' });
    }

    // Create exams for each class subject
    const exams = await Promise.all(
      classSubjects.map(classSubject =>
        prisma.exam.create({
          data: {
            class_subject_id: classSubject.class_subject_id,
            title,
            exam_type,
            exam_date: new Date(exam_date),
            duration_minutes: parseInt(duration_minutes),
            total_marks: parseFloat(total_marks),
            created_by: user_id,
            status: 'PENDING_APPROVAL'
          },
          include: {
            class_subject: {
              include: { subject: true, school_class: true }
            }
          }
        })
      )
    );

    res.status(201).json({ message: `${exams.length} exam(s) created successfully`, exams });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
}

/**
 * Approve Exam
 * PUT /api/department-head/exams/:id/approve
 */
async function approveExam(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(id) },
      include: { class_subject: { include: { teacher: true } } }
    });

    if (!exam || exam.class_subject.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Exam not found in your department' });
    }

    const updated = await prisma.exam.update({
      where: { exam_id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: user_id,
        approved_at: new Date()
      }
    });

    res.json({ message: 'Exam approved successfully', exam: updated });
  } catch (error) {
    console.error('Error approving exam:', error);
    res.status(500).json({ error: 'Failed to approve exam' });
  }
}

/**
 * Assign Exam Invigilator
 * POST /api/department-head/exams/:id/invigilators
 */
async function assignInvigilator(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;
    const { teacher_id } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(id) },
      include: { class_subject: { include: { teacher: true } } }
    });

    if (!exam || exam.class_subject.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Exam not found in your department' });
    }

    const invigilator = await prisma.examInvigilator.create({
      data: {
        exam_id: parseInt(id),
        teacher_id: parseInt(teacher_id)
      },
      include: {
        teacher: { include: { user: true } }
      }
    });

    res.status(201).json({ message: 'Invigilator assigned successfully', invigilator });
  } catch (error) {
    console.error('Error assigning invigilator:', error);
    res.status(500).json({ error: 'Failed to assign invigilator' });
  }
}

/**
 * Get Exam Results
 * GET /api/department-head/exams/:id/results
 */
async function getExamResults(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(id) },
      include: { class_subject: { include: { teacher: true } } }
    });

    if (!exam || exam.class_subject.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Exam not found in your department' });
    }

    const results = await prisma.examResult.findMany({
      where: { exam_id: parseInt(id) },
      include: {
        student: { include: { user: true } }
      }
    });

    const passCount = results.filter(r => Number(r.score) >= Number(exam.total_marks) * 0.5).length;
    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + Number(r.score), 0) / results.length
      : 0;

    res.json({
      exam_id: exam.exam_id,
      title: exam.title,
      total_marks: Number(exam.total_marks),
      total_students: results.length,
      pass_count: passCount,
      pass_rate: results.length > 0 ? Math.round((passCount / results.length) * 100) : 0,
      average_score: Math.round(avgScore),
      results: results.map(r => ({
        student_name: r.student.user.full_name,
        score: Number(r.score),
        letter_grade: r.letter_grade,
      }))
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
}

/**
 * Delete Exam
 * DELETE /api/department-head/exams/:id
 */
async function deleteExam(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(id) },
      include: { class_subject: { include: { teacher: true } } }
    });

    if (!exam || exam.class_subject.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Exam not found in your department' });
    }

    // Delete exam results first
    await prisma.examResult.deleteMany({
      where: { exam_id: parseInt(id) }
    });

    // Delete exam
    await prisma.exam.delete({
      where: { exam_id: parseInt(id) }
    });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
}

/**
 * Update Exam
 * PUT /api/department-head/exams/:id
 */
async function updateExam(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { id } = req.params;
    const { title, exam_type, exam_date, duration_minutes, total_marks } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_id: parseInt(id) },
      include: { class_subject: { include: { teacher: true } } }
    });

    if (!exam || exam.class_subject.teacher.department !== deptHead.department) {
      return res.status(404).json({ error: 'Exam not found in your department' });
    }

    const updatedExam = await prisma.exam.update({
      where: { exam_id: parseInt(id) },
      data: {
        title: title || exam.title,
        exam_type: exam_type || exam.exam_type,
        exam_date: exam_date ? new Date(exam_date) : exam.exam_date,
        duration_minutes: duration_minutes ? parseInt(duration_minutes) : exam.duration_minutes,
        total_marks: total_marks ? parseFloat(total_marks) : exam.total_marks
      },
      include: {
        class_subject: {
          include: { subject: true, school_class: true }
        }
      }
    });

    res.json({ message: 'Exam updated successfully', exam: updatedExam });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
}

// ==================== PEER EVALUATION ====================

/**
 * Get Peer Evaluation Forms
 * GET /api/department-head/evaluations/forms
 */
async function getEvaluationForms(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const forms = await prisma.peerEvaluationForm.findMany({
      where: { created_by: user_id },
      include: {
        creator: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(forms);
  } catch (error) {
    console.error('Error getting evaluation forms:', error);
    res.status(500).json({ error: 'Failed to get evaluation forms' });
  }
}

/**
 * Create Custom Evaluation Form
 * POST /api/department-head/evaluations/forms
 */
async function createEvaluationForm(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { title, description, criteria } = req.body;

    const form = await prisma.peerEvaluationForm.create({
      data: {
        title,
        description,
        criteria,
        created_by: user_id
      }
    });

    res.status(201).json({ message: 'Evaluation form created', form });
  } catch (error) {
    console.error('Error creating evaluation form:', error);
    res.status(500).json({ error: 'Failed to create evaluation form' });
  }
}

/**
 * Get Peer Evaluations
 * GET /api/department-head/evaluations
 */
async function getPeerEvaluations(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const evaluations = await prisma.peerEvaluation.findMany({
      where: {
        OR: [
          { evaluator: { department: deptHead.department } },
          { evaluatee: { department: deptHead.department } }
        ]
      },
      include: {
        form: true,
        evaluator: { include: { user: true } },
        evaluatee: { include: { user: true } }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(evaluations);
  } catch (error) {
    console.error('Error getting peer evaluations:', error);
    res.status(500).json({ error: 'Failed to get peer evaluations' });
  }
}

/**
 * Get Department Head Evaluations
 * GET /api/department-head/evaluations/direct
 */
async function getDepartmentHeadEvaluations(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const evaluations = await prisma.departmentHeadEvaluation.findMany({
      where: {
        department_head_id: deptHead.dept_head_id
      },
      include: {
        teacher: {
          include: { user: true }
        },
        department_head: {
          include: { user: true }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(evaluations);
  } catch (error) {
    console.error('Error getting department head evaluations:', error);
    res.status(500).json({ error: 'Failed to get department head evaluations' });
  }
}

/**
 * Submit Direct Teacher Evaluation
 * POST /api/department-head/evaluations/direct-submit
 */
async function submitDirectEvaluation(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { 
      teacher_id, 
      evaluation_date, 
      ratings, 
      strengths, 
      areas_for_improvement, 
      evaluator_comments, 
      overall_recommendation 
    } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check teacher exists and is in department
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: parseInt(teacher_id) },
      include: { user: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.department !== deptHead.department) {
      return res.status(403).json({ error: 'Teacher not in your department' });
    }

    // Calculate overall score from ratings
    const scoreValues = Object.values(ratings).map(s => Number(s));
    const overallScore = scoreValues.length > 0 
      ? (scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) * 20 
      : 0;

    // Create department head evaluation
    const evaluation = await prisma.departmentHeadEvaluation.create({
      data: {
        teacher_id: parseInt(teacher_id),
        department_head_id: deptHead.dept_head_id,
        evaluation_date: new Date(evaluation_date),
        scores: ratings,
        overall_score: overallScore,
        strengths,
        areas_for_improvement,
        evaluator_comments,
        overall_recommendation
      },
      include: {
        teacher: {
          include: { user: true }
        },
        department_head: {
          include: { user: true }
        }
      }
    });

    res.status(201).json({
      message: 'Teacher evaluation submitted successfully',
      evaluation: {
        evaluation_id: evaluation.evaluation_id,
        teacher_name: evaluation.teacher.user.full_name,
        evaluator_name: evaluation.department_head.user.full_name,
        evaluation_date: evaluation.evaluation_date,
        overall_score: evaluation.overall_score,
        overall_recommendation: evaluation.overall_recommendation
      }
    });
  } catch (error) {
    console.error('Error submitting direct evaluation:', error);
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
}

/**
 * Submit Evaluation Form
 * POST /api/department-head/evaluations/submit
 */
async function submitEvaluationForm(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { evaluation_id, scores, comments } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check evaluation exists and is in department
    const evaluation = await prisma.peerEvaluation.findUnique({
      where: { evaluation_id: parseInt(evaluation_id) },
      include: {
        evaluator: true,
        evaluatee: true
      }
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (evaluation.evaluator.department !== deptHead.department && 
        evaluation.evaluatee.department !== deptHead.department) {
      return res.status(403).json({ error: 'Evaluation not in your department' });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).map(s => Number(s));
    const overallScore = scoreValues.length > 0 
      ? scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length 
      : 0;

    // Update evaluation
    const updated = await prisma.peerEvaluation.update({
      where: { evaluation_id: parseInt(evaluation_id) },
      data: {
        scores,
        comments,
        overall_score: overallScore,
        submitted_at: new Date()
      },
      include: {
        form: true,
        evaluator: { include: { user: true } },
        evaluatee: { include: { user: true } }
      }
    });

    res.json({ message: 'Evaluation submitted successfully', evaluation: updated });
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
}

/**
 * Send Teacher Evaluation to Student with One-Time Link
 * POST /api/department-head/evaluations/send-to-student
 */
async function sendEvaluationToStudent(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { teacher_id, student_id, evaluation_form_id, message, form_type } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Check teacher is in department
    const teacher = await prisma.teacher.findUnique({
      where: { teacher_id: parseInt(teacher_id) },
      include: { user: true }
    });

    if (!teacher || teacher.department !== deptHead.department) {
      return res.status(400).json({ error: 'Teacher not found in your department' });
    }

    // Check student exists
    const student = await prisma.student.findUnique({
      where: { student_id: parseInt(student_id) },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let evaluationForm = null;
    let formId = null;

    // For simplified form, we don't need a form_id from database
    if (form_type === 'comprehensive') {
      // Check evaluation form exists
      evaluationForm = await prisma.peerEvaluationForm.findUnique({
        where: { form_id: parseInt(evaluation_form_id) }
      });

      if (!evaluationForm) {
        return res.status(404).json({ error: 'Evaluation form not found' });
      }
      formId = parseInt(evaluation_form_id);
    }

    // Generate unique one-time token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Create evaluation link record
    const evaluationLink = await prisma.evaluationLink.create({
      data: {
        token,
        teacher_id: parseInt(teacher_id),
        student_id: parseInt(student_id),
        form_id: formId,
        created_by: user_id,
        expires_at: expiresAt,
        used: false,
        form_type: form_type || 'comprehensive'
      }
    });

    // Create notification for student with the link
    const evaluationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/evaluation/${token}`;
    
    const notification = await prisma.notification.create({
      data: {
        user_id: student.user_id,
        title: 'Teacher Evaluation Request',
        message: message || `Please complete the evaluation for ${teacher.user.full_name}.`,
        type: 'EVALUATION',
        read: false,
        metadata: {
          evaluation_url: evaluationUrl,
          teacher_name: teacher.user.full_name,
          expires_at: expiresAt
        }
      }
    });

    res.status(201).json({ 
      message: 'Evaluation link sent to student successfully',
      evaluation_link: evaluationUrl,
      token,
      expires_at: expiresAt,
      notification,
      student: {
        student_id: student.student_id,
        name: student.user.full_name,
        email: student.user.email
      },
      teacher: {
        teacher_id: teacher.teacher_id,
        name: teacher.user.full_name
      }
    });
  } catch (error) {
    console.error('Error sending evaluation to student:', error);
    res.status(500).json({ error: 'Failed to send evaluation to student' });
  }
}

// ==================== COMMUNICATION ====================

/**
 * Get Department Meetings
 * GET /api/department-head/meetings
 */
async function getMeetings(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const meetings = await prisma.departmentMeeting.findMany({
      where: { department: deptHead.department },
      include: {
        creator: { select: { full_name: true } },
        meeting_attendees: {
          include: { user: { select: { full_name: true } } }
        },
        meeting_minutes: true
      },
      orderBy: { scheduled_date: 'desc' }
    });

    res.json(meetings);
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
}

/**
 * Create Department Meeting
 * POST /api/department-head/meetings
 */
async function createMeeting(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { title, description, scheduled_date, scheduled_time, location, attendee_ids } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const meeting = await prisma.departmentMeeting.create({
      data: {
        department: deptHead.department,
        title,
        description,
        scheduled_date: new Date(scheduled_date),
        scheduled_time: new Date(scheduled_time),
        location,
        created_by: user_id
      }
    });

    // Add attendees
    if (attendee_ids && attendee_ids.length > 0) {
      await prisma.meetingAttendee.createMany({
        data: attendee_ids.map(uid => ({
          meeting_id: meeting.meeting_id,
          user_id: parseInt(uid)
        }))
      });
    }

    res.status(201).json({ message: 'Meeting created successfully', meeting });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
}

/**
 * Send Department Announcement
 * POST /api/department-head/announcements
 */
async function sendAnnouncement(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { title, message, target_class_id } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        created_by: user_id,
        target_roles: 'TEACHER,STUDENT',
        target_class_id: target_class_id ? parseInt(target_class_id) : null
      }
    });

    res.status(201).json({ message: 'Announcement sent successfully', announcement });
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ error: 'Failed to send announcement' });
  }
}

// ==================== STUDENT SUPPORT ====================

/**
 * Get All Students by Class
 * GET /api/department-head/students
 */
async function getStudentsByClass(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { class_id } = req.query;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Build where clause for class filter
    const where = {};
    if (class_id) {
      where.current_class_id = parseInt(class_id);
    }

    // Get students
    const students = await prisma.student.findMany({
      where,
      include: {
        user: true,
        current_class: true
      },
      orderBy: {
        user: {
          full_name: 'asc'
        }
      }
    });

    // Group students by class
    const studentsByClass = {};
    students.forEach(student => {
      const className = student.current_class?.class_name || 'Unassigned';
      if (!studentsByClass[className]) {
        studentsByClass[className] = [];
      }
      studentsByClass[className].push({
        student_id: student.student_id,
        full_name: student.user.full_name,
        email: student.user.email,
        class: className,
        enrollment_status: student.enrollment_status,
        grade_level: student.grade_level
      });
    });

    res.json(studentsByClass);
  } catch (error) {
    console.error('Error getting students by class:', error);
    res.status(500).json({ error: 'Failed to get students by class' });
  }
}

/**
 * Get At-Risk Students
 * GET /api/department-head/students/at-risk
 */
async function getAtRiskStudents(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Get students with low grades in department subjects
    const lowGrades = await prisma.grade.findMany({
      where: {
        score: { lt: 60 },
        submission: {
          assignment: {
            class_subject: {
              teacher: { department: deptHead.department }
            }
          }
        }
      },
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

    const uniqueStudents = new Map();
    lowGrades.forEach(g => {
      const student = g.submission.student;
      if (!uniqueStudents.has(student.student_id)) {
        uniqueStudents.set(student.student_id, {
          student_id: student.student_id,
          full_name: student.user.full_name,
          class: student.current_class?.class_name,
          risk_factors: []
        });
      }
      uniqueStudents.get(student.student_id).risk_factors.push({
        type: 'ACADEMIC',
        subject: g.submission.assignment.class_subject.subject.subject_name,
        score: Number(g.score)
      });
    });

    // Get students with poor attendance
    const poorAttendance = await prisma.attendanceRecord.groupBy({
      by: ['student_id'],
      where: {
        status: 'ABSENT',
        school_class: {
          class_subjects: {
            some: {
              teacher: { department: deptHead.department }
            }
          }
        }
      },
      having: {
        student_id: {
          _count: {
            gt: 5
          }
        }
      }
    });

    for (const record of poorAttendance) {
      const student = await prisma.student.findUnique({
        where: { student_id: record.student_id },
        include: { user: true, current_class: true }
      });
      if (student) {
        if (!uniqueStudents.has(student.student_id)) {
          uniqueStudents.set(student.student_id, {
            student_id: student.student_id,
            full_name: student.user.full_name,
            class: student.current_class?.class_name,
            risk_factors: []
          });
        }
        uniqueStudents.get(student.student_id).risk_factors.push({
          type: 'ATTENDANCE',
          absences: record._count
        });
      }
    }

    res.json(Array.from(uniqueStudents.values()));
  } catch (error) {
    console.error('Error getting at-risk students:', error);
    res.status(500).json({ error: 'Failed to get at-risk students' });
  }
}

/**
 * Create Intervention Plan
 * POST /api/department-head/interventions
 */
async function createIntervention(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { student_id, type, description, actions, start_date, end_date } = req.body;

    const intervention = await prisma.interventionPlan.create({
      data: {
        student_id: parseInt(student_id),
        created_by: user_id,
        type,
        description,
        actions,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        status: 'ACTIVE'
      },
      include: {
        student: { include: { user: true } }
      }
    });

    res.status(201).json({ message: 'Intervention plan created', intervention });
  } catch (error) {
    console.error('Error creating intervention:', error);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
}

/**
 * Get Intervention Plans
 * GET /api/department-head/interventions
 */
async function getInterventions(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const interventions = await prisma.interventionPlan.findMany({
      where: {
        student: {
          current_class: {
            class_subjects: {
              some: {
                teacher: { department: deptHead.department }
              }
            }
          }
        }
      },
      include: {
        student: { include: { user: true } },
        creator: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(interventions);
  } catch (error) {
    console.error('Error getting interventions:', error);
    res.status(500).json({ error: 'Failed to get interventions' });
  }
}

// ==================== REPORTS ====================

/**
 * Get Reports Overview
 * GET /api/department-head/reports
 */
async function getReportsOverview(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const department = deptHead.department;

    // Get report statistics
    const teachers = await prisma.teacher.count({
      where: { department }
    });

    const grades = await prisma.grade.count({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher: { department }
            }
          }
        }
      }
    });

    const attendanceRecords = await prisma.attendanceRecord.count({
      where: {
        school_class: {
          class_subjects: {
            some: {
              teacher: { department }
            }
          }
        }
      }
    });

    const lessonPlans = await prisma.lessonPlan.count({
      where: {
        teacher: { department }
      }
    });

    res.json({
      department,
      available_reports: [
        {
          name: 'Department Report',
          endpoint: '/api/department-head/reports/generate',
          description: 'Comprehensive department overview including teachers, grades, and attendance',
          formats: ['json', 'csv']
        },
        {
          name: 'Teacher Performance',
          endpoint: '/api/department-head/teachers/:id/performance',
          description: 'Individual teacher performance metrics',
          formats: ['json']
        },
        {
          name: 'Grade Distribution',
          endpoint: '/api/department-head/academics/grade-distribution',
          description: 'Distribution of grades across department',
          formats: ['json']
        },
        {
          name: 'Subject Performance',
          endpoint: '/api/department-head/academics/subject-performance',
          description: 'Performance metrics by subject',
          formats: ['json']
        },
        {
          name: 'Attendance Trends',
          endpoint: '/api/department-head/academics/attendance-trends',
          description: 'Attendance trends over time',
          formats: ['json']
        }
      ],
      statistics: {
        total_teachers: teachers,
        total_grades: grades,
        total_attendance_records: attendanceRecords,
        total_lesson_plans: lessonPlans
      }
    });
  } catch (error) {
    console.error('Error getting reports overview:', error);
    res.status(500).json({ error: 'Failed to get reports overview' });
  }
}

/**
 * Generate Department Report
 * GET /api/department-head/reports/generate
 */
async function generateDepartmentReport(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { format } = req.query; // json, csv

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const department = deptHead.department;

    // Gather all department data
    const teachers = await prisma.teacher.findMany({
      where: { department },
      include: { user: true }
    });

    const grades = await prisma.grade.findMany({
      where: {
        submission: {
          assignment: {
            class_subject: {
              teacher: { department }
            }
          }
        }
      }
    });

    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        school_class: {
          class_subjects: {
            some: {
              teacher: { department }
            }
          }
        }
      }
    });

    const reportData = {
      department,
      generated_at: new Date(),
      summary: {
        total_teachers: teachers.length,
        total_grades: grades.length,
        total_attendance_records: attendance.length,
        average_grade: grades.length > 0 
          ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length 
          : 0
      },
      teachers: teachers.map(t => ({
        name: t.user.full_name,
        subjects: t.subjects,
        grade_levels: t.grade_levels
      }))
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=department_report_${Date.now()}.csv`);
      
      let csv = 'Department,Generated At,Total Teachers,Total Grades,Average Grade\n';
      csv += `${reportData.department},${reportData.generated_at},${reportData.summary.total_teachers},${reportData.summary.total_grades},${reportData.summary.average_grade}\n`;
      csv += '\nTeacher Name,Subjects,Grade Levels\n';
      reportData.teachers.forEach(t => {
        csv += `${t.name},"${t.subjects.join(', ')}","${t.grade_levels.join(', ')}"\n`;
      });
      
      return res.send(csv);
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

// ==================== SETTINGS ====================

/**
 * Get Department Settings
 * GET /api/department-head/settings
 */
async function getDepartmentSettings(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    let settings = await prisma.departmentSettings.findUnique({
      where: { department: deptHead.department }
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.departmentSettings.create({
        data: {
          department: deptHead.department,
          goals: [],
          grading_scale: {
            A: { min: 90, max: 100 },
            B: { min: 80, max: 89 },
            C: { min: 70, max: 79 },
            D: { min: 60, max: 69 },
            F: { min: 0, max: 59 }
          }
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error getting department settings:', error);
    res.status(500).json({ error: 'Failed to get department settings' });
  }
}

/**
 * Update Department Settings
 * PUT /api/department-head/settings
 */
async function updateDepartmentSettings(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { goals, grading_scale, academic_calendar, notification_preferences } = req.body;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const settings = await prisma.departmentSettings.upsert({
      where: { department: deptHead.department },
      update: {
        goals,
        grading_scale,
        academic_calendar,
        notification_preferences
      },
      create: {
        department: deptHead.department,
        goals,
        grading_scale,
        academic_calendar,
        notification_preferences
      }
    });

    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating department settings:', error);
    res.status(500).json({ error: 'Failed to update department settings' });
  }
}

// ==================== CURRICULUM MANAGEMENT ====================

/**
 * Get Curriculum Maps
 * GET /api/department-head/curriculum
 */
async function getCurriculumMaps(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { subject_id, grade_level, term } = req.query;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    const where = {};
    if (subject_id) where.subject_id = parseInt(subject_id);
    if (grade_level) where.grade_level = parseInt(grade_level);
    if (term) where.term = term;

    const curriculumMaps = await prisma.curriculumMap.findMany({
      where,
      include: {
        subject: true,
        creator: { select: { full_name: true } }
      },
      orderBy: [{ grade_level: 'asc' }, { term: 'asc' }]
    });

    res.json(curriculumMaps);
  } catch (error) {
    console.error('Error getting curriculum maps:', error);
    res.status(500).json({ error: 'Failed to get curriculum maps' });
  }
}

/**
 * Create Curriculum Map
 * POST /api/department-head/curriculum
 */
async function createCurriculumMap(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { subject_id, grade_level, term, topics, learning_objectives, alignment_standards } = req.body;

    const curriculumMap = await prisma.curriculumMap.create({
      data: {
        subject_id: parseInt(subject_id),
        grade_level: parseInt(grade_level),
        term,
        topics,
        learning_objectives,
        alignment_standards,
        created_by: user_id
      },
      include: {
        subject: true
      }
    });

    res.status(201).json({ message: 'Curriculum map created', curriculumMap });
  } catch (error) {
    console.error('Error creating curriculum map:', error);
    res.status(500).json({ error: 'Failed to create curriculum map' });
  }
}

// ==================== AUDIT LOG ====================

/**
 * Get Department Activity Log
 * GET /api/department-head/audit-log
 */
async function getAuditLog(req, res) {
  try {
    const user_id = await getDepartmentHeadId(req);
    const { limit = 50 } = req.query;

    const deptHead = await prisma.departmentHead.findUnique({
      where: { user_id }
    });

    if (!deptHead) {
      return res.status(404).json({ error: 'Department Head not found' });
    }

    // Get teachers in department
    const teachers = await prisma.teacher.findMany({
      where: { department: deptHead.department },
      select: { user_id: true }
    });

    const teacherUserIds = teachers.map(t => t.user_id);
    teacherUserIds.push(user_id); // Include department head

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        user_id: { in: teacherUserIds }
      },
      include: {
        user: { select: { full_name: true, role: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
}

module.exports = {
  // Dashboard
  getDashboardMetrics,
  getActivityFeed,

  // Teacher Management
  getDepartmentTeachers,
  addTeachingAssistant,
  assignTeacherToCourse,
  getTeacherPerformance,

  // Lesson Plans
  getLessonPlans,
  reviewLessonPlan,

  // Academics
  getDepartmentGrades,
  getGradeDistribution,
  getSubjectPerformance,
  getAttendanceTrends,

  // Resources
  getResources,
  addResource,
  deleteResource,
  allocateResource,
  requestResource,

  // Subjects
  getSubjectsByGrade,
  
  // Exams
  getExams,
  createExam,
  approveExam,
  assignInvigilator,
  getExamResults,
  deleteExam,
  updateExam,
  
  // Peer Evaluations
  getEvaluationForms,
  createEvaluationForm,
  getPeerEvaluations,
  getDepartmentHeadEvaluations,
  submitEvaluationForm,
  submitDirectEvaluation,
  sendEvaluationToStudent,
  
  // Communication
  getMeetings,
  createMeeting,
  sendAnnouncement,
  
  // Student Support
  getStudentsByClass,
  getAtRiskStudents,
  createIntervention,
  getInterventions,
  
  // Reports
  getReportsOverview,
  generateDepartmentReport,
  
  // Settings
  getDepartmentSettings,
  updateDepartmentSettings,
  
  // Curriculum
  getCurriculumMaps,
  createCurriculumMap,
  
  // Audit
  getAuditLog
};
