const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const { processPendingBackupJobs } = require("../services/backupService");

const router = express.Router();

router.post(
  "/process",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const requestedLimit = Number(req.body.limit || 25);
    const safeLimit = Math.min(100, Math.max(1, requestedLimit || 25));
    const result = await processPendingBackupJobs(safeLimit);

    res.json(result);
  }),
);

module.exports = router;
