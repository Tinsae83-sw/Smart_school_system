const express = require("express");
const crypto = require("crypto");
const pool = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { verifyPassword, hashPassword } = require("../utils/password");
const { signToken, verifyToken } = require("../utils/token");
const { issueOtp, verifyOtp } = require("../utils/otp");
const { audit } = require("../utils/audit");
const { validateFaydaIdOrAlias } = require("../utils/nationalId");
const fayda = require("../utils/fayda");

const router = express.Router();

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const faydaStates = new Map();
const faydaVerifications = new Map();

function pruneFaydaStore() {
  const now = Date.now();
  for (const [key, entry] of faydaStates) if (entry.expiresAt < now) faydaStates.delete(key);
  for (const [key, entry] of faydaVerifications) if (entry.expiresAt < now) faydaVerifications.delete(key);
  if (faydaStates.size || faydaVerifications.size) {
    setTimeout(pruneFaydaStore, VERIFICATION_TTL_MS);
  }
}

function createVerificationRef(data) {
  const ref = crypto.randomUUID();
  faydaVerifications.set(ref, { data: data || null, expiresAt: Date.now() + VERIFICATION_TTL_MS });
  if (faydaVerifications.size === 1) setTimeout(pruneFaydaStore, VERIFICATION_TTL_MS);
  return ref;
}

function getVerification(ref) {
  const entry = typeof ref === "string" && faydaVerifications.get(ref);
  return entry && entry.expiresAt > Date.now() ? entry : null;
}

function consumeVerification(ref) {
  const entry = getVerification(ref);
  if (entry) {
    faydaVerifications.delete(ref);
    return entry.data;
  }
  return null;
}

/**
 * Check that a Fayda verification belongs to the person registering.
 * Matches on the numeric part of the verified `sub` (the Fayda sub is derived
 * from the resident's FIN/FAN) or, when that is inconclusive, on the phone
 * number returned by Fayda matching the phone entered in the form.
 */
function verificationMatchesUser(enteredDigits, formPhone, verified) {
  const entered = String(enteredDigits || "").replace(/\D/g, "");
  const sub = String((verified && verified.sub) || "").replace(/\D/g, "");
  const vPhone = String((verified && verified.phone) || "").replace(/\D/g, "");
  const pPhone = String(formPhone || "").replace(/\D/g, "");

  if (entered && sub) {
    return sub === entered || sub.endsWith(entered) || sub.includes(entered);
  }
  if (entered && !sub) return false;
  if (pPhone && vPhone) return pPhone === vPhone;
  return Boolean(sub) || Boolean(vPhone);
}

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
    class_id, relationship, national_id, fan, fayda_ref,
  } = req.body || {};

  // Honeypot anti-spam trap: real users never fill this hidden field. Bots that
  // autofill every input step in it, so reject the request silently.
  if (req.body && req.body.company_website) {
    return res.status(400).json({ error: "Invalid request." });
  }

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

  const idCheck = validateFaydaIdOrAlias(national_id);
  if (!idCheck.valid) {
    return res.status(400).json({ error: idCheck.error });
  }
  const isFan = idCheck.kind === "FAN";
  const normalizedNationalId = isFan ? null : idCheck.normalized;
  const normalizedFan = isFan ? idCheck.normalized : null;

  let faydaVerified = null;
  if (fayda_ref) {
    const verified = consumeVerification(fayda_ref);
    if (!verified) {
      return res.status(400).json({ error: "Fayda verification has expired or is invalid. Please verify again." });
    }
    if (verificationMatchesUser(idCheck.normalized, phone_number, verified)) {
      faydaVerified = verified;
    } else {
      return res.status(400).json({ error: "The verified Fayda account does not match the National ID or phone number entered." });
    }
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

    const insert = faydaVerified
      ? `INSERT INTO users (full_name, email, phone_number, password_hash, role, status,
                            national_id, fan, fayda_sub, fayda_verified_at, fayda_birthdate, fayda_gender,
                            requested_class_id, requested_relationship)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11, $12)`
      : `INSERT INTO users (full_name, email, phone_number, password_hash, role, status,
                            national_id, fan, requested_class_id, requested_relationship)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9)`;

    await pool.query(
      insert,
      faydaVerified
        ? [
            full_name.trim(),
            email.trim().toLowerCase(),
            phone_number || null,
            hashPassword(password),
            userRole,
            normalizedNationalId,
            normalizedFan,
            faydaVerified.sub || null,
            faydaVerified.birthdate || null,
            faydaVerified.gender || null,
            userRole === "STUDENT" ? Number(class_id) || null : null,
            userRole === "PARENT" ? (relationship || "Guardian") : null,
          ]
        : [
            full_name.trim(),
            email.trim().toLowerCase(),
            phone_number || null,
            hashPassword(password),
            userRole,
            normalizedNationalId,
            normalizedFan,
            userRole === "STUDENT" ? Number(class_id) || null : null,
            userRole === "PARENT" ? (relationship || "Guardian") : null,
          ]
    );

    await audit(null, "REGISTRATION_REQUEST", { role: userRole, email: email.trim().toLowerCase() }, req);

    res.status(201).json({
      success: true,
      fayda_verified: Boolean(faydaVerified),
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

// ─── Fayda (Ethiopian National ID) eSignet verification ──────────────────────

router.get("/fayda/config", (req, res) => {
  res.json({ configured: fayda.isConfigured(), mock: fayda.isMockEnabled() });
});

router.post("/fayda/authorize", (req, res) => {
  const { national_id, phone_number } = req.body || {};
  const digits = String(national_id || "").replace(/\D/g, "");
  const phone = String(phone_number || "").replace(/\D/g, "");

  const state = crypto.randomUUID();
  const store = { codeVerifier: null, expiresAt: Date.now() + VERIFICATION_TTL_MS };

  if (fayda.isConfigured()) {
    try {
      const session = fayda.initAuthorize();
      store.codeVerifier = session.codeVerifier;
      faydaStates.set(state, store);
      if (faydaStates.size === 1) setTimeout(pruneFaydaStore, VERIFICATION_TTL_MS);
      return res.json({ authorizeUrl: session.authorizeUrl, mode: "live" });
    } catch (err) {
      console.error("fayda authorize error:", err.message);
      return res.status(500).json({ error: err.message || "Unable to start Fayda verification." });
    }
  }

  if (fayda.isMockEnabled()) {
    store.mockId = digits || null;
    store.mockPhone = phone || null;
    faydaStates.set(state, store);
    if (faydaStates.size === 1) setTimeout(pruneFaydaStore, VERIFICATION_TTL_MS);
    const qs = new URLSearchParams({ state });
    if (store.mockId) qs.set("id", store.mockId);
    if (store.mockPhone) qs.set("phone", store.mockPhone);
    const base = `${req.protocol}://${req.get("host")}`;
    return res.json({ authorizeUrl: `${base}/api/auth/fayda/mock?${qs.toString()}`, mode: "mock" });
  }

  return res.status(503).json({ error: "Fayda integration is not configured yet.", configured: false });
});

// Simulated VeriFayda page (dev/test only - active while Fayda is unconfigured).
router.get("/fayda/mock", (req, res) => {
  const { state, id, phone } = req.query || {};
  const stored = faydaStates.get(state);
  if (!stored || stored.expiresAt <= Date.now()) {
    return res.status(400).send("Fayda simulation session expired. Please try again from the registration form.");
  }

  const idLabel = id ? (/^\d{16}$/.test(id) ? "Fayda Alias Number (FAN)" : "Fayda ID (FIN)") : "—";
  const phoneDisplay = phone ? `+${phone}` : "—";
  const callbackUrl = `/api/auth/fayda/callback?code=mock.${encodeURIComponent(state)}&state=${encodeURIComponent(state)}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>VeriFayda — Simulation</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;margin:0;padding:2rem;color:#0f172a}
  .card{max-width:440px;margin:2rem auto;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,.06)}
  h1{font-size:1.15rem;margin:0 0 .25rem}
  .sub{font-size:.8rem;color:#64748b;margin:0 0 1.25rem}
  .row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f1f5f9;font-size:.85rem}
  .row span{color:#64748b}.row b{font-weight:600}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;font-size:.65rem;font-weight:700;padding:.2rem .6rem;letter-spacing:.03em;text-transform:uppercase}
  .btn{width:100%;border:0;border-radius:.6rem;padding:.7rem 1rem;font-size:.9rem;font-weight:600;cursor:pointer;margin-top:1rem}
  .btn-primary{background:#2563eb;color:#fff}.btn-primary:hover{background:#1d4ed8}
  .btn-muted{background:#e2e8f0;color:#334155}.btn-muted:hover{background:#cbd5e1}
  .otp-box{display:none;margin-top:1.25rem;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:.6rem;padding:1rem}
  input{width:100%;padding:.6rem .8rem;border:1px solid #cbd5e1;border-radius:.6rem;font-size:1rem;letter-spacing:.35em;text-align:center;font-weight:700}
  .note{font-size:.72rem;color:#94a3b8;margin-top:.6rem;line-height:1.4}
  .err{color:#dc2626;font-size:.8rem;margin-top:.6rem;min-height:1rem}
</style></head><body>
<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <h1>VeriFayda <small style="color:#94a3b8">2.0</small></h1>
    <span class="badge">Simulation</span>
  </div>
  <p class="sub">This is the simulated National ID login. In production this is the real Fayda portal and your one-time code is sent by SMS to the phone on file.</p>

  <div class="row"><span>Identity</span><b id="idLabel">${idLabel}</b></div>
  <div class="row"><span>National ID</span><b>${id || "—"}</b></div>
  <div class="row"><span>Registered phone</span><b>${phoneDisplay}</b></div>

  <button id="sendBtn" class="btn btn-primary">Send one-time code</button>

  <div id="otpBox" class="otp-box">
    <label style="font-size:.8rem;font-weight:600;color:#475569">One-time code</label>
    <input id="otpInput" inputmode="numeric" maxlength="8" placeholder="••••••">
    <p class="note" id="hint">In production this code is delivered by SMS by the National ID Program.</p>
    <div class="err" id="err"></div>
    <button id="confirmBtn" class="btn btn-primary" disabled>Confirm &amp; link identity</button>
  </div>
</div>
<script>
  var OTP = "123456"; // simulation only
  document.getElementById("sendBtn").onclick = function () {
    document.getElementById("otpBox").style.display = "block";
    document.getElementById("hint").textContent = "Simulation: your one-time code is " + OTP + " (in production this is sent by SMS).";
    document.getElementById("sendBtn").style.display = "none";
    document.getElementById("otpInput").focus();
  };
  var input = document.getElementById("otpInput");
  var detect = function () {
    var v = input.value.trim();
    var ok = (v === OTP);
    document.getElementById("confirmBtn").disabled = !ok;
    document.getElementById("err").textContent = v && !ok ? "Incorrect code." : "";
  };
  input.oninput = detect;
  document.getElementById("confirmBtn").onclick = function () {
    window.location.href = "${callbackUrl}";
  };
</script>
</body></html>`);
});

router.get("/fayda/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query || {};
  const frontendOrigin = process.env.FAYDA_FRONTEND_ORIGIN || process.env.CORS_ORIGINS?.split(",")[0]?.trim() || "http://localhost:3000";

  function respond(payload) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const json = JSON.stringify(payload).replace(/</g, "\\u003c");
    res.send(`<!doctype html><html><body>
<script>
(function () {
  var payload = ${json};
  if (window.opener) {
    try { window.opener.postMessage({ type: "FAYDA_RESULT", payload: payload }, "${frontendOrigin}"); } catch (e) {}
    setTimeout(function () { window.close(); }, 400);
  } else {
    document.body.style.fontFamily = "system-ui, sans-serif";
    document.body.style.padding = "2rem";
    document.body.textContent = payload.message || "Fayda verification complete. You can close this window.";
  }
})();
</script>
</body></html>`);
  }

  if (error) {
    return respond({ ok: false, message: error_description || "Fayda authorization was declined." });
  }
  if (!code || !state) {
    return respond({ ok: false, message: "Fayda callback is missing required parameters." });
  }
  const stored = faydaStates.get(state);
  if (stored && stored.expiresAt > Date.now()) {
    faydaStates.delete(state);
  } else {
    return respond({ ok: false, message: "Fayda verification expired or invalid. Please try again." });
  }

  try {
    let claims;
    if (typeof code === "string" && code.startsWith("mock.")) {
      if (!stored.mockId) {
        return respond({ ok: false, message: "Simulated Fayda session is missing an identity." });
      }
      claims = {
        sub: stored.mockId,
        name: "Simulated Identity",
        birthdate: "1995-06-15",
        gender: "male",
        phone: stored.mockPhone || null,
      };
    } else {
      const accessToken = await fayda.exchangeCode(code, stored.codeVerifier);
      claims = await fayda.getUserInfo(accessToken);
    }

    if (!claims.sub) {
      return respond({ ok: false, message: "Fayda did not return an identity." });
    }

    const data = {
      sub: claims.sub,
      name: claims.name,
      birthdate: claims.birthdate,
      gender: claims.gender,
      phone: claims.phone,
    };
    const ref = createVerificationRef(data);

    return respond({
      ok: true,
      ref,
      mock: Boolean(stored.mockId),
      verified: {
        name: claims.name,
        birthdate: claims.birthdate,
        gender: claims.gender,
      },
    });
  } catch (err) {
    console.error("fayda callback error:", err.message);
    return respond({ ok: false, message: err.message || "Fayda verification failed." });
  }
});

module.exports = router;