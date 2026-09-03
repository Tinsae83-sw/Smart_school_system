/**
 * Ethiopian Fayda National ID validation and utilities.
 *
 * Fayda ID is a 12-digit unique identification number issued by Ethiopia's
 * National ID Program (NIDP). It is biometric-based and used for identity
 * verification across public and private services.
 *
 * Format: 12 digits (numeric only, no embedded structure publicly documented)
 * Example: 123456789012
 */

const FAYDA_LENGTH = 12;

/**
 * Strip spaces, dashes, and other non-digit characters.
 */
function normalize(raw) {
  return String(raw || "").replace(/[\s\-.]/g, "").trim();
}

/**
 * Validate a Fayda National ID.
 * @param {string} id - The national ID to validate
 * @returns {{ valid: boolean, error?: string, normalized?: string }}
 */
function validateFaydaId(id) {
  const normalized = normalize(id);

  if (!normalized) {
    return { valid: false, error: "National ID is required." };
  }

  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: "National ID must contain only digits." };
  }

  if (normalized.length !== FAYDA_LENGTH) {
    return {
      valid: false,
      error: `National ID must be exactly ${FAYDA_LENGTH} digits (got ${normalized.length}).`,
    };
  }

  return { valid: true, normalized };
}

/**
 * Format a Fayda ID for display: XXXX XXXX XXXX
 * @param {string} id - Raw or normalized ID
 * @returns {string} Formatted ID
 */
function formatFaydaId(id) {
  const n = normalize(id);
  if (n.length !== FAYDA_LENGTH) return id;
  return `${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`;
}

/**
 * Check if a string looks like it could be a Fayda ID (12 digits).
 * Useful for search/query parameters.
 */
function isFaydaIdLike(value) {
  return /^\d{12}$/.test(normalize(value));
}

module.exports = {
  validateFaydaId,
  formatFaydaId,
  normalize,
  isFaydaIdLike,
  FAYDA_LENGTH,
};
