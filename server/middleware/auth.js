"use strict";

const { COOKIE_NAME, verifyToken } = require("../utils/token");
const { canAccess } = require("../utils/roles");

function parseAuth(req, _res, next) {
  req.auth = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.auth = payload;
  } catch (_error) {
    req.auth = null;
  }

  return next();
}

function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  return next();
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    if (!canAccess(req.auth.role, requiredRole)) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }
    return next();
  };
}

module.exports = { parseAuth, requireAuth, requireRole };
