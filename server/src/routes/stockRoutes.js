const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const {
  createStockMovement,
  getStockMovementHistory,
  getStockOverview,
} = require("../services/stockService");
const { stockMovementSchema } = require("../validators/schemas");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const overview = await getStockOverview();

    res.json(overview);
  }),
);

router.get(
  "/movements",
  asyncHandler(async (req, res) => {
    const history = await getStockMovementHistory({
      from: req.query.from || "",
      to: req.query.to || "",
      limit: Number(req.query.limit || 50),
    });

    res.json({ history });
  }),
);

router.post(
  "/movements",
  asyncHandler(async (req, res) => {
    const payload = stockMovementSchema.parse(req.body);
    const movement = await createStockMovement(payload);

    res.status(201).json({ movement });
  }),
);

module.exports = router;
