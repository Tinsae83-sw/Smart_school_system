/**
 * Validation middleware for the REGISTRATION actor (student registration)
 *
 * Mirrors the constraints enforced inside userController.registerUser, but
 * runs BEFORE the controller so the whole error list is returned at once and
 * no User row is ever created and rolled back for a formatting problem.
 *
 * student_number format: STU-YYYY-XXXX (same regex the controller enforces)
 */

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  return /^\+251\d{9}$/.test(String(value).trim());
}

/**
 * POST /api/registration/students
 */
function validateStudentRegistration(req, res, next) {
  const errors = [];
  const body = req.body || {};

  const {
    full_name,
    email,
    phone_number,
    password,
    student_number,
    enrollment_date,
    current_class_name,
    date_of_birth,
    gender,
  } = body;

  // ---- identity ----
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 3) {
    errors.push('Full name must be at least 3 characters');
  } else if (full_name.trim().length > 100) {
    errors.push('Full name must not exceed 100 characters');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required');
  } else if (String(email).trim().length > 100) {
    errors.push('Email must not exceed 100 characters');
  }

  if (phone_number && !isValidPhone(phone_number)) {
    errors.push('Phone must be in format +251XXXXXXXXX');
  }

  if (!password || String(password).length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (String(password).length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // ---- student record ----
  if (!student_number || !/^STU-\d{4}-\d{4}$/.test(String(student_number).trim())) {
    errors.push('Student number must be in format STU-YYYY-XXXX (e.g. STU-2026-0001)');
  }

  if (!enrollment_date) {
    errors.push('Enrollment date is required');
  } else {
    const d = new Date(enrollment_date);
    if (Number.isNaN(d.getTime())) {
      errors.push('Enrollment date must be a valid date');
    } else if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      errors.push('Enrollment date must not be in the future');
    }
  }

  if (!current_class_name || typeof current_class_name !== 'string' || !current_class_name.trim()) {
    errors.push('Current class is required');
  } else if (current_class_name.trim().length > 100) {
    errors.push('Class name must not exceed 100 characters');
  }

  if (date_of_birth) {
    const d = new Date(date_of_birth);
    if (Number.isNaN(d.getTime())) {
      errors.push('Date of birth must be a valid date');
    } else if (d.getTime() > Date.now()) {
      errors.push('Date of birth must not be in the future');
    } else if (d.getFullYear() < 1900) {
      errors.push('Date of birth must be after 1900');
    }
  }

  if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(String(gender).trim().toUpperCase())) {
    errors.push('Gender must be MALE, FEMALE, or OTHER');
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // Normalise so the controller receives clean values
  req.body = {
    ...body,
    full_name: full_name.trim(),
    email: String(email).trim().toLowerCase(),
    phone_number: phone_number ? String(phone_number).trim() : undefined,
    student_number: String(student_number).trim(),
    current_class_name: current_class_name.trim(),
    gender: gender ? String(gender).trim().toUpperCase() : undefined,
    role: 'STUDENT', // this actor can only register students
  };

  next();
}

module.exports = {
  validateStudentRegistration,
};
