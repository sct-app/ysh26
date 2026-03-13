"use strict";

const fs = require("fs/promises");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Pool } = require("pg");

const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
const DB_FILE = process.env.DB_FILE || "/tmp/portal.db";

function isLocalDbUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch (_error) {
    return false;
  }
}

const DB_KIND = DATABASE_URL ? "postgres" : "sqlite";

let sqlitePromise = null;
let pgPool = null;

async function initSqlite() {
  await fs.mkdir("/tmp", { recursive: true });
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

function getSqlite() {
  if (!sqlitePromise) {
    sqlitePromise = initSqlite();
  }
  return sqlitePromise;
}

function getPgPool() {
  if (!pgPool) {
    const sslEnv = String(process.env.PG_SSL || "").trim().toLowerCase();
    const useSsl = sslEnv ? sslEnv === "true" : !isLocalDbUrl(DATABASE_URL);
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }
  return pgPool;
}

let pgInitPromise = null;
async function initPostgres() {
  if (pgInitPromise) return pgInitPromise;
  pgInitPromise = (async () => {
    const pool = getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  })();
  return pgInitPromise;
}

async function listClassNotices() {
  if (DB_KIND === "postgres") {
    await initPostgres();
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, title, content, author, created_at AS "createdAt"
       FROM class_notices
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  const db = await getSqlite();
  return db.all(
    `SELECT id, title, content, author, created_at AS createdAt
     FROM class_notices
     ORDER BY datetime(created_at) DESC`
  );
}

async function createClassNotice(item) {
  if (DB_KIND === "postgres") {
    await initPostgres();
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO class_notices (id, title, content, author, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.id, item.title, item.content, item.author, item.createdAt]
    );
    return;
  }

  const db = await getSqlite();
  await db.run(
    `INSERT INTO class_notices (id, title, content, author, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [item.id, item.title, item.content, item.author, item.createdAt]
  );
}

async function deleteClassNotice(id) {
  if (DB_KIND === "postgres") {
    await initPostgres();
    const pool = getPgPool();
    const result = await pool.query(`DELETE FROM class_notices WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }

  const db = await getSqlite();
  const result = await db.run(`DELETE FROM class_notices WHERE id = ?`, [id]);
  return Boolean(result.changes);
}

const DB_INFO = {
  kind: DB_KIND,
  target: DB_KIND === "postgres" ? "DATABASE_URL" : DB_FILE,
};

module.exports = {
  DB_INFO,
  listClassNotices,
  createClassNotice,
  deleteClassNotice,
};
