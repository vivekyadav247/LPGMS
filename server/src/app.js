const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const env = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const stockRoutes = require("./routes/stockRoutes");
const reportRoutes = require("./routes/reportRoutes");
const backupRoutes = require("./routes/backupRoutes");
const AppError = require("./utils/AppError");

const app = express();
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

function normalizeOrigin(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).origin.toLowerCase();
  } catch (_error) {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

const allowedOrigins = new Set(
  env.CLIENT_URL.split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean),
);
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    if (
      env.NODE_ENV !== "production" &&
      localhostOriginPattern.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    return callback(new AppError("Origin not allowed", 403));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "LPGMS API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/backup", backupRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
