const env = require("../config/env");

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const separatorIndex = item.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getAuthTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[env.AUTH_COOKIE_NAME] || null;
}

function serializeAuthCookie(token, maxAgeMs) {
  const parts = [
    `${env.AUTH_COOKIE_NAME}=${token ? encodeURIComponent(token) : ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (typeof maxAgeMs === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`);
  }

  if (!token) {
    parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }

  if (env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function setAuthCookie(res, token, remember) {
  const maxAgeMs = remember ? Number(env.AUTH_COOKIE_MAX_AGE_MS) : undefined;
  res.setHeader("Set-Cookie", serializeAuthCookie(token, maxAgeMs));
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", serializeAuthCookie("", 0));
}

module.exports = {
  clearAuthCookie,
  getAuthTokenFromRequest,
  setAuthCookie,
};
