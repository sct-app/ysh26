"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, getMonthRangeFromDate, getSchoolApiKey, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const date = stripYmd(req.query.date);
    const fromDate = stripYmd(req.query.fromDate);
    const toDate = stripYmd(req.query.toDate);

    let range = null;
    if (date) {
      range = getMonthRangeFromDate(date);
      if (!range) {
        return res.status(400).json({ message: "date 형식이 올바르지 않습니다." });
      }
    } else if (fromDate && toDate) {
      range = { fromDate, toDate };
    } else {
      return res.status(400).json({ message: "date 또는 fromDate/toDate를 입력해주세요." });
    }

    const payload = await callNeis({
      endpoint: "SchoolSchedule",
      key: getSchoolApiKey(),
      params: {
        AA_FROM_YMD: range.fromDate,
        AA_TO_YMD: range.toDate,
      },
    });

    const rows = parseRows(payload, "SchoolSchedule");
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
