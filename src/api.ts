// Determine API URL dynamically based on runtime hostname
function getApiUrl(): string {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // For localhost development, use localhost:8000
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:8000";
  }

  // For VPN access via Caddy, replace subdomain with expenses-api
  const parts = window.location.hostname.split(".");
  parts[0] = "expenses-api"; // Replace first part (e.g., 'expenses' -> 'expenses-api')
  return `${window.location.protocol}//${parts.join(".")}`;
}

export type ApiOptions = RequestInit & { csrf?: string };

const REQUEST_TIMEOUT_MS = 30_000;

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  // Get API URL dynamically on each request
  const API_URL = getApiUrl();

  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.csrf) headers.set("X-CSRF-Token", options.csrf);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: "No fue posible completar la solicitud." }));
    const detail =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : "No fue posible completar la solicitud.";
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
