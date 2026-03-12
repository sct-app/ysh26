"use strict";

(function initAuthModule() {
  const SESSION_KEY = "ysh26_session";
  const ROLE_LEVEL = { C: 1, B: 2, A: 3 };

  const GENERAL_PASSWORD = "YEOUIDO";
  const STAFF_ACCOUNTS = {
    admin: {
      password: "ADMIN1234!",
      role: "A",
      name: "관리자",
    },
    manager: {
      password: "MANAGER1234!",
      role: "B",
      name: "매니저",
    },
  };

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function roleLabel(role) {
    if (role === "A") return "A (관리자)";
    if (role === "B") return "B (매니저 이상)";
    return "C (로그인 사용자)";
  }

  function canAccess(userRole, requiredRole) {
    const userLevel = ROLE_LEVEL[userRole] ?? 0;
    const requiredLevel = ROLE_LEVEL[requiredRole] ?? Number.MAX_SAFE_INTEGER;
    return userLevel >= requiredLevel;
  }

  function loginGeneral(password) {
    if (password !== GENERAL_PASSWORD) {
      return { ok: false, message: "비밀번호가 올바르지 않습니다." };
    }

    const session = {
      id: "general",
      name: "일반 사용자",
      role: "C",
      loginType: "general",
      loggedInAt: new Date().toISOString(),
    };
    setSession(session);
    return { ok: true, session };
  }

  function loginStaff(id, password) {
    const userId = String(id || "").trim().toLowerCase();
    const account = STAFF_ACCOUNTS[userId];

    if (!account || account.password !== password) {
      return { ok: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }

    const session = {
      id: userId,
      name: account.name,
      role: account.role,
      loginType: "staff",
      loggedInAt: new Date().toISOString(),
    };
    setSession(session);
    return { ok: true, session };
  }

  function logout() {
    clearSession();
    window.location.href = "login.html";
  }

  function requireAuth(requiredRole) {
    const session = getSession();
    if (!session) {
      const redirect = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
      window.location.href = `login.html?redirect=${redirect}`;
      return null;
    }

    if (!canAccess(session.role, requiredRole)) {
      alert(`이 페이지는 ${roleLabel(requiredRole)} 권한이 필요합니다.`);
      window.location.href = "index.html";
      return null;
    }

    return session;
  }

  function applyCommonUI(session) {
    const userInfoTargets = document.querySelectorAll("[data-user-info]");
    userInfoTargets.forEach((target) => {
      target.textContent = `${session.name} / ${roleLabel(session.role)}`;
    });

    const roleTargets = document.querySelectorAll("[data-current-role]");
    roleTargets.forEach((target) => {
      target.textContent = roleLabel(session.role);
    });

    const gatedLinks = document.querySelectorAll("[data-min-role]");
    gatedLinks.forEach((item) => {
      const minRole = item.getAttribute("data-min-role");
      if (!minRole) return;
      item.style.display = canAccess(session.role, minRole) ? "" : "none";
    });

    const logoutButtons = document.querySelectorAll("[data-logout]");
    logoutButtons.forEach((button) => {
      button.addEventListener("click", logout);
    });
  }

  function initProtectedPage(requiredRole) {
    const session = requireAuth(requiredRole);
    if (!session) return null;
    applyCommonUI(session);
    return session;
  }

  function redirectIfLoggedIn() {
    const session = getSession();
    if (!session) return;
    window.location.href = "index.html";
  }

  window.Auth = {
    GENERAL_PASSWORD,
    STAFF_ACCOUNTS,
    ROLE_LEVEL,
    getSession,
    loginGeneral,
    loginStaff,
    logout,
    canAccess,
    roleLabel,
    initProtectedPage,
    redirectIfLoggedIn,
  };
})();
