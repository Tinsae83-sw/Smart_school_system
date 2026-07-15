const prisma = require('../config/prisma');

async function getSubjects(req, res) {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { subject_name: 'asc' }
    });
    return res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ error: 'Unable to load subjects' });
  }
}

async function createSubject(req, res) {
  try {
    const { subject_name, subject_code } = req.body;

    if (!subject_name || typeof subject_name !== 'string' || subject_name.trim().length < 2) {
      return res.status(400).json({ error: 'Subject name is required and must be at least 2 characters.' });
    }

    if (!subject_code || typeof subject_code !== 'string' || subject_code.trim().length < 2) {
      return res.status(400).json({ error: 'Subject code is required and must be at least 2 characters.' });
    }

    const newSubject = await prisma.subject.create({
      data: {
        subject_name: subject_name.trim(),
        subject_code: subject_code.trim().toUpperCase()
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
    const { subject_name, subject_code } = req.body;

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

    const updatedSubject = await prisma.subject.update({
      where: { subject_id: subjectId },
      data: {
        subject_name: subject_name.trim(),
        subject_code: subject_code.trim().toUpperCase()
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
