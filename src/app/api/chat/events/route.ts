import chatBus from '@/lib/chat-bus';
import { resolveSessionUserId } from '@/lib/chat-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hard cap on stream lifetime. The client (native EventSource) retries
// automatically, so recycling the connection periodically prevents zombie
// streams held open for 15+ minutes across network changes — during
// incidents these accumulated and pinned server resources.
const MAX_STREAM_DURATION_MS = 10 * 60_000;

// Heartbeat cadence to keep proxies from buffering/closing the stream.
const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(req: Request) {
  const employeeId = await resolveSessionUserId(req);
  if (!employeeId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let maxDurationTimeout: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (maxDurationTimeout) clearTimeout(maxDurationTimeout);
        chatBus.unregisterClient(employeeId, controller);
      };

      chatBus.registerClient(employeeId, controller);

      // Send initial connection event with online user list
      const initialPayload = JSON.stringify({
        connectedUser: employeeId,
        onlineUsers: chatBus.getOnlineUsers(),
      });
      controller.enqueue(encoder.encode(`event: init\ndata: ${initialPayload}\n\n`));

      // Periodic heartbeat ping to prevent proxy timeouts
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup?.();
        }
      }, HEARTBEAT_INTERVAL_MS);

      maxDurationTimeout = setTimeout(() => {
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
        cleanup?.();
      }, MAX_STREAM_DURATION_MS);

      // Clean up when the runtime invokes the start() return (not
      // guaranteed by the streams spec — cancel() below is the reliable
      // signal, so cleanup must exist in both places).
      return () => cleanup?.();
    },
    cancel() {
      // cancel() is the guaranteed signal that the client disconnected.
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
