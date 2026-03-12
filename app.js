"use strict";

(function initAppModule() {
  function getToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseMealRows(payload) {
    const top = payload?.mealServiceDietInfo;
    if (!Array.isArray(top) || top.length < 2) return [];
    return top[1]?.row ?? [];
  }

  function replaceBr(value) {
    return String(value || "")
      .replaceAll("<br/>", "\n")
      .replaceAll("<br />", "\n")
      .replaceAll("<BR/>", "\n")
      .replaceAll("<BR />", "\n");
  }

  async function fetchMeal({ officeCode, schoolCode, mealDate }) {
    const params = new URLSearchParams({
      officeCode: String(officeCode || "").trim(),
      schoolCode: String(schoolCode || "").trim(),
      mealDate: String(mealDate || "").trim(),
    });
    const payload = await window.Auth.apiRequest(`/api/meals?${params.toString()}`, { method: "GET" });
    return parseMealRows({ mealServiceDietInfo: [{}, { row: payload.rows || [] }] });
  }

  function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  async function listSuggestions() {
    const payload = await window.Auth.apiRequest("/api/suggestions", { method: "GET" });
    return payload.suggestions || [];
  }

  async function createSuggestion({ title, content }) {
    const payload = await window.Auth.apiRequest("/api/suggestions", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    return payload.suggestion;
  }

  async function updateSuggestion(id, updateInput) {
    const payload = await window.Auth.apiRequest(`/api/suggestions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateInput),
    });
    return payload.suggestion;
  }

  async function deleteSuggestion(id) {
    await window.Auth.apiRequest(`/api/suggestions/${id}`, {
      method: "DELETE",
    });
  }

  async function initMainPage() {
    const session = await window.Auth.initProtectedPage("C");
    if (!session) return;

    const dateInput = document.getElementById("meal-date");
    const officeInput = document.getElementById("office-code");
    const schoolInput = document.getElementById("school-code");
    const form = document.getElementById("meal-form");
    const result = document.getElementById("meal-result");

    if (dateInput) dateInput.value = getToday();

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.textContent = "급식 정보를 불러오는 중입니다...";

      const officeCode = String(officeInput?.value || "").trim();
      const schoolCode = String(schoolInput?.value || "").trim();
      const mealDate = String(dateInput?.value || "").trim();

      if (!officeCode || !schoolCode || !mealDate) {
        result.textContent = "시도교육청코드, 학교코드, 날짜를 모두 입력해주세요.";
        return;
      }

      try {
        const rows = await fetchMeal({ officeCode, schoolCode, mealDate });
        if (!rows.length) {
          result.textContent = "조회된 급식 정보가 없습니다.";
          return;
        }

        const fragment = document.createDocumentFragment();
        rows.forEach((row) => {
          const card = makeEl("article", "meal-card");
          card.appendChild(makeEl("h4", "", `${row.MMEAL_SC_NM} (${row.MLSV_YMD})`));
          card.appendChild(makeEl("p", "meal-menu", replaceBr(row.DDISH_NM)));
          card.appendChild(makeEl("p", "meal-info", `칼로리: ${row.CAL_INFO || "-"}`));
          fragment.appendChild(card);
        });

        result.innerHTML = "";
        result.appendChild(fragment);
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : "급식 정보를 불러오지 못했습니다.";
      }
    });
  }

  function renderSuggestionList(container, suggestions, reloadList) {
    container.innerHTML = "";
    if (!suggestions.length) {
      container.textContent = "등록된 건의가 없습니다.";
      return;
    }

    suggestions.forEach((item) => {
      const wrapper = makeEl("article", "suggestion-card");
      wrapper.appendChild(makeEl("h4", "", item.title || "(제목 없음)"));
      wrapper.appendChild(makeEl("p", "suggestion-content", item.content || "(내용 없음)"));
      wrapper.appendChild(makeEl("p", "suggestion-meta", `등록: ${new Date(item.createdAt).toLocaleString("ko-KR")}`));

      if (item.updatedAt) {
        wrapper.appendChild(
          makeEl("p", "suggestion-meta", `수정: ${new Date(item.updatedAt).toLocaleString("ko-KR")}`)
        );
      }

      const actions = makeEl("div", "card-actions");
      const editBtn = makeEl("button", "btn secondary", "수정");
      const delBtn = makeEl("button", "btn danger", "삭제");

      editBtn.addEventListener("click", async () => {
        const nextTitle = window.prompt("새 제목", item.title);
        if (nextTitle === null) return;
        const nextContent = window.prompt("새 내용", item.content);
        if (nextContent === null) return;

        try {
          await updateSuggestion(item.id, {
            title: nextTitle.trim(),
            content: nextContent.trim(),
          });
          await reloadList();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "수정에 실패했습니다.");
        }
      });

      delBtn.addEventListener("click", async () => {
        if (!window.confirm("이 건의 글을 삭제할까요?")) return;
        try {
          await deleteSuggestion(item.id);
          await reloadList();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "삭제에 실패했습니다.");
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(actions);
      container.appendChild(wrapper);
    });
  }

  async function initSuggestionsPage() {
    const session = await window.Auth.initProtectedPage("C");
    if (!session) return;

    const form = document.getElementById("suggest-form");
    const titleInput = document.getElementById("suggest-title");
    const contentInput = document.getElementById("suggest-content");
    const message = document.getElementById("suggest-message");
    const managerPanel = document.getElementById("manager-panel");
    const managerList = document.getElementById("suggestion-list");

    async function reloadManagerSuggestions() {
      if (!managerList) return;
      const suggestions = await listSuggestions();
      renderSuggestionList(managerList, suggestions, reloadManagerSuggestions);
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = String(titleInput?.value || "").trim();
      const content = String(contentInput?.value || "").trim();

      if (!content) {
        message.textContent = "건의 내용은 비워둘 수 없습니다.";
        return;
      }

      try {
        await createSuggestion({
          title,
          content,
        });
        form.reset();
        message.textContent = "익명 건의가 등록되었습니다.";
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : "건의 등록에 실패했습니다.";
        return;
      }

      if (window.Auth.canAccess(session.role, "B")) {
        try {
          await reloadManagerSuggestions();
        } catch (error) {
          message.textContent = error instanceof Error ? error.message : "목록을 불러오지 못했습니다.";
        }
      }
    });

    if (window.Auth.canAccess(session.role, "B")) {
      if (managerPanel) managerPanel.style.display = "block";
      try {
        await reloadManagerSuggestions();
      } catch (error) {
        if (managerList) {
          managerList.textContent = error instanceof Error ? error.message : "목록을 불러오지 못했습니다.";
        }
      }
      return;
    }

    if (managerPanel) {
      managerPanel.style.display = "block";
      managerPanel.innerHTML =
        "<h3>비공개 익명 게시판</h3><p>건의 내용 조회/관리 권한은 매니저 이상(B)부터 제공됩니다.</p>";
    }
  }

  async function initManagerPage() {
    const session = await window.Auth.initProtectedPage("B");
    if (!session) return;

    const countTarget = document.getElementById("manager-suggest-count");
    if (!countTarget) return;

    try {
      const items = await listSuggestions();
      countTarget.textContent = String(items.length);
    } catch (error) {
      countTarget.textContent = "-";
      window.alert(error instanceof Error ? error.message : "건의 수를 조회할 수 없습니다.");
    }
  }

  async function initAdminPage() {
    const session = await window.Auth.initProtectedPage("A");
    if (!session) return;

    const accountList = document.getElementById("staff-account-list");
    if (!accountList) return;
    accountList.innerHTML = "";

    try {
      const payload = await window.Auth.apiRequest("/api/admin/staff", { method: "GET" });
      const staff = payload.staff || [];

      if (!staff.length) {
        accountList.innerHTML = "<li>등록된 계정이 없습니다.</li>";
        return;
      }

      staff.forEach((user) => {
        const item = makeEl(
          "li",
          "",
          `${user.username} / ${user.display_name} / 역할 ${user.role} / ${
            user.is_active ? "활성" : "비활성"
          }`
        );
        accountList.appendChild(item);
      });
    } catch (error) {
      accountList.innerHTML = `<li>${error instanceof Error ? error.message : "계정 목록을 불러오지 못했습니다."}</li>`;
    }
  }

  async function initGeneralLoginPage() {
    await window.Auth.redirectIfLoggedIn();
    const form = document.getElementById("general-login-form");
    const pwInput = document.getElementById("general-password");
    const message = document.getElementById("general-login-message");
    const goStaffLink = document.getElementById("go-staff-link");

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && goStaffLink) {
      goStaffLink.href = `./login-staff.html?redirect=${encodeURIComponent(redirect)}`;
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await window.Auth.loginGeneral(String(pwInput?.value || "").trim());
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : "로그인에 실패했습니다.";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "index.html";
      window.location.href = redirect;
    });
  }

  async function initStaffLoginPage() {
    await window.Auth.redirectIfLoggedIn();
    const form = document.getElementById("staff-login-form");
    const idInput = document.getElementById("staff-id");
    const pwInput = document.getElementById("staff-password");
    const message = document.getElementById("staff-login-message");
    const goGeneralLink = document.getElementById("go-general-link");

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && goGeneralLink) {
      goGeneralLink.href = `./login-user.html?redirect=${encodeURIComponent(redirect)}`;
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await window.Auth.loginStaff(String(idInput?.value || "").trim(), String(pwInput?.value || "").trim());
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : "로그인에 실패했습니다.";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "index.html";
      window.location.href = redirect;
    });
  }

  window.App = {
    initMainPage,
    initSuggestionsPage,
    initManagerPage,
    initAdminPage,
    initGeneralLoginPage,
    initStaffLoginPage,
  };
})();
