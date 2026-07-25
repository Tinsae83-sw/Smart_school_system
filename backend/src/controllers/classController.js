const prisma = require('../config/prisma');

function buildClassName({ class_name, grade_level, section }) {
  const cleanedName = class_name?.toString().trim();
  if (cleanedName) return cleanedName;

  const cleanedGrade = grade_level?.toString().trim();
  if (!cleanedGrade) return '';

  const cleanedSection = section?.toString().trim();
  return cleanedSection ? `${cleanedGrade} ${cleanedSection}` : cleanedGrade;
}

async function getClasses(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const classes = await prisma.schoolClass.findMany({
      skip,
      take: limit,
      include: {
        homeroom_teacher: {
          select: {
            teacher_id: true,
            user: {
              select: { full_name: true }
            }
          }
        },
        _count: {
          select: { students: true }
        },
        class_subjects: {
          include: {
            subject: {
              select: { subject_id: true, subject_name: true, subject_code: true }
            },
            teacher: {
              select: {
                teacher_id: true,
                user: { select: { full_name: true } }
              }
            }
          }
        }
      },
      orderBy: { class_name: 'asc' }
    });

    const total = await prisma.schoolClass.count();

    const payload = classes.map((cls) => ({
      class_id: cls.class_id,
      class_name: cls.class_name,
      academic_year: cls.academic_year,
      homeroom_teacher_id: cls.homeroom_teacher_id,
      homeroom_teacher_name: cls.homeroom_teacher?.user?.full_name || null,
      student_count: cls._count?.students || 0,
      assigned_subjects: cls.class_subjects.map(cs => ({
        class_subject_id: cs.class_subject_id,
        subject_id: cs.subject.subject_id,
        subject_name: cs.subject.subject_name,
        subject_code: cs.subject.subject_code,
        teacher_id: cs.teacher.teacher_id,
        teacher_name: cs.teacher.user?.full_name || 'Unknown'
      }))
    }));

    return res.json({
      classes: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return res.status(500).json({ error: 'Unable to load classes.' });
  }
}

async function getClassRoster(req, res) {
  try {
    const classId = Number(req.params.id);
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ error: 'Invalid class ID.' });
    }

    const students = await prisma.student.findMany({
      where: { current_class_id: classId },
      include: {
        user: {
          select: {
            full_name: true,
            email: true
          }
        }
      },
      orderBy: { user: { full_name: 'asc' } }
    });

    const roster = students.map((student) => ({
      student_id: student.student_id,
      user_id: student.user_id,
      full_name: student.user?.full_name || 'Unknown',
      email: student.user?.email || '',
      student_number: student.student_number
    }));

    return res.json(roster);
  } catch (error) {
    console.error('Error fetching class roster:', error);
    return res.status(500).json({ error: 'Unable to load class roster.' });
  }
}

async function createClass(req, res) {
  try {
    const { class_name, grade_level, section, academic_year, homeroom_teacher_id } = req.body;
    const finalClassName = buildClassName({ class_name, grade_level, section });

    if (!finalClassName) {
      return res.status(400).json({ error: 'Class name or grade selection is required.' });
    }

    if (!academic_year || typeof academic_year !== 'string' || academic_year.trim().length < 4) {
      return res.status(400).json({ error: 'Academic year is required.' });
    }

    const parsedTeacherId = Number(homeroom_teacher_id);
    if (!parsedTeacherId || Number.isNaN(parsedTeacherId)) {
      return res.status(400).json({ error: 'Valid homeroom teacher ID is required.' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { teacher_id: parsedTeacherId } });
    if (!teacher) {
      return res.status(404).json({ error: 'Homeroom teacher not found.' });
    }

    const created = await prisma.schoolClass.create({
      data: {
        class_name: finalClassName,
        academic_year: academic_year.trim(),
        homeroom_teacher_id: parsedTeacherId
      }
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating class:', error);
    return res.status(500).json({ error: 'Unable to create class.' });
  }
}

async function updateClass(req, res) {
  try {
    const classId = Number(req.params.id);
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ error: 'Invalid class ID.' });
    }

    const { class_name, grade_level, section, academic_year, homeroom_teacher_id } = req.body;
    const finalClassName = buildClassName({ class_name, grade_level, section });

    if (!finalClassName) {
      return res.status(400).json({ error: 'Class name or grade selection is required.' });
    }

    if (!academic_year || typeof academic_year !== 'string' || academic_year.trim().length < 4) {
      return res.status(400).json({ error: 'Academic year is required.' });
    }

    const parsedTeacherId = Number(homeroom_teacher_id);
    if (!parsedTeacherId || Number.isNaN(parsedTeacherId)) {
      return res.status(400).json({ error: 'Valid homeroom teacher ID is required.' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { teacher_id: parsedTeacherId } });
    if (!teacher) {
      return res.status(404).json({ error: 'Homeroom teacher not found.' });
    }

    const existingClass = await prisma.schoolClass.findUnique({ where: { class_id: classId } });
    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const updated = await prisma.schoolClass.update({
      where: { class_id: classId },
      data: {
        class_name: finalClassName,
        academic_year: academic_year.trim(),
        homeroom_teacher_id: parsedTeacherId
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error updating class:', error);
    return res.status(500).json({ error: 'Unable to update class.' });
  }
}

async function deleteClass(req, res) {
  try {
    const classId = Number(req.params.id);
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ error: 'Invalid class ID.' });
    }

    const existingClass = await prisma.schoolClass.findUnique({ where: { class_id: classId } });
    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    await prisma.schoolClass.delete({ where: { class_id: classId } });
    return res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return res.status(500).json({ error: 'Unable to delete class.' });
  }
}

module.exports = {
  getClasses,
  getClassRoster,
  createClass,
  updateClass,
  deleteClass
};
// Export autoGenerateClasses
module.exports.autoGenerateClasses = autoGenerateClasses;

async function autoGenerateClasses(req, res) {
  try {
    const { grade, academic_year, max_per_class = 30, student_numbers = [] } = req.body;

    if (!grade || Number.isNaN(Number(grade))) {
      return res.status(400).json({ error: 'Valid numeric grade is required (e.g. 9).' });
    }

    if (!academic_year || typeof academic_year !== 'string') {
      return res.status(400).json({ error: 'Academic year is required.' });
    }

    const parsedGrade = Number(grade);
    const maxSize = Number(max_per_class) > 0 ? Number(max_per_class) : 30;

    // Fetch students by provided student_numbers; require at least one student
    let students = [];
    if (Array.isArray(student_numbers) && student_numbers.length > 0) {
      students = await prisma.student.findMany({
        where: { student_number: { in: student_numbers } },
        include: { user: { select: { full_name: true } } }
      });
    }

    if (students.length === 0) {
      return res.status(400).json({ error: 'No students provided or found. Provide student_numbers array.' });
    }

    // Sort students alphabetically by full name
    students.sort((a, b) => {
      const A = (a.user?.full_name || '').toLowerCase();
      const B = (b.user?.full_name || '').toLowerCase();
      return A < B ? -1 : A > B ? 1 : 0;
    });

    const total = students.length;
    const numClasses = Math.ceil(total / maxSize) || 1;

    // Find eligible homeroom teachers for this grade
    const eligibleTeachers = await prisma.teacher.findMany({ where: { grade_levels: { has: parsedGrade } }, include: { user: true } });
    if (eligibleTeachers.length === 0) {
      return res.status(400).json({ error: `No teachers available for grade ${parsedGrade}. Please assign grade levels to teachers first.` });
    }

    const createdClasses = [];

    for (let i = 0; i < numClasses; i++) {
      const sectionLetter = String.fromCharCode(65 + i); // A, B, C...
      const className = `Grade ${parsedGrade}${sectionLetter}`;

      // round-robin homeroom teacher assignment
      const teacher = eligibleTeachers[i % eligibleTeachers.length];

      const created = await prisma.schoolClass.create({
        data: {
          class_name: className,
          academic_year: academic_year.trim(),
          homeroom_teacher_id: teacher.teacher_id
        }
      });

      createdClasses.push(created);
    }

    // Assign students to classes in order
    for (let idx = 0; idx < students.length; idx++) {
      const clsIndex = Math.floor(idx / maxSize);
      const targetClass = createdClasses[clsIndex];
      const student = students[idx];

      await prisma.student.update({ where: { student_id: student.student_id }, data: { current_class_id: targetClass.class_id } });
    }

    return res.status(201).json({ message: 'Classes created and students assigned', classes: createdClasses.length });
  } catch (error) {
    console.error('Error auto-generating classes:', error);
    return res.status(500).json({ error: 'Unable to auto-generate classes.' });
  }
}
