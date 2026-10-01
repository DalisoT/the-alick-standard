"use client";
import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { cn, minutesTo12Hour } from "@/lib/utils";

interface Slot {
  start: string;
  startMinutes: number;
  available: boolean;
  reason?: string;
}

interface DateSlotPickerProps {
  serviceId: string;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelect: (date: string, time: string) => void;
  bookType: "shop" | "home";
}

export function DateSlotPicker({
  serviceId,
  selectedDate,
  selectedTime,
  onSelect,
}: DateSlotPickerProps) {
  const [month, setMonth] = React.useState<Date>(startOfDay(new Date()));
  const [daysData, setDaysData] = React.useState<
    Record<string, { isWorkingDay: boolean; hasSlots: boolean }>
  >({});
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [loadingDays, setLoadingDays] = React.useState(false);

  // Fetch month availability summary
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingDays(true);
      try {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const params = new URLSearchParams({
          serviceId,
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
        });
        const r = await fetch(`/api/availability?${params.toString()}`);
        const j = await r.json();
        if (cancelled) return;
        setDaysData(j.days ?? {});
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingDays(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [month, serviceId]);

  // Fetch slots for selected date
  React.useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoadingSlots(true);
      try {
        const r = await fetch(
          `/api/availability?serviceId=${serviceId}&date=${selectedDate}`,
        );
        const j = await r.json();
        if (cancelled) return;
        setSlots(j.slots ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, serviceId]);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = Array.from({ length: getDay(monthStart) });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* CALENDAR */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              setMonth((m) => addDays(startOfMonth(m), -1))
            }
            disabled={
              isSameDay(startOfMonth(month), startOfMonth(today)) ||
              month < today
            }
            className="rounded-full p-2 text-cream/70 hover:bg-cream/5 hover:text-cream disabled:opacity-30"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-display text-lg">
              {format(month, "MMMM yyyy")}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cream/40 mt-0.5">
              {loadingDays ? "Checking…" : "Tap a date"}
            </p>
          </div>
          <button
            onClick={() => setMonth((m) => addDays(endOfMonth(m), 1))}
            disabled={monthEnd >= maxDate}
            className="rounded-full p-2 text-cream/70 hover:bg-cream/5 hover:text-cream disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-cream/40 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {leadingBlanks.map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {monthDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const past = day < today;
            const tooFar = day > maxDate;
            const info = daysData[dateStr];
            const isWorking = info?.isWorkingDay;
            const hasSlots = info?.hasSlots;
            const isSelected =
              selectedDate !== null && selectedDate === dateStr;
            const isToday = isSameDay(day, today);

            const disabled = past || tooFar || !isWorking || !hasSlots;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(dateStr, "")}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm transition relative",
                  disabled && "text-cream/20 cursor-not-allowed",
                  !disabled &&
                    !isSelected &&
                    "hover:bg-accent/10 hover:text-cream text-cream",
                  isSelected &&
                    "bg-accent text-ink font-semibold shadow-luxury",
                  isToday && !isSelected && "ring-1 ring-accent/40",
                )}
              >
                {day.getDate()}
                {isWorking && hasSlots && !isSelected && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-5 border-t border-ink-line flex items-center gap-2 text-[11px] text-cream/50">
          <Calendar size={12} className="text-accent" />
          Selected:{" "}
          {selectedDate
            ? format(new Date(selectedDate), "EEEE, d MMMM yyyy")
            : "—"}
        </div>
      </div>

      {/* TIME SLOTS */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-lg">
            {selectedDate
              ? format(new Date(selectedDate), "EEE, d MMM")
              : "Pick a date first"}
          </p>
          <span className="label-eyebrow">
            <Clock size={11} className="inline -mt-0.5 mr-1" />
            Lusaka time
          </span>
        </div>

        {!selectedDate && (
          <div className="rounded-xl border border-dashed border-ink-line p-8 text-center text-sm text-cream/40">
            Select a date to see available times.
          </div>
        )}

        {selectedDate && loadingSlots && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-ink-soft animate-pulse"
              />
            ))}
          </div>
        )}

        {selectedDate && !loadingSlots && slots.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-line p-8 text-center text-sm text-cream/40">
            Alick is closed on this day. Pick another date.
          </div>
        )}

        {selectedDate && !loadingSlots && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {slots.map((s) => {
              const isSelected = selectedTime === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={!s.available}
                  onClick={() => onSelect(selectedDate, s.start)}
                  className={cn(
                    "h-11 text-sm rounded-xl border transition font-medium tracking-wide",
                    s.available
                      ? isSelected
                        ? "bg-accent text-ink border-accent shadow-luxury"
                        : "border-ink-border bg-ink-soft text-cream hover:border-accent"
                      : "border-ink-line bg-ink/50 text-cream/25 cursor-not-allowed line-through",
                  )}
                >
                  {minutesTo12Hour(s.startMinutes)}
                </button>
              );
            })}
          </div>
        )}

        {selectedTime && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            <span className="text-cream/60">Selected: </span>
            <span className="text-accent font-medium">
              {format(new Date(selectedTime), "EEEE d MMMM, ") +
                minutesTo12Hour(
                  new Date(selectedTime).getHours() * 60 +
                    new Date(selectedTime).getMinutes(),
                )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}