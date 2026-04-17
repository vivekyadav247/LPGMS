const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const { getDailyReport } = require("../services/reportService");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/daily",
  asyncHandler(async (req, res) => {
    const report = await getDailyReport(req.query.date);

    res.json(report);
  }),
);

module.exports = router;
