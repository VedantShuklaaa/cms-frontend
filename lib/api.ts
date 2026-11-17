import type { ApiEnvelope, ApiError, Paginated, UserResponse } from "@/types/api";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1"
).replace(/\/+$/, "");

export const TOKEN_KEY = "access_token";
export const USER_KEY = "user";
export const EXPIRES_AT_KEY = "expires_at";

export class ApiRequestError extends Error {
  status: number;
  detail: string;

  constructor(detail: string, status: number, message?: string) {
    super(detail);
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail;
    if (message) this.message = detail;
  }
}

export function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof Error) return new ApiRequestError(error.message, 0);
  return new ApiRequestError("Something went wrong", 0);
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryValue>;
  /** When false, a 401 response will not clear the session or redirect. */
  redirectOn401?: boolean;
}

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(EXPIRES_AT_KEY);
  } catch {
    // Storage may be unavailable (private mode); nothing to clear.
  }
}

function handleUnauthorized(): void {
  clearStoredSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    // A full navigation discards all in-memory auth state after a 401.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}

/**
 * Calls the CMS API and unwraps the response envelope.
 * Throws `ApiRequestError` for HTTP errors and unsuccessful envelopes.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, redirectOn401 = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | null;

  if (!response.ok) {
    if (response.status === 401 && redirectOn401) handleUnauthorized();
    const errorPayload = payload as ApiError | null;
    const detail =
      errorPayload?.error ||
      errorPayload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiRequestError(detail, response.status, errorPayload?.message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if (!payload.success) {
      throw new ApiRequestError(
        payload.error || payload.message || "Request failed",
        response.status,
      );
    }
    return payload.data;
  }

  // Defensive fallback for endpoints that return a bare payload.
  return payload as unknown as T;
}

/** Fetches every page of a paginated endpoint (up to `maxPages` pages of 100). */
export async function apiRequestAll<T>(
  path: string,
  params: Record<string, QueryValue> = {},
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = [];
  let total = Number.POSITIVE_INFINITY;
  let page = 1;

  while (items.length < total && page <= maxPages) {
    const result = await apiRequest<Paginated<T>>(path, {
      params: { ...params, page, per_page: 100 },
    });
    items.push(...result.items);
    total = result.total;
    page += 1;
    if (result.items.length === 0) break;
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Session helpers                                                     */
/* ------------------------------------------------------------------ */

export interface StoredSession {
  access_token: string;
  expires_at: string;
  user: UserResponse;
}

export function storeSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, session.access_token);
    window.localStorage.setItem(EXPIRES_AT_KEY, session.expires_at);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } catch {
    // Ignore storage failures; the in-memory session still works.
  }
}

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    const expiresAt = window.localStorage.getItem(EXPIRES_AT_KEY) ?? "";
    if (!token || !userRaw) return null;
    const user = JSON.parse(userRaw) as UserResponse;
    return { access_token: token, expires_at: expiresAt, user };
  } catch {
    return null;
  }
}

export function isSessionExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) return false;
  return time <= Date.now();
}
