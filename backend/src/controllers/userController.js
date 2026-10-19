const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

/**
 * Generate a secure random password
 */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Ethiopian phone format
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+251[0-9]{9}$/;
  return phoneRegex.test(phone);
}

function normalizeClassName(className) {
  const trimmed = className?.toString().trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) {
    return `Grade ${trimmed}`;
  }
  return trimmed;
}

function getAcademicYearString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

/**
 * REGISTER NEW USER (Teacher, Student, or Parent)
 * POST /api/admin/users
 */
async function registerUser(req, res) {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      role,
      // Teacher fields
      employee_id,
      department,
      degree_level,
      grade_levels,
      age,
      experience_years,
      hire_date,
      gender,
      // Student fields
      student_number,
      enrollment_date,
      current_class_name,
      date_of_birth,
      // Parent fields
      relationship,
      preferred_language,
      address
    } = req.body;

    // ==================== VALIDATION ====================

    // Common validations
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({ error: 'Full name must be at least 3 characters' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (phone_number && !isValidPhone(phone_number)) {
      return res.status(400).json({ error: 'Phone must be in format: +251XXXXXXXXX' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const validRoles = ['TEACHER', 'STUDENT', 'PARENT', 'ADMIN', 'SUPER_ADMIN'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be TEACHER, STUDENT, PARENT, ADMIN, or SUPER_ADMIN' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // ==================== CREATE USER ====================

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create base user
    const newUser = await prisma.user.create({
      data: {
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone_number: phone_number || null,
        password_hash,
        role,
        is_active: true,
        preferred_language: preferred_language || 'en'
      }
    });

    // ==================== CREATE ROLE-SPECIFIC RECORD ====================

    let roleRecord = null;

    if (role === 'TEACHER') {
      // Validate teacher fields
      if (!employee_id || employee_id.trim().length < 3) {
        // Rollback: delete the user
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Employee ID is required for teachers' });
      }

      if (!department) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Department is required for teachers' });
      }

      const validGenders = ['MALE', 'FEMALE', 'OTHER'];
      const normalizedGender = gender ? gender.toString().trim().toUpperCase() : null;
      if (!normalizedGender || !validGenders.includes(normalizedGender)) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Gender must be MALE, FEMALE, or OTHER' });
      }

      const validDegreeLevels = ['BACHELOR', 'MASTER', 'PHD', 'DIPLOMA', 'OTHER'];
      const normalizedDegreeLevel = degree_level ? degree_level.toString().trim().toUpperCase() : null;
      if (!normalizedDegreeLevel || !validDegreeLevels.includes(normalizedDegreeLevel)) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Degree level must be BACHELOR, MASTER, PHD, DIPLOMA, or OTHER' });
      }

      const parsedAge = age != null ? Number(age) : null;
      if (parsedAge == null || Number.isNaN(parsedAge) || parsedAge < 18 || parsedAge > 80) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Age must be a valid number between 18 and 80' });
      }

      const parsedExperience = experience_years != null ? Number(experience_years) : null;
      if (parsedExperience == null || Number.isNaN(parsedExperience) || parsedExperience < 0 || parsedExperience > 50) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Experience must be a valid number of years' });
      }

      const parsedHireDate = hire_date ? new Date(hire_date) : null;
      if (parsedHireDate === null || Number.isNaN(parsedHireDate.getTime())) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Hire date must be a valid date' });
      }

      if (!grade_levels || !Array.isArray(grade_levels) || grade_levels.length === 0) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'At least one grade level is required for teachers' });
      }

      const normalizedGradeLevels = grade_levels.map((item) => Number(item)).filter((value) => !Number.isNaN(value));
      if (normalizedGradeLevels.length !== grade_levels.length) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Grade levels must be valid numbers' });
      }

      // Check if employee_id already exists
      const existingTeacher = await prisma.teacher.findUnique({
        where: { employee_id: employee_id.trim() }
      });

      if (existingTeacher) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(409).json({ error: 'Employee ID already exists' });
      }

      // Create teacher record
      roleRecord = await prisma.teacher.create({
        data: {
          user_id: newUser.user_id,
          employee_id: employee_id.trim(),
          department: department.trim(),
          hire_date: parsedHireDate,
          degree_level: normalizedDegreeLevel || null,
          gender: normalizedGender || null,
          age: parsedAge,
          experience_years: parsedExperience,
          grade_levels: normalizedGradeLevels,
          subjects: []
        }
      });

      // Handle grade levels assignment (via class_subject table or metadata)
      if (grade_levels && Array.isArray(grade_levels)) {
        // This would require additional logic to map grade levels to class_ids.
        // For now, we store grade levels on the teacher record.
      }

    } else if (role === 'STUDENT') {
      // Validate student fields
      if (!student_number || !/^STU-\d{4}-\d{4}$/.test(student_number)) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Student number must be in format: STU-YYYY-XXXX' });
      }

      if (!enrollment_date) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Enrollment date is required' });
      }

      if (!current_class_name) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Current class is required' });
      }

      // Check if student_number already exists
      const existingStudent = await prisma.student.findUnique({
        where: { student_number: student_number.trim() }
      });

      if (existingStudent) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(409).json({ error: 'Student number already exists' });
      }

      const normalizedClassName = normalizeClassName(current_class_name);

      // Find or create class by name
      let schoolClass = await prisma.schoolClass.findFirst({
        where: { class_name: normalizedClassName }
      });

      if (!schoolClass) {
        const fallbackTeacher = await prisma.teacher.findFirst();
        if (!fallbackTeacher) {
          await prisma.user.delete({ where: { user_id: newUser.user_id } });
          return res.status(400).json({ error: `Class "${normalizedClassName}" not found and no homeroom teacher is available to create it.` });
        }

        schoolClass = await prisma.schoolClass.create({
          data: {
            class_name: normalizedClassName,
            academic_year: getAcademicYearString(),
            homeroom_teacher_id: fallbackTeacher.teacher_id
          }
        });
      }

      // Create student record
      roleRecord = await prisma.student.create({
        data: {
          user_id: newUser.user_id,
          student_number: student_number.trim(),
          enrollment_date: new Date(enrollment_date),
          current_class_id: schoolClass.class_id,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          gender: gender || null
        }
      });

    } else if (role === 'PARENT') {
      // Validate parent fields
      if (!relationship) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Relationship to student is required' });
      }

      const validRelationships = ['Father', 'Mother', 'Guardian', 'Other'];
      if (!validRelationships.includes(relationship)) {
        await prisma.user.delete({ where: { user_id: newUser.user_id } });
        return res.status(400).json({ error: 'Relationship must be Father, Mother, Guardian, or Other' });
      }

      // Create parent record
      roleRecord = await prisma.parent.create({
        data: {
          user_id: newUser.user_id,
          relationship: relationship.trim(),
          address: address ? address.trim() : null,
          preferred_language: preferred_language || 'English'
        }
      });
    }

    // ==================== RETURN SUCCESS ====================

    const responseData = {
      message: `${role} registered successfully`,
      user_id: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
      password: password // Return password only for first-time login
    };

    // Add role-specific data
    if (role === 'TEACHER' && roleRecord) {
      responseData.employee_id = roleRecord.employee_id;
      responseData.department = roleRecord.department;
      responseData.degree_level = roleRecord.degree_level;
      responseData.gender = roleRecord.gender;
      responseData.age = roleRecord.age;
      responseData.experience_years = roleRecord.experience_years;
      responseData.grade_levels = roleRecord.grade_levels;
      responseData.subjects = roleRecord.subjects;
    } else if (role === 'STUDENT' && roleRecord) {
      responseData.student_number = roleRecord.student_number;
      responseData.class_id = roleRecord.current_class_id;
    } else if (role === 'PARENT' && roleRecord) {
      responseData.parent_id = roleRecord.parent_id;
      responseData.relationship = roleRecord.relationship;
    }

    return res.status(201).json(responseData);

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email or ID already exists' });
    }

    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

/**
 * LINK PARENT TO STUDENT
 * POST /api/admin/users/link-parent
 */
async function linkParentToStudent(req, res) {
  try {
    const { student_user_id, parent_user_id, relationship } = req.body;

    // Validate input
    if (!student_user_id || !parent_user_id) {
      return res.status(400).json({ error: 'Student user ID and parent user ID are required' });
    }

    // Find student by user_id
    const student = await prisma.student.findUnique({
      where: { user_id: parseInt(student_user_id) }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find parent by user_id
    const parent = await prisma.parent.findUnique({
      where: { user_id: parseInt(parent_user_id) }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Check if link already exists
    const existingLink = await prisma.studentParent.findFirst({
      where: {
        student_id: student.student_id,
        parent_id: parent.parent_id
      }
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Parent is already linked to this student' });
    }

    // Create the link
    const link = await prisma.studentParent.create({
      data: {
        student_id: student.student_id,
        parent_id: parent.parent_id
      }
    });

    return res.status(201).json({
      message: 'Parent linked to student successfully',
      link_id: link.student_parent_id,
      student_id: student.student_id,
      parent_id: parent.parent_id,
      relationship: relationship || parent.relationship
    });

  } catch (error) {
    console.error('Link parent error:', error);
    return res.status(500).json({ error: 'Internal server error while linking parent to student' });
  }
}

/**
 * GET ALL USERS (with filters)
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  try {
    const { role, status } = req.query;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        teacher: {
          select: {
            employee_id: true,
            department: true,
            degree_level: true,
            gender: true,
            age: true,
            experience_years: true,
            grade_levels: true,
            subjects: true
          }
        },
        student: {
          select: {
            student_number: true,
            enrollment_date: true,
            current_class_id: true,
            current_class: {
              select: {
                class_name: true
              }
            },
            date_of_birth: true,
            gender: true
          }
        },
        parent: {
          select: {
            relationship: true,
            address: true,
            preferred_language: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Flatten the response
    const flattenedUsers = users.map(user => ({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login,
      profile_picture_url: user.profile_picture_url,
      preferred_language: user.preferred_language,
      // Teacher fields
      teacher_id: user.teacher?.teacher_id,
      teacher_employee_id: user.teacher?.employee_id,
      teacher_department: user.teacher?.department,
      teacher_degree_level: user.teacher?.degree_level,
      teacher_gender: user.teacher?.gender,
      teacher_age: user.teacher?.age,
      teacher_experience_years: user.teacher?.experience_years,
      teacher_grade_levels: user.teacher?.grade_levels,
      teacher_subjects: user.teacher?.subjects,
      teacher_hire_date: user.teacher?.hire_date,
      // Student fields
      student_number: user.student?.student_number,
      enrollment_date: user.student?.enrollment_date,
      current_class_id: user.student?.current_class_id,
      current_class_name: user.student?.current_class?.class_name,
      date_of_birth: user.student?.date_of_birth,
      gender: user.student?.gender,
      // Parent fields
      parent_relationship: user.parent?.relationship,
      address: user.parent?.address,
      parent_preferred_language: user.parent?.preferred_language
    }));

    return res.json(flattenedUsers);

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET USER BY ID
 * GET /api/admin/users/:id
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
      include: {
        teacher: true,
        student: {
          include: {
            current_class: true
          }
        },
        parent: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    return res.json(userWithoutPassword);

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET STUDENT GRADES
 * GET /api/admin/users/:id/grades
 */
async function getStudentGrades(req, res) {
  try {
    const { id } = req.params;

    // Find student record by user_id
    const student = await prisma.student.findUnique({ where: { user_id: parseInt(id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Find grades for submissions by this student
    const grades = await prisma.grade.findMany({
      where: { submission: { student_id: student.student_id } },
      include: {
        submission: {
          include: {
            assignment: true
          }
        },
        teacher: {
          include: { user: true }
        }
      },
      orderBy: { graded_at: 'desc' }
    });

    return res.json(grades);
  } catch (error) {
    console.error('Get student grades error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET GRADES ASSIGNED BY TEACHER
 * GET /api/admin/users/:id/assigned-grades
 */
async function getTeacherAssignedGrades(req, res) {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({ where: { user_id: parseInt(id) } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const grades = await prisma.grade.findMany({
      where: { graded_by: teacher.teacher_id },
      include: {
        submission: { include: { assignment: true, student: true } },
        teacher: { include: { user: true } }
      },
      orderBy: { graded_at: 'desc' }
    });

    return res.json(grades);
  } catch (error) {
    console.error('Get teacher assigned grades error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * UPDATE USER
 * PUT /api/admin/users/:id
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, role, ...roleSpecificData } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update base user data
    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        full_name: full_name || existingUser.full_name,
        email: email || existingUser.email,
        phone_number: phone_number !== undefined ? phone_number : existingUser.phone_number
      }
    });

    // Update role-specific data if provided
    if (existingUser.role === 'TEACHER') {
      const teacherUpdateData = {};
      if (roleSpecificData.department !== undefined) {
        teacherUpdateData.department = roleSpecificData.department;
      }
      if (roleSpecificData.degree_level !== undefined) {
        teacherUpdateData.degree_level = roleSpecificData.degree_level.toString().toUpperCase();
      }
      if (roleSpecificData.gender !== undefined) {
        teacherUpdateData.gender = roleSpecificData.gender.toString().toUpperCase();
      }
      if (roleSpecificData.age !== undefined) {
        const parsedAge = Number(roleSpecificData.age);
        if (!Number.isNaN(parsedAge)) {
          teacherUpdateData.age = parsedAge;
        }
      }
      if (roleSpecificData.hire_date !== undefined) {
        const parsedHireDate = roleSpecificData.hire_date ? new Date(roleSpecificData.hire_date) : null;
        if (parsedHireDate && !Number.isNaN(parsedHireDate.getTime())) {
          teacherUpdateData.hire_date = parsedHireDate;
        }
      }
      if (roleSpecificData.experience_years !== undefined) {
        const parsedExperience = Number(roleSpecificData.experience_years);
        if (!Number.isNaN(parsedExperience)) {
          teacherUpdateData.experience_years = parsedExperience;
        }
      }
      if (roleSpecificData.grade_levels !== undefined && Array.isArray(roleSpecificData.grade_levels)) {
        teacherUpdateData.grade_levels = roleSpecificData.grade_levels.map((item) => Number(item));
      }
      if (roleSpecificData.subjects !== undefined && Array.isArray(roleSpecificData.subjects)) {
        teacherUpdateData.subjects = roleSpecificData.subjects.map((item) => String(item));
      }

      if (Object.keys(teacherUpdateData).length > 0) {
        await prisma.teacher.update({
          where: { user_id: parseInt(id) },
          data: teacherUpdateData
        });
      }
    }

    if (existingUser.role === 'STUDENT') {
      const studentUpdateData = {};
      if (roleSpecificData.current_class_id) {
        studentUpdateData.current_class_id = parseInt(roleSpecificData.current_class_id);
      }
      if (roleSpecificData.date_of_birth) {
        studentUpdateData.date_of_birth = new Date(roleSpecificData.date_of_birth);
      }
      if (roleSpecificData.gender) {
        studentUpdateData.gender = roleSpecificData.gender;
      }

      if (Object.keys(studentUpdateData).length > 0) {
        await prisma.student.update({
          where: { user_id: parseInt(id) },
          data: studentUpdateData
        });
      }
    }

    if (existingUser.role === 'PARENT') {
      const parentUpdateData = {};
      if (roleSpecificData.address !== undefined) {
        parentUpdateData.address = roleSpecificData.address;
      }
      if (roleSpecificData.preferred_language) {
        parentUpdateData.preferred_language = roleSpecificData.preferred_language;
      }
      if (roleSpecificData.relationship) {
        parentUpdateData.relationship = roleSpecificData.relationship;
      }

      if (Object.keys(parentUpdateData).length > 0) {
        await prisma.parent.update({
          where: { user_id: parseInt(id) },
          data: parentUpdateData
        });
      }
    }

    return res.json({
      message: 'User updated successfully',
      user_id: updatedUser.user_id
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * TOGGLE USER STATUS (Enable/Disable)
 * PATCH /api/admin/users/:id/status
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { is_active: is_active }
    });

    return res.json({
      message: `User ${is_active ? 'enabled' : 'disabled'} successfully`,
      user_id: updatedUser.user_id,
      is_active: updatedUser.is_active
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * RESET USER PASSWORD
 * POST /api/admin/users/:id/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { id } = req.params;

    // Generate new password
    const newPassword = generatePassword();

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { password_hash }
    });

    return res.json({
      message: 'Password reset successfully',
      password: newPassword
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE USER
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade will delete role-specific records)
    await prisma.user.delete({
      where: { user_id: parseInt(id) }
    });

    return res.json({
      message: 'User deleted successfully',
      user_id: parseInt(id)
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  registerUser,
  linkParentToStudent,
  getUsers,
  getUserById,
  getStudentGrades,
  getTeacherAssignedGrades,
  updateUser,
  toggleUserStatus,
  resetPassword,
  deleteUser
};
