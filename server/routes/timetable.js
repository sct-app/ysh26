"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, getSchoolApiKey, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const officeCode = String(req.query.officeCode || "")
      .trim()
      .toUpperCase();
    const schoolCode = String(req.query.schoolCode || "").trim();
    const date = stripYmd(req.query.date);
    const grade = String(req.query.grade || "").trim();
    const classNm = String(req.query.classNm || "").trim();

    if (!officeCode || !schoolCode || !date) {
      return res.status(400).json({ message: "officeCode, schoolCode, date가 필요합니다." });
    }

    const params = {
      ALL_TI_YMD: date,
    };
    if (grade) params.GRADE = grade;
    if (classNm) params.CLASS_NM = classNm;

    const payload = await callNeis({
      endpoint: "hisTimetable",
      key: getSchoolApiKey(),
      officeCode,
      schoolCode,
      params,
    });

    const rows = parseRows(payload, "hisTimetable");
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
