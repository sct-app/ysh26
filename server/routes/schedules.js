"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const date = stripYmd(req.query.date);
    const fromDate = stripYmd(req.query.fromDate);
    const toDate = stripYmd(req.query.toDate);

    if (!date && (!fromDate || !toDate)) {
      return res.status(400).json({ message: "date 또는 fromDate/toDate를 입력해주세요." });
    }

    const apiKey = process.env.NEIS_SCHOOL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NEIS_SCHOOL_API_KEY가 서버에 설정되지 않았습니다." });
    }
    const params = {};
    if (date) {
      params.AA_YMD = date;
    } else {
      params.AA_FROM_YMD = fromDate;
      params.AA_TO_YMD = toDate;
    }

    const payload = await callNeis({
      endpoint: "SchoolSchedule",
      key: apiKey,
      params,
    });

    const rows = parseRows(payload, "SchoolSchedule");
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
