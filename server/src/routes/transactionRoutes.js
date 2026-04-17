const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const {
  createTransaction,
  listTransactions,
  softDeleteTransaction,
  updateTransaction,
} = require("../services/ledgerService");
const { transactionSchema } = require("../validators/schemas");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const transactions = await listTransactions({
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      search: req.query.search || "",
      from: req.query.from || "",
      to: req.query.to || "",
      customerId: req.query.customerId || "",
    });

    res.json(transactions);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = transactionSchema.parse(req.body);
    const transaction = await createTransaction(payload);

    res.status(201).json({ transaction });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = transactionSchema.parse(req.body);
    const transaction = await updateTransaction(req.params.id, payload);

    res.json({ transaction });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await softDeleteTransaction(req.params.id);

    res.json(result);
  }),
);

module.exports = router;
