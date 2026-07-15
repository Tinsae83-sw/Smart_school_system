/**
 * Utility Functions
 * Common helper functions used across the application
 */

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Random password
 */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Format date to ISO string
 * @param {Date|string} date - Date to format
 * @returns {string} ISO formatted date
 */
function formatDate(date) {
  return new Date(date).toISOString();
}

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Readable date string
 */
function formatDateReadable(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate student number
 * @param {number} sequence - Sequence number
 * @param {number} year - Year (default: current year)
 * @returns {string} Formatted student number
 */
function generateStudentNumber(sequence, year = new Date().getFullYear()) {
  return `STU-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate employee ID
 * @param {number} sequence - Sequence number
 * @param {number} year - Year (default: current year)
 * @returns {string} Formatted employee ID
 */
function generateEmployeeId(sequence, year = new Date().getFullYear()) {
  return `TCH-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Parse pagination parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} Parsed pagination parameters
 */
function parsePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
}

/**
 * Create pagination response
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination response
 */
function createPaginationResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Remove sensitive fields from user object
 * @param {Object} user - User object
 * @returns {Object} User object without sensitive data
 */
function sanitizeUser(user) {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
}

/**
 * Check if string is valid email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is valid Ethiopian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+251[0-9]{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generatePassword,
  formatDate,
  formatDateReadable,
  generateStudentNumber,
  generateEmployeeId,
  parsePagination,
  createPaginationResponse,
  sanitizeUser,
  isValidEmail,
  isValidPhone,
  toTitleCase,
  sleep,
  randomString
};
