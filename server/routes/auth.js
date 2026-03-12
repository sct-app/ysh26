"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");

const { pool } = require("../db/pool");
const { COOKIE_NAME, signToken, cookieOptions } = require("../utils/token");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login/general", async (req, res, next) => {
  try {
    const passcode = String(req.body?.passcode || "").trim();
    if (!passcode) {
      return res.status(400).json({ message: "비밀번호를 입력해주세요." });
    }

    const query = `
      SELECT code_name, secret_hash, role
      FROM access_codes
      WHERE code_name = 'GENERAL_PORTAL'
      LIMIT 1
    `;
    const result = await pool.query(query);
    const row = result.rows[0];

    if (!row) {
      return res.status(500).json({ message: "일반 로그인 코드가 설정되지 않았습니다." });
    }

    const matched = await bcrypt.compare(passcode, row.secret_hash);
    if (!matched) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    const payload = {
      userId: null,
      username: "general",
      name: "일반 사용자",
      role: row.role,
      loginType: "general",
    };

    res.cookie(COOKIE_NAME, signToken(payload), cookieOptions());
    return res.json({ session: payload });
  } catch (error) {
    return next(error);
  }
});

router.post("/login/staff", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
    }

    const query = `
      SELECT id, username, display_name, password_hash, role, is_active
      FROM users
      WHERE username = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [username]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    const matched = await bcrypt.compare(password, user.password_hash);
    if (!matched) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    const payload = {
      userId: user.id,
      username: user.username,
      name: user.display_name,
      role: user.role,
      loginType: "staff",
    };

    res.cookie(COOKIE_NAME, signToken(payload), cookieOptions());
    return res.json({ session: payload });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
  return res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ session: req.auth });
});

module.exports = router;
