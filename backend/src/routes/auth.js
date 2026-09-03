const express = require("express");
const pool = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { verifyPassword, hashPassword } = require("../utils/password");
const { signToken, verifyToken } = require("../utils/token");
const { issueOtp, verifyOtp } = require("../utils/otp");
const { audit } = require("../utils/audit");
const { validateFaydaId } = require("../utils/nationalId");

const router = express.Router();

function publicUser(user, ext = {}) {
  return {
    id: user.user_id,
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    national_id: user.national_id || "",
    role: user.role,
    profile_picture_url: user.profile_picture_url,
    preferred_language: user.preferred_language || "",
    relationship: ext.relationship || "",
    department: ext.department || "",
    student_number: ext.student_number || "",
    current_class_id: ext.current_class_id || null,
    employee_id: ext.employee_id || "",
  };
}

async function createSession(user) {
  const token = signToken(user);
  await pool.query(
    `INSERT INTO user_sessions (user_id, token, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [user.user_id, token, null, null]
  );
  return token;
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, phone_number, password_hash, role, is_active,
              status, must_reset_password, profile_picture_url, preferred_language
         FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (user.status === "PENDING") {
      return res.status(403).json({ error: "Your registration is still waiting for school approval. Please check back later." });
    }
    if (user.status === "REJECTED") {
      return res.status(403).json({ error: "Your registration request was not approved. Please contact the school office." });
    }
    if (user.status === "SUSPENDED" || !user.is_active) {
      return res.status(403).json({ error: "Account is disabled. Contact the school administrator." });
    }

    // First-login setup: an admin-created account has a temporary password and
    // must verify its email via OTP and set a real password before a session is
    // issued. Auto-send the OTP and do not create a session yet.
    if (user.must_reset_password) {
      await issueOtp(user.email);
      await audit(user.user_id, "LOGIN_REQUIRES_OTP", {}, req);
      return res.json({ requiresOtp: true, user: publicUser(user) });
    }

    const token = await createSession(user);
    await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`, [user.user_id]);
    await audit(user.user_id, "LOGIN", { method: "password" }, req);

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Unable to sign in." });
  }
});

/**
 * GET /api/auth/classes
 * Public list of classes for the self-service enrollment form.
 */
router.get("/classes", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.class_id, c.class_name, c.academic_year
         FROM school_classes c
        ORDER BY c.class_name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("get classes (public):", err.message);
    res.status(500).json({ error: "Unable to load classes." });
  }
});

/**
 * POST /api/auth/register
 * Body: {
 *   role: "STUDENT" | "PARENT",
 *   full_name, email, phone_number, password, confirm_password,
 *   class_id?,   // required for student - the class they are enrolling into
 *   relationship? // for parent: "Father"/"Mother"/"Guardian"
 * }
 * Public self-service signup. Creates a PENDING account that cannot log in
 * until an admin/registrar approves it (assigns the class + links parents).
 */
router.post("/register", async (req, res) => {
  const {
    role, full_name, email, phone_number, password, confirm_password,
    class_id, relationship, national_id,
  } = req.body || {};

  const userRole = String(role || "").toUpperCase();
  if (!["STUDENT", "PARENT"].includes(userRole)) {
    return res.status(400).json({ error: "Self-service registration is only open to students and parents." });
  }
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "Full name, email, and password are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (userRole === "STUDENT" && !class_id) {
    return res.status(400).json({ error: "Please select the class you are enrolling into." });
  }

  let normalizedNationalId = null;
  if (national_id) {
    const check = validateFaydaId(national_id);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }
    normalizedNationalId = check.normalized;
  }

  try {
    const exists = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (exists.rowCount) {
      return res.status(409).json({ error: "An account with this email already exists. Please sign in or recover your password." });
    }

    if (normalizedNationalId) {
      const idExists = await pool.query(`SELECT user_id FROM users WHERE national_id = $1`, [normalizedNationalId]);
      if (idExists.rowCount) {
        return res.status(409).json({ error: "An account with this National ID already exists." });
      }
    }

    await pool.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, status,
                          national_id, requested_class_id, requested_relationship)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8)`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        phone_number || null,
        hashPassword(password),
        userRole,
        normalizedNationalId,
        userRole === "STUDENT" ? Number(class_id) || null : null,
        userRole === "PARENT" ? (relationship || "Guardian") : null,
      ]
    );

    await audit(null, "REGISTRATION_REQUEST", { role: userRole, email: email.trim().toLowerCase() }, req);

    res.status(201).json({
      success: true,
      message: userRole === "STUDENT"
        ? "Your enrollment request has been submitted. The school office will approve it before you can sign in."
        : "Your account request has been submitted. Once approved by the school office you will be able to sign in.",
    });
  } catch (err) {
    console.error("register error:", err.message);
    res.status(500).json({ error: "Unable to submit registration. Please try again." });
  }
});

/**
 * POST /api/auth/send-otp
 * Body: { email }
 * Creates a 6-digit code (logged to console in dev).
 */
router.post("/send-otp", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const { rows } = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (!rows.length) {
      return res.status(404).json({ error: "No account found for this email." });
    }

    await issueOtp(email.trim().toLowerCase());
    res.json({ success: true, message: "OTP sent. Check the server console in development." });
  } catch (err) {
    console.error("send-otp error:", err.message);
    res.status(500).json({ error: "Unable to send OTP." });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP code are required." });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const ok = await verifyOtp(normalizedEmail, String(otp).trim());
    if (!ok) return res.status(401).json({ error: "Invalid or expired OTP code." });

    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, phone_number, password_hash, role, is_active,
              status, must_reset_password, profile_picture_url, preferred_language
         FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    const user = rows[0];
    if (!user || !user.is_active || user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Account unavailable." });
    }

    // First-login setup: issue a short-lived token that only grants the
    // password-setup step. No full session is created until setup completes.
    if (user.must_reset_password) {
      const setupToken = signToken(user, "setup", "15m");
      return res.json({
        requiresSetup: true,
        user: publicUser(user),
        setupToken,
      });
    }

    const token = await createSession(user);
    await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`, [user.user_id]);
    await audit(user.user_id, "LOGIN_OTP", {}, req);

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("verify-otp error:", err.message);
    res.status(500).json({ error: "Unable to verify OTP." });
  }
});

/**
 * POST /api/auth/setup-password
 * Body: { setupToken, newPassword }
 * Final step of first-login setup. Verifies the short-lived setup token
 * (granted after a successful OTP), sets the user's real password and clears
 * the must_reset_password flag so they can log in normally going forward.
 */
router.post("/setup-password", async (req, res) => {
  const { setupToken, newPassword } = req.body || {};
  if (!setupToken || !newPassword) {
    return res.status(400).json({ error: "Setup token and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  let payload;
  try {
    payload = verifyToken(setupToken);
  } catch {
    return res.status(401).json({ error: "Setup token is invalid or has expired. Please start again." });
  }
  if (payload.type !== "setup") {
    return res.status(401).json({ error: "Invalid setup token." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, email, role, must_reset_password FROM users WHERE user_id = $1`,
      [payload.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Account not found." });
    const user = rows[0];
    if (!user.must_reset_password) {
      return res.status(400).json({ error: "Your password has already been set up. Please sign in." });
    }

    await pool.query(`UPDATE users SET password_hash = $1, must_reset_password = FALSE WHERE user_id = $2`, [
      hashPassword(newPassword),
      user.user_id,
    ]);
    await audit(user.user_id, "SETUP_PASSWORD", {}, req);

    res.json({
      success: true,
      message: "Your password has been set. Please sign in.",
    });
  } catch (err) {
    console.error("setup-password error:", err.message);
    res.status(500).json({ error: "Unable to complete setup." });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (req, res) => {
  const authorization = req.headers.authorization;
  let token = null;
  if (authorization && authorization.startsWith("Bearer ")) {
    token = authorization.replace("Bearer ", "");
  }

  try {
    if (token) {
      await pool.query(`DELETE FROM user_sessions WHERE token = $1`, [token]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("logout error:", err.message);
    res.status(500).json({ error: "Unable to log out." });
  }
});

/**
 * GET /api/auth/me
 */
router.get("/me", authenticate, async (req, res) => {
  res.json({ user: publicUser(req.user, req.ext) });
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  try {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: "Account not found." });

    if (!verifyPassword(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [hashPassword(newPassword), req.user.user_id]);
    await pool.query(`DELETE FROM user_sessions WHERE user_id = $1 AND token <> $2`, [
      req.user.user_id,
      req.headers.authorization.replace("Bearer ", ""),
    ]);
    await audit(req.user.user_id, "CHANGE_PASSWORD", {}, req);

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("change-password error:", err.message);
    res.status(500).json({ error: "Unable to change password." });
  }
});

module.exports = router;