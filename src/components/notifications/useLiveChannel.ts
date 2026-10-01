"use client";
import * as React from "react";
import type { LiveEvent } from "@/lib/live-bus";

/**
 * Connect to a Server-Sent Events stream and surface incoming events.
 * Falls back to polling if EventSource / SSE is unavailable.
 */
export function useLiveChannel(
  url: string | null,
  options: { onEvent?: (e: LiveEvent) => void } = {},
) {
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!url) return;
    if (typeof window === "undefined") return;

    if (typeof EventSource === "undefined") return;

    const es = new EventSource(url);
    es.addEventListener("hello", () => setConnected(true));
    es.addEventListener("live", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as LiveEvent;
        setEvents((arr) => [data, ...arr].slice(0, 20));
        options.onEvent?.(data);
      } catch {
        // ignore
      }
    });
    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss(id: string) {
    setEvents((arr) => arr.filter((e) => e.id !== id));
  }

  function clear() {
    setEvents([]);
  }

  return { events, connected, dismiss, clear };
}