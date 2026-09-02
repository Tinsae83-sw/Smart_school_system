const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");

const router = makeGovernanceRouter({ role: "SIC_MEMBER", extension: { table: "sic_members" } });

router.get("/meetings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT meeting_id, title, description, scheduled_date, scheduled_time, location, meeting_type, status, created_at
         FROM sic_meetings ORDER BY scheduled_date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch meetings." });
  }
});

router.post("/meetings", async (req, res) => {
  const { title, description, scheduled_date, scheduled_time, location, meeting_type } = req.body || {};
  if (!title || !scheduled_date) return res.status(400).json({ error: "title and scheduled_date are required." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO sic_meetings (title, description, scheduled_date, scheduled_time, location, meeting_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, scheduled_date, scheduled_time || "09:00:00", location || null,
       meeting_type || "REGULAR", req.user.user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create meeting." });
  }
});

router.get("/recommendations", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT recommendation_id, title, description, category, priority, status, submitted_at, reviewed_at, response
         FROM sic_recommendations ORDER BY submitted_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch recommendations." });
  }
});

router.get("/inspections", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT inspection_id, inspection_type, inspection_date, inspector_name, inspector_agency,
              findings, recommendations, compliance_status, action_required, submitted_at
         FROM sic_inspection_reports ORDER BY submitted_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch inspections." });
  }
});

module.exports = router;