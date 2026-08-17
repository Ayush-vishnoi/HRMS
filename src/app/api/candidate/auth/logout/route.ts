import { NextResponse } from 'next/server';
import { CANDIDATE_COOKIE_NAME } from '@/lib/auth/candidate-session';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Candidate session logged out successfully.',
  });

  // Clear cookie
  response.cookies.set({
    name: CANDIDATE_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
