export const ADMIN_DATA_CHANGED_EVENT = "admin-data-changed";
export const AUTH_CHANGED_EVENT = "auth-changed";

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAuthSession(input: { token: string; user: unknown }) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", input.token);
  localStorage.setItem("user", JSON.stringify(input.user));

  const role = (input.user as any)?.role || "user";
  document.cookie = `role=${encodeURIComponent(role)}; Path=/; Max-Age=${
    60 * 60 * 24 * 7
  }; SameSite=Lax`;
  notifyAuthChanged();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  document.cookie = "role=; Path=/; Max-Age=0; SameSite=Lax";
  notifyAuthChanged();
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body: any = null,
  auth: boolean = false,
  isFormData: boolean = false,
  options?: { timeoutMs?: number }
): Promise<T> {
  const baseUrl = endpoint.startsWith("/api/jarvisx/") ? "" : getApiBaseUrl();

  // baseUrl is always non-empty due to fallback.

  const headers: Record<string, string> = {};

  const isBodyAllowed = method !== "GET" && (method !== "DELETE" || body != null);

  if (!isFormData && isBodyAllowed) {
    headers["Content-Type"] = "application/json";
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Always attach Authorization header if token exists.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (auth) {
    if (!token) {
      throw new ApiError("Authentication required", 401);
    }
  }

  const controller = new AbortController();
  const timeoutMs =
    typeof options?.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    const requestInit: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      // P0 FIX: Include credentials for cookie-based session management (jarvisx_sid)
      credentials: "include",
    };

    if (isBodyAllowed && body !== null && body !== undefined) {
      requestInit.body = isFormData ? (body as BodyInit) : JSON.stringify(body);
    }

    res = await fetch(`${baseUrl}${endpoint}`, requestInit);
  } catch (err: unknown) {
    const maybeError = err as { name?: string };
    if (maybeError?.name === "AbortError") {
      throw new Error(
        "Request timed out (server may be waking up). Please try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // If auth fails due to invalid/expired token, clear potentially stale tokens.
  // NOTE: do NOT clear on 403; a valid session can be forbidden for a route.
  if (typeof window !== "undefined" && res.status === 401) {
    clearAuthSession();
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await res.json().catch(() => null)
    : await res.text();

  const extractMessage = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    return typeof record.message === "string" ? record.message : null;
  };

  if (!res.ok) {
    const message =
      (isJson ? extractMessage(payload) : null) ||
      (typeof payload === "string" && payload.trim() ? payload : null) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  if (method !== "GET" && typeof window !== "undefined" && endpoint.split("/").includes("admin")) {
    window.dispatchEvent(new Event(ADMIN_DATA_CHANGED_EVENT));
  }
  return payload as T;
}

export function getApiBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  const defaultProdBase = "https://uremo-backend.onrender.com";
  return (
    envBase ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5000"
      : defaultProdBase)
  ).replace(/\/+$/, "");
}
