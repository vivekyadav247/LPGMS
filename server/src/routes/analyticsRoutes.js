const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const {
  getPendingAnalytics,
  getRevenueAnalytics,
  getSummaryAnalytics,
} = require("../services/analyticsService");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const summary = await getSummaryAnalytics();

    res.json(summary);
  }),
);

router.get(
  "/revenue",
  asyncHandler(async (_req, res) => {
    const revenue = await getRevenueAnalytics();

    res.json(revenue);
  }),
);

router.get(
  "/pending",
  asyncHandler(async (_req, res) => {
    const pending = await getPendingAnalytics();

    res.json(pending);
  }),
);

module.exports = router;
