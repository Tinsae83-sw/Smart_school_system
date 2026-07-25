const prisma = require('../config/prisma');

/**
 * PRINCIPAL CONTROLLER
 * Comprehensive controller for Principal operations
 */

// Helper function to get principal ID (with or without authentication)
async function getPrincipalId(req) {
  // If authenticated, use the authenticated principal ID
  if (req.user_id) {
    return req.user_id;
  }
  
  // For development without authentication, use the first principal in the database
  const principal = await prisma.principal.findFirst({
    where: { user: { role: 'PRINCIPAL' } },
    include: { user: true }
  });
  
  if (!principal) {
    throw new Error('No principal found in database');
  }
  
  return principal.user_id;
}

// ==================== DASHBOARD & OVERVIEW ====================

/**
 * Get Executive Dashboard Data
 * GET /api/principal/dashboard
 */
async function getExecutiveDashboard(req, res) {
  try {
    // Get current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    // Get total enrollment
    const totalStudents = await prisma.student.count();
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { date: new Date(today) }
    });
    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? ((presentCount / attendanceRecords.length) * 100).toFixed(1) 
      : 0;

    // Get staff count
    const staffCount = await prisma.teacher.count();

    // Get average grades by grade level
    const grades = await prisma.grade.findMany({
      include: {
        submission: {
          include: {
            student: {
              include: {
                current_class: true
              }
            }
          }
        }
      }
    });

    const gradeLevelAverages = {};
    grades.forEach(grade => {
      const className = grade.submission.student.current_class?.class_name || 'Unknown';
      const gradeLevel = className.match(/\d+/)?.[0] || 'Unknown';
      
      if (!gradeLevelAverages[gradeLevel]) {
        gradeLevelAverages[gradeLevel] = { total: 0, count: 0 };
      }
      gradeLevelAverages[gradeLevel].total += Number(grade.score);
      gradeLevelAverages[gradeLevel].count += 1;
    });

    const averageGrades = {};
    Object.keys(gradeLevelAverages).forEach(level => {
      averageGrades[level] = (
        gradeLevelAverages[level].total / gradeLevelAverages[level].count
      ).toFixed(2);
    });

    // Get budget summary
    const budget = await prisma.budget.findFirst({
      where: { 
        academic_year: currentYear?.year_name || '2024-2025',
        status: 'ACTIVE'
      }
    });

    const financialHealth = budget ? {
      total_budget: Number(budget.total_amount),
      spent: Number(budget.spent_amount),
      remaining: Number(budget.remaining_amount),
      utilization_rate: budget.total_amount > 0 
        ? ((budget.spent_amount / budget.total_amount) * 100).toFixed(1)
        : 0
    } : null;

    return res.json({
      total_enrollment: totalStudents,
      attendance_rate: parseFloat(attendanceRate),
      staff_count: staffCount,
      average_grades_by_level: averageGrades,
      financial_health: financialHealth,
      academic_year: currentYear?.year_name || '2024-2025'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Key Performance Indicators
 * GET /api/principal/kpi
 */
async function getKPIs(req, res) {
  try {
    // Mock data for national exam performance
    const nationalExamPerformance = {
      egsece_pass_rate: 78.5,
      esslce_pass_rate: 82.3,
      school_ranking: 3,
      total_schools_in_district: 15
    };

    // Budget utilization
    const budget = await prisma.budget.findFirst({
      where: { status: 'ACTIVE' }
    });

    const budgetUtilization = budget ? {
      utilization_rate: ((budget.spent_amount / budget.total_amount) * 100).toFixed(1)
    } : null;

    // Teacher-student ratio
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();
    const teacherStudentRatio = teacherCount > 0 
      ? (studentCount / teacherCount).toFixed(1) 
      : 0;

    return res.json({
      national_exam_performance: nationalExamPerformance,
      budget_utilization: budgetUtilization,
      teacher_student_ratio: parseFloat(teacherStudentRatio)
    });
  } catch (error) {
    console.error('KPI error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Compliance Status
 * GET /api/principal/compliance
 */
async function getComplianceStatus(req, res) {
  try {
    // Check compliance items
    const complianceItems = {
      teacher_licensing: { status: 'COMPLIANT', last_checked: new Date() },
      safety_requirements: { status: 'COMPLIANT', last_checked: new Date() },
      reporting_deadlines: { status: 'WARNING', last_checked: new Date() },
      budget_submission: { status: 'COMPLIANT', last_checked: new Date() }
    };

    // Overall status
    const hasWarning = Object.values(complianceItems).some(item => item.status === 'WARNING');
    const hasNonCompliant = Object.values(complianceItems).some(item => item.status === 'NON_COMPLIANT');
    
    const overallStatus = hasNonCompliant ? 'NON_COMPLIANT' : (hasWarning ? 'WARNING' : 'COMPLIANT');

    return res.json({
      overall_status: overallStatus,
      items: complianceItems
    });
  } catch (error) {
    console.error('Compliance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Recent Alerts & Actions
 * GET /api/principal/alerts
 */
async function getRecentAlerts(req, res) {
  try {
    const alerts = [];

    // Pending approval requests
    const pendingExpenditures = await prisma.expenditure.count({
      where: { status: 'PENDING' }
    });
    if (pendingExpenditures > 0) {
      alerts.push({
        type: 'BUDGET_APPROVAL',
        message: `${pendingExpenditures} expenditure requests pending approval`,
        priority: 'HIGH',
        created_at: new Date()
      });
    }

    // Grievances
    const pendingGrievances = await prisma.grievance.count({
      where: { status: 'PENDING' }
    });
    if (pendingGrievances > 0) {
      alerts.push({
        type: 'GRIEVANCE',
        message: `${pendingGrievances} grievances require attention`,
        priority: 'MEDIUM',
        created_at: new Date()
      });
    }

    // PTSA feedback
    const pendingPTSAFeedback = await prisma.pTSAFeedback.count({
      where: { status: 'PENDING' }
    });
    if (pendingPTSAFeedback > 0) {
      alerts.push({
        type: 'PTSA_FEEDBACK',
        message: `${pendingPTSAFeedback} PTSA feedback items pending response`,
        priority: 'MEDIUM',
        created_at: new Date()
      });
    }

    return res.json(alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== STAFF MANAGEMENT ====================

/**
 * Register Senior Staff (VP Academic, VP Admin, Department Head)
 * POST /api/principal/staff/register
 */
async function registerSeniorStaff(req, res) {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      role,
      employee_id,
      department,
      appointment_date
    } = req.body;

    // Validate role - only senior staff roles allowed
    const validRoles = ['VP_ACADEMIC', 'VP_ADMINISTRATION', 'DEPARTMENT_HEAD'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Principal can only register VP Academic, VP Admin, or Department Heads' 
      });
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password (use default if not provided)
    const bcrypt = require('bcrypt');
    const defaultPassword = password || 'ChangeMe123!';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone_number: phone_number || null,
        password_hash,
        role,
        is_active: true
      }
    });

    // Create role-specific record
    let roleRecord;
    if (role === 'VP_ACADEMIC') {
      roleRecord = await prisma.vPAcademic.create({
        data: {
          user: {
            connect: { user_id: user.user_id }
          },
          employee_id: employee_id.trim(),
          appointment_date: appointment_date ? new Date(appointment_date) : null
        }
      });
    } else if (role === 'VP_ADMINISTRATION') {
      roleRecord = await prisma.vPAdministration.create({
        data: {
          user: {
            connect: { user_id: user.user_id }
          },
          employee_id: employee_id.trim(),
          appointment_date: appointment_date ? new Date(appointment_date) : null
        }
      });
    } else if (role === 'DEPARTMENT_HEAD') {
      // Department is optional for Department Heads - can be assigned later
      roleRecord = await prisma.departmentHead.create({
        data: {
          user: {
            connect: { user_id: user.user_id }
          },
          employee_id: employee_id.trim(),
          department: department ? department.trim() : null,
          appointment_date: appointment_date ? new Date(appointment_date) : null
        }
      });
    }

    return res.status(201).json({
      message: `${role} registered successfully`,
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      employee_id: roleRecord.employee_id,
      password: password // Return for first-time login
    });
  } catch (error) {
    console.error('Register senior staff error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get All Senior Staff
 * GET /api/principal/staff/senior
 */
async function getSeniorStaff(req, res) {
  try {
    const vpsAcademic = await prisma.vPAcademic.findMany({
      include: { user: true }
    });

    const vpsAdmin = await prisma.vPAdministration.findMany({
      include: { user: true }
    });

    const deptHeads = await prisma.departmentHead.findMany({
      include: { user: true }
    });

    const seniorStaff = [
      ...vpsAcademic.map(vp => ({
        ...vp.user,
        role: 'VP_ACADEMIC',
        employee_id: vp.employee_id,
        appointment_date: vp.appointment_date,
        status: vp.user.is_active ? 'ACTIVE' : 'INACTIVE'
      })),
      ...vpsAdmin.map(vp => ({
        ...vp.user,
        role: 'VP_ADMINISTRATION',
        employee_id: vp.employee_id,
        appointment_date: vp.appointment_date,
        status: vp.user.is_active ? 'ACTIVE' : 'INACTIVE'
      })),
      ...deptHeads.map(dh => ({
        ...dh.user,
        role: 'DEPARTMENT_HEAD',
        employee_id: dh.employee_id,
        department: dh.department,
        appointment_date: dh.appointment_date,
        status: dh.user.is_active ? 'ACTIVE' : 'INACTIVE'
      }))
    ];

    return res.json(seniorStaff);
  } catch (error) {
    console.error('Get senior staff error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Senior Staff Details
 * PUT /api/principal/staff/senior/:id
 */
async function updateSeniorStaff(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, department } = req.body;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is senior staff
    if (!['VP_ACADEMIC', 'VP_ADMINISTRATION', 'DEPARTMENT_HEAD'].includes(user.role)) {
      return res.status(403).json({ error: 'Can only update senior staff' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        full_name: full_name || user.full_name,
        email: email || user.email,
        phone_number: phone_number !== undefined ? phone_number : user.phone_number
      }
    });

    // Update department if department head
    if (user.role === 'DEPARTMENT_HEAD' && department !== undefined) {
      await prisma.departmentHead.update({
        where: { user_id: parseInt(id) },
        data: { department: department ? department.trim() : null }
      });
    }

    return res.json({
      message: 'Senior staff updated successfully',
      user_id: updatedUser.user_id
    });
  } catch (error) {
    console.error('Update senior staff error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Terminate/Transfer Senior Staff
 * DELETE /api/principal/staff/senior/:id
 */
async function terminateSeniorStaff(req, res) {
  try {
    const { id } = req.params;
    const { reason, transfer_to } = req.body;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['VP_ACADEMIC', 'VP_ADMINISTRATION', 'DEPARTMENT_HEAD'].includes(user.role)) {
      return res.status(403).json({ error: 'Can only terminate senior staff' });
    }

    // Create audit log
    const user_id = await getPrincipalId(req);
    await prisma.auditLog.create({
      data: {
        user_id: user_id,
        action: 'TERMINATE_SENIOR_STAFF',
        details: {
          target_user_id: parseInt(id),
          reason,
          transfer_to
        }
      }
    });

    // Deactivate user
    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { is_active: false }
    });

    return res.json({
      message: 'Senior staff terminated/transferred successfully',
      user_id: parseInt(id)
    });
  } catch (error) {
    console.error('Terminate senior staff error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * View Staff Performance Summaries
 * GET /api/principal/staff/performance
 */
async function getStaffPerformance(req, res) {
  try {
    const { academic_year, term } = req.query;

    const performances = await prisma.staffPerformance.findMany({
      where: {
        academic_year: academic_year || '2024-2025',
        term: term || '1'
      },
      include: {
        user: true
      }
    });

    return res.json(performances);
  } catch (error) {
    console.error('Get staff performance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get All Departments
 * GET /api/principal/departments
 */
async function getDepartments(req, res) {
  try {
    const departments = await prisma.department.findMany({
      where: { is_active: true },
      include: {
        head_of_department: {
          include: { user: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create Department
 * POST /api/principal/departments
 */
async function createDepartment(req, res) {
  try {
    const { name, code, description, head_of_department_id } = req.body;

    // Check if department name already exists
    const existingDept = await prisma.department.findUnique({
      where: { name: name.trim() }
    });

    if (existingDept) {
      return res.status(409).json({ error: 'Department with this name already exists' });
    }

    // Check if code already exists (if provided)
    if (code) {
      const existingCode = await prisma.department.findUnique({
        where: { code: code.trim() }
      });

      if (existingCode) {
        return res.status(409).json({ error: 'Department with this code already exists' });
      }
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code ? code.trim() : null,
        description: description || null,
        head_of_department_id: head_of_department_id ? parseInt(head_of_department_id) : null
      },
      include: {
        head_of_department: {
          include: { user: true }
        }
      }
    });

    return res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Department
 * PUT /api/principal/departments/:id
 */
async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description, head_of_department_id, is_active } = req.body;

    const existingDept = await prisma.department.findUnique({
      where: { department_id: parseInt(id) }
    });

    if (!existingDept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if name is being changed and if new name already exists
    if (name && name.trim() !== existingDept.name) {
      const nameExists = await prisma.department.findUnique({
        where: { name: name.trim() }
      });

      if (nameExists) {
        return res.status(409).json({ error: 'Department with this name already exists' });
      }
    }

    // Check if code is being changed and if new code already exists
    if (code && code.trim() !== existingDept.code) {
      const codeExists = await prisma.department.findUnique({
        where: { code: code.trim() }
      });

      if (codeExists) {
        return res.status(409).json({ error: 'Department with this code already exists' });
      }
    }

    const department = await prisma.department.update({
      where: { department_id: parseInt(id) },
      data: {
        name: name ? name.trim() : existingDept.name,
        code: code !== undefined ? (code ? code.trim() : null) : existingDept.code,
        description: description !== undefined ? description : existingDept.description,
        head_of_department_id: head_of_department_id !== undefined 
          ? (head_of_department_id ? parseInt(head_of_department_id) : null) 
          : existingDept.head_of_department_id,
        is_active: is_active !== undefined ? is_active : existingDept.is_active
      },
      include: {
        head_of_department: {
          include: { user: true }
        }
      }
    });

    return res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete Department
 * DELETE /api/principal/departments/:id
 */
async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;

    const existingDept = await prisma.department.findUnique({
      where: { department_id: parseInt(id) }
    });

    if (!existingDept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has any teachers
    const teachersCount = await prisma.teacher.count({
      where: { department: existingDept.name }
    });

    if (teachersCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned teachers. Please reassign teachers first.' 
      });
    }

    // Soft delete by setting is_active to false
    await prisma.department.update({
      where: { department_id: parseInt(id) },
      data: { is_active: false }
    });

    return res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get All Teachers
 * GET /api/principal/staff/teachers
 */
async function getTeachers(req, res) {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { user: true }
    });

    const teacherData = teachers.map(teacher => ({
      user_id: teacher.user.user_id,
      full_name: teacher.user.full_name,
      email: teacher.user.email,
      phone_number: teacher.user.phone_number,
      role: 'TEACHER',
      employee_id: teacher.employee_id,
      department: teacher.department,
      qualification: teacher.degree_level,
      years_of_experience: teacher.experience_years,
      status: teacher.user.is_active ? 'ACTIVE' : 'INACTIVE'
    }));

    return res.json(teacherData);
  } catch (error) {
    console.error('Get teachers error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Create Teacher
 * POST /api/principal/staff/teachers
 */
async function createTeacher(req, res) {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      employee_id,
      department,
      qualification,
      years_of_experience,
      hire_date
    } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone_number: phone_number || null,
        password_hash,
        role: 'TEACHER',
        is_active: true
      }
    });

    // Create teacher record
    const teacher = await prisma.teacher.create({
      data: {
        user_id: user.user_id,
        employee_id: employee_id.trim(),
        department: department || null,
        degree_level: qualification || null,
        experience_years: years_of_experience || 0,
        hire_date: hire_date ? new Date(hire_date) : null
      }
    });

    return res.status(201).json({
      message: 'Teacher created successfully',
      user_id: user.user_id,
      email: user.email,
      employee_id: teacher.employee_id
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Teacher Details
 * PUT /api/principal/staff/teachers/:id
 */
async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, department, qualification, years_of_experience } = req.body;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Can only update teachers' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        full_name: full_name || user.full_name,
        email: email || user.email,
        phone_number: phone_number !== undefined ? phone_number : user.phone_number
      }
    });

    // Update teacher record
    await prisma.teacher.update({
      where: { user_id: parseInt(id) },
      data: {
        department: department !== undefined ? department : undefined,
        degree_level: qualification !== undefined ? qualification : undefined,
        experience_years: years_of_experience !== undefined ? years_of_experience : undefined
      }
    });

    return res.json({
      message: 'Teacher updated successfully',
      user_id: updatedUser.user_id
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete Teacher
 * DELETE /api/principal/staff/teachers/:id
 */
async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Can only delete teachers' });
    }

    // Deactivate user instead of deleting
    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { is_active: false }
    });

    return res.json({
      message: 'Teacher deleted successfully',
      user_id: parseInt(id)
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== SCHOOL SETTINGS ====================

/**
 * Get School Settings (general endpoint for frontend)
 * GET /api/principal/settings
 */
async function getSchoolSettings(req, res) {
  try {
    let profile = await prisma.schoolProfile.findFirst();
    
    if (!profile) {
      // Create default profile
      profile = await prisma.schoolProfile.create({
        data: {
          school_name: 'Default High School',
          address: 'Addis Ababa, Ethiopia',
          phone_number: '+251911000000',
          email: 'school@example.com',
          school_code: 'ETH-001',
          woreda: 'Bole',
          region: 'Addis Ababa',
          principal_name: 'Principal Name'
        }
      });
    }

    // Get current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    // Transform to match frontend expectations
    const settings = {
      school_id: profile.profile_id,
      school_name: profile.school_name,
      address: profile.address,
      phone: profile.phone_number,
      email: profile.email,
      principal_name: profile.principal_name,
      academic_year: currentYear?.year_name || '2024-2025',
      current_term: profile.current_term || 'First Semester',
      school_type: profile.school_type || 'High School',
      grades_offered: profile.grades_offered || '9-12',
      established_year: profile.established_date ? new Date(profile.established_date).getFullYear() : 2010,
      student_capacity: profile.student_capacity || 2000,
      mission_statement: profile.motto || '',
      vision_statement: profile.vision_statement || ''
    };

    return res.json(settings);
  } catch (error) {
    console.error('Get school settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Manage School Profile
 * GET /api/principal/settings/profile
 */
async function getSchoolProfile(req, res) {
  try {
    let profile = await prisma.schoolProfile.findFirst();
    
    if (!profile) {
      // Create default profile
      profile = await prisma.schoolProfile.create({
        data: {
          school_name: 'Default High School',
          address: 'Addis Ababa, Ethiopia',
          phone_number: '+251911000000',
          email: 'school@example.com',
          school_code: 'ETH-001',
          woreda: 'Bole',
          region: 'Addis Ababa',
          principal_name: 'Principal Name'
        }
      });
    }

    return res.json(profile);
  } catch (error) {
    console.error('Get school profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update School Profile
 * PUT /api/principal/settings/profile
 */
async function updateSchoolProfile(req, res) {
  try {
    const { school_name, address, phone_number, email, logo_url, motto, principal_name } = req.body;

    const profile = await prisma.schoolProfile.findFirst();

    if (profile) {
      const updated = await prisma.schoolProfile.update({
        where: { profile_id: profile.profile_id },
        data: {
          school_name: school_name || profile.school_name,
          address: address || profile.address,
          phone_number: phone_number || profile.phone_number,
          email: email || profile.email,
          logo_url: logo_url !== undefined ? logo_url : profile.logo_url,
          motto: motto !== undefined ? motto : profile.motto,
          principal_name: principal_name || profile.principal_name
        }
      });
      return res.json(updated);
    } else {
      const created = await prisma.schoolProfile.create({
        data: {
          school_name,
          address,
          phone_number,
          email,
          logo_url,
          motto,
          school_code: 'ETH-001',
          woreda: 'Bole',
          region: 'Addis Ababa',
          principal_name
        }
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error('Update school profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update School Settings (general endpoint for frontend)
 * PUT /api/principal/settings
 */
async function updateSchoolSettings(req, res) {
  try {
    const {
      school_name,
      address,
      phone,
      email,
      principal_name,
      academic_year,
      current_term,
      school_type,
      grades_offered,
      established_year,
      student_capacity,
      mission_statement,
      vision_statement
    } = req.body;

    const profile = await prisma.schoolProfile.findFirst();

    if (profile) {
      const updated = await prisma.schoolProfile.update({
        where: { profile_id: profile.profile_id },
        data: {
          school_name: school_name || profile.school_name,
          address: address || profile.address,
          phone_number: phone || profile.phone_number,
          email: email || profile.email,
          principal_name: principal_name || profile.principal_name,
          motto: mission_statement !== undefined ? mission_statement : profile.motto,
          vision_statement: vision_statement !== undefined ? vision_statement : profile.vision_statement,
          school_type: school_type !== undefined ? school_type : profile.school_type,
          grades_offered: grades_offered !== undefined ? grades_offered : profile.grades_offered,
          student_capacity: student_capacity !== undefined ? student_capacity : profile.student_capacity,
          current_term: current_term !== undefined ? current_term : profile.current_term,
          established_date: established_year ? new Date(established_year, 0, 1) : profile.established_date
        }
      });
      return res.json(updated);
    } else {
      const created = await prisma.schoolProfile.create({
        data: {
          school_name,
          address,
          phone_number: phone,
          email,
          principal_name,
          motto: mission_statement,
          vision_statement,
          school_type,
          grades_offered,
          student_capacity,
          current_term,
          established_date: established_year ? new Date(established_year, 0, 1) : null,
          school_code: 'ETH-001',
          woreda: 'Bole',
          region: 'Addis Ababa'
        }
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error('Update school settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Calendar
 * GET /api/principal/academic-calendar
 */
async function getAcademicCalendar(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    if (!currentYear) {
      // Return default calendar if none exists
      return res.json({
        calendar_id: 0,
        academic_year: '2024-2025',
        term_start_date: new Date('2024-09-01'),
        term_end_date: new Date('2025-06-30'),
        exam_period_start: new Date('2025-05-15'),
        exam_period_end: new Date('2025-06-15'),
        break_periods: 'December 20 - January 5, February 8-12',
        status: 'ACTIVE'
      });
    }

    // Transform to match frontend expectations
    const calendar = {
      calendar_id: currentYear.year_id,
      academic_year: currentYear.year_name,
      term_start_date: currentYear.start_date ? currentYear.start_date.toISOString() : null,
      term_end_date: currentYear.end_date ? currentYear.end_date.toISOString() : null,
      exam_period_start: currentYear.end_date ? currentYear.end_date.toISOString() : null,
      exam_period_end: currentYear.end_date ? currentYear.end_date.toISOString() : null,
      break_periods: typeof currentYear.breaks === 'string' ? currentYear.breaks : JSON.stringify(currentYear.breaks || []),
      terms: typeof currentYear.terms === 'string' ? currentYear.terms : JSON.stringify(currentYear.terms || []),
      status: currentYear.is_current ? 'ACTIVE' : 'INACTIVE'
    };

    return res.json(calendar);
  } catch (error) {
    console.error('Get academic calendar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Academic Calendar
 * PUT /api/principal/academic-calendar
 */
async function updateAcademicCalendar(req, res) {
  try {
    const { academic_year, term_start_date, term_end_date, exam_period_start, exam_period_end, break_periods } = req.body;

    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    let updatedYear;

    if (currentYear) {
      // Update existing
      updatedYear = await prisma.academicYear.update({
        where: { year_id: currentYear.year_id },
        data: {
          year_name: academic_year,
          start_date: new Date(term_start_date),
          end_date: new Date(term_end_date),
          breaks: break_periods
        }
      });
    } else {
      // Create new
      updatedYear = await prisma.academicYear.create({
        data: {
          year_name: academic_year,
          start_date: new Date(term_start_date),
          end_date: new Date(term_end_date),
          breaks: break_periods,
          is_current: true
        }
      });
    }

    // Transform response
    const calendar = {
      calendar_id: updatedYear.year_id,
      academic_year: updatedYear.year_name,
      term_start_date: updatedYear.start_date.toISOString(),
      term_end_date: updatedYear.end_date.toISOString(),
      exam_period_start: exam_period_start,
      exam_period_end: exam_period_end,
      break_periods: typeof updatedYear.breaks === 'string' ? updatedYear.breaks : JSON.stringify(updatedYear.breaks || []),
      terms: typeof updatedYear.terms === 'string' ? updatedYear.terms : JSON.stringify(updatedYear.terms || []),
      status: updatedYear.is_current ? 'ACTIVE' : 'INACTIVE'
    };

    return res.json(calendar);
  } catch (error) {
    console.error('Update academic calendar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Configure Academic Year
 * POST /api/principal/settings/academic-year
 */
async function createAcademicYear(req, res) {
  try {
    const { year_name, start_date, end_date, terms, breaks } = req.body;

    // Set all other years to not current
    await prisma.academicYear.updateMany({
      data: { is_current: false }
    });

    const academicYear = await prisma.academicYear.create({
      data: {
        year_name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        is_current: true,
        terms,
        breaks
      }
    });

    return res.status(201).json(academicYear);
  } catch (error) {
    console.error('Create academic year error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Years
 * GET /api/principal/settings/academic-year
 */
async function getAcademicYears(req, res) {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year_name: 'desc' }
    });
    return res.json(years);
  } catch (error) {
    console.error('Get academic years error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Set Grading Scale
 * POST /api/principal/settings/grading-scale
 */
async function createGradingScale(req, res) {
  try {
    const { scale_name, grade_level, min_pass_score, grading_criteria } = req.body;

    const scale = await prisma.gradingScale.create({
      data: {
        scale_name,
        grade_level: parseInt(grade_level),
        min_pass_score: parseFloat(min_pass_score),
        grading_criteria
      }
    });

    return res.status(201).json(scale);
  } catch (error) {
    console.error('Create grading scale error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Grading Scales
 * GET /api/principal/settings/grading-scale
 */
async function getGradingScales(req, res) {
  try {
    const scales = await prisma.gradingScale.findMany();
    return res.json(scales);
  } catch (error) {
    console.error('Get grading scales error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Manage School Fees
 * POST /api/principal/settings/fees
 */
async function createSchoolFee(req, res) {
  try {
    const { fee_name, fee_type, grade_level, amount, description, academic_year } = req.body;

    const fee = await prisma.schoolFee.create({
      data: {
        fee_name,
        fee_type,
        grade_level: parseInt(grade_level),
        amount: parseFloat(amount),
        description,
        academic_year
      }
    });

    return res.status(201).json(fee);
  } catch (error) {
    console.error('Create school fee error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Fees
 * GET /api/principal/settings/fees
 */
async function getSchoolFees(req, res) {
  try {
    const { academic_year } = req.query;
    const fees = await prisma.schoolFee.findMany({
      where: academic_year ? { academic_year } : undefined
    });
    return res.json(fees);
  } catch (error) {
    console.error('Get school fees error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create Academic Policy
 * POST /api/principal/settings/policies
 */
async function createAcademicPolicy(req, res) {
  try {
    const { policy_name, policy_type, content, effective_date } = req.body;

    if (!policy_name || !policy_type || !content || !effective_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveDate = new Date(effective_date);
    if (isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ error: 'Invalid effective_date format' });
    }

    const policy = await prisma.academicPolicy.create({
      data: {
        policy_name,
        policy_type,
        content,
        effective_date: effectiveDate
      }
    });

    return res.status(201).json(policy);
  } catch (error) {
    console.error('Create academic policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Policies
 * GET /api/principal/settings/policies
 */
async function getAcademicPolicies(req, res) {
  try {
    const policies = await prisma.academicPolicy.findMany({
      where: { is_active: true },
      orderBy: { policy_type: 'asc' }
    });
    return res.json(policies);
  } catch (error) {
    console.error('Get academic policies error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update Academic Policy
 * PUT /api/principal/settings/policies/:id
 */
async function updateAcademicPolicy(req, res) {
  try {
    const { id } = req.params;
    const { policy_name, policy_type, content, effective_date } = req.body;

    if (!policy_name || !policy_type || !content || !effective_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveDate = new Date(effective_date);
    if (isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ error: 'Invalid effective_date format' });
    }

    const policy = await prisma.academicPolicy.update({
      where: { policy_id: parseInt(id) },
      data: {
        policy_name,
        policy_type,
        content,
        effective_date: effectiveDate
      }
    });

    return res.json(policy);
  } catch (error) {
    console.error('Update academic policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete Academic Policy
 * DELETE /api/principal/settings/policies/:id
 */
async function deleteAcademicPolicy(req, res) {
  try {
    const { id } = req.params;

    await prisma.academicPolicy.update({
      where: { policy_id: parseInt(id) },
      data: { is_active: false }
    });

    return res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Delete academic policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== FINANCIAL OVERSIGHT ====================

/**
 * Get Financial Summary
 * GET /api/principal/financial/summary
 */
async function getFinancialSummary(req, res) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        expenditures: true
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const totalBudget = Number(budget.total_amount);
    const spent = Number(budget.spent_amount);
    const remaining = Number(budget.remaining_amount);
    const utilizationRate = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) + '%' : '0%';

    return res.json({
      total_budget: totalBudget,
      spent,
      remaining,
      utilization_rate: utilizationRate,
      fiscal_year: budget.academic_year
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Budget Allocations
 * GET /api/principal/financial/allocations
 */
async function getBudgetAllocations(req, res) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        expenditures: true
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Group expenditures by category to create allocations
    const allocations = [];
    const categoryMap = {};

    budget.expenditures.forEach(exp => {
      if (!categoryMap[exp.category]) {
        categoryMap[exp.category] = {
          category: exp.category,
          allocated_amount: 0,
          spent_amount: 0,
          fiscal_year: budget.academic_year
        };
      }
      categoryMap[exp.category].spent_amount += Number(exp.amount);
    });

    // For demo purposes, allocate budget proportionally
    const totalSpent = Object.values(categoryMap).reduce((sum, cat) => sum + cat.spent_amount, 0);
    const totalBudget = Number(budget.total_amount);

    Object.values(categoryMap).forEach(cat => {
      const allocatedAmount = totalSpent > 0 ? (cat.spent_amount / totalSpent) * totalBudget : totalBudget / 4;
      allocations.push({
        allocation_id: allocations.length + 1,
        category: cat.category,
        allocated_amount: Math.round(allocatedAmount),
        spent_amount: cat.spent_amount,
        remaining_amount: Math.round(allocatedAmount - cat.spent_amount),
        fiscal_year: cat.fiscal_year
      });
    });

    return res.json(allocations);
  } catch (error) {
    console.error('Get budget allocations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Expenses
 * GET /api/principal/financial/expenses
 */
async function getExpenses(req, res) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        expenditures: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const expenses = budget.expenditures.map(exp => ({
      expense_id: exp.expenditure_id,
      description: exp.description,
      amount: Number(exp.amount),
      category: exp.category,
      date: exp.created_at ? exp.created_at.toISOString() : new Date().toISOString(),
      status: exp.status,
      approved_by: exp.approved_by ? 'Principal' : null
    }));

    return res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Budget Summary
 * GET /api/principal/financial/budget
 */
async function getBudgetSummary(req, res) {
  try {
    const { academic_year } = req.query;
    
    const budget = await prisma.budget.findFirst({
      where: academic_year ? { academic_year } : { status: 'ACTIVE' },
      include: {
        expenditures: true
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Calculate breakdown by category
    const breakdown = {};
    budget.expenditures.forEach(exp => {
      if (!breakdown[exp.category]) {
        breakdown[exp.category] = 0;
      }
      breakdown[exp.category] += Number(exp.amount);
    });

    return res.json({
      ...budget,
      expenditure_breakdown: breakdown
    });
  } catch (error) {
    console.error('Get budget summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Expenditure
 * PUT /api/principal/financial/expenditures/:id/approve
 */
async function approveExpenditure(req, res) {
  try {
    const { id } = req.params;

    const expenditure = await prisma.expenditure.update({
      where: { expenditure_id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: await getPrincipalId(req)
      }
    });

    // Update budget spent amount
    const budget = await prisma.budget.findUnique({
      where: { budget_id: expenditure.budget_id }
    });

    if (budget) {
      await prisma.budget.update({
        where: { budget_id: budget.budget_id },
        data: {
          spent_amount: { increment: expenditure.amount },
          remaining_amount: { decrement: expenditure.amount }
        }
      });
    }

    return res.json({
      message: 'Expenditure approved successfully',
      expenditure
    });
  } catch (error) {
    console.error('Approve expenditure error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Asset Inventory
 * GET /api/principal/financial/assets
 */
async function getAssetInventory(req, res) {
  try {
    const { category, status } = req.query;

    const assets = await prisma.assetInventory.findMany({
      where: {
        category: category || undefined,
        status: status || undefined
      },
      orderBy: { asset_name: 'asc' }
    });

    return res.json(assets);
  } catch (error) {
    console.error('Get asset inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Facility Booking
 * PUT /api/principal/financial/facilities/:id/approve
 */
async function approveFacilityBooking(req, res) {
  try {
    const { id } = req.params;

    const booking = await prisma.facilityBooking.update({
      where: { booking_id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: await getPrincipalId(req)
      }
    });

    return res.json({
      message: 'Facility booking approved successfully',
      booking
    });
  } catch (error) {
    console.error('Approve facility booking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== GOVERNANCE & COMPLIANCE ====================

/**
 * Get Governance Overview
 * GET /api/principal/governance
 */
async function getGovernanceOverview(req, res) {
  try {
    const { academic_year } = req.query;

    // Get School Improvement Plans
    const sips = await prisma.schoolImprovementPlan.findMany({
      where: academic_year ? { academic_year } : undefined,
      include: {
        progress_items: true,
        feedback: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Get PTSA Executive members
    const ptsaExecutives = await prisma.pTSAExecutive.findMany({
      where: { is_active: true },
      include: {
        user: true
      },
      orderBy: { term_start: 'desc' }
    });

    // Get PTSA Feedback
    const ptsaFeedback = await prisma.pTSAFeedback.findMany({
      include: {
        submitted_by_user: true,
        responded_by_user: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    // Get Budget Advisories
    const budgetAdvisories = await prisma.budgetAdvisory.findMany({
      include: {
        submitted_by_user: true,
        reviewed_by_user: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    // Get Grievances
    const grievances = await prisma.grievance.findMany({
      include: {
        user: true,
        assigned_to: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    // Calculate summary statistics
    const summary = {
      total_sips: sips.length,
      approved_sips: sips.filter(sip => sip.status === 'APPROVED').length,
      pending_sips: sips.filter(sip => sip.status === 'SUBMITTED').length,
      active_ptsa_executives: ptsaExecutives.length,
      pending_ptsa_feedback: ptsaFeedback.filter(f => f.status === 'PENDING').length,
      pending_budget_advisories: budgetAdvisories.filter(b => b.status === 'PENDING').length,
      pending_grievances: grievances.filter(g => g.status === 'PENDING').length
    };

    return res.json({
      summary,
      school_improvement_plans: sips,
      ptsa_executives: ptsaExecutives,
      ptsa_feedback: ptsaFeedback,
      budget_advisories: budgetAdvisories,
      grievances: grievances
    });
  } catch (error) {
    console.error('Get governance overview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Improvement Plans
 * GET /api/principal/governance/sip
 */
async function getSIPs(req, res) {
  try {
    const { academic_year } = req.query;

    const sips = await prisma.schoolImprovementPlan.findMany({
      where: academic_year ? { academic_year } : undefined,
      include: {
        progress_items: true,
        feedback: true
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json(sips);
  } catch (error) {
    console.error('Get SIPs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve SIP
 * PUT /api/principal/governance/sip/:id/approve
 */
async function approveSIP(req, res) {
  try {
    const { id } = req.params;

    const sip = await prisma.schoolImprovementPlan.update({
      where: { sip_id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: await getPrincipalId(req),
        approved_at: new Date()
      }
    });

    return res.json({
      message: 'School Improvement Plan approved successfully',
      sip
    });
  } catch (error) {
    console.error('Approve SIP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Recognize PTSA Executive
 * POST /api/principal/governance/ptsa/executive
 */
async function recognizePTSAExecutive(req, res) {
  try {
    const { user_id, position, term_start, term_end } = req.body;

    const executive = await prisma.pTSAExecutive.create({
      data: {
        user_id: parseInt(user_id),
        position,
        term_start: new Date(term_start),
        term_end: new Date(term_end),
        recognized_by: await getPrincipalId(req),
        recognized_at: new Date()
      }
    });

    return res.status(201).json(executive);
  } catch (error) {
    console.error('Recognize PTSA executive error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get PTSA Feedback
 * GET /api/principal/governance/ptsa/feedback
 */
async function getPTSAFeedback(req, res) {
  try {
    const feedback = await prisma.pTSAFeedback.findMany({
      orderBy: { submitted_at: 'desc' }
    });

    return res.json(feedback);
  } catch (error) {
    console.error('Get PTSA feedback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Respond to PTSA Feedback
 * PUT /api/principal/governance/ptsa/feedback/:id/respond
 */
async function respondPTSAFeedback(req, res) {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const feedback = await prisma.pTSAFeedback.update({
      where: { feedback_id: parseInt(id) },
      data: {
        response,
        responded_by: await getPrincipalId(req),
        responded_at: new Date(),
        status: 'RESPONDED'
      }
    });

    return res.json({
      message: 'PTSA feedback responded successfully',
      feedback
    });
  } catch (error) {
    console.error('Respond PTSA feedback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== GRIEVANCES & DISCIPLINE ====================

/**
 * Get All Grievances
 * GET /api/principal/grievances
 */
async function getGrievances(req, res) {
  try {
    const { status, priority } = req.query;

    const grievances = await prisma.grievance.findMany({
      where: {
        status: status || undefined,
        priority: priority || undefined
      },
      include: {
        user: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    // Map to frontend expected format
    const mapped = grievances.map(g => ({
      grievance_id: g.grievance_id,
      complainant_name: g.user?.full_name || 'Unknown',
      complainant_type: g.user?.role || 'UNKNOWN',
      subject: g.subject,
      description: g.description,
      category: g.category,
      priority: g.priority,
      status: g.status,
      submitted_date: g.submitted_at,
      resolution: g.resolution,
      resolved_date: g.resolved_at
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get grievances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Resolve Grievance
 * PUT /api/principal/grievances/:id/resolve
 */
async function resolveGrievance(req, res) {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const grievance = await prisma.grievance.update({
      where: { grievance_id: parseInt(id) },
      data: {
        resolution,
        status: 'RESOLVED',
        resolved_at: new Date()
      }
    });

    return res.json(grievance);
  } catch (error) {
    console.error('Resolve grievance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Discipline Records
 * GET /api/principal/discipline
 */
async function getDisciplineRecords(req, res) {
  try {
    const disciplinaryActions = await prisma.disciplinaryAction.findMany({
      include: {
        student: {
          include: {
            user: true
          }
        },
        recommended_by_user: true,
        approved_by_user: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Map to frontend expected format
    const mapped = disciplinaryActions.map(d => ({
      record_id: d.action_id,
      student_name: d.student?.user?.full_name || 'Unknown',
      student_id: d.student?.student_id || 'Unknown',
      infraction: d.action_type,
      description: d.reason,
      severity: d.action_type === 'EXPULSION' ? 'HIGH' : d.action_type === 'SUSPENSION' ? 'HIGH' : d.action_type === 'PROBATION' ? 'MEDIUM' : 'LOW',
      action_taken: d.action_type,
      action_date: d.start_date,
      reported_by: d.recommended_by_user?.full_name || 'Unknown',
      status: d.status
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get discipline records error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Escalate Grievance to Woreda
 * PUT /api/principal/grievances/:id/escalate
 */
async function escalateGrievance(req, res) {
  try {
    const { id } = req.params;

    const grievance = await prisma.grievance.update({
      where: { grievance_id: parseInt(id) },
      data: {
        status: 'ESCALATED',
        escalated_to_woreda: true,
        escalation_date: new Date()
      }
    });

    return res.json({
      message: 'Grievance escalated to Woreda successfully',
      grievance
    });
  } catch (error) {
    console.error('Escalate grievance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Disciplinary Action
 * PUT /api/principal/discipline/:id/approve
 */
async function approveDisciplinaryAction(req, res) {
  try {
    const { id } = req.params;

    const action = await prisma.disciplinaryAction.update({
      where: { action_id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: await getPrincipalId(req)
      }
    });

    return res.json({
      message: 'Disciplinary action approved successfully',
      action
    });
  } catch (error) {
    console.error('Approve disciplinary action error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== STAFF WELFARE ====================

/**
 * Get Staff Leave Requests
 * GET /api/principal/staff/leave
 */
async function getStaffLeaveRequests(req, res) {
  try {
    const { status } = req.query;

    const leaveRequests = await prisma.staffLeaveRequest.findMany({
      where: {
        status: status || undefined
      },
      include: {
        user: true
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json(leaveRequests);
  } catch (error) {
    console.error('Get staff leave requests error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Senior Staff Leave
 * PUT /api/principal/staff/leave/:id/approve
 */
async function approveStaffLeave(req, res) {
  try {
    const { id } = req.params;
    const { approval } = req.body; // true for approve, false for reject

    const leaveRequest = await prisma.staffLeaveRequest.update({
      where: { leave_id: parseInt(id) },
      data: {
        status: approval ? 'APPROVED' : 'REJECTED',
        approved_by: await getPrincipalId(req),
        approved_at: new Date(),
        rejection_reason: approval ? null : req.body.rejection_reason
      }
    });

    return res.json({
      message: `Leave request ${approval ? 'approved' : 'rejected'} successfully`,
      leaveRequest
    });
  } catch (error) {
    console.error('Approve staff leave error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Staff Transfers
 * GET /api/principal/staff/transfers
 */
async function getStaffTransfers(req, res) {
  try {
    const { status } = req.query;

    const transfers = await prisma.staffTransfer.findMany({
      where: {
        status: status || undefined
      },
      include: {
        user: true
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json(transfers);
  } catch (error) {
    console.error('Get staff transfers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve Staff Transfer
 * PUT /api/principal/staff/transfers/:id/approve
 */
async function approveStaffTransfer(req, res) {
  try {
    const { id } = req.params;

    const transfer = await prisma.staffTransfer.update({
      where: { transfer_id: parseInt(id) },
      data: {
        status: 'COMPLETED',
        approved_by: await getPrincipalId(req),
        approved_at: new Date()
      }
    });

    return res.json({
      message: 'Staff transfer approved successfully',
      transfer
    });
  } catch (error) {
    console.error('Approve staff transfer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== COMMUNICATION ====================

/**
 * Create School Announcement
 * POST /api/principal/communications/announcements
 */
async function createAnnouncement(req, res) {
  try {
    const { title, content, announcement_type, target_audience, is_urgent, attachment_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await prisma.schoolAnnouncement.create({
      data: {
        title,
        content,
        announcement_type: announcement_type || 'GENERAL',
        target_audience: target_audience || 'ALL',
        created_by: await getPrincipalId(req),
        is_urgent: is_urgent || false,
        attachment_url,
        status: 'PUBLISHED',
        publish_date: new Date()
      }
    });

    // Log to communication log
    await prisma.communicationLog.create({
      data: {
        communication_type: 'ANNOUNCEMENT',
        title,
        recipient_count: 0, // Would calculate based on target audience
        sent_by: await getPrincipalId(req),
        status: 'SENT',
        details: { target_audience }
      }
    });

    return res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Announcements
 * GET /api/principal/communications/announcements
 */
async function getAnnouncements(req, res) {
  try {
    const announcements = await prisma.schoolAnnouncement.findMany({
      orderBy: { created_at: 'desc' }
    });

    return res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send Urgent Alert
 * POST /api/principal/communications/alerts
 */
async function sendUrgentAlert(req, res) {
  try {
    const { alert_type, title, message, severity, target_audience, delivery_method } = req.body;

    const alert = await prisma.urgentAlert.create({
      data: {
        alert_type,
        title,
        message,
        severity: severity || 'HIGH',
        created_by: await getPrincipalId(req),
        target_audience: target_audience || 'ALL',
        delivery_method: delivery_method || 'SMS_EMAIL',
        status: 'SENT'
      }
    });

    // Log to communication log
    await prisma.communicationLog.create({
      data: {
        communication_type: 'ALERT',
        title,
        recipient_count: 0,
        sent_by: await getPrincipalId(req),
        status: 'SENT',
        details: { alert_type, severity }
      }
    });

    return res.status(201).json(alert);
  } catch (error) {
    console.error('Send urgent alert error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Communication Log
 * GET /api/principal/communications/log
 */
async function getCommunicationLog(req, res) {
  try {
    const logs = await prisma.communicationLog.findMany({
      orderBy: { sent_at: 'desc' }
    });
    return res.json(logs);
  } catch (error) {
    console.error('Get communication log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== REPORTING ====================

/**
 * Get Academic Reports
 * GET /api/principal/reports/academic
 */
async function getAcademicReports(req, res) {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { generated_at: 'desc' }
    });

    // Map to frontend expected format
    const mapped = reports.map(r => ({
      report_id: r.report_id,
      report_type: r.data?.type || 'GENERAL',
      title: r.title,
      description: r.data?.description || '',
      academic_year: r.data?.academic_year || new Date().getFullYear().toString(),
      generated_date: r.generated_at,
      data: r.data
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get academic reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Audit Logs
 * GET /api/principal/reports/audit-logs
 */
async function getAuditLogs(req, res) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: true
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Map to frontend expected format
    const mapped = logs.map(log => ({
      log_id: log.log_id,
      action: log.action,
      performed_by: log.user?.full_name || 'Unknown',
      timestamp: log.timestamp,
      details: typeof log.details === 'object' ? JSON.stringify(log.details) : log.details
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate Report
 * POST /api/principal/reports/generate
 */
async function generateReport(req, res) {
  try {
    const { report_type } = req.body;

    let report;
    const principalId = await getPrincipalId(req);

    switch (report_type) {
      case 'ENROLLMENT':
        report = await prisma.report.create({
          data: {
            title: 'Enrollment Report',
            data: {
              type: 'ENROLLMENT',
              description: 'Student enrollment statistics by grade and gender',
              academic_year: new Date().getFullYear().toString()
            },
            generated_by: principalId
          }
        });
        break;
      case 'PERFORMANCE':
        report = await prisma.report.create({
          data: {
            title: 'Academic Performance Report',
            data: {
              type: 'PERFORMANCE',
              description: 'Student performance metrics and grade distribution',
              academic_year: new Date().getFullYear().toString()
            },
            generated_by: principalId
          }
        });
        break;
      case 'ATTENDANCE':
        report = await prisma.report.create({
          data: {
            title: 'Attendance Report',
            data: {
              type: 'ATTENDANCE',
              description: 'Student attendance statistics and trends',
              academic_year: new Date().getFullYear().toString()
            },
            generated_by: principalId
          }
        });
        break;
      case 'COMPLIANCE':
        report = await prisma.complianceReport.create({
          data: {
            report_name: 'Compliance Report',
            academic_year: new Date().getFullYear().toString(),
            compliance_type: 'GENERAL',
            status: 'PENDING',
            findings: [],
            action_required: false,
            reviewed_by: principalId
          }
        });
        break;
      case 'AUDIT':
        // Export audit logs
        const logs = await prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' }
        });
        return res.json({ logs, message: 'Audit log exported successfully' });
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    return res.status(201).json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate Annual School Report
 * POST /api/principal/reports/annual
 */
async function generateAnnualReport(req, res) {
  try {
    const { academic_year } = req.body;

    // Gather comprehensive data
    const reportData = {
      academic_year,
      generated_at: new Date(),
      enrollment: await prisma.student.count(),
      staff_count: await prisma.teacher.count(),
      budget_summary: await prisma.budget.findFirst({
        where: { academic_year }
      }),
      // Add more sections as needed
    };

    const report = await prisma.annualSchoolReport.create({
      data: {
        academic_year,
        report_data: reportData,
        generated_by: await getPrincipalId(req)
      }
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Generate annual report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Annual Reports
 * GET /api/principal/reports/annual
 */
async function getAnnualReports(req, res) {
  try {
    const reports = await prisma.annualSchoolReport.findMany({
      orderBy: { created_at: 'desc' }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Get annual reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit Report to Woreda
 * PUT /api/principal/reports/annual/:id/submit
 */
async function submitReportToWoreda(req, res) {
  try {
    const { id } = req.params;

    const report = await prisma.annualSchoolReport.update({
      where: { report_id: parseInt(id) },
      data: {
        submitted_to_woreda: true,
        submission_date: new Date()
      }
    });

    return res.json({
      message: 'Report submitted to Woreda successfully',
      report
    });
  } catch (error) {
    console.error('Submit report to Woreda error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Compliance Reports
 * GET /api/principal/reports/compliance
 */
async function getComplianceReports(req, res) {
  try {
    const reports = await prisma.complianceReport.findMany({
      orderBy: { created_at: 'desc' }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Get compliance reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get National Exam Reports
 * GET /api/principal/reports/national-exams
 */
async function getNationalExamReports(req, res) {
  try {
    const reports = await prisma.nationalExamReport.findMany({
      orderBy: { created_at: 'desc' }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Get national exam reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== AUDIT LOG ====================

/**
 * Get Full Audit Log
 * GET /api/principal/audit-log
 */
async function getAuditLog(req, res) {
  try {
    const { user_id, action, start_date, end_date } = req.query;

    const where = {};
    if (user_id) where.user_id = parseInt(user_id);
    if (action) where.action = action;
    if (start_date || end_date) {
      where.timestamp = {};
      if (start_date) where.timestamp.gte = new Date(start_date);
      if (end_date) where.timestamp.lte = new Date(end_date);
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to 100 most recent
    });

    return res.json(auditLogs);
  } catch (error) {
    console.error('Get audit log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== EXTERNAL RELATIONS ====================

/**
 * Create School Event
 * POST /api/principal/events
 */
async function createSchoolEvent(req, res) {
  try {
    const { event_name, event_type, description, event_date, start_time, end_time, location } = req.body;

    const event = await prisma.schoolEvent.create({
      data: {
        event_name,
        event_type,
        description,
        event_date: new Date(event_date),
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        location,
        organized_by: await getPrincipalId(req)
      }
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Create school event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Events
 * GET /api/principal/events
 */
async function getSchoolEvents(req, res) {
  try {
    const { status } = req.query;

    const events = await prisma.schoolEvent.findMany({
      where: { status: status || undefined },
      orderBy: { event_date: 'asc' }
    });

    return res.json(events);
  } catch (error) {
    console.error('Get school events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create School Partnership
 * POST /api/principal/partnerships
 */
async function createSchoolPartnership(req, res) {
  try {
    const { partner_name, partner_type, partnership_type, description, start_date, contact_person, contact_email, contact_phone } = req.body;

    const partnership = await prisma.schoolPartnership.create({
      data: {
        partner_name,
        partner_type,
        partnership_type,
        description,
        start_date: new Date(start_date),
        contact_person,
        contact_email,
        contact_phone
      }
    });

    return res.status(201).json(partnership);
  } catch (error) {
    console.error('Create school partnership error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Partnerships
 * GET /api/principal/partnerships
 */
async function getSchoolPartnerships(req, res) {
  try {
    const partnerships = await prisma.schoolPartnership.findMany({
      orderBy: { start_date: 'desc' }
    });

    return res.json(partnerships);
  } catch (error) {
    console.error('Get school partnerships error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  // Dashboard
  getExecutiveDashboard,
  getKPIs,
  getComplianceStatus,
  getRecentAlerts,
  
  // Staff Management
  registerSeniorStaff,
  getSeniorStaff,
  updateSeniorStaff,
  terminateSeniorStaff,
  getStaffPerformance,
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  
  // School Settings
  getSchoolSettings,
  getSchoolProfile,
  updateSchoolSettings,
  updateSchoolProfile,
  getAcademicCalendar,
  updateAcademicCalendar,
  createAcademicYear,
  getAcademicYears,
  createGradingScale,
  getGradingScales,
  createSchoolFee,
  getSchoolFees,
  createAcademicPolicy,
  getAcademicPolicies,
  updateAcademicPolicy,
  deleteAcademicPolicy,
  
  // Financial Oversight
  getFinancialSummary,
  getBudgetAllocations,
  getExpenses,
  getBudgetSummary,
  approveExpenditure,
  getAssetInventory,
  approveFacilityBooking,
  
  // Governance & Compliance
  getGovernanceOverview,
  getSIPs,
  approveSIP,
  recognizePTSAExecutive,
  getPTSAFeedback,
  respondPTSAFeedback,
  
  // Grievances & Discipline
  getGrievances,
  resolveGrievance,
  getDisciplineRecords,
  escalateGrievance,
  approveDisciplinaryAction,
  
  // Staff Welfare
  getStaffLeaveRequests,
  approveStaffLeave,
  getStaffTransfers,
  approveStaffTransfer,
  
  // Communication
  createAnnouncement,
  getAnnouncements,
  sendUrgentAlert,
  getCommunicationLog,
  
  // Reporting
  getAcademicReports,
  getAuditLogs,
  generateReport,
  generateAnnualReport,
  getAnnualReports,
  submitReportToWoreda,
  getComplianceReports,
  getNationalExamReports,
  getAuditLog,
  
  // External Relations
  createSchoolEvent,
  getSchoolEvents,
  createSchoolPartnership,
  getSchoolPartnerships
};
