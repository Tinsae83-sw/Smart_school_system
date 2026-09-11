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

/**
 * Validate a Fayda Alias Number (FAN).
 *
 * FAN is an alias a resident can set instead of sharing their FIN. It is
 * typically 16 digits and can be changed/revoked, so we only enforce the
 * digit count here (no uniqueness in the DB).
 * @param {string} fan - The alias to validate
 * @returns {{ valid: boolean, error?: string, normalized?: string }}
 */
function validateFaydaFan(fan) {
  const normalized = normalize(fan);

  if (!normalized) {
    return { valid: true, normalized: null };
  }

  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: "Fayda Alias Number (FAN) must contain only digits." };
  }

  if (normalized.length !== 16) {
    return {
      valid: false,
      error: `Fayda Alias Number (FAN) must be exactly 16 digits (got ${normalized.length}).`,
    };
  }

  return { valid: true, normalized };
}

/**
 * Validate a single optional Fayda identifier input.
 *
 * Accepts either a 12-digit FIN (Fayda Identification Number) or a 16-digit
 * FAN (Fayda Alias Number) so the UI only needs one field. Empty input is
 * valid (the field is optional).
 * @param {string} value - Raw FIN or FAN
 * @returns {{ valid: boolean, error?: string, kind?: null|'FIN'|'FAN', normalized?: string|null }}
 */
function validateFaydaIdOrAlias(value) {
  const normalized = normalize(value);

  if (!normalized) {
    return { valid: true, kind: null, normalized: null };
  }

  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: "Fayda ID must contain only digits." };
  }

  if (normalized.length === 12) {
    return { valid: true, kind: "FIN", normalized };
  }

  if (normalized.length === 16) {
    return { valid: true, kind: "FAN", normalized };
  }

  return {
    valid: false,
    error: `Enter your 12-digit Fayda ID (FIN) or your 16-digit Fayda Alias (FAN) (got ${normalized.length}).`,
  };
}

module.exports = {
  validateFaydaId,
  formatFaydaId,
  normalize,
  isFaydaIdLike,
  validateFaydaFan,
  validateFaydaIdOrAlias,
  FAYDA_LENGTH,
};
