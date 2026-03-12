"use strict";

const DEFAULT_OFFICE_CODE = process.env.DEFAULT_ATPT_OFCDC_SC_CODE || "B10";
const DEFAULT_SCHOOL_CODE = process.env.DEFAULT_SD_SCHUL_CODE || "7010096";
const DEFAULT_MEAL_API_KEY = "24c8cc27be96460fa3a0f648dc6d0af5";
const DEFAULT_SCHOOL_API_KEY = "88c7f5d3fc914566b53504aed7919ff1";

function stripYmd(value) {
  return String(value || "").replaceAll("-", "").trim();
}

function isValidYmd(ymd) {
  return /^\d{8}$/.test(ymd);
}

function addMonths(ymd, months) {
  if (!isValidYmd(ymd)) return "";
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getMonthRangeFromDate(ymd) {
  if (!isValidYmd(ymd)) return null;
  return {
    fromDate: ymd,
    toDate: addMonths(ymd, 1),
  };
}

function getMealApiKey() {
  return (
    process.env.NEIS_MEAL_API_KEY ||
    process.env.NEIS_API_KEY ||
    process.env.NEIS_SCHOOL_API_KEY ||
    DEFAULT_MEAL_API_KEY
  );
}

function getSchoolApiKey() {
  return process.env.NEIS_SCHOOL_API_KEY || process.env.NEIS_API_KEY || DEFAULT_SCHOOL_API_KEY;
}

function parseRows(payload, rootKey) {
  const top = payload?.[rootKey];
  if (!Array.isArray(top) || top.length < 2) return [];
  return Array.isArray(top[1]?.row) ? top[1].row : [];
}

async function callNeis({ endpoint, key, params }) {
  const query = new URLSearchParams({
    KEY: key,
    Type: "json",
    pIndex: "1",
    pSize: "100",
    ATPT_OFCDC_SC_CODE: DEFAULT_OFFICE_CODE,
    SD_SCHUL_CODE: DEFAULT_SCHOOL_CODE,
    ...params,
  });

  const url = `https://open.neis.go.kr/hub/${endpoint}?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`NEIS API 호출 실패 (${response.status})`);
    error.status = 502;
    throw error;
  }
  return response.json();
}

module.exports = {
  DEFAULT_OFFICE_CODE,
  DEFAULT_SCHOOL_CODE,
  getMealApiKey,
  getSchoolApiKey,
  getMonthRangeFromDate,
  stripYmd,
  isValidYmd,
  parseRows,
  callNeis,
};
