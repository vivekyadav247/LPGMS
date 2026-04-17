require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/db");
const env = require("./config/env");
const { ensureAdminUser } = require("./services/authService");

const PORT = Number(env.PORT || 5000);

async function startServer() {
  await connectDatabase();
  await ensureAdminUser();

  app.listen(PORT, () => {
    if (env.NODE_ENV !== "production") {
      process.stdout.write(`LPGMS server listening on port ${PORT}\n`);
    }
  });
}

startServer().catch((error) => {
  const message = error?.message || "Unknown startup error";
  process.stderr.write(`Failed to start server: ${message}\n`);
  if (env.NODE_ENV !== "production" && error?.stack) {
    process.stderr.write(`${error.stack}\n`);
  }
  process.exit(1);
});
