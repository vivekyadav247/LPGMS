const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
  PORT: z.string().optional().default("5000"),
  CLIENT_URL: z.string().optional().default("http://localhost:5173"),
  MONGODB_URL: z.string().min(1, "MONGODB_URL is required"),
  MONGODB_DB: z.string().min(1).default("lpgms"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET should be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().optional().default("7d"),
  AUTH_COOKIE_NAME: z.string().optional().default("lpgms_auth"),
  AUTH_COOKIE_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive("AUTH_COOKIE_MAX_AGE_MS should be a positive integer")
    .optional()
    .default(7 * 24 * 60 * 60 * 1000),
  ADMIN_NAME: z.string().optional().default("LPG Admin"),
  ADMIN_ID: z.string().trim().optional().default("LPGADMIN"),
  ADMIN_EMAIL: z.string().optional().default(""),
  ADMIN_PHONE: z.string().optional().default(""),
  ADMIN_PASSWORD: z
    .union([
      z.literal(""),
      z
        .string()
        .min(12, "ADMIN_PASSWORD should be at least 12 characters long"),
    ])
    .optional()
    .default(""),
  LOW_STOCK_THRESHOLD: z.string().optional().default("15"),
  GOOGLE_SHEETS_ID: z.string().optional().default(""),
  GOOGLE_SHEETS_TRANSACTIONS_SHEET: z
    .string()
    .optional()
    .default("Transactions"),
  GOOGLE_SHEETS_STOCK_SHEET: z.string().optional().default("StockMovements"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(""),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional().default(""),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid server environment: ${parsedEnv.error.issues
      .map((issue) => issue.message)
      .join(", ")}`,
  );
}

module.exports = parsedEnv.data;
