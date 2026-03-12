"use strict";

require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../db/pool");

async function main() {
  const schemaPath = path.resolve(__dirname, "..", "db", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);
  console.log("DB migration completed.");
}

main()
  .catch((error) => {
    console.error("DB migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
