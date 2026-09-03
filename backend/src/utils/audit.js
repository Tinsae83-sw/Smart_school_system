const pool = require("../config/db");

/** Insert an audit log row (uses audit_logs table). */
async function audit(userId, action, details, req, client = pool) {
  try {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [userId || null, action, JSON.stringify(details || {}), req?.ip || null]
    );
  } catch (err) {
    // Never let auditing break the main flow.
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { audit };