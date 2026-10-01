import { NextRequest } from "next/server";
import { liveBus, adminChannel, type LiveEvent } from "@/lib/live-bus";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }
  const channel = adminChannel();

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: LiveEvent) => {
        try {
          controller.enqueue(
            enc.encode(`event: live\ndata: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Stream closed
        }
      };

      controller.enqueue(
        enc.encode(
          `event: hello\ndata: ${JSON.stringify({ channel, ts: Date.now() })}\n\n`,
        ),
      );

      const unsub = liveBus.subscribe(channel, send);

      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          // ignore
        }
      }, 25_000);

      const cleanup = () => {
        clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {}
      };

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