const bcrypt = require('bcrypt');

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Ethiopian phone format
 */
function validatePhone(phone) {
  const phoneRegex = /^\+251[0-9]{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate student number format
 */
function validateStudentNumber(studentNumber) {
  const pattern = /^STU-\d{4}-\d{4}$/;
  return pattern.test(studentNumber);
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate date format
 */
function validateDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate relationship type
 */
function validateRelationship(relationship) {
  const validRelationships = ['Father', 'Mother', 'Guardian', 'Other'];
  return validRelationships.includes(relationship);
}

/**
 * Validate role
 */
function validateRole(role) {
  const validRoles = ['TEACHER', 'STUDENT', 'PARENT', 'ADMIN', 'SUPER_ADMIN'];
  return validRoles.includes(role);
}

module.exports = {
  validatePassword,
  validateEmail,
  validatePhone,
  validateStudentNumber,
  sanitizeString,
  validateDate,
  validateRelationship,
  validateRole
};
