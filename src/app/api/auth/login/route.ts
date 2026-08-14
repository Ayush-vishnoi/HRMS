import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  authSessionCookieName,
  authSessionCookieOptions,
} from '@/lib/auth-cookies';
import { authenticateCredentials } from '@/lib/credentials';

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials.' },
      { status: 400 },
    );
  }

  try {
    const result = await authenticateCredentials(
      parsed.data.identifier,
      parsed.data.password,
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.reason === 'locked'
              ? 'Account temporarily locked. Try again later.'
              : 'Invalid credentials.',
        },
        { status: result.reason === 'locked' ? 423 : 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(authSessionCookieName, result.sessionToken, {
      ...authSessionCookieOptions,
      expires: result.expires,
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Credential login failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in right now.' },
      { status: 500 },
    );
  }
}
