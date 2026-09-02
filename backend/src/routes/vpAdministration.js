const express = require("express");
const pool = require("../config/db");
const { makeGovernanceRouter } = require("./governance/common");

const router = makeGovernanceRouter({ role: "VP_ADMINISTRATION", extension: { table: "vp_administration" } });

router.get("/assets", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT asset_id, asset_name, asset_code, category, quantity, unit_cost,
              purchase_date, location, condition, status, assigned_to, created_at
         FROM asset_inventory ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch assets." });
  }
});

router.post("/assets", async (req, res) => {
  const { asset_name, asset_code, category, quantity, unit_cost, purchase_date, location, condition, status } = req.body || {};
  if (!asset_name || !asset_code || !category) {
    return res.status(400).json({ error: "asset_name, asset_code, and category are required." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO asset_inventory (asset_name, asset_code, category, quantity, unit_cost, purchase_date, location, condition, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [asset_name, asset_code, category, quantity || 1, unit_cost || null, purchase_date || null, location || null,
       condition || "GOOD", status || "AVAILABLE"]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create asset." });
  }
});

router.get("/facilities", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT facility_id, facility_name, facility_type, capacity, location, building, floor, amenities, status, created_at
         FROM facilities ORDER BY facility_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch facilities." });
  }
});

module.exports = router;