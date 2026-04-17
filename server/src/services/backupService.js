const BackupJob = require("../models/BackupJob");
const {
  syncTransactionToGoogleSheet,
  appendStockMovementToGoogleSheet,
} = require("./sheetService");

async function queueBackupJob({ type, action, entityId, payload, session }) {
  const [job] = await BackupJob.create(
    [
      {
        type,
        action,
        entityId,
        payload,
        status: "PENDING",
      },
    ],
    session ? { session } : {},
  );

  return job;
}

async function processBackupJob(jobId) {
  const job = await BackupJob.findById(jobId);

  if (!job || job.status === "SYNCED") {
    return job;
  }

  try {
    if (job.type === "TRANSACTION") {
      await syncTransactionToGoogleSheet(job.action, job.payload);
    } else {
      await appendStockMovementToGoogleSheet(job.payload);
    }

    job.status = "SYNCED";
    job.syncedAt = new Date();
    job.lastAttemptAt = new Date();
    job.lastError = "";
    job.attempts += 1;
    await job.save();
  } catch (error) {
    job.attempts += 1;
    job.lastAttemptAt = new Date();
    job.lastError = error.message;
    job.status = job.attempts >= 5 ? "FAILED" : "PENDING";
    await job.save();
  }

  return job;
}

async function processPendingBackupJobs(limit = 25) {
  const jobs = await BackupJob.find({
    status: { $in: ["PENDING", "FAILED"] },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let synced = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await processBackupJob(job._id);

    if (result?.status === "SYNCED") {
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: jobs.length,
    synced,
    failed,
  };
}

module.exports = {
  queueBackupJob,
  processBackupJob,
  processPendingBackupJobs,
};
