"use strict";

const DEFAULT_OFFICE_CODE = process.env.DEFAULT_ATPT_OFCDC_SC_CODE || "B10";
const DEFAULT_SCHOOL_CODE = process.env.DEFAULT_SD_SCHUL_CODE || "7010096";

function stripYmd(value) {
  return String(value || "").replaceAll("-", "").trim();
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
  stripYmd,
  parseRows,
  callNeis,
};
