"use client";
import * as React from "react";

/**
 * Plays a soft two-tone chime via Web Audio API when booking notifications
 * arrive. Browser autoplay policies require a user gesture before any
 * AudioContext can produce sound, so the context is created lazily and
 * resumed on the first user interaction.
 *
 * Returns:
 *   - play(): play the chime once
 *   - prime(): call from a user gesture to unlock audio (call from a
 *     click handler — the page-load AudioContext starts suspended)
 *   - enabled: whether sound has been primed
 */
export function useNotificationSound() {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = React.useState(false);

  function primeAudio() {
    if (ctxRef.current) {
      // Already primed; resume if suspended
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => {});
      }
      return;
    }
    const Ctx =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext) ??
      null;
    if (!Ctx) return;
    try {
      const ctx = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      setEnabled(true);
    } catch {
      // ignore
    }
  }

  function play() {
    try {
      const ctx = ctxRef.current;
      if (!ctx || ctx.state !== "running") return;
      const now = ctx.currentTime;

      // First tone (E5) — gentle "ding"
      tone({ ctx, freq: 659.25, startAt: now, duration: 0.32, peakGain: 0.16 });
      // Second tone (A5) — slightly delayed "dong"
      tone({ ctx, freq: 880.0, startAt: now + 0.16, duration: 0.42, peakGain: 0.14 });
    } catch {
      // ignore
    }
  }

  return { play, primeAudio, enabled };
}

function tone(opts: {
  ctx: AudioContext;
  freq: number;
  startAt: number;
  duration: number;
  peakGain: number;
}) {
  const { ctx, freq, startAt, duration, peakGain } = opts;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}