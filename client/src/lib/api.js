export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || ""}${path}`,
    {
      ...options,
      headers,
      credentials: "include",
    },
  );

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
