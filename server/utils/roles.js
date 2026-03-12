"use strict";

const ROLE_LEVEL = {
  C: 1,
  B: 2,
  A: 3,
};

function canAccess(userRole, requiredRole) {
  const userLevel = ROLE_LEVEL[userRole] ?? 0;
  const requiredLevel = ROLE_LEVEL[requiredRole] ?? Number.MAX_SAFE_INTEGER;
  return userLevel >= requiredLevel;
}

module.exports = { ROLE_LEVEL, canAccess };
