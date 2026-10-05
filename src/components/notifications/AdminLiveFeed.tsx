"use client";
import * as React from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLiveChannel } from "@/components/notifications/useLiveChannel";
import { ToastStack } from "@/components/notifications/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { useNotificationSound } from "@/lib/hooks/use-notification-sound";

/**
 * Admin-side live notification feed.
 *
 * Connects to /api/admin/notifications/stream and:
 *   - shows a floating toast for every new booking / change
 *   - plays a soft two-tone chime on every new booking
 *   - keeps a dropdown list of recent events (closes on outside click)
 *   - asks the OS for native notification permission so alerts fire
 *     even when the tab is in the background
 */
export function AdminLiveFeed() {
  const [open, setOpen] = React.useState(false);
  const [permState, setPermState] = React.useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const wrapRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false), open);
  const sound = useNotificationSound();

  const { events, connected, dismiss } = useLiveChannel(
    "/api/admin/notifications/stream",
    {
      onEvent: (e) => {
        // Soft chime on every new booking / change (works in foreground).
        sound.play();
        if (
          permState === "granted" &&
          typeof Notification !== "undefined" &&
          document.visibilityState !== "visible"
        ) {
          try {
            new Notification(e.title, {
              body: e.body,
              tag: e.id,
              icon: "/icon-192.png",
              badge: "/favicon-32.png",
            });
          } catch {
            // ignore
          }
        }
      },
    },
  );

  async function askPerm() {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermState(r);
  }

  return (
    <>
      <ToastStack events={events} onDismiss={dismiss} />

      <div className="fixed top-4 right-4 z-[55] sm:right-4 sm:top-4 max-w-[calc(100vw-2rem)]">
        <div className="relative" ref={wrapRef}>
          <button
            onClick={() => {
              // First click also primes the audio context (user gesture
              // is required by browser policy before any sound can play).
              sound.primeAudio();
              setOpen((v) => !v);
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ink-card border border-ink-border text-cream hover:border-accent hover:text-accent transition shadow-luxury"
            aria-label="Open notifications"
          >
            {events.length > 0 ? <BellRing size={18} /> : <Bell size={18} />}
            {events.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-accent text-ink text-[10px] font-semibold flex items-center justify-center">
                {events.length}
              </span>
            )}
            {connected && (
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-ink-card" />
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] card-base p-2 shadow-luxury z-10"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-ink-line">
                  <p className="label-eyebrow flex items-center gap-2">
                    Live feed
                    <span
                      className={`flex items-center gap-1 text-[10px] ${
                        connected ? "text-emerald-400" : "text-cream/40"
                      }`}
                    >
                      {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {connected ? "Connected" : "Offline"}
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        // Toggle mute by priming (null) — simplest way is to
                        // reuse the same hook via a wrapper component, but
                        // for now we just expose the current state.
                        sound.primeAudio();
                      }}
                      className="text-[10px] uppercase tracking-wider text-accent hover:text-accent-soft"
                      title={
                        sound.enabled
                          ? "Chime is on — click the bell to keep it primed"
                          : "Click the bell to enable sound"
                      }
                    >
                      {sound.enabled ? "🔔 Sound on" : "🔕 Sound off"}
                    </button>
                    {permState !== "granted" && permState !== "unsupported" && (
                      <button
                        onClick={askPerm}
                        className="text-[10px] uppercase tracking-wider text-accent hover:text-accent-soft"
                      >
                        Enable alerts
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                  {events.length === 0 ? (
                    <div className="px-4 py-8 text-center text-cream/45 text-sm">
                      No live events yet. New bookings & status changes
                      will appear here in real time.
                    </div>
                  ) : (
                    <div className="divide-y divide-ink-line">
                      {events.map((e) => (
                        <a
                          key={e.id}
                          href={e.url ?? "#"}
                          className="block px-3 py-3 hover:bg-cream/[0.03] transition"
                          onClick={() => setOpen(false)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink-soft border border-ink-border">
                              {e.type === "booking_received" ? (
                                <Sparkles size={12} className="text-accent" />
                              ) : e.type === "booking_confirmed" ? (
                                <CheckCircle2 size={12} className="text-emerald-300" />
                              ) : (
                                <XCircle size={12} className="text-red-300" />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {e.title}
                              </p>
                              <p className="text-xs text-cream/55 mt-0.5 line-clamp-2">
                                {e.body}
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-cream/30 mt-1">
                                {formatDistanceToNow(e.ts, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}