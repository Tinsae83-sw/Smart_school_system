/**
 * Validation middleware for Teacher operations
 */

function validateAssignmentCreation(req, res, next) {
  const errors = [];
  const {
    class_subject_id,
    class_subject_ids,
    individual_assignments,
    student_id,
    title,
    description,
    due_date,
    max_score,
    allow_resubmission,
    resubmission_deadline,
    max_resubmissions
  } = req.body;

  // Case 1: Individual assignments with different titles for different students
  if (individual_assignments !== undefined) {
    if (!Array.isArray(individual_assignments) || individual_assignments.length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['individual_assignments must be a non-empty array of student assignment items']
      });
    }

    if (!class_subject_id || isNaN(parseInt(class_subject_id))) {
      errors.push('A valid target class_subject_id is required');
    }

    const defaultDueDate = due_date ? new Date(due_date) : null;
    if (due_date) {
      if (isNaN(defaultDueDate.getTime())) {
        errors.push('Default due_date has an invalid date format');
      } else if (defaultDueDate <= new Date()) {
        errors.push('Default due_date must be in the future');
      }
    }

    const defaultMaxScore = max_score !== undefined ? parseFloat(max_score) : 100;
    if (isNaN(defaultMaxScore) || defaultMaxScore <= 0 || defaultMaxScore > 1000) {
      errors.push('Default max_score must be a number between 1 and 1000');
    }

    individual_assignments.forEach((item, index) => {
      const itemPrefix = `Assignment #${index + 1}`;
      if (!item.student_id || isNaN(parseInt(item.student_id))) {
        errors.push(`${itemPrefix}: Valid student_id is required`);
      }

      if (!item.title || typeof item.title !== 'string' || item.title.trim().length < 3 || item.title.trim().length > 200) {
        errors.push(`${itemPrefix}: Title must be between 3 and 200 characters`);
      }

      if (item.description && typeof item.description === 'string' && item.description.length > 2000) {
        errors.push(`${itemPrefix}: Description cannot exceed 2000 characters`);
      }

      if (item.max_score !== undefined) {
        const itemScore = parseFloat(item.max_score);
        if (isNaN(itemScore) || itemScore <= 0 || itemScore > 1000) {
          errors.push(`${itemPrefix}: Maximum score must be between 1 and 1000`);
        }
      }

      if (item.due_date) {
        const itemDueDate = new Date(item.due_date);
        if (isNaN(itemDueDate.getTime())) {
          errors.push(`${itemPrefix}: Invalid due date format`);
        } else if (itemDueDate <= new Date()) {
          errors.push(`${itemPrefix}: Due date must be in the future`);
        }
      } else if (!defaultDueDate) {
        errors.push(`${itemPrefix}: Due date is required either individually or globally`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    return next();
  }

  // Case 2: Class-wide assignment(s) for single or multiple classes
  const targetIds = Array.isArray(class_subject_ids)
    ? class_subject_ids
    : class_subject_id
    ? [class_subject_id]
    : [];

  if (targetIds.length === 0) {
    errors.push('At least one class/subject must be selected (class_subject_id or class_subject_ids)');
  } else {
    for (const id of targetIds) {
      if (!id || isNaN(parseInt(id))) {
        errors.push(`Invalid class_subject_id: ${id}`);
      }
    }
  }

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Assignment title must be between 3 and 200 characters');
  }

  if (description && typeof description === 'string' && description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }

  if (!due_date) {
    errors.push('Due date is required');
  } else {
    const parsedDate = new Date(due_date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid due date format');
    } else if (parsedDate <= new Date()) {
      errors.push('Due date must be in the future');
    }
  }

  const parsedMaxScore = parseFloat(max_score);
  if (isNaN(parsedMaxScore) || parsedMaxScore <= 0 || parsedMaxScore > 1000) {
    errors.push('Maximum score must be a number between 1 and 1000');
  }

  if (allow_resubmission && resubmission_deadline) {
    const parsedResub = new Date(resubmission_deadline);
    const parsedDue = new Date(due_date);
    if (isNaN(parsedResub.getTime())) {
      errors.push('Invalid resubmission deadline format');
    } else if (parsedResub <= parsedDue) {
      errors.push('Resubmission deadline must be after the original due date');
    }
  }

  if (max_resubmissions !== undefined) {
    const maxResub = parseInt(max_resubmissions);
    if (isNaN(maxResub) || maxResub < 1 || maxResub > 10) {
      errors.push('Maximum resubmissions must be an integer between 1 and 10');
    }
  }

  if (student_id !== undefined && (isNaN(parseInt(student_id)) || parseInt(student_id) <= 0)) {
    errors.push('Student ID must be a valid positive integer');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateAssignmentUpdate(req, res, next) {
  const errors = [];
  const { assignmentId } = req.params;
  const {
    title,
    description,
    due_date,
    max_score,
    allow_resubmission,
    resubmission_deadline,
    max_resubmissions
  } = req.body;

  if (!assignmentId || isNaN(parseInt(assignmentId))) {
    errors.push('Valid assignment ID is required in URL');
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200)) {
    errors.push('Title must be between 3 and 200 characters');
  }

  if (description !== undefined && typeof description === 'string' && description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }

  if (due_date !== undefined) {
    const parsedDue = new Date(due_date);
    if (isNaN(parsedDue.getTime())) {
      errors.push('Invalid due date format');
    } else if (parsedDue <= new Date()) {
      errors.push('Due date must be in the future');
    }
  }

  if (max_score !== undefined) {
    const parsedScore = parseFloat(max_score);
    if (isNaN(parsedScore) || parsedScore <= 0 || parsedScore > 1000) {
      errors.push('Maximum score must be a number between 1 and 1000');
    }
  }

  if (allow_resubmission && resubmission_deadline) {
    const parsedResub = new Date(resubmission_deadline);
    if (isNaN(parsedResub.getTime())) {
      errors.push('Invalid resubmission deadline format');
    }
  }

  if (max_resubmissions !== undefined) {
    const parsedMaxResub = parseInt(max_resubmissions);
    if (isNaN(parsedMaxResub) || parsedMaxResub < 1 || parsedMaxResub > 10) {
      errors.push('Maximum resubmissions must be an integer between 1 and 10');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateGradeSubmission(req, res, next) {
  const errors = [];
  const { assignmentId } = req.params;
  const { submission_id, score, feedback } = req.body;

  if (!assignmentId || isNaN(parseInt(assignmentId))) {
    errors.push('Valid assignment ID is required in URL');
  }

  if (!submission_id || isNaN(parseInt(submission_id))) {
    errors.push('Valid submission_id is required');
  }

  const parsedScore = parseFloat(score);
  if (score === undefined || score === null || isNaN(parsedScore) || parsedScore < 0) {
    errors.push('Score must be a non-negative number');
  }

  if (feedback && typeof feedback === 'string' && feedback.length > 1000) {
    errors.push('Feedback cannot exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateBulkGrade(req, res, next) {
  const errors = [];
  const { assignmentId } = req.params;
  const { grades } = req.body;

  if (!assignmentId || isNaN(parseInt(assignmentId))) {
    errors.push('Valid assignment ID is required in URL');
  }

  if (!grades || !Array.isArray(grades) || grades.length === 0) {
    errors.push('Grades array must contain at least one submission');
  } else {
    grades.forEach((g, idx) => {
      if (!g.submission_id || isNaN(parseInt(g.submission_id))) {
        errors.push(`Row #${idx + 1}: Valid submission_id is required`);
      }
      const score = parseFloat(g.score);
      if (isNaN(score) || score < 0) {
        errors.push(`Row #${idx + 1}: Score must be a non-negative number`);
      }
      if (g.feedback && typeof g.feedback === 'string' && g.feedback.length > 1000) {
        errors.push(`Row #${idx + 1}: Feedback cannot exceed 1000 characters`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateAttendance(req, res, next) {
  const errors = [];
  const { class_id, date } = req.body;
  const records = req.body.entries || req.body.records;

  if (!class_id || isNaN(parseInt(class_id))) {
    errors.push('Valid class_id is required');
  }

  if (!date) {
    errors.push('Date is required');
  } else {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid date format');
    }
  }

  if (!records || !Array.isArray(records) || records.length === 0) {
    errors.push('Records or entries array must contain at least one student attendance record');
  } else {
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    records.forEach((rec, idx) => {
      if (!rec.student_id || isNaN(parseInt(rec.student_id))) {
        errors.push(`Record #${idx + 1}: Valid student_id is required`);
      }
      if (!rec.status || !validStatuses.includes(rec.status)) {
        errors.push(`Record #${idx + 1}: Status must be PRESENT, ABSENT, LATE, or EXCUSED`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateBulkMarks(req, res, next) {
  const errors = [];
  const { class_id, subject_id, type, marks } = req.body;

  if (!class_id || isNaN(parseInt(class_id))) {
    errors.push('Valid class_id is required');
  }

  if (!subject_id || isNaN(parseInt(subject_id))) {
    errors.push('Valid subject_id is required');
  }

  const validTypes = ['TEST', 'MID', 'FINAL', 'ASSIGNMENT', 'OTHER'];
  if (!type || !validTypes.includes(type.toUpperCase())) {
    errors.push('Mark type must be one of: TEST, MID, FINAL, ASSIGNMENT, OTHER');
  }

  if (!marks || !Array.isArray(marks) || marks.length === 0) {
    errors.push('Marks array must contain at least one student entry');
  } else {
    marks.forEach((m, idx) => {
      if (!m.student_id || isNaN(parseInt(m.student_id))) {
        errors.push(`Row #${idx + 1}: Valid student_id is required`);
      }
      const score = parseFloat(m.score);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`Row #${idx + 1}: Score must be a number between 0 and 100`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateConduct(req, res, next) {
  const errors = [];
  const { student_id, class_id, score, comment } = req.body;

  if (!student_id || isNaN(parseInt(student_id))) {
    errors.push('Valid student_id is required');
  }

  if (!class_id || isNaN(parseInt(class_id))) {
    errors.push('Valid class_id is required');
  }

  if (score !== undefined) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      errors.push('Score must be a number between 0 and 100');
    }
  }

  if (comment && typeof comment === 'string' && comment.length > 500) {
    errors.push('Comment cannot exceed 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateLessonPlan(req, res, next) {
  const errors = [];
  const { class_id, subject_id, title, week_number, start_date } = req.body;

  if (!class_id || isNaN(parseInt(class_id))) {
    errors.push('Valid class_id is required');
  }

  if (!subject_id || isNaN(parseInt(subject_id))) {
    errors.push('Valid subject_id is required');
  }

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Lesson plan title must be between 3 and 200 characters');
  }

  if (week_number !== undefined) {
    const week = parseInt(week_number);
    if (isNaN(week) || week < 1 || week > 52) {
      errors.push('Week number must be between 1 and 52');
    }
  }

  if (start_date) {
    const parsed = new Date(start_date);
    if (isNaN(parsed.getTime())) {
      errors.push('Invalid start_date format');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateCourseMaterial(req, res, next) {
  const errors = [];
  const { class_subject_id, title } = req.body;

  if (!class_subject_id || isNaN(parseInt(class_subject_id))) {
    errors.push('Valid class_subject_id is required');
  }

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Material title must be between 3 and 200 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateOnlineClass(req, res, next) {
  const errors = [];
  const { class_subject_id, title, scheduled_start, duration_minutes } = req.body;

  if (!class_subject_id || isNaN(parseInt(class_subject_id))) {
    errors.push('Valid class_subject_id is required');
  }

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Online class title must be between 3 and 200 characters');
  }

  if (!scheduled_start) {
    errors.push('scheduled_start is required');
  } else {
    const parsedStart = new Date(scheduled_start);
    if (isNaN(parsedStart.getTime())) {
      errors.push('Invalid scheduled_start format');
    }
  }

  if (duration_minutes !== undefined) {
    const dur = parseInt(duration_minutes);
    if (isNaN(dur) || dur < 5 || dur > 360) {
      errors.push('Duration must be between 5 and 360 minutes');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

module.exports = {
  validateAssignmentCreation,
  validateAssignmentUpdate,
  validateGradeSubmission,
  validateBulkGrade,
  validateAttendance,
  validateBulkMarks,
  validateConduct,
  validateLessonPlan,
  validateCourseMaterial,
  validateOnlineClass
};
