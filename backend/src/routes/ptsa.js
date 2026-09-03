const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");

const router = makeGovernanceRouter({ role: "PTSA_REPRESENTATIVE", extension: { table: "ptsa_representatives" } });

router.get("/meetings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT meeting_id, title, description, scheduled_date, scheduled_time, location, status, created_at
         FROM ptsa_meetings ORDER BY scheduled_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch meetings." });
  }
});

router.post("/meetings", async (req, res) => {
  const { title, description, scheduled_date, scheduled_time, location } = req.body || {};
  if (!title || !scheduled_date) return res.status(400).json({ error: "title and scheduled_date are required." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO ptsa_meetings (title, description, scheduled_date, scheduled_time, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, scheduled_date, scheduled_time || "09:00:00", location || null, req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create meeting." });
  }
});

router.get("/announcements", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT announcement_id, meeting_id, title, content, published_at, is_active
         FROM ptsa_announcements ORDER BY published_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch announcements." });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT feedback_id, feedback_type, source, subject, feedback, submitted_anonymously,
              status, submitted_at
         FROM community_feedback ORDER BY submitted_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch feedback." });
  }
});

module.exports = router;