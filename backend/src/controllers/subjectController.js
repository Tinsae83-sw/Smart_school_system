const prisma = require('../config/prisma');

async function getSubjects(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const subjects = await prisma.subject.findMany({
      skip,
      take: limit,
      orderBy: { subject_name: 'asc' }
    });

    const total = await prisma.subject.count();

    return res.json({
      subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ error: 'Unable to load subjects' });
  }
}

async function createSubject(req, res) {
  try {
    const { subject_name, subject_code, credit_hour, department, grade_levels } = req.body;

    if (!subject_name || typeof subject_name !== 'string' || subject_name.trim().length < 2) {
      return res.status(400).json({ error: 'Subject name is required and must be at least 2 characters.' });
    }

    if (!subject_code || typeof subject_code !== 'string' || subject_code.trim().length < 2) {
      return res.status(400).json({ error: 'Subject code is required and must be at least 2 characters.' });
    }

    const creditHourValue = credit_hour ? parseInt(credit_hour) : 3;
    if (isNaN(creditHourValue) || creditHourValue < 1 || creditHourValue > 10) {
      return res.status(400).json({ error: 'Credit hour must be between 1 and 10.' });
    }

    let gradeLevelsValue = [];
    if (grade_levels && Array.isArray(grade_levels)) {
      gradeLevelsValue = grade_levels
        .map(g => parseInt(g))
        .filter(g => !isNaN(g) && g >= 1 && g <= 12);
    }

    const newSubject = await prisma.subject.create({
      data: {
        subject_name: subject_name.trim(),
        subject_code: subject_code.trim().toUpperCase(),
        credit_hour: creditHourValue,
        department: department ? department.trim() : null,
        grade_levels: gradeLevelsValue
      }
    });

    return res.status(201).json(newSubject);
  } catch (error) {
    console.error('Error creating subject:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Subject code already exists.' });
    }
    return res.status(500).json({ error: 'Unable to create subject.' });
  }
}

async function updateSubject(req, res) {
  try {
    const subjectId = Number(req.params.id);
    const { subject_name, subject_code, credit_hour, department, grade_levels } = req.body;

    if (!subjectId || Number.isNaN(subjectId)) {
      return res.status(400).json({ error: 'Invalid subject ID.' });
    }

    if (!subject_name || typeof subject_name !== 'string' || subject_name.trim().length < 2) {
      return res.status(400).json({ error: 'Subject name is required and must be at least 2 characters.' });
    }

    if (!subject_code || typeof subject_code !== 'string' || subject_code.trim().length < 2) {
      return res.status(400).json({ error: 'Subject code is required and must be at least 2 characters.' });
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { subject_id: subjectId }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const creditHourValue = credit_hour ? parseInt(credit_hour) : existingSubject.credit_hour;
    if (isNaN(creditHourValue) || creditHourValue < 1 || creditHourValue > 10) {
      return res.status(400).json({ error: 'Credit hour must be between 1 and 10.' });
    }

    let gradeLevelsValue = existingSubject.grade_levels || [];
    if (grade_levels !== undefined && Array.isArray(grade_levels)) {
      gradeLevelsValue = grade_levels
        .map(g => parseInt(g))
        .filter(g => !isNaN(g) && g >= 1 && g <= 12);
    }

    const updatedSubject = await prisma.subject.update({
      where: { subject_id: subjectId },
      data: {
        subject_name: subject_name.trim(),
        subject_code: subject_code.trim().toUpperCase(),
        credit_hour: creditHourValue,
        department: department ? department.trim() : existingSubject.department,
        grade_levels: gradeLevelsValue
      }
    });

    return res.json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Subject code already exists.' });
    }
    return res.status(500).json({ error: 'Unable to update subject.' });
  }
}

async function deleteSubject(req, res) {
  try {
    const subjectId = Number(req.params.id);

    if (!subjectId || Number.isNaN(subjectId)) {
      return res.status(400).json({ error: 'Invalid subject ID.' });
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { subject_id: subjectId }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    await prisma.subject.delete({
      where: { subject_id: subjectId }
    });

    return res.json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({ error: 'Unable to delete subject.' });
  }
}

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject
};
