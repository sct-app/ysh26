"use strict";

const jwt = require("jsonwebtoken");

const COOKIE_NAME = "portal_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 환경변수가 필요합니다.");
  }
  return secret;
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "8h",
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAMESITE || "Lax";
  const secureFlag = process.env.COOKIE_SECURE;
  const secure = secureFlag === undefined ? process.env.NODE_ENV === "production" : secureFlag === "true";
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === "None" ? true : secure,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
