const AppError = require("../utils/AppError");
const env = require("../config/env");

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(error, _req, res, _next) {
  if (error.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      details: error.flatten ? error.flatten() : error.issues,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid id or field value",
      details: {
        path: error.path || null,
        value: error.value || null,
      },
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Database validation failed",
      details: Object.fromEntries(
        Object.entries(error.errors || {}).map(([key, value]) => [
          key,
          value.message,
        ]),
      ),
    });
  }

  const statusCode = error.statusCode || 500;
  const isProduction = env.NODE_ENV === "production";
  const shouldExposeMessage = !isProduction || statusCode < 500;
  const shouldExposeDetails = !isProduction;

  res.status(statusCode).json({
    message: shouldExposeMessage
      ? error.message || "Something went wrong"
      : "Internal server error",
    details: shouldExposeDetails ? error.details || null : null,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
