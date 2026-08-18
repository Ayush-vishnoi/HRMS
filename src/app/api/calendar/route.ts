import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  ['from', 'to'].forEach((k) => {
    const v = searchParams.get(k);
    if (v) params.set(k, v);
  });
  return proxyToBackend(`/calendar?${params.toString()}`);
}
