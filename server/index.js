"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { parseAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const suggestionRoutes = require("./routes/suggestions");
const adminRoutes = require("./routes/admin");
const mealRoutes = require("./routes/meals");

const app = express();

function parseOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.FRONTEND_ORIGIN);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(parseAuth);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/meals", mealRoutes);

if (process.env.SERVE_STATIC === "true") {
  const staticRoot = path.resolve(__dirname, "..");
  app.use(express.static(staticRoot));
}

app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "서버 에러";
  const status = String(message).includes("CORS") ? 403 : 500;
  res.status(status).json({ message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API server listening on :${port}`);
});
