"use strict";

const express = require("express");
const { pool } = require("../db/pool");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/staff", requireRole("A"), async (_req, res, next) => {
  try {
    const query = `
      SELECT id, username, display_name, role, is_active, created_at
      FROM users
      WHERE role IN ('A', 'B')
      ORDER BY role DESC, username ASC
    `;
    const result = await pool.query(query);
    return res.json({ staff: result.rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
