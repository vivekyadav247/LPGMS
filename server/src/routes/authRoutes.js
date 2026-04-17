const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const createRateLimiter = require("../middleware/rateLimit");
const asyncHandler = require("../utils/asyncHandler");
const { clearAuthCookie, setAuthCookie } = require("../utils/authCookie");
const { loginSchema } = require("../validators/schemas");
const { loginAdmin } = require("../services/authService");

const router = express.Router();
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

router.post(
  "/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const result = await loginAdmin(payload);
    setAuthCookie(res, result.token, payload.remember);

    res.json({ admin: result.admin });
  }),
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ admin: req.user });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  }),
);

module.exports = router;
