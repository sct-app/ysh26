"use strict";

const fs = require("fs/promises");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, "..", "data", "portal.db");

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

module.exports = { getDb };
