"use client";
import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Home as HomeIcon,
  MapPin,
  Calendar,
  Scissors,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatK, minutesTo12Hour, normalisePhone } from "@/lib/utils";
import { statusTone } from "@/lib/status";
import { useLiveChannel } from "@/components/notifications/useLiveChannel";
import { ToastStack } from "@/components/notifications/Toast";
import { motion, AnimatePresence } from "framer-motion";

export interface LiveAppt {
  id: string;
  bookingRef: string;
  status: string;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  totalNgwee: number;
  travelFeeNgwee: number;
  servicePriceNgwee: number;
  address: string | null;
  customerName: string;
  customerPhone: string;
  serviceName: string;
}

export function CustomerLiveStatus({ initial }: { initial: LiveAppt }) {
  const [appt, setAppt] = React.useState(initial);
  const [now, setNow] = React.useState(() => Date.now());
  const { events, connected, dismiss } = useLiveChannel(
    `/api/notifications/stream?ref=${initial.bookingRef}`,
    {
      onEvent: (e) => {
        if (e.data?.status) {
          setAppt((a) => ({ ...a, status: e.data!.status as string }));
        }
      },
    },
  );

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const when = new Date(appt.scheduledAt);
  const minutes = Math.round((when.getTime() - now) / 60_000);

  const stage = currentStage(appt.status);
  const stepIndex = stageIndex(stage);

  return (
    <>
      <ToastStack events={events} onDismiss={dismiss} />

      <div className="card-base p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="flex items-center justify-between mb-5">
          <p className="label-eyebrow">Live status</p>
          <span
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${
              connected ? "text-emerald-400" : "text-cream/40"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-cream/30"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl mb-1">
          {titleFor(stage, appt.customerName)}
        </h2>
        <p className="text-cream/60 text-sm">
          {subtitleFor(stage, when, minutes)}
        </p>

        {/* Timeline */}
        <div className="mt-8 grid grid-cols-4 gap-2">
          {STAGES.map((s, i) => {
            const reached = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <div key={s.key} className="flex flex-col items-center text-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: current ? 1.05 : 1,
                    backgroundColor: reached ? "var(--accent)" : "rgba(38,39,43,1)",
                  }}
                  className="h-10 w-10 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: reached ? "var(--accent)" : "rgba(38,39,43,1)",
                  }}
                >
                  {reached ? (
                    <CheckCircle2 size={16} className="text-ink" />
                  ) : (
                    <s.icon size={14} className="text-cream/40" />
                  )}
                </motion.div>
                <p
                  className={`mt-2 text-[10px] uppercase tracking-wider ${
                    reached ? "text-cream" : "text-cream/35"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detail cards */}
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <Detail icon={Calendar} label="Date">
            {format(when, "EEEE, d MMMM yyyy")}
          </Detail>
          <Detail icon={Clock} label="Time">
            {minutesTo12Hour(when.getHours() * 60 + when.getMinutes())} ·{" "}
            <span className="text-cream/55 text-sm">{appt.durationMinutes}m</span>
          </Detail>
          <Detail icon={Scissors} label="Service">
            {appt.serviceName}
          </Detail>
          <Detail icon={appt.type === "home" ? HomeIcon : MapPin} label={appt.type === "home" ? "Service at" : "In-shop"}>
            {appt.type === "home"
              ? (appt.address ?? "—")
              : "The studio, Kabulonga"}
          </Detail>
        </div>

        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="label-eyebrow mb-2">Total</p>
          <p className="font-display text-3xl gradient-text">
            {formatK(appt.totalNgwee)}
          </p>
          {appt.travelFeeNgwee > 0 && (
            <p className="text-xs text-cream/50 mt-1">
              Includes {formatK(appt.travelFeeNgwee)} travel fee.
            </p>
          )}
          <p className="text-xs text-cream/50 mt-2">Pay after your appointment.</p>
        </div>

        {appt.status === "completed" && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
            <Sparkles size={20} className="text-accent mx-auto mb-2" />
            <p className="font-display text-lg">Thanks for choosing THE ALICK STANDARD.</p>
            <p className="text-cream/55 text-xs mt-1">Hope you enjoyed the experience.</p>
          </div>
        )}

        {appt.status === "cancelled" && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
            <XCircle size={20} className="text-red-300 mx-auto mb-2" />
            <p className="font-display text-lg">This booking was cancelled.</p>
            <p className="text-cream/55 text-xs mt-1">
              You can re-book anytime at the home page.
            </p>
          </div>
        )}
      </div>

      <EventLog events={events} />
    </>
  );
}

function EventLog({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="card-base p-5 mt-5 text-center text-cream/45 text-sm">
        Waiting for live updates from Alick…
      </div>
    );
  }
  return (
    <div className="card-base p-5 mt-5">
      <p className="label-eyebrow mb-3">Activity</p>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {events.slice(0, 6).map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-ink-line bg-ink-soft px-3 py-2.5 text-sm"
            >
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-cream/55 mt-0.5">{e.body}</p>
              <p className="text-[10px] uppercase tracking-wider text-cream/30 mt-1">
                {formatDistanceToNow(e.ts, { addSuffix: true })}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<any>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-soft p-4">
      <div className="flex items-center gap-2 text-cream/40 mb-1">
        <Icon size={12} />
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-cream text-sm">{children}</p>
    </div>
  );
}

const STAGES = [
  { key: "received", label: "Received", icon: Sparkles },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "active", label: "On the day", icon: Calendar },
  { key: "done", label: "Completed", icon: Sparkles },
] as const;

type Stage = (typeof STAGES)[number]["key"];

function currentStage(status: string): Stage {
  if (status === "cancelled" || status === "declined" || status === "no_show") {
    return "received";
  }
  if (status === "completed") return "done";
  if (status === "confirmed") return "confirmed";
  return "received";
}

function stageIndex(s: Stage) {
  return STAGES.findIndex((x) => x.key === s);
}

function titleFor(stage: Stage, name: string) {
  switch (stage) {
    case "received":
      return `Hold tight, ${name.split(" ")[0]}.`;
    case "confirmed":
      return `You're confirmed, ${name.split(" ")[0]}.`;
    case "active":
      return "See you soon.";
    case "done":
      return `Until next time, ${name.split(" ")[0]}.`;
  }
}

function subtitleFor(stage: Stage, when: Date, minutes: number) {
  if (stage === "received") {
    return "Alick is reviewing your booking. You'll get a real-time alert when he confirms.";
  }
  if (stage === "confirmed") {
    return minutes > 0
      ? `See Alick in ${humanMinutes(minutes)}.`
      : "You're due now.";
  }
  if (stage === "active") return `Scheduled for ${format(when, "EEEE, d MMMM")}.`;
  return "Your booking is complete.";
}

function humanMinutes(n: number) {
  if (n < 60) return `${n} minutes`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}