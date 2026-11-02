/**
 * Validation middleware for PTSA (Parent-Teacher-Student Association) operations
 *
 * Follows the same pattern as teacherValidators.js: every validator collects
 * all problems into an `errors` array and rejects with 400 + details, so the
 * client sees every issue at once instead of failing one field at a time.
 *
 * Controllers keep their own defensive checks; these validators add
 * length/range/type constraints BEFORE the request reaches Prisma, so malformed
 * input can never produce a PrismaClientValidationError or a partial write.
 */

// ---------- shared helpers ----------

function asString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return { invalid: true };
  return value.trim();
}

function requireText(errors, label, value, min, max) {
  const v = asString(value);
  if (v === null || v === '') {
    errors.push(`${label} is required`);
    return null;
  }
  if (v.invalid) {
    errors.push(`${label} must be text`);
    return null;
  }
  if (v.length < min) {
    errors.push(`${label} must be at least ${min} characters`);
    return null;
  }
  if (v.length > max) {
    errors.push(`${label} must not exceed ${max} characters`);
    return null;
  }
  return v;
}

function optionalText(errors, label, value, max) {
  if (value === undefined || value === null || value === '') return null;
  const v = asString(value);
  if (v.invalid) {
    errors.push(`${label} must be text`);
    return null;
  }
  if (v.length > max) {
    errors.push(`${label} must not exceed ${max} characters`);
    return null;
  }
  return v;
}

function requireInt(errors, label, value) {
  const n = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(n) || !Number.isInteger(n) || n <= 0) {
    errors.push(`${label} must be a positive integer`);
    return null;
  }
  return n;
}

function requireDate(errors, label, value, { mustBeFuture = false } = {}) {
  if (!value) {
    errors.push(`${label} is required`);
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.push(`${label} must be a valid date`);
    return null;
  }
  if (mustBeFuture && d.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    errors.push(`${label} must not be in the past`);
    return null;
  }
  return d;
}

function requireOneOf(errors, label, value, allowed, { optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    errors.push(`${label} is required`);
    return null;
  }
  if (!allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}`);
    return null;
  }
  return value;
}

function reject(errors, res) {
  res.status(400).json({ error: 'Validation failed', details: errors });
}

// ---------- PTSA validators ----------

/**
 * POST /api/ptsa/meetings
 */
function validateMeetingCreation(req, res, next) {
  const errors = [];
  const { title, description, date, time, location, agenda } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  optionalText(errors, 'Description', description, 5000);
  requireDate(errors, 'Date', date, { mustBeFuture: true });

  if (!time) {
    errors.push('Time is required');
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time).trim())) {
    errors.push('Time must be in 24-hour HH:MM format');
  }

  optionalText(errors, 'Location', location, 100);
  optionalText(errors, 'Agenda', agenda, 5000);

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/meetings/minutes
 */
function validateMeetingMinutes(req, res, next) {
  const errors = [];
  const { meeting_id, content, action_items } = req.body;

  requireInt(errors, 'Meeting ID', meeting_id);
  requireText(errors, 'Content', content, 10, 10000);
  optionalText(errors, 'Action items', action_items, 5000);

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/financial/budget-advisory
 */
function validateBudgetAdvisory(req, res, next) {
  const errors = [];
  requireText(errors, 'Advisory', req.body.advisory, 10, 5000);
  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/feedback-items
 */
function validateFeedbackItem(req, res, next) {
  const errors = [];
  const { subject, message, category, recipient_role } = req.body;

  requireText(errors, 'Subject', subject, 3, 200);
  requireText(errors, 'Message', message, 10, 5000);
  requireOneOf(errors, 'Category', category,
    ['General', 'Academic', 'Facilities', 'Safety', 'Finance', 'Other'], { optional: true });
  requireOneOf(errors, 'Recipient role', recipient_role,
    ['PRINCIPAL', 'VP_ACADEMIC', 'VP_ADMINISTRATION', 'TEACHER', 'ADMIN'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/ptsa-announcements
 */
function validateAnnouncement(req, res, next) {
  const errors = [];
  const { title, message, target_audience } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Message', message, 10, 5000);
  requireOneOf(errors, 'Target audience', target_audience,
    ['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS', 'STAFF'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/surveys
 */
function validateSurveyCreation(req, res, next) {
  const errors = [];
  const { title, description, target_audience, questions } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Description', description, 10, 2000);
  requireOneOf(errors, 'Target audience', target_audience,
    ['ALL_PARENTS', 'PARENTS', 'PTSA_MEMBERS', 'ALL'], { optional: true });

  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('Questions must be a non-empty array');
  } else if (questions.length > 50) {
    errors.push('A survey may contain at most 50 questions');
  } else {
    questions.forEach((q, i) => {
      const prefix = `Question #${i + 1}`;
      if (!q || typeof q !== 'object') {
        errors.push(`${prefix} must be an object`);
        return;
      }
      const text = asString(q.question_text);
      if (!text || text.invalid || text.length < 3 || text.length > 500) {
        errors.push(`${prefix}: question_text must be between 3 and 500 characters`);
      }
      const type = q.question_type;
      if (!['TEXT', 'MULTIPLE_CHOICE', 'RATING', 'BOOLEAN', 'SCALE'].includes(type)) {
        errors.push(`${prefix}: question_type must be one of TEXT, MULTIPLE_CHOICE, RATING, BOOLEAN, SCALE`);
      }
      if (type === 'MULTIPLE_CHOICE' && (!Array.isArray(q.options) || q.options.length < 2)) {
        errors.push(`${prefix}: multiple-choice questions need at least 2 options`);
      }
    });
  }

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/compliance/policy-proposals
 */
function validatePolicyProposal(req, res, next) {
  const errors = [];
  const { title, description, category } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Description', description, 10, 5000);
  requireOneOf(errors, 'Category', category,
    ['General', 'Academic', 'Discipline', 'Finance', 'Safety', 'Infrastructure'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/sic/feedback  (SIP feedback from the PTSA side)
 */
function validateSIPFeedback(req, res, next) {
  const errors = [];
  requireText(errors, 'Feedback', req.body.feedback, 10, 5000);
  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/discussions
 */
function validateDiscussionCreation(req, res, next) {
  const errors = [];
  const { title, description, category } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Description', description, 10, 5000);
  optionalText(errors, 'Category', category, 100);

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/discussions/:id/messages
 */
function validateDiscussionMessage(req, res, next) {
  const errors = [];
  requireInt(errors, 'Discussion ID', req.params.id);
  requireText(errors, 'Content', req.body.content, 1, 5000);
  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/ptsa/surveys/:id/send  and  POST /api/ptsa/meetings/:id/invite
 */
function validateIdParam(req, res, next) {
  const errors = [];
  requireInt(errors, 'ID', req.params.id);
  if (errors.length) return reject(errors, res);
  next();
}

module.exports = {
  validateMeetingCreation,
  validateMeetingMinutes,
  validateBudgetAdvisory,
  validateFeedbackItem,
  validateAnnouncement,
  validateSurveyCreation,
  validatePolicyProposal,
  validateSIPFeedback,
  validateDiscussionCreation,
  validateDiscussionMessage,
  validateIdParam,
};
