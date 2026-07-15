const prisma = require('../config/prisma');

async function assignTeacherToClassSubject(req, res) {
  try {
    const { class_id, subject_id, teacher_id } = req.body;

    if (!class_id || !subject_id || !teacher_id) {
      return res.status(400).json({ error: 'class_id, subject_id and teacher_id are required.' });
    }

    const parsedClassId = Number(class_id);
    const parsedSubjectId = Number(subject_id);
    const parsedTeacherId = Number(teacher_id);

    if ([parsedClassId, parsedSubjectId, parsedTeacherId].some((value) => Number.isNaN(value) || value <= 0)) {
      return res.status(400).json({ error: 'class_id, subject_id and teacher_id must be valid positive numbers.' });
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
        teacher_id: parsedTeacherId
      }
    });

    return res.status(201).json(createdAssignment);
  } catch (error) {
    console.error('Error assigning teacher to class subject:', error);
    return res.status(500).json({ error: 'Unable to assign teacher to subject for the class.' });
  }
}

module.exports = {
  assignTeacherToClassSubject
};
