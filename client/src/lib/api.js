const AUTH_TOKEN_STORAGE_KEY = "lpgms_auth_token";

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

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL || ""}${path}`, {
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
