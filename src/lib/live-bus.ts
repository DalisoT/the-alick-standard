/**
 * In-process pub/sub for live notifications.
 *
 * Keeps a registry of SSE connections keyed by channel
 * (`admin`, `customer:<ref>`). When something interesting happens
 * server-side (booking received, confirmed, completed, …) we publish
 * a payload to the channel and every connected browser receives it
 * in real time via the SSE stream endpoint.
 *
 * No external broker required — perfect for a single-barber shop.
 */

export type LiveEventType =
  | "booking_received"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "appointment_completed"
  | "appointment_noshow"
  | "reminder"
  | "info";

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  title: string;
  body: string;
  url?: string;
  ref?: string;
  data?: Record<string, unknown>;
  ts: number;
}

type Subscriber = (event: LiveEvent) => void;

class LiveBus {
  private subs = new Map<string, Set<Subscriber>>();

  subscribe(channel: string, fn: Subscriber): () => void {
    let set = this.subs.get(channel);
    if (!set) {
      set = new Set();
      this.subs.set(channel, set);
    }
    set.add(fn);
    return () => {
      set?.delete(fn);
      if (set && set.size === 0) this.subs.delete(channel);
    };
  }

  publish(channel: string, event: Omit<LiveEvent, "id" | "ts">) {
    const full: LiveEvent = {
      ...event,
      id: cryptoRandom(),
      ts: Date.now(),
    };
    const set = this.subs.get(channel);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(full);
      } catch (err) {
        console.error("[live-bus] subscriber threw", err);
      }
    }
  }

  stats() {
    let total = 0;
    for (const s of this.subs.values()) total += s.size;
    return { channels: this.subs.size, connections: total };
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Hot-reload safe singleton
declare global {
  // eslint-disable-next-line no-var
  var __tasLiveBus: LiveBus | undefined;
}

export const liveBus: LiveBus =
  globalThis.__tasLiveBus ?? (globalThis.__tasLiveBus = new LiveBus());

export function adminChannel() {
  return "admin";
}

export function customerChannel(ref: string) {
  return `customer:${ref.toUpperCase()}`;
}