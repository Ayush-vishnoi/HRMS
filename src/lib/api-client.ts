const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const TOKEN_KEY = 'hrms_access_token';

// Existing callers consume several legacy and NestJS response shapes during migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = any;

export const tokenStore = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

export async function apiRequest<T = ApiResponse>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers });

  if (res.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined') window.location.replace('/');
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? String(body.message)
      : typeof body === 'string' && body
        ? body
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  get: <T = ApiResponse>(path: string) => apiRequest<T>(path),
  post: <T = ApiResponse>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = ApiResponse>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T = ApiResponse>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = ApiResponse>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
