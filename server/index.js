"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const { DB_INFO, listClassNotices, createClassNotice, deleteClassNotice } = require("./db");

const app = express();

const allowedOrigin = String(process.env.FRONTEND_ORIGIN || "").trim();
app.use(
  cors({
    origin: allowedOrigin || true,
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

function isManagerOrAbove(role) {
  return role === "A" || role === "B";
}

function getRole(req) {
  return String(req.headers["x-user-role"] || "")
    .trim()
    .toUpperCase();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: DB_INFO });
});

app.get("/api/class-notices", async (_req, res, next) => {
  try {
    const rows = await listClassNotices();
    res.json({ notices: rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/class-notices", async (req, res, next) => {
  try {
    const role = getRole(req);
    if (!isManagerOrAbove(role)) {
      return res.status(403).json({ message: "공지 등록 권한이 없습니다." });
    }

    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();
    const author = String(req.body?.author || "").trim();

    if (!title || !content) {
      return res.status(400).json({ message: "제목과 내용을 입력해주세요." });
    }

    const item = {
      id: crypto.randomUUID(),
      title,
      content,
      author: author || "관리자",
      createdAt: new Date().toISOString(),
    };

    await createClassNotice(item);

    return res.status(201).json({ notice: item });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/class-notices/:id", async (req, res, next) => {
  try {
    const role = getRole(req);
    if (!isManagerOrAbove(role)) {
      return res.status(403).json({ message: "공지 삭제 권한이 없습니다." });
    }

    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ message: "공지 ID가 필요합니다." });
    }

    const deleted = await deleteClassNotice(id);
    if (!deleted) {
      return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." });
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.use(express.static(path.resolve(__dirname, "..")));

app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "서버 오류";
  res.status(500).json({ message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server started on :${port}`);
});
