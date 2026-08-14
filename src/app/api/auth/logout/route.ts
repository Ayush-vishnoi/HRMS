import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authSessionCookieName, authSessionCookieOptions } from '@/lib/auth-cookies';
import { db } from '@/lib/db';

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authSessionCookieName)?.value;

  if (sessionToken) {
    await db.authSession.deleteMany({ where: { sessionToken } });
  }

  cookieStore.set(authSessionCookieName, '', {
    ...authSessionCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
