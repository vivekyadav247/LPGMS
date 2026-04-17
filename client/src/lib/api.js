const AUTH_TOKEN_STORAGE_KEY = "lpgms_auth_token";
const FALLBACK_PROD_API_URL = "https://lpgms.onrender.com";
const FALLBACK_DEV_API_URL = "http://localhost:5000";

function resolveApiBaseUrl() {
  const configuredUrl = (import.meta.env.VITE_API_URL || "").trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();

    if (host === "localhost" || host === "127.0.0.1") {
      return FALLBACK_DEV_API_URL;
    }
  }

  return FALLBACK_PROD_API_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

export function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

export function setAuthToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const token = getAuthToken();
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${String(path || "")}`;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const raw = await response.text().catch(() => "");
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (_error) {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.details = data.details || null;
    throw error;
  }

  return data;
}
