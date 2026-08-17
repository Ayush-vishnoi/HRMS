import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCandidateAccessToken,
  CANDIDATE_COOKIE_NAME,
  CandidateAuthError,
} from '@/lib/auth/candidate-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, email } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    const { sessionToken, candidate } = await verifyCandidateAccessToken(token, email);

    const response = NextResponse.json({
      success: true,
      candidate,
      message: 'Authentication successful.',
    });

    // Set secure HTTP-only candidate session cookie
    response.cookies.set({
      name: CANDIDATE_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error('Candidate token verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
