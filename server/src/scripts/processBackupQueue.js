require("dotenv").config();

const connectDatabase = require("../config/db");
const { processPendingBackupJobs } = require("../services/backupService");

async function run() {
  await connectDatabase();
  const result = await processPendingBackupJobs(100);

  process.stdout.write(`Backup queue processed: ${JSON.stringify(result)}\n`);
  process.exit(0);
}

run().catch((error) => {
  const detail = error?.message ? `: ${error.message}` : "";
  process.stderr.write(`Backup queue processing failed${detail}\n`);
  process.exit(1);
});
