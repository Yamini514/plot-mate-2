// Thin client for the PlotMate backend.
// - Wraps request bodies in the { data: ... } envelope the Roda services expect.
// - Sends the JWT as a Bearer token (persisted in localStorage).
// - Unwraps the { status, data, ...extras } response envelope.
// - Converts snake_case <-> camelCase at the boundary so React code stays camelCase.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_KEY = "plotmate.token";
const SESSION_KEY = "plotmate.session";

/** Whether the app should talk to the real backend (vs the mock store). */
export const apiEnabled = !!API_BASE;

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/([A-Z])/g, (c) => "_" + c.toLowerCase());

function convertKeys(value, fn) {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, fn));
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [fn(k), convertKeys(v, fn)]),
    );
  }
  return value;
}
export const camelize = (o) => convertKeys(o, toCamel);
export const snakeize = (o) => convertKeys(o, toSnake);

// Backend rows carry a numeric `id` plus a human code (`code`/`number`, e.g.
// "CMP-051", "INV-2026-0412"). The UI shows the code as the id and uses the
// numeric id only for mutation URLs. normalize() exposes both: `id` = code,
// `dbId` = numeric.
export function normalize(rec) {
  if (!rec || typeof rec !== "object") return rec;
  const human = rec.code ?? rec.number;
  return { ...rec, dbId: rec.id, id: human ?? rec.id };
}
export const normalizeList = (rows) => (rows ?? []).map(normalize);

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { body, query } = {}) {
  const url = new URL(API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  // POST/PUT/PATCH always carry a JSON body — even action endpoints with no
  // payload need a valid `{data:{}}` so the backend's JSON parser doesn't choke
  // on an empty body (which would 500).
  const sendsBody = body !== undefined || ["POST", "PUT", "PATCH"].includes(method);
  const headers = {};
  if (sendsBody) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: sendsBody ? JSON.stringify({ data: snakeize(body ?? {}) }) : undefined,
    });
  } catch {
    // Network error — backend unreachable (not started / wrong URL / CORS).
    throw new ApiError(
      `Can't reach the server at ${API_BASE}. Make sure the backend is running.`,
      0,
      null,
    );
  }

  let json = null;
  try { json = await res.json(); } catch { /* non-JSON (e.g. CSV) */ }

  if (res.status === 401) {
    setToken(null);
    // A 401 on /login means bad credentials — not an expired session. Don't
    // wipe state or redirect; let the login form show the real reason.
    if (path === "/login") {
      throw new ApiError("Invalid email or password.", 401, json);
    }
    // Any other 401 means the stored token is stale (expired, or invalidated by
    // a login elsewhere — the backend enforces a single active session). Clear
    // the persisted session too, otherwise AuthProvider still thinks we're
    // signed in and the login page just bounces us back into the failing
    // dashboard. Hard-redirect so the app re-reads the now-empty storage.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    throw new ApiError("Your session has expired. Please sign in again.", 401, json);
  }
  if (!res.ok || (json && json.status === "error")) {
    const data = json && json.data;
    const message =
      (data && data.message) ||
      (typeof data === "string" ? data : null) ||
      (data && typeof data === "object" ? Object.values(data)[0] : null) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, json);
  }

  // Unwrap envelope: data is the payload; keep extras like counts / totalPages.
  const { status, data, ...extras } = json || {};
  void status;
  return { data: camelize(data), ...camelize(extras) };
}

export const api = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  del: (path) => request("DELETE", path),

  /** Authenticate; persists the JWT and returns the camelized user info. */
  async login(email, password) {
    const { data } = await request("POST", "/login", { body: { email, password } });
    if (data?.token) setToken(data.token);
    return data;
  },

  /**
   * End the server session: closes any open guard shift (recording the logout
   * time + early-clock-out flag) and clears the single-session token. Best
   * effort — a network failure must never trap the user in the app, so the
   * local token is always cleared. Returns the server's { ended, endedEarly }
   * payload (or an empty object on failure).
   */
  async endSession() {
    try {
      const { data } = await request("POST", "/me/logout");
      return data ?? {};
    } catch {
      return {};
    } finally {
      setToken(null);
    }
  },

  logout: () => setToken(null),

  // --- password recovery (OTP) ---------------------------------------------
  // Each step throws ApiError (with a friendly .message) on failure so the
  // forgot-password wizard can surface the exact reason inline.

  /** Step 1 — email a 6-digit code. Rejects if the email isn't registered. */
  async forgotPassword(email) {
    await request("POST", "/forgot-password", { body: { email } });
  },

  /** Step 2 — verify the code; returns a single-use reset token on success. */
  async verifyOtp(email, otp) {
    const { data } = await request("POST", "/verify-otp", { body: { email, otp } });
    return data?.token;
  },

  /** Step 3 — set the new password using the verified token. */
  async resetPassword(token, password) {
    await request("POST", "/reset-password", { body: { token, password } });
  },
};
