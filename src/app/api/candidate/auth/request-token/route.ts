import { NextRequest, NextResponse } from 'next/server';
import { requestCandidateAccessToken } from '@/lib/auth/candidate-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const result = await requestCandidateAccessToken(email, origin);

    return NextResponse.json({
      success: true,
      message: result.message,
      debugToken: result.debugToken,
    });
  } catch (error: any) {
    console.error('Error requesting candidate access token:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request.' },
      { status: 500 }
    );
  }
}
