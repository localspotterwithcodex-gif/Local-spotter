/**
 * HTTP client for the NestJS backend.
 *
 * - Requests go to the same origin (`/api/v1/...`); next.config.ts rewrites them
 *   to the backend, so the session cookie is first-party.
 * - Authentication is the HttpOnly `ls_session` cookie set by the backend. No
 *   token is ever stored in, or readable from, JavaScript.
 * - CSRF: the backend rejects cookie-authenticated state-changing requests whose
 *   Origin/Referer is not an allowed origin (OriginCheckGuard) and the cookie is
 *   SameSite=Lax. Browsers attach the Origin header to these fetches automatically.
 */

const API_BASE_URL = "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = RequestInit;

/**
 * Language of the UI, sent as Accept-Language so the backend returns
 * user-entered content (product names, descriptions, ...) in that language.
 * Set by LocaleProvider before any child effect runs.
 */
let apiLocale: string | undefined;
export function setApiLocale(locale: string): void {
  apiLocale = locale;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { headers, ...rest } = options;
  // multipart bodies must keep the browser-generated boundary: no JSON content type
  const isForm = typeof FormData !== "undefined" && rest.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "same-origin",
      ...rest,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(apiLocale ? { "Accept-Language": apiLocale } : {}),
        ...(headers as Record<string, string>),
      },
    });
  } catch (networkErr) {
    // fetch() only throws when no response arrived at all (backend down, no network).
    throw new ApiError("Network error: could not reach the API (is BACKEND_URL correct?)", 0, networkErr);
  }

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (body && (body.message || body.error)) || res.statusText || "Request failed";
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status, body);
  }

  return body as T;
}

const withBody = (method: string) => <T>(path: string, data?: unknown, options?: RequestOptions) =>
  request<T>(path, { ...options, method, body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data) });

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: withBody("POST"),
  patch: withBody("PATCH"),
  put: withBody("PUT"),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};

/** Builds `?a=1&b=2`, skipping undefined/empty values. */
export function qs(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
