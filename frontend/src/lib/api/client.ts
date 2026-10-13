/**
 * Real HTTP client for the NestJS backend (see backend/src/**).
 *
 * Replaces the previous mock-array implementation in lib/api/index.ts.
 * Every owner/consumer/admin page should call through here (or the
 * higher-level `api` object in lib/api/index.ts once it's migrated
 * endpoint-by-endpoint) instead of reading MOCK_* arrays.
 *
 * Auth token storage: kept in localStorage for this demo. For a real
 * production deployment, move to an httpOnly cookie set by the backend
 * on login so the token isn't reachable from client-side JS.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000/api/v1";

const TOKEN_KEY = "localspotter_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    // Mirrored into a (non-httpOnly) cookie purely so Next.js middleware can
    // redirect unauthenticated visitors away from /owner and /admin before
    // the page renders. This is a UX guard only — the real authorization
    // boundary is the backend's JwtAuthGuard on every protected endpoint.
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean; // attach bearer token (default true)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
    });
  } catch (networkErr) {
    // fetch() throws (rather than resolving with a non-ok response) when the
    // request never reached a server at all — wrong host/port, backend not
    // running/deployed, CORS rejection, or no network. Surface this as a
    // distinct, actionable error instead of a generic "login failed" so it's
    // obvious the problem is connectivity/config, not credentials.
    throw new ApiError(
      `Kan geen verbinding maken met de server (${API_BASE_URL}). Controleer of de backend draait en of NEXT_PUBLIC_API_URL correct is ingesteld.`,
      0,
      networkErr
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (body && (body.message || body.error)) || res.statusText || "Request failed";
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status, body);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
