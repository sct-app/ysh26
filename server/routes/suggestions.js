"use strict";

const express = require("express");
const { pool } = require("../db/pool");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireRole("C"), async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();

    if (!content) {
      return res.status(400).json({ message: "건의 내용은 비워둘 수 없습니다." });
    }

    const query = `
      INSERT INTO suggestions (title, content, created_by, created_by_role)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        title,
        content,
        created_by_role AS "createdByRole",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;
    const params = [title || null, content, req.auth.userId || null, req.auth.role];
    const result = await pool.query(query, params);
    return res.status(201).json({ suggestion: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireRole("B"), async (_req, res, next) => {
  try {
    const query = `
      SELECT
        id,
        title,
        content,
        created_by_role AS "createdByRole",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM suggestions
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return res.json({ suggestions: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireRole("B"), async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();

    if (!content) {
      return res.status(400).json({ message: "건의 내용은 비워둘 수 없습니다." });
    }

    const query = `
      UPDATE suggestions
      SET title = $2, content = $3, updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        title,
        content,
        created_by_role AS "createdByRole",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;
    const result = await pool.query(query, [id, title || null, content]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "건의 글을 찾을 수 없습니다." });
    }
    return res.json({ suggestion: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireRole("B"), async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    const query = `DELETE FROM suggestions WHERE id = $1`;
    const result = await pool.query(query, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "건의 글을 찾을 수 없습니다." });
    }
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
