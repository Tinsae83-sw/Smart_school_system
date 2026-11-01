const prisma = require('../config/prisma');

/**
 * PUBLIC CONTROLLER
 * Handles public-facing data for landing page and general school information
 */

/**
 * Get School Information for Landing Page
 * GET /api/public/school-info
 */
exports.getSchoolInfo = async (req, res) => {
  try {
    // Get school profile from database
    const schoolProfile = await prisma.schoolProfile.findFirst();

    // Get basic school statistics
    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.teacher.count();
    const totalClasses = await prisma.schoolClass.count();
    const totalDepartments = await prisma.department.count();

    // Get departments
    const departments = await prisma.department.findMany({
      where: { is_active: true },
      select: {
        department_id: true,
        name: true,
        code: true,
        description: true
      }
    });

    // Get grade levels (unique grade levels from students)
    const students = await prisma.student.findMany({
      select: { grade_level: true },
      distinct: ['grade_level']
    });

    const gradeLevels = students
      .map(s => s.grade_level)
      .filter(g => g !== null)
      .sort((a, b) => a - b);

    res.json({
      success: true,
      data: {
        school_name: schoolProfile?.school_name || 'Yekatit 25/67 Secondary School',
        school_name_amharic: 'የካቲት 25/67 ትምህርት ቤት',
        tagline: schoolProfile?.motto || 'Building Knowledge. Inspiring Character. Shaping the Future.',
        mission: schoolProfile?.vision_statement || 'To provide quality education through effective teaching, modern learning approaches, strong ethical values, and meaningful collaboration between students, teachers, parents, and the wider community.',
        vision: schoolProfile?.vision_statement,
        grades_offered: schoolProfile?.grades_offered,
        school_type: schoolProfile?.school_type,
        established_date: schoolProfile?.established_date,
        principal_name: schoolProfile?.principal_name,
        student_capacity: schoolProfile?.student_capacity,
        current_term: schoolProfile?.current_term,
        statistics: {
          total_students: totalStudents,
          total_teachers: totalTeachers,
          total_classes: totalClasses,
          total_departments: totalDepartments
        },
        departments,
        grade_levels: gradeLevels
      }
    });
  } catch (error) {
    console.error('Error fetching school info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school information'
    });
  }
};

/**
 * Get Academic Programs for Landing Page
 * GET /api/public/academic-programs
 */
exports.getAcademicPrograms = async (req, res) => {
  try {
    // Get school profile to check grades offered
    const schoolProfile = await prisma.schoolProfile.findFirst();
    
    // Parse grades_offered - it might be a string like "9-12" or an array
    let gradesOffered = [9, 10, 11, 12];
    if (schoolProfile?.grades_offered) {
      if (Array.isArray(schoolProfile.grades_offered)) {
        gradesOffered = schoolProfile.grades_offered;
      } else if (typeof schoolProfile.grades_offered === 'string') {
        // Parse string like "9-12" into [9, 10, 11, 12]
        const match = schoolProfile.grades_offered.match(/(\d+)-(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = parseInt(match[2]);
          gradesOffered = [];
          for (let i = start; i <= end; i++) {
            gradesOffered.push(i);
          }
        }
      }
    }

    // Get subjects by grade level
    const subjects = await prisma.subject.findMany({
      where: {
        grade_levels: {
          isEmpty: false
        }
      },
      select: {
        subject_id: true,
        subject_name: true,
        subject_code: true,
        credit_hour: true,
        department: true,
        grade_levels: true
      }
    });

    // Group subjects by grade level
    const programsByGrade = {};
    subjects.forEach(subject => {
      subject.grade_levels.forEach(grade => {
        if (!programsByGrade[grade]) {
          programsByGrade[grade] = {
            grade: `Grade ${grade}`,
            subjects: []
          };
        }
        programsByGrade[grade].subjects.push({
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          credit_hour: subject.credit_hour,
          department: subject.department
        });
      });
    });

    // Use grades from school profile or default to 9-12
    const grades = gradesOffered.length > 0 ? gradesOffered : [9, 10, 11, 12];
    const result = grades.map(grade => {
      const program = programsByGrade[grade] || { grade: `Grade ${grade}`, subjects: [] };
      
      // Add descriptions based on grade level
      const descriptions = {
        9: 'Strong foundation for secondary education, with emphasis on core academic subjects and study skills.',
        10: 'Development of deeper subject knowledge, critical thinking, and preparation for national academic requirements.',
        11: 'Advanced academic preparation and development of skills required for higher education and future careers.',
        12: 'Focused preparation for higher education, examinations, and transition into university or professional pathways.'
      };

      return {
        ...program,
        description: descriptions[grade] || ''
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching academic programs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academic programs'
    });
  }
};

/**
 * Get Contact Information for Landing Page
 * GET /api/public/contact-info
 */
exports.getContactInfo = async (req, res) => {
  try {
    // Get school profile from database
    const schoolProfile = await prisma.schoolProfile.findFirst();

    res.json({
      success: true,
      data: {
        school_name: schoolProfile?.school_name || 'Yekatit 25/67 Secondary School',
        address: schoolProfile?.address || '[Official School Address]',
        phone: schoolProfile?.phone_number || '[Official Phone Number]',
        email: schoolProfile?.email || 'info@yekatit25-67.edu',
        tagline: schoolProfile?.motto || 'Building Knowledge. Inspiring Character. Shaping the Future.',
        school_code: schoolProfile?.school_code,
        woreda: schoolProfile?.woreda,
        zone: schoolProfile?.zone,
        region: schoolProfile?.region
      }
    });
  } catch (error) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact information'
    });
  }
};
