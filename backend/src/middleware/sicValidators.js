/**
 * Validation middleware for SIC (School Improvement Committee) operations
 *
 * Same pattern as teacherValidators.js / ptsaValidators.js: collect every
 * problem, reject once with 400 + details. These checks run before the
 * controller, so bad input never reaches Prisma.
 */

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

// ---------- SIC validators ----------

/**
 * POST /api/sic/sip/feedback
 */
function validateSIPFeedback(req, res, next) {
  const errors = [];
  const { sip_id, feedback } = req.body;

  requireInt(errors, 'SIP ID', sip_id);
  requireText(errors, 'Feedback', feedback, 10, 5000);

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/sip/amendments
 */
function validateSIPAmendment(req, res, next) {
  const errors = [];
  const { sip_id, amendment_title, amendment_description, priority } = req.body;

  requireInt(errors, 'SIP ID', sip_id);
  requireText(errors, 'Amendment title', amendment_title, 3, 200);
  requireText(errors, 'Amendment description', amendment_description, 10, 5000);
  requireOneOf(errors, 'Priority', priority, ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/meetings/agenda-items
 */
function validateAgendaItem(req, res, next) {
  const errors = [];
  const { meeting_id, title, description, priority } = req.body;

  requireInt(errors, 'Meeting ID', meeting_id);
  requireText(errors, 'Title', title, 3, 200);
  optionalText(errors, 'Description', description, 5000);
  requireOneOf(errors, 'Priority', priority, ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/meetings/resolutions/:resolutionId/vote
 */
function validateResolutionVote(req, res, next) {
  const errors = [];
  requireInt(errors, 'Resolution ID', req.params.resolutionId);
  requireOneOf(errors, 'Vote', req.body.vote, ['for', 'against', 'abstain']);
  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/needs-assessments
 */
function validateNeedsAssessment(req, res, next) {
  const errors = [];
  const { assessment_name, academic_year, assessment_type, questions, target_audience } = req.body;

  requireText(errors, 'Assessment name', assessment_name, 3, 200);
  requireOneOf(errors, 'Assessment type', assessment_type,
    ['NEEDS', 'SATISFACTION', 'READINESS', 'RESOURCE']);
  if (academic_year !== undefined && academic_year !== null && academic_year !== '') {
    if (!/^\d{4}-\d{4}$/.test(String(academic_year))) {
      errors.push('Academic year must be in YYYY-YYYY format');
    }
  }
  if (questions === undefined || questions === null || questions === '') {
    errors.push('Questions are required');
  } else if (typeof questions === 'string') {
    if (questions.trim().length < 3) errors.push('Questions must be at least 3 characters');
  } else if (!Array.isArray(questions)) {
    errors.push('Questions must be text or an array of questions');
  } else if (questions.length === 0) {
    errors.push('Questions must be a non-empty array');
  }
  requireOneOf(errors, 'Target audience', target_audience,
    ['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/partnerships/suggest
 */
function validatePartnerSuggestion(req, res, next) {
  const errors = [];
  const {
    partner_name, partner_type, partnership_type,
    description, contact_person, contact_email, contact_phone,
  } = req.body;

  requireText(errors, 'Partner name', partner_name, 2, 200);
  requireOneOf(errors, 'Partner type', partner_type,
    ['NGO', 'GOVERNMENT', 'PRIVATE', 'COMMUNITY', 'DONOR', 'ACADEMIC', 'OTHER']);
  requireOneOf(errors, 'Partnership type', partnership_type,
    ['COMMUNITY', 'SPONSORSHIP', 'TRAINING', 'RESOURCE_SHARING', 'TECHNICAL', 'RESEARCH'], { optional: true });
  optionalText(errors, 'Description', description, 2000);
  optionalText(errors, 'Contact person', contact_person, 100);

  if (contact_email !== undefined && contact_email !== null && contact_email !== '') {
    const email = asString(contact_email);
    if (email.invalid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Contact email must be a valid email address');
    }
  }

  if (contact_phone !== undefined && contact_phone !== null && contact_phone !== '') {
    const phone = asString(contact_phone);
    if (phone.invalid || !/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      errors.push('Contact phone must be a valid phone number (7-20 digits)');
    }
  }

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/annual-report
 */
function validateAnnualReport(req, res, next) {
  const errors = [];
  const { academic_year, report_data, achievements, recommendations } = req.body;

  if (!academic_year || !/^\d{4}-\d{4}$/.test(String(academic_year))) {
    errors.push('Academic year is required in YYYY-YYYY format');
  }

  if (report_data === undefined || report_data === null || report_data === '') {
    errors.push('Report data is required');
  } else if (typeof report_data === 'string') {
    if (report_data.trim().length < 10) errors.push('Report data must be at least 10 characters');
  } else if (typeof report_data !== 'object') {
    errors.push('Report data must be text or an object');
  }

  optionalText(errors, 'Achievements', achievements, 10000);
  optionalText(errors, 'Recommendations', recommendations, 10000);

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/recommendations
 */
function validateRecommendation(req, res, next) {
  const errors = [];
  const { title, description, category, priority } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Description', description, 10, 5000);
  requireOneOf(errors, 'Category', category,
    ['ACADEMIC', 'FINANCE', 'INFRASTRUCTURE', 'DISCIPLINE', 'SAFETY', 'GENERAL']);
  requireOneOf(errors, 'Priority', priority, ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/announcements
 */
function validateSICAnnouncement(req, res, next) {
  const errors = [];
  const { title, content, announcement_type, target_audience } = req.body;

  requireText(errors, 'Title', title, 3, 200);
  requireText(errors, 'Content', content, 10, 5000);
  requireOneOf(errors, 'Announcement type', announcement_type,
    ['GENERAL', 'URGENT', 'ACADEMIC', 'ADMINISTRATIVE'], { optional: true });
  requireOneOf(errors, 'Target audience', target_audience,
    ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'STAFF'], { optional: true });

  if (errors.length) return reject(errors, res);
  next();
}

/**
 * POST /api/sic/training/:trainingId/complete
 */
function validateTrainingCompletion(req, res, next) {
  const errors = [];
  const { feedback, rating } = req.body;

  requireInt(errors, 'Training ID', req.params.trainingId);

  if (feedback !== undefined && feedback !== null && feedback !== '') {
    optionalText(errors, 'Feedback', feedback, 2000);
  }

  if (rating !== undefined && rating !== null && rating !== '') {
    const n = Number(rating);
    if (Number.isNaN(n) || n < 1 || n > 5) {
      errors.push('Rating must be a number between 1 and 5');
    }
  }

  if (errors.length) return reject(errors, res);
  next();
}

module.exports = {
  validateSIPFeedback,
  validateSIPAmendment,
  validateAgendaItem,
  validateResolutionVote,
  validateNeedsAssessment,
  validatePartnerSuggestion,
  validateAnnualReport,
  validateRecommendation,
  validateSICAnnouncement,
  validateTrainingCompletion,
};
