const crypto = require("crypto");
const pool = require("../config/db");

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send an OTP email via SMTP (nodemailer). Falls back to console logging when
 * SMTP is not configured (development). Delivery mode is controlled by
 * OTP_DELIVERY inside the transport selection below.
 */
function getTransporter() {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function deliverOtp(email, code, expiresAt) {
  const delivery = process.env.OTP_DELIVERY || "console";

  if (delivery === "email") {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn("[OTP] OTP_DELIVERY=email but SMTP_HOST/USER not set. Falling back to console.");
      console.log(`[DEV] OTP for ${email}: ${code} (expires ${expiresAt.toISOString()})`);
      return;
    }
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.OTP_EMAIL_FROM || `SmartSchool <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your SmartSchool verification code",
        text: `Your SmartSchool verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        html: `<p>Hi,</p><p>Your SmartSchool verification code is:</p><h2>${code}</h2><p>Enter this code to complete your secure first-login setup. It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
      });
      console.log(`[OTP] Email sent to ${email}`);
    } catch (err) {
      // Never fail the OTP issue because email delivery failed; log and surface.
      console.error("[OTP] Email send failed:", err.message);
      console.log(`[DEV] OTP for ${email}: ${code}`);
    }
  } else {
    console.log(`[DEV] OTP for ${email}: ${code} (expires ${expiresAt.toISOString()})`);
  }
}

/**
 * Create an OTP for an email and deliver it (email in production, console dev).
 */
async function issueOtp(email) {
  await pool.query(
    `UPDATE otp_verifications SET expires_at = CURRENT_TIMESTAMP
      WHERE email = $1 AND is_verified = FALSE`,
    [email]
  );
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO otp_verifications (email, otp_code, expires_at)
     VALUES ($1, $2, $3)`,
    [email, code, expiresAt]
  );

  await deliverOtp(email, code, expiresAt);
  return true;
}

/**
 * Validate a submitted code. Returns true and invalidates the code on success.
 */
async function verifyOtp(email, code) {
  const { rows } = await pool.query(
    `SELECT otp_id, otp_code, expires_at
       FROM otp_verifications
      WHERE email = $1 AND is_verified = FALSE
      ORDER BY created_at DESC LIMIT 1`,
    [email]
  );

  if (!rows.length) return false;

  const otp = rows[0];
  if (otp.expires_at < new Date()) return false;
  if (otp.otp_code !== code) return false;

  await pool.query(`UPDATE otp_verifications SET is_verified = TRUE WHERE otp_id = $1`, [otp.otp_id]);
  return true;
}

/** True when an unverified, unexpired OTP code exists for this email. */
async function hasPendingOtp(email) {
  const { rows } = await pool.query(
    `SELECT 1 FROM otp_verifications
      WHERE email = $1 AND is_verified = FALSE AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1`,
    [email]
  );
  return rows.length > 0;
}

module.exports = { issueOtp, verifyOtp, hasPendingOtp, generateOtp, deliverOtp };