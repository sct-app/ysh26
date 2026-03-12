"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, getMealApiKey, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const officeCode = String(req.query.officeCode || "")
      .trim()
      .toUpperCase();
    const schoolCode = String(req.query.schoolCode || "").trim();
    const mealDate = stripYmd(req.query.mealDate);

    if (!officeCode || !schoolCode || !mealDate) {
      return res.status(400).json({ message: "officeCode, schoolCode, mealDate가 필요합니다." });
    }

    const payload = await callNeis({
      endpoint: "mealServiceDietInfo",
      key: getMealApiKey(),
      officeCode,
      schoolCode,
      params: {
        MLSV_YMD: mealDate,
      },
    });
    const rows = parseRows(payload, "mealServiceDietInfo");
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
