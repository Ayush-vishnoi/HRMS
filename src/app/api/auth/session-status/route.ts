import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authSessionCookieName, authSessionCookieOptions } from '@/lib/auth-cookies';
import { getCurrentEmployee } from '@/lib/auth-session';

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
} as const;

export async function GET() {
  try {
    const employee = await getCurrentEmployee();

    if (!employee) {
      const cookieStore = await cookies();
      cookieStore.set(authSessionCookieName, '', {
        ...authSessionCookieOptions,
        expires: new Date(0),
        maxAge: 0,
      });

      return NextResponse.json(
        { authenticated: false },
        { status: 401, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      { authenticated: true },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error('Session status check failed:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Unable to verify session.' },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
