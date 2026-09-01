import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authSessionCookieName, authSessionCookieOptions } from '@/lib/auth-cookies';
import { getCurrentEmployee } from '@/lib/auth-session';
import { db } from '@/lib/db';

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
} as const;

export async function GET() {
  try {
    const employee = await getCurrentEmployee();

    if (!employee) {
      const cookieStore = await cookies();

      // getCurrentEmployee() returns null for signed-out users, but ALSO when
      // the database is temporarily unreachable: NextAuth swallows adapter
      // errors internally and yields an empty session. Clearing the cookie on
      // a transient outage force-logs users out (the auto-logout bug), so
      // verify the session row directly before declaring the session invalid.
      // A database failure in this probe throws and lands in the catch below,
      // which returns 503 — the client treats that as "temporarily
      // unverifiable" and keeps the user logged in.
      const sessionToken = cookieStore.get(authSessionCookieName)?.value;
      if (sessionToken) {
        const session = await db.authSession.findUnique({
          where: { sessionToken },
          select: {
            expires: true,
            employee: { select: { status: true } },
          },
        });

        const sessionAlive =
          session !== null &&
          session.expires.valueOf() > Date.now() &&
          session.employee.status !== 'Offboarded';

        if (sessionAlive) {
          // The session row is valid but the primary lookup failed — treat as
          // a transient infrastructure error, NOT an authentication failure.
          return NextResponse.json(
            { authenticated: false, error: 'Unable to verify session.' },
            { status: 503, headers: noStoreHeaders },
          );
        }
      }

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
      { authenticated: true, user: { id: employee.id, name: employee.name, email: employee.email, userRole: employee.userRole } },
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
