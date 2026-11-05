/**
 * Validation middleware for the REGISTRATION actor (student registration)
 *
 * Validates the comprehensive enrolment payload (personal, contact, academic,
 * guardian/parent, system settings) mirroring the constraints enforced by the
 * controller. Runs BEFORE the controller so all problems are reported at once
 * and no User/Student/Parent rows are created for a malformed request.
 */

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidEthiopianPhone(value) {
  return /^09[0-9]{8}$/.test(String(value).trim()) || /^\+251[0-9]{9}$/.test(String(value).trim());
}

function validateStudentRegistration(req, res, next) {
  const errors = [];
  const body = req.body || {};

  const {
    first_name, middle_name, last_name, full_name,
    date_of_birth, gender, nationality, religion, home_address,
    email, phone_number, emergency_contact_name, emergency_contact_phone,
    grade_level, department_id, admission_date,
    guardian_name, relationship, guardian_phone, guardian_email, guardian_password,
    username, password, send_credentials, terms_agreed,
  } = body;

  // ---- identity (personal) ----
  const hasFullName = (full_name && String(full_name).trim().length >= 3) ||
    ((first_name && String(first_name).trim().length >= 2) &&
     (last_name && String(last_name).trim().length >= 2));
  if (!hasFullName) {
    errors.push('Full name is required (first and last name, at least 2 characters each)');
  }
  if (first_name && String(first_name).trim().length > 50) errors.push('First name must not exceed 50 characters');
  if (middle_name && String(middle_name).trim().length > 50) errors.push('Middle name must not exceed 50 characters');
  if (last_name && String(last_name).trim().length > 50) errors.push('Last name must not exceed 50 characters');

  // ---- contact ----
  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required');
  } else if (String(email).trim().length > 100) {
    errors.push('Email must not exceed 100 characters');
  }
  if (phone_number && !isValidEthiopianPhone(phone_number)) {
    errors.push('Phone must be in format 09XXXXXXXX or +251XXXXXXXXX');
  }
  if (emergency_contact_phone && !isValidEthiopianPhone(emergency_contact_phone)) {
    errors.push('Emergency contact phone must be in format 09XXXXXXXX or +251XXXXXXXXX');
  }
  if (emergency_contact_name && String(emergency_contact_name).trim().length < 2) {
    errors.push('Emergency contact name must be at least 2 characters');
  }

  // ---- personal details ----
  if (!date_of_birth) {
    errors.push('Date of birth is required');
  } else {
    const d = new Date(date_of_birth);
    if (Number.isNaN(d.getTime())) errors.push('Date of birth must be a valid date');
    else if (d.getTime() > Date.now()) errors.push('Date of birth must not be in the future');
    else if (d.getFullYear() < 1900) errors.push('Date of birth must be after 1900');
  }
  if (gender && !['MALE', 'FEMALE'].includes(String(gender).trim().toUpperCase())) {
    errors.push('Gender must be MALE or FEMALE');
  }
  if (nationality && String(nationality).trim().length > 50) errors.push('Nationality must not exceed 50 characters');
  if (religion && String(religion).trim().length > 50) errors.push('Religion must not exceed 50 characters');
  if (home_address && String(home_address).trim().length > 200) errors.push('Home address must not exceed 200 characters');

  // ---- academic ----
  if (grade_level === undefined || grade_level === null || grade_level === '') {
    errors.push('Grade level is required');
  } else if (!['9', '10', '11', '12', 9, 10, 11, 12].includes(grade_level)) {
    errors.push('Grade level must be 9, 10, 11, or 12');
  }
  if (department_id && (Number.isNaN(parseInt(department_id, 10)) || parseInt(department_id, 10) <= 0)) {
    errors.push('Department ID must be a positive integer');
  }
  if (admission_date) {
    const d = new Date(admission_date);
    if (Number.isNaN(d.getTime())) errors.push('Admission date must be a valid date');
  }

  // ---- guardian / parent (optional but validated when provided) ----
  if (guardian_email && !isValidEmail(guardian_email)) {
    errors.push('Guardian email must be a valid email address');
  }
  if (guardian_name && String(guardian_name).trim().length < 2) {
    errors.push('Guardian name must be at least 2 characters');
  }
  if (guardian_phone && !isValidEthiopianPhone(guardian_phone)) {
    errors.push('Guardian phone must be in format 09XXXXXXXX or +251XXXXXXXXX');
  }
  if (guardian_password && String(guardian_password).length < 8) {
    errors.push('Guardian password must be at least 8 characters');
  }
  if (relationship && !['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'].includes(String(relationship).trim().toUpperCase())) {
    errors.push('Relationship must be FATHER, MOTHER, GUARDIAN, or OTHER');
  }

  // ---- system ----
  if (password && String(password).length < 8) {
    errors.push('Student password must be at least 8 characters');
  } else if (password && String(password).length > 128) {
    errors.push('Student password must not exceed 128 characters');
  }
  if (guardian_password && String(guardian_password).length > 128) {
    errors.push('Guardian password must not exceed 128 characters');
  }
  if (username && String(username).trim().length > 50) {
    errors.push('Username must not exceed 50 characters');
  }
  if (terms_agreed !== true && terms_agreed !== 'true' && terms_agreed !== 1) {
    errors.push('You must agree to the terms and conditions');
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // ---- normalise ----
  req.body = {
    ...body,
    first_name: first_name ? String(first_name).trim() : undefined,
    middle_name: middle_name ? String(middle_name).trim() : undefined,
    last_name: last_name ? String(last_name).trim() : undefined,
    full_name: full_name ? String(full_name).trim() : undefined,
    email: String(email).trim().toLowerCase(),
    phone_number: phone_number ? String(phone_number).trim() : undefined,
    emergency_contact_name: emergency_contact_name ? String(emergency_contact_name).trim() : undefined,
    emergency_contact_phone: emergency_contact_phone ? String(emergency_contact_phone).trim() : undefined,
    nationality: nationality ? String(nationality).trim() : 'Ethiopian',
    religion: religion ? String(religion).trim() : undefined,
    home_address: home_address ? String(home_address).trim() : undefined,
    gender: gender ? String(gender).trim().toUpperCase() : 'MALE',
    guardian_name: guardian_name ? String(guardian_name).trim() : undefined,
    relationship: relationship ? String(relationship).trim().toUpperCase() : 'GUARDIAN',
    guardian_phone: guardian_phone ? String(guardian_phone).trim() : undefined,
    guardian_email: guardian_email ? String(guardian_email).trim().toLowerCase() : undefined,
    username: username ? String(username).trim() : undefined,
    role: 'STUDENT',
  };

  next();
}

module.exports = { validateStudentRegistration };
