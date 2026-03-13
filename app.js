"use strict";

(function initAppModule() {
  const SUGGESTIONS_KEY = "ysh26_suggestions";
  const CLASS_NOTICES_KEY = "ysh26_class_notices";
  const NOTICE_API_BASE = String(window.APP_CONFIG?.API_BASE || "").replace(/\/+$/, "");
  const MEAL_API_BASE = "https://open.neis.go.kr/hub/mealServiceDietInfo";
  const MEAL_API_KEY = "24c8cc27be96460fa3a0f648dc6d0af5";

  function formatYmd(dateStr) {
    return String(dateStr || "").replaceAll("-", "");
  }

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
      KEY: MEAL_API_KEY,
      Type: "json",
      pIndex: "1",
      pSize: "100",
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode,
      MLSV_YMD: formatYmd(mealDate),
    });

    const response = await fetch(`${MEAL_API_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`급식 API 호출 실패 (${response.status})`);
    }

    const payload = await response.json();
    return parseMealRows(payload);
  }

  function readSuggestions() {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      localStorage.removeItem(SUGGESTIONS_KEY);
      return [];
    }
  }

  function saveSuggestions(list) {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list));
  }

  function createSuggestion({ title, content, role }) {
    const item = {
      id: crypto.randomUUID(),
      title: String(title || "").trim(),
      content: String(content || "").trim(),
      authorRole: role,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    const list = readSuggestions();
    list.unshift(item);
    saveSuggestions(list);
    return item;
  }

  function updateSuggestion(id, updateInput) {
    const list = readSuggestions();
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return false;

    list[index] = {
      ...list[index],
      ...updateInput,
      updatedAt: new Date().toISOString(),
    };
    saveSuggestions(list);
    return true;
  }

  function deleteSuggestion(id) {
    const list = readSuggestions();
    const next = list.filter((item) => item.id !== id);
    if (next.length === list.length) return false;
    saveSuggestions(next);
    return true;
  }

  function readClassNoticesLocal() {
    const raw = localStorage.getItem(CLASS_NOTICES_KEY);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      localStorage.removeItem(CLASS_NOTICES_KEY);
      return [];
    }
  }

  function saveClassNoticesLocal(list) {
    localStorage.setItem(CLASS_NOTICES_KEY, JSON.stringify(list));
  }

  function classNoticeApiUrl(path) {
    return `${NOTICE_API_BASE}${path}`;
  }

  async function readClassNotices() {
    const response = await fetch(classNoticeApiUrl("/api/class-notices"), {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || "학급 공지사항을 불러오지 못했습니다.");
    }
    const payload = await response.json();
    const notices = Array.isArray(payload?.notices) ? payload.notices : [];
    saveClassNoticesLocal(notices);
    return notices;
  }

  async function createClassNotice({ title, content, author, role }) {
    const response = await fetch(classNoticeApiUrl("/api/class-notices"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": String(role || ""),
      },
      body: JSON.stringify({
        title: String(title || "").trim(),
        content: String(content || "").trim(),
        author: String(author || "").trim(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || "학급 공지사항 등록에 실패했습니다.");
    }
  }

  async function deleteClassNotice(id, role) {
    const response = await fetch(classNoticeApiUrl(`/api/class-notices/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: {
        "X-User-Role": String(role || ""),
      },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || "학급 공지사항 삭제에 실패했습니다.");
    }
  }

  function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function renderClassNoticeList(container, notices, canManage, onDelete) {
    container.innerHTML = "";
    if (!notices.length) {
      container.textContent = "등록된 학급 공지사항이 없습니다.";
      return;
    }

    notices.forEach((item) => {
      const wrapper = makeEl("article", "suggestion-card");
      wrapper.appendChild(makeEl("h4", "", item.title || "(제목 없음)"));
      wrapper.appendChild(makeEl("p", "suggestion-content", item.content || "(내용 없음)"));
      wrapper.appendChild(
        makeEl(
          "p",
          "suggestion-meta",
          `등록: ${new Date(item.createdAt).toLocaleString("ko-KR")} / 작성자: ${item.author || "-"}`
        )
      );

      if (canManage) {
        const actions = makeEl("div", "card-actions");
        const delBtn = makeEl("button", "btn danger", "삭제");
        delBtn.addEventListener("click", () => {
          onDelete(item.id);
        });
        actions.appendChild(delBtn);
        wrapper.appendChild(actions);
      }

      container.appendChild(wrapper);
    });
  }

  function initMainPage() {
    const session = window.Auth.initProtectedPage("C");
    if (!session) return;

    const dateInput = document.getElementById("meal-date");
    const officeInput = document.getElementById("office-code");
    const schoolInput = document.getElementById("school-code");
    const form = document.getElementById("meal-form");
    const result = document.getElementById("meal-result");
    const classNoticeList = document.getElementById("class-notice-list");
    const classNoticeManager = document.getElementById("class-notice-manager");
    const classNoticeForm = document.getElementById("class-notice-form");
    const classNoticeTitle = document.getElementById("class-notice-title");
    const classNoticeContent = document.getElementById("class-notice-content");
    const classNoticeMessage = document.getElementById("class-notice-message");

    if (dateInput) dateInput.value = getToday();

    const canManageClassNotice = window.Auth.canAccess(session.role, "B");
    if (classNoticeManager) {
      classNoticeManager.style.display = canManageClassNotice ? "block" : "none";
    }

    async function refreshClassNoticeList() {
      if (!classNoticeList) return;
      const notices = await readClassNotices();
      renderClassNoticeList(classNoticeList, notices, canManageClassNotice, async (id) => {
        if (!canManageClassNotice) return;
        if (!window.confirm("이 공지사항을 삭제할까요?")) return;
        try {
          await deleteClassNotice(id, session.role);
          await refreshClassNoticeList();
        } catch (_error) {
          classNoticeMessage.textContent = "공지사항 삭제에 실패했습니다.";
        }
      });
    }

    refreshClassNoticeList().catch(() => {
      if (classNoticeList) {
        classNoticeList.textContent = "학급 공지사항을 불러오지 못했습니다.";
      }
    });

    classNoticeForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canManageClassNotice) return;

      const title = String(classNoticeTitle?.value || "").trim();
      const content = String(classNoticeContent?.value || "").trim();
      if (!title || !content) {
        classNoticeMessage.textContent = "제목과 내용을 모두 입력해주세요.";
        return;
      }

      try {
        await createClassNotice({
          title,
          content,
          author: session.name,
          role: session.role,
        });
        classNoticeForm.reset();
        classNoticeMessage.textContent = "학급 공지사항이 등록되었습니다.";
        await refreshClassNoticeList();
      } catch (_error) {
        classNoticeMessage.textContent = "학급 공지사항 등록에 실패했습니다.";
      }
    });

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

  function renderSuggestionList(container, suggestions) {
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

      editBtn.addEventListener("click", () => {
        const nextTitle = window.prompt("새 제목", item.title);
        if (nextTitle === null) return;
        const nextContent = window.prompt("새 내용", item.content);
        if (nextContent === null) return;

        const ok = updateSuggestion(item.id, {
          title: nextTitle.trim(),
          content: nextContent.trim(),
        });
        if (ok) {
          renderSuggestionList(container, readSuggestions());
        }
      });

      delBtn.addEventListener("click", () => {
        if (!window.confirm("이 건의 글을 삭제할까요?")) return;
        const ok = deleteSuggestion(item.id);
        if (ok) {
          renderSuggestionList(container, readSuggestions());
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(actions);
      container.appendChild(wrapper);
    });
  }

  function initSuggestionsPage() {
    const session = window.Auth.initProtectedPage("C");
    if (!session) return;

    const form = document.getElementById("suggest-form");
    const titleInput = document.getElementById("suggest-title");
    const contentInput = document.getElementById("suggest-content");
    const message = document.getElementById("suggest-message");
    const managerPanel = document.getElementById("manager-panel");
    const managerList = document.getElementById("suggestion-list");

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = String(titleInput?.value || "").trim();
      const content = String(contentInput?.value || "").trim();

      if (!content) {
        message.textContent = "건의 내용은 비워둘 수 없습니다.";
        return;
      }

      createSuggestion({
        title,
        content,
        role: session.role,
      });

      form.reset();
      message.textContent = "익명 건의가 등록되었습니다.";

      if (window.Auth.canAccess(session.role, "B") && managerList) {
        renderSuggestionList(managerList, readSuggestions());
      }
    });

    if (window.Auth.canAccess(session.role, "B")) {
      if (managerPanel) managerPanel.style.display = "block";
      if (managerList) renderSuggestionList(managerList, readSuggestions());
      return;
    }

    if (managerPanel) {
      managerPanel.style.display = "block";
      managerPanel.innerHTML =
        "<h3>비공개 익명 게시판</h3><p>건의 내용 조회/관리 권한은 매니저 이상(B)부터 제공됩니다.</p>";
    }
  }

  function initManagerPage() {
    const session = window.Auth.initProtectedPage("B");
    if (!session) return;

    const countTarget = document.getElementById("manager-suggest-count");
    const items = readSuggestions();
    if (countTarget) countTarget.textContent = String(items.length);
  }

  function initAdminPage() {
    const session = window.Auth.initProtectedPage("A");
    if (!session) return;

    const accountList = document.getElementById("staff-account-list");
    if (!accountList) return;
    accountList.innerHTML = "";

    Object.entries(window.Auth.STAFF_ACCOUNTS).forEach(([id, account]) => {
      const item = makeEl("li", "", `${id} / ${account.role} / 기본 비밀번호: ${account.password}`);
      accountList.appendChild(item);
    });
  }

  function initGeneralLoginPage() {
    window.Auth.redirectIfLoggedIn();
    const form = document.getElementById("general-login-form");
    const pwInput = document.getElementById("general-password");
    const message = document.getElementById("general-login-message");
    const goStaffLink = document.getElementById("go-staff-link");

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && goStaffLink) {
      goStaffLink.href = `./login-staff.html?redirect=${encodeURIComponent(redirect)}`;
    }

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = window.Auth.loginGeneral(String(pwInput?.value || "").trim());
      if (!result.ok) {
        message.textContent = result.message;
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "index.html";
      window.location.href = redirect;
    });
  }

  function initStaffLoginPage() {
    window.Auth.redirectIfLoggedIn();
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

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = window.Auth.loginStaff(
        String(idInput?.value || "").trim(),
        String(pwInput?.value || "").trim()
      );

      if (!result.ok) {
        message.textContent = result.message;
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
