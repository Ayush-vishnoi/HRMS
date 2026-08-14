import { NextResponse } from 'next/server';
import { getDemoAccounts } from '@/lib/demo-accounts';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(
    {
      success: true,
      data: getDemoAccounts(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, private',
      },
    },
  );
}
