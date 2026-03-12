"use strict";

(function initAuthModule() {
  const ROLE_LEVEL = { C: 1, B: 2, A: 3 };
  let cachedSession = null;

  function getApiBase() {
    const raw = String(window.APP_CONFIG?.API_BASE || "").trim();
    if (!raw) return "";
    return raw.replace(/\/+$/, "");
  }

  function buildApiUrl(path) {
    return `${getApiBase()}${path}`;
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

  async function apiRequest(path, init = {}) {
    const headers = {
      ...(init.headers || {}),
    };
    if (init.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(buildApiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.message || "요청 처리에 실패했습니다.");
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function getSession(force = false) {
    if (!force && cachedSession) return cachedSession;
    try {
      const data = await apiRequest("/api/auth/me", { method: "GET" });
      cachedSession = data.session || null;
      return cachedSession;
    } catch (error) {
      if (error?.status === 401) {
        cachedSession = null;
        return null;
      }
      throw error;
    }
  }

  async function loginGeneral(passcode) {
    const data = await apiRequest("/api/auth/login/general", {
      method: "POST",
      body: JSON.stringify({ passcode }),
    });
    cachedSession = data.session || null;
    return data;
  }

  async function loginStaff(username, password) {
    const data = await apiRequest("/api/auth/login/staff", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    cachedSession = data.session || null;
    return data;
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_error) {
      // 로그아웃 API 실패 시에도 클라이언트는 로그인 페이지로 이동시킨다.
    }
    cachedSession = null;
    window.location.href = "./login.html";
  }

  async function requireAuth(requiredRole) {
    const session = await getSession();
    if (!session) {
      const redirect = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
      window.location.href = `./login.html?redirect=${redirect}`;
      return null;
    }

    if (!canAccess(session.role, requiredRole)) {
      alert(`이 페이지는 ${roleLabel(requiredRole)} 권한이 필요합니다.`);
      window.location.href = "./index.html";
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

  async function initProtectedPage(requiredRole) {
    const session = await requireAuth(requiredRole);
    if (!session) return null;
    applyCommonUI(session);
    return session;
  }

  async function redirectIfLoggedIn() {
    const session = await getSession();
    if (!session) return;
    window.location.href = "./index.html";
  }

  window.Auth = {
    ROLE_LEVEL,
    apiRequest,
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
