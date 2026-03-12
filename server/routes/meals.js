"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");
const { callNeis, parseRows, stripYmd } = require("../utils/neis");

const router = express.Router();

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const mealDate = stripYmd(req.query.mealDate);

    if (!mealDate) {
      return res.status(400).json({ message: "mealDate가 필요합니다." });
    }

    const apiKey = process.env.NEIS_MEAL_API_KEY || process.env.NEIS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NEIS_MEAL_API_KEY가 서버에 설정되지 않았습니다." });
    }

    const payload = await callNeis({
      endpoint: "mealServiceDietInfo",
      key: apiKey,
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
