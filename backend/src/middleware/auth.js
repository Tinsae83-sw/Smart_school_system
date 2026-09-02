const pool = require("../config/db");
const { verifyToken } = require("../utils/token");

/**
 * Extension table per role (columns loaded onto req.ext).
 */
const ROLE_EXTENSION = {
  TEACHER: { table: "teachers", key: "teacher_id", cols: ["teacher_id", "employee_id", "department"] },
  STUDENT: { table: "students", key: "student_id", cols: ["student_id", "student_number", "current_class_id", "enrollment_date"] },
  PARENT: { table: "parents", key: "parent_id", cols: ["parent_id", "relationship"] },
  PRINCIPAL: { table: "principals", key: "principal_id", cols: ["principal_id", "employee_id"] },
  VP_ACADEMIC: { table: "vp_academic", key: "vp_academic_id", cols: ["vp_academic_id", "employee_id"] },
  VP_ADMINISTRATION: { table: "vp_administration", key: "vp_admin_id", cols: ["vp_admin_id", "employee_id"] },
  DEPARTMENT_HEAD: { table: "department_heads", key: "dept_head_id", cols: ["dept_head_id", "employee_id", "department"] },
  PTSA_REPRESENTATIVE: { table: "ptsa_representatives", key: "ptsa_rep_id", cols: ["ptsa_rep_id", "position"] },
  SIC_MEMBER: { table: "sic_members", key: "sic_member_id", cols: ["sic_member_id", "role"] },
  ADMIN: { table: "administrators", key: "admin_id", cols: ["admin_id", "employee_id", "access_level"] },
  SUPER_ADMIN: { table: "administrators", key: "admin_id", cols: ["admin_id", "employee_id", "access_level"] },
};

async function loadUser(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, full_name, email, phone_number, password_hash, role, is_active,
            created_at, last_login, profile_picture_url, preferred_language
       FROM users WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function loadExtension(user) {
  const ext = ROLE_EXTENSION[user.role];
  if (!ext) return {};
  const { rows } = await pool.query(
    `SELECT ${ext.cols.join(", ")} FROM ${ext.table} WHERE user_id = $1`,
    [user.user_id]
  );
  const row = rows[0];
  if (!row) return {};
  row.user_id = user.user_id;
  return row;
}

/**
 * Authenticate a Bearer JWT, verify the session still exists in the database,
 * and attach req.user (users row) plus req.ext (role extension row).
 */
async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token." });
  }

  const token = authorization.replace("Bearer ", "");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  // Only full-access session tokens may use protected routes. Short-lived
  // "setup" tokens are verified by their dedicated endpoint instead.
  if (payload.type !== "session") {
    return res.status(401).json({ error: "Invalid token type." });
  }

  try {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM user_sessions WHERE token = $1 AND user_id = $2`,
      [token, payload.user_id]
    );

    if (!rowCount) {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }

    // Refresh last_activity periodically.
    await pool.query(`UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = $1`, [token]);

    const user = await loadUser(payload.user_id);
    if (!user) {
      return res.status(401).json({ error: "Account not found." });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: "Account is disabled." });
    }

    req.user = user;
    req.ext = await loadExtension(user);
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(500).json({ error: "Authentication service unavailable." });
  }
}

/**
 * Restrict a route to one or more roles. Must run after authenticate.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (roles.length && !roles.includes(req.user.role) && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

/**
 * Semi-auth used by scripts/tests and optional DEV_BYPASS_AUTH mode.
 * Loads the first user with a given role.
 */
async function devUser(role) {
  const { rows } = await pool.query(
    `SELECT user_id FROM users WHERE role = $1 AND is_active = TRUE ORDER BY user_id LIMIT 1`,
    [role]
  );
  if (!rows.length) return null;
  return loadUser(rows[0].user_id);
}

module.exports = { authenticate, authorize, loadUser, loadExtension, devUser, ROLE_EXTENSION };