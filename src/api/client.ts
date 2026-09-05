import { API_BASE_URL } from "./config";

// Every module in this folder used to repeat the same three things: prefix
// the path with the base URL, `if (!res.ok) throw new Error(...)`, and
// nothing at all for a hung socket - a stalled request would sit in
// react-query's `pending` state forever. apiFetch centralizes all three
// and adds an AbortController timeout.
//
// Kept deliberately small: JSON in, JSON (or nothing) out, one bearer
// header, one error message. Anything more exotic can still call `fetch`
// directly.

// A slow network is common on the audience's devices; 15s is long enough
// not to abort a legitimately slow response but short enough that a dead
// socket surfaces as an error instead of an infinite spinner.
const DEFAULT_TIMEOUT_MS = 15_000;

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  // Serialized to JSON; presence also sets the Content-Type header.
  body?: unknown;
  // Bearer token; a null/undefined/empty value just omits the header.
  token?: string | null;
  // Thrown as `new Error(errorMessage)` when the response status isn't ok.
  errorMessage: string;
  // Set false for endpoints that return no body (POST/PUT/DELETE that
  // resolve to void) so a missing/empty body isn't parsed as JSON.
  parseJson?: boolean;
  timeoutMs?: number;
};

// Thrown for a non-ok response. Carries the HTTP status so a caller can tell
// "the server rejected this" from "the request never landed" - a plain Error
// made a 401 and an offline device indistinguishable, which is how a single
// offline launch used to destroy a stored session (see auth-context.tsx).
// A transport failure (timeout, DNS, socket) still throws a plain Error with
// no status, which is exactly the distinction callers need.
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// True only for a response the server actively rejected as unauthenticated.
export function isAuthRejection(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    errorMessage,
    parseJson = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const hasHeaders = Object.keys(headers).length > 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: hasHeaders ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(errorMessage, res.status);
    return parseJson ? ((await res.json()) as T) : (undefined as T);
  } finally {
    clearTimeout(timer);
  }
}
