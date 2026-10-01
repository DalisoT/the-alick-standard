"use client";
import * as React from "react";
import {
  addDays,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { minutesTo12Hour, minutesToHHMM, hhmmToMinutes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Appt {
  id: string;
  bookingRef: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  customerName: string;
  serviceName: string;
}

interface Block {
  id: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  reason: string;
}

interface Props {
  startDate: string;
  days: number;
  appointments: Appt[];
  blocks: Block[];
}

export function CalendarView({ startDate, days, appointments, blocks }: Props) {
  const start = startOfDay(new Date(startDate));
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 08:00 – 19:00
  const today = startOfDay(new Date());

  function apptsForDay(d: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.scheduledAt), d));
  }

  function blocksForDay(d: Date) {
    const key = format(d, "yyyy-MM-dd");
    return blocks.filter((b) => b.date === key);
  }

  return (
    <div className="card-base overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-ink-line sticky top-0 bg-ink-card z-10" style={{ gridTemplateColumns: "60px repeat(14, minmax(110px, 1fr))" }}>
        <div className="px-3 py-3 text-[10px] uppercase tracking-wider text-cream/40 border-r border-ink-line">
          Time
        </div>
        {dayList.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "px-3 py-3 border-r border-ink-line last:border-r-0",
                isToday && "bg-accent/5",
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-cream/40">
                {format(d, "EEE")}
              </p>
              <p
                className={cn(
                  "font-display text-base",
                  isToday && "text-accent",
                )}
              >
                {format(d, "d MMM")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hours */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(14, minmax(110px, 1fr))" }}>
          {hours.map((h) => (
            <React.Fragment key={h}>
              <div className="px-3 py-4 text-[10px] text-cream/40 border-r border-b border-ink-line text-right">
                {minutesTo12Hour(h * 60)}
              </div>
              {dayList.map((d) => {
                const dayAppts = apptsForDay(d).filter((a) => {
                  const when = new Date(a.scheduledAt);
                  return when.getHours() === h;
                });
                const dayBlocks = blocksForDay(d).filter((b) => {
                  return b.startMinutes <= h * 60 + 30 && b.endMinutes > h * 60;
                });

                return (
                  <div
                    key={`${h}-${d.toISOString()}`}
                    className="border-r border-b border-ink-line last:border-r-0 min-h-[60px] p-1 relative"
                  >
                    {dayBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="text-[10px] px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-300 truncate"
                        title={b.reason || "Blocked"}
                      >
                        Block{b.reason ? `: ${b.reason}` : ""}
                      </div>
                    ))}
                    {dayAppts.map((a) => {
                      const when = new Date(a.scheduledAt);
                      const startMin = when.getHours() * 60 + when.getMinutes();
                      const topPct = ((startMin - h * 60) / 60) * 100;
                      const heightRem = Math.max(1.5, a.durationMinutes / 30);
                      return (
                        <Link
                          key={a.id}
                          href={`/admin/appointments?id=${a.id}`}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg px-2 py-1.5 text-[11px] leading-tight border transition",
                            toneForStatus(a.status),
                            "hover:scale-[1.02]",
                          )}
                          style={{
                            top: `${topPct}%`,
                            minHeight: `${heightRem}rem`,
                          }}
                        >
                          <p className="font-medium truncate">{a.customerName}</p>
                          <p className="opacity-80 truncate">{a.serviceName}</p>
                          <p className="opacity-60 text-[10px] mt-0.5">
                            {minutesTo12Hour(startMin)}
                            {a.type === "home" ? " · H" : ""}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function toneForStatus(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 border-emerald-500/40 text-emerald-200";
    case "pending":
      return "bg-amber-500/15 border-amber-500/40 text-amber-200";
    case "completed":
      return "bg-sky-500/15 border-sky-500/40 text-sky-200";
    case "cancelled":
    case "declined":
    case "no_show":
      return "bg-red-500/10 border-red-500/30 text-red-200 opacity-60";
    default:
      return "bg-cream/10 border-cream/20 text-cream";
  }
}