require("dotenv").config();

const connectDatabase = require("../config/db");
const { syncAdminUserFromEnv } = require("../services/authService");

async function run() {
  await connectDatabase();
  const result = await syncAdminUserFromEnv();

  const identifier = result.admin.email || result.admin.phone || "configured";
  process.stdout.write(`Admin ${result.mode}: ${identifier}\n`);
  process.exit(0);
}

run().catch((error) => {
  const detail = error?.message ? `: ${error.message}` : "";
  process.stderr.write(`Admin sync failed${detail}\n`);
  process.exit(1);
});
