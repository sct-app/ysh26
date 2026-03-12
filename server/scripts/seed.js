"use strict";

require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../db/pool");

async function upsertUser({ username, displayName, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const query = `
    INSERT INTO users (username, display_name, password_hash, role, is_active, updated_at)
    VALUES ($1, $2, $3, $4, TRUE, now())
    ON CONFLICT (username)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      is_active = TRUE,
      updated_at = now()
    RETURNING id, username, display_name, role
  `;
  const result = await pool.query(query, [username.toLowerCase(), displayName, passwordHash, role]);
  return result.rows[0];
}

async function upsertGeneralPasscode(passcode) {
  const passcodeHash = await bcrypt.hash(passcode, 12);
  const query = `
    INSERT INTO access_codes (code_name, secret_hash, role, updated_at)
    VALUES ('GENERAL_PORTAL', $1, 'C', now())
    ON CONFLICT (code_name)
    DO UPDATE SET
      secret_hash = EXCLUDED.secret_hash,
      role = 'C',
      updated_at = now()
  `;
  await pool.query(query, [passcodeHash]);
}

async function main() {
  const generalPasscode = process.env.GENERAL_PASSCODE || "YEOUIDO";
  const admin = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "ADMIN1234!",
    displayName: process.env.ADMIN_DISPLAY_NAME || "관리자",
    role: "A",
  };
  const manager = {
    username: process.env.MANAGER_USERNAME || "manager",
    password: process.env.MANAGER_PASSWORD || "MANAGER1234!",
    displayName: process.env.MANAGER_DISPLAY_NAME || "매니저",
    role: "B",
  };

  const [adminUser, managerUser] = await Promise.all([upsertUser(admin), upsertUser(manager)]);
  await upsertGeneralPasscode(generalPasscode);

  console.log("Seed completed.");
  console.log("admin:", adminUser.username, adminUser.role);
  console.log("manager:", managerUser.username, managerUser.role);
}

main()
  .catch((error) => {
    console.error("DB seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
