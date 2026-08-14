import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const AUTH_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const AUTH_SESSION_UPDATE_AGE_SECONDS = 60 * 60;

export const useSecureAuthCookies =
  process.env.AUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production';

export const authSessionCookieName = useSecureAuthCookies
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

export const authSessionCookieOptions: Pick<
  ResponseCookie,
  'httpOnly' | 'sameSite' | 'path' | 'secure'
> = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: useSecureAuthCookies,
};
