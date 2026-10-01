"use client";
import * as React from "react";
import { CheckCircle2, AlertCircle, Info, XCircle, Bell, ArrowRight } from "lucide-react";
import type { LiveEvent, LiveEventType } from "@/lib/live-bus";
import { cn } from "@/lib/utils";

const toneByType: Record<LiveEventType, string> = {
  booking_received: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  booking_confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  booking_cancelled: "border-red-500/40 bg-red-500/10 text-red-100",
  booking_rescheduled: "border-sky-500/40 bg-sky-500/10 text-sky-100",
  appointment_completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  appointment_noshow: "border-red-500/40 bg-red-500/10 text-red-100",
  reminder: "border-accent/40 bg-accent/10 text-accent-soft",
  info: "border-ink-border bg-ink-card text-cream",
};

const iconByType: Record<LiveEventType, React.ComponentType<any>> = {
  booking_received: Bell,
  booking_confirmed: CheckCircle2,
  booking_cancelled: XCircle,
  booking_rescheduled: AlertCircle,
  appointment_completed: CheckCircle2,
  appointment_noshow: AlertCircle,
  reminder: Bell,
  info: Info,
};

export function Toast({
  event,
  onDismiss,
}: {
  event: LiveEvent;
  onDismiss: () => void;
}) {
  const Icon = iconByType[event.type];
  return (
    <div
      className={cn(
        "pointer-events-auto card-base px-4 py-3.5 shadow-luxury border flex items-start gap-3 animate-floatIn max-w-sm",
        toneByType[event.type],
      )}
    >
      <span className="mt-0.5">
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{event.title}</p>
        <p className="text-xs opacity-85 mt-0.5">{event.body}</p>
        {event.url && (
          <a
            href={event.url}
            className="mt-1.5 inline-flex items-center gap-1 text-xs underline opacity-90"
          >
            Open
            <ArrowRight size={12} />
          </a>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 text-xs"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastStack({
  events,
  onDismiss,
}: {
  events: LiveEvent[];
  onDismiss: (id: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="fixed inset-x-0 top-4 sm:top-auto sm:bottom-4 sm:right-4 z-[60] flex flex-col items-center sm:items-end gap-2 px-4 sm:px-0 pointer-events-none">
      {events.slice(0, 4).map((e) => (
        <Toast key={e.id} event={e} onDismiss={() => onDismiss(e.id)} />
      ))}
    </div>
  );
}