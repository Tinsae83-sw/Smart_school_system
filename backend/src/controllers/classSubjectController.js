const prisma = require('../config/prisma');

async function getAllClassSubjects(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const classSubjects = await prisma.classSubject.findMany({
      skip,
      take: limit,
      include: {
        school_class: {
          select: {
            class_id: true,
            class_name: true,
            academic_year: true
          }
        },
        subject: {
          select: {
            subject_id: true,
            subject_name: true,
            subject_code: true,
            credit_hour: true
          }
        },
        teacher: {
          select: {
            teacher_id: true,
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    const total = await prisma.classSubject.count();

    return res.status(200).json({
      class_subjects: classSubjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    return res.status(500).json({ error: 'Unable to fetch class subjects.' });
  }
}

async function assignTeacherToClassSubject(req, res) {
  try {
    const { class_id, subject_id, teacher_id, credit_hour } = req.body;

    if (!class_id || !subject_id || !teacher_id) {
      return res.status(400).json({ error: 'class_id, subject_id and teacher_id are required.' });
    }

    const parsedClassId = Number(class_id);
    const parsedSubjectId = Number(subject_id);
    const parsedTeacherId = Number(teacher_id);
    const parsedCreditHour = credit_hour ? Number(credit_hour) : 3;

    if ([parsedClassId, parsedSubjectId, parsedTeacherId].some((value) => Number.isNaN(value) || value <= 0)) {
      return res.status(400).json({ error: 'class_id, subject_id and teacher_id must be valid positive numbers.' });
    }

    if (Number.isNaN(parsedCreditHour) || parsedCreditHour <= 0) {
      return res.status(400).json({ error: 'credit_hour must be a valid positive number.' });
    }

    const [schoolClass, subject, teacher] = await Promise.all([
      prisma.schoolClass.findUnique({ where: { class_id: parsedClassId } }),
      prisma.subject.findUnique({ where: { subject_id: parsedSubjectId } }),
      prisma.teacher.findUnique({ where: { teacher_id: parsedTeacherId } })
    ]);

    if (!schoolClass) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    const existingAssignment = await prisma.classSubject.findFirst({
      where: {
        class_id: parsedClassId,
        subject_id: parsedSubjectId
      }
    });

    if (existingAssignment) {
      return res.status(409).json({ error: 'This class-subject combination already exists.' });
    }

    const createdAssignment = await prisma.classSubject.create({
      data: {
        class_id: parsedClassId,
        subject_id: parsedSubjectId,
        teacher_id: parsedTeacherId,
        credit_hour: parsedCreditHour
      }
    });

    return res.status(201).json(createdAssignment);
  } catch (error) {
    console.error('Error assigning teacher to class subject:', error);
    return res.status(500).json({ error: 'Unable to assign teacher to subject for the class.' });
  }
}

module.exports = {
  getAllClassSubjects,
  assignTeacherToClassSubject
};
