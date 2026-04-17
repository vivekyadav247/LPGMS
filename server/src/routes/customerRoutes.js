const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const {
  createCustomer,
  deleteCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} = require("../services/ledgerService");
const { customerSchema } = require("../validators/schemas");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const customers = await listCustomers({
      search: req.query.search || "",
    });

    res.json({ customers });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = customerSchema.parse(req.body);
    const customer = await createCustomer(payload);

    res.status(201).json({ customer });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await getCustomerDetail(req.params.id);

    res.json(result);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = customerSchema.parse(req.body);
    const customer = await updateCustomer(req.params.id, payload);

    res.json({ customer });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await deleteCustomer(req.params.id);

    res.json(result);
  }),
);

module.exports = router;
