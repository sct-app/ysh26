"use strict";

const express = require("express");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

function parseMealRows(payload) {
  const top = payload?.mealServiceDietInfo;
  if (!Array.isArray(top) || top.length < 2) return [];
  return top[1]?.row ?? [];
}

router.get("/", requireRole("C"), async (req, res, next) => {
  try {
    const officeCode = String(req.query.officeCode || "").trim();
    const schoolCode = String(req.query.schoolCode || "").trim();
    const mealDate = String(req.query.mealDate || "").replaceAll("-", "").trim();

    if (!officeCode || !schoolCode || !mealDate) {
      return res.status(400).json({ message: "officeCode, schoolCode, mealDate가 필요합니다." });
    }

    const apiKey = process.env.NEIS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NEIS_API_KEY가 서버에 설정되지 않았습니다." });
    }

    const params = new URLSearchParams({
      KEY: apiKey,
      Type: "json",
      pIndex: "1",
      pSize: "100",
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode,
      MLSV_YMD: mealDate,
    });

    const endpoint = `https://open.neis.go.kr/hub/mealServiceDietInfo?${params.toString()}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res.status(502).json({ message: `급식 API 호출 실패 (${response.status})` });
    }

    const payload = await response.json();
    const rows = parseMealRows(payload);
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
