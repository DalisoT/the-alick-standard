import { NextRequest } from "next/server";
import { liveBus, customerChannel, type LiveEvent } from "@/lib/live-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events for a customer's booking.
 *
 * GET /api/notifications/stream?ref=TAS-XXXX
 *   → long-lived text/event-stream connection
 *   → pushes every LiveEvent published to the customer's channel
 *   → keeps the connection alive with a heartbeat every 25 seconds
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref) {
    return new Response("Missing ref", { status: 400 });
  }
  const channel = customerChannel(ref);

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: LiveEvent) => {
        try {
          const data = `event: live\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(enc.encode(data));
        } catch {
          // Stream closed
        }
      };

      // Initial hello
      controller.enqueue(
        enc.encode(
          `event: hello\ndata: ${JSON.stringify({ channel, ts: Date.now() })}\n\n`,
        ),
      );

      const unsub = liveBus.subscribe(channel, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          // ignore
        }
      }, 25_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Auto-cleanup when client disconnects
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}