import chatBus from '@/lib/chat-bus';
import { resolveSessionUserId } from '@/lib/chat-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const employeeId = await resolveSessionUserId(req);
  if (!employeeId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      chatBus.registerClient(employeeId, controller);

      // Send initial connection event with online user list
      const encoder = new TextEncoder();
      const initialPayload = JSON.stringify({
        connectedUser: employeeId,
        onlineUsers: chatBus.getOnlineUsers(),
      });
      controller.enqueue(encoder.encode(`event: init\ndata: ${initialPayload}\n\n`));

      // Periodic heartbeat ping every 15 seconds to prevent proxy timeouts
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15_000);

      // Clean up on stream cancellation
      return () => {
        clearInterval(heartbeatInterval);
        chatBus.unregisterClient(employeeId, controller);
      };
    },
    cancel(reason) {
      void reason;
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
