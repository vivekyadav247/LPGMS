const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AdminUser = require("../models/AdminUser");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { getAuthTokenFromRequest } = require("../utils/authCookie");

const authMiddleware = asyncHandler(async (req, _res, next) => {
  const token = getAuthTokenFromRequest(req);

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);
  const admin = await AdminUser.findById(decoded.sub).lean();

  if (!admin) {
    throw new AppError("Admin account not found", 401);
  }

  req.user = {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
  };

  next();
});

module.exports = authMiddleware;
