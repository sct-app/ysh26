"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const date = stripYmd(req.query.date);
    const grade = String(req.query.grade || "").trim();
    const classNm = String(req.query.classNm || "").trim();

    if (!date || !grade || !classNm) {
      return res.status(400).json({ message: "date, grade, classNm이 필요합니다." });
    }

    const apiKey = process.env.NEIS_SCHOOL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NEIS_SCHOOL_API_KEY가 서버에 설정되지 않았습니다." });
    }
    const payload = await callNeis({
      endpoint: "hisTimetable",
      key: apiKey,
      params: {
        ALL_TI_YMD: date,
        GRADE: grade,
        CLASS_NM: classNm,
      },
    });

    const rows = parseRows(payload, "hisTimetable");
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
