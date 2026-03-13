"use strict";

const fs = require("fs/promises");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

// Render 같은 환경에서는 /opt/render/project/src가 read-only일 수 있으므로
// 기본 경로를 /tmp로 둔다. 영구 저장은 DB_FILE을 디스크 마운트 경로로 지정해야 한다.
const DB_FILE = process.env.DB_FILE || "/tmp/portal.db";

let dbPromise = null;

async function initDb() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS class_notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return db;
}

function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

module.exports = { getDb, DB_FILE };
