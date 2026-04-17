const AppError = require("../utils/AppError");

function createRateLimiter({ windowMs, maxRequests }) {
  const store = new Map();
  let requestCounter = 0;

  function cleanupExpiredEntries(now) {
    for (const [key, value] of store.entries()) {
      if (now > value.resetAt) {
        store.delete(key);
      }
    }
  }

  return (req, _res, next) => {
    const key = `${req.ip}:${req.baseUrl || ""}:${req.path}`;
    const now = Date.now();

    requestCounter += 1;

    if (requestCounter % 200 === 0) {
      cleanupExpiredEntries(now);
    }

    const current = store.get(key);

    if (!current || now > current.resetAt) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (current.count >= maxRequests) {
      return next(
        new AppError(
          "Too many requests. Please wait a bit before trying again.",
          429,
        ),
      );
    }

    current.count += 1;
    store.set(key, current);
    return next();
  };
}

module.exports = createRateLimiter;
