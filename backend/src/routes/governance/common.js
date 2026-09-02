// Shared factories for governance routers (principal, VPs, department head,
// PTSA, SIC). Every router gets authentication, role authorization, profile,
// password, notifications, and a dashboard summary. Role files add their own
// resource endpoints on top.
const express = require("express");
const pool = require("../../config/db");
const { authenticate, authorize } = require("../../middleware/auth");

function makeGovernanceRouter({ role, extension }) {
  const router = express.Router();
  router.use(authenticate, authorize(role, "SUPER_ADMIN"));

  router.get("/profile", async (req, res) => {
    try {
      const user = await pool.query(`SELECT user_id, full_name, email, phone_number, preferred_language, profile_picture_url
                                       FROM users WHERE user_id = $1`, [req.user.user_id]);
      let ext = null;
      if (extension) {
        const extRow = await pool.query(`SELECT * FROM ${extension.table} WHERE user_id = $1`,
          [req.user.user_id]);
        ext = extRow.rows[0] || null;
      }
      res.json({ ...user.rows[0], ext });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch profile." });
    }
  });

  router.put("/profile", async (req, res) => {
    const { full_name, phone_number, preferred_language } = req.body || {};
    try {
      await pool.query(
        `UPDATE users SET full_name = COALESCE($1, full_name),
                phone_number = COALESCE($2, phone_number),
                preferred_language = COALESCE($3, preferred_language)
          WHERE user_id = $4`,
        [full_name || null, phone_number || null, preferred_language || null, req.user.user_id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update profile." });
    }
  });

  router.post("/change-password", async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required." });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }
    try {
      const { verifyPassword, hashPassword } = require("../utils/password");
      const { rows } = await pool.query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
      if (!(await verifyPassword(currentPassword, rows[0].password_hash))) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }
      await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [
        await hashPassword(newPassword),
        req.user.user_id,
      ]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to change password." });
    }
  });

  router.get("/notifications", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT notification_id, type, content, is_sent AS read, sent_at, metadata
           FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50`,
        [req.user.user_id]
      );
      res.json(rows.map((r) => ({
        id: r.notification_id,
        notification_id: r.notification_id,
        type: r.type,
        title: r.type,
        body: r.content,
        read: r.read,
        created_at: r.sent_at,
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch notifications." });
    }
  });

  router.post("/notifications/read", async (req, res) => {
    const { notificationId } = req.body || {};
    try {
      if (notificationId) {
        await pool.query(`UPDATE notifications SET is_sent = TRUE WHERE notification_id = $1 AND user_id = $2`,
          [notificationId, req.user.user_id]);
      } else {
        await pool.query(`UPDATE notifications SET is_sent = TRUE WHERE user_id = $1`, [req.user.user_id]);
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to update notifications." });
    }
  });

  router.get("/school-profile", async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM school_profile LIMIT 1`);
      res.json(rows[0] || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch school profile." });
    }
  });

  router.get("/dashboard", async (req, res) => {
    try {
      const [students, teachers, parents, classes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM students`),
        pool.query(`SELECT COUNT(*)::int AS count FROM teachers`),
        pool.query(`SELECT COUNT(*)::int AS count FROM parents`),
        pool.query(`SELECT COUNT(*)::int AS count FROM school_classes`),
      ]);
      res.json({
        total_students: students.rows[0].count,
        total_teachers: teachers.rows[0].count,
        total_parents: parents.rows[0].count,
        total_classes: classes.rows[0].count,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Unable to load dashboard." });
    }
  });

  return router;
}

module.exports = { makeGovernanceRouter };