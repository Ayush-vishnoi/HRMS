'use client';

/**
 * Central client for talking to the NestJS backend directly.
 *
 * - Base URL: NEXT_PUBLIC_BACKEND_URL (default http://localhost:4000)
 * - Auth: JWT Bearer token stored in localStorage (`hrms_access_token`)
 * - 401 responses clear the token and redirect to /login
 */

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
).replace(/\/$/, '');

const TOKEN_KEY = 'hrms_access_token';
const USER_KEY = 'hrms_current_user';

export const backendUrl = (path: string) =>
  `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  },
};

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  employeeCode?: string;
  userRole?: string;
  department?: string | null;
  avatarUrl?: string | null;
  [key: string]: unknown;
}

export const userStore = {
  get(): StoredUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    } catch {
      return null;
    }
  },
  set(user: StoredUser) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  },
};

function handleUnauthorized() {
  tokenStore.clear();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

export interface AuthFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching the Authorization header (e.g. for login). */
  skipAuth?: boolean;
  /** Skip JSON parsing of the response and return raw Response. */
  raw?: boolean;
}

/**
 * Fetch wrapper that targets the backend, attaches the Bearer token,
 * serializes JSON bodies and handles 401 globally.
 */
export async function authFetch<T = unknown>(
  path: string,
  options: AuthFetchOptions = {},
): Promise<T> {
  const { skipAuth = false, raw = false, body, headers, ...rest } = options;

  const finalHeaders = new Headers(headers as HeadersInit | undefined);
  if (body !== undefined && !(body instanceof FormData) && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = tokenStore.get();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    ...rest,
    credentials: 'include',
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? (body as FormData)
          : typeof body === 'string'
            ? body
            : JSON.stringify(body),
  };

  const response = await fetch(backendUrl(path), init);

  // In raw mode the caller inspects the Response itself (e.g. candidate
  // portal pages handle 401 by redirecting to /candidate/login), so never
  // hijack the response here.
  if (raw) return response as unknown as T;

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'message' in data) {
        message = String((data as { message: unknown }).message);
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** Convenience helpers for common verbs. */
export const api = {
  get: <T = unknown>(path: string, options?: AuthFetchOptions) =>
    authFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: AuthFetchOptions) =>
    authFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: AuthFetchOptions) =>
    authFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown, options?: AuthFetchOptions) =>
    authFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T = unknown>(path: string, options?: AuthFetchOptions) =>
    authFetch<T>(path, { ...options, method: 'DELETE' }),
};

/** Login against the backend and persist token + user. */
export async function login(identifier: string, password: string): Promise<StoredUser> {
  const data = await authFetch<{ accessToken: string; user: StoredUser }>(
    '/api/auth/login',
    { method: 'POST', skipAuth: true, body: { identifier, password } },
  );
  if (!data?.accessToken || !data?.user) {
    throw new Error('Invalid login response');
  }
  tokenStore.set(data.accessToken);
  userStore.set(data.user);
  return data.user;
}

/** Logout: clear local state. */
export function logout() {
  tokenStore.clear();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}
