import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getCurrentEmployee } from '@/lib/auth-session';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hrms-mylotic-super-secret-jwt-key-2026',
);

async function getBackendToken(): Promise<string | null> {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  return new SignJWT({
    sub: employee.id,
    email: employee.email,
    userRole: employee.userRole,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

export async function proxyToBackend(
  path: string,
  options: RequestInit = {},
): Promise<NextResponse> {
  const token = await getBackendToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 503 });
  }
}
