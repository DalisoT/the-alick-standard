import { db, schema } from "@/lib/db";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { addDays, addMinutes, isBefore, isSameDay, startOfDay } from "date-fns";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/utils";

export interface Slot {
  /** ISO string */
  start: string;
  /** ISO string */
  end: string;
  /** Minutes since 00:00 */
  startMinutes: number;
  available: boolean;
  reason?: "booked" | "blocked" | "past" | "outside_hours";
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  isWorkingDay: boolean;
  slots: Slot[];
}

/**
 * Compute available time slots for a given day, taking into account:
 *  - weekly availability rules (working hours)
 *  - one-off availability blocks
 *  - existing appointments (shop + home both consume a slot)
 *
 * @param date The target date (interpreted in server local time)
 * @param durationMinutes Service duration
 * @param slotIntervalMinutes Slot granularity (e.g. 30)
 * @param excludeAppointmentId Optional appointment ID to ignore (for reschedules)
 */
export async function computeDaySlots(args: {
  date: Date;
  durationMinutes: number;
  slotIntervalMinutes: number;
  excludeAppointmentId?: string;
}): Promise<DayAvailability> {
  const { date, durationMinutes, slotIntervalMinutes, excludeAppointmentId } =
    args;

  const dayStart = startOfDay(date);
  const dayOfWeek = dayStart.getDay(); // 0=Sun
  const dateStr = `${dayStart.getFullYear()}-${pad(dayStart.getMonth() + 1)}-${pad(dayStart.getDate())}`;

  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.dayOfWeek, dayOfWeek));
  const blocks = await db
    .select()
    .from(schema.availabilityBlocks)
    .where(eq(schema.availabilityBlocks.date, dateStr));

  const dayStartMs = dayStart.getTime();
  const dayEndMs = addDays(dayStart, 1).getTime();
  const appts = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, new Date(dayStartMs)),
        lte(schema.appointments.scheduledAt, new Date(dayEndMs - 1)),
        ne(schema.appointments.status, "cancelled"),
        ne(schema.appointments.status, "declined"),
      ),
    );

  const now = new Date();
  const rule = rules.find((r) => r.active);
  const isWorkingDay = !!rule;

  if (!rule) {
    return {
      date: dateStr,
      dayOfWeek,
      isWorkingDay: false,
      slots: [],
    };
  }

  const slots: Slot[] = [];
  for (
    let m = rule.startMinutes;
    m + durationMinutes <= rule.endMinutes;
    m += slotIntervalMinutes
  ) {
    const slotStart = new Date(dayStartMs + m * 60_000);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

    let available = true;
    let reason: Slot["reason"] | undefined;

    if (isBefore(slotStart, now)) {
      available = false;
      reason = "past";
    } else {
      // overlapping with existing appointments?
      const conflicts = appts.some((a) => {
        if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
        const aStart = a.scheduledAt.getTime();
        const aEnd = aStart + a.durationMinutes * 60_000;
        return aStart < slotEnd.getTime() && aEnd > slotStart.getTime();
      });
      if (conflicts) {
        available = false;
        reason = "booked";
      } else {
        // overlapping with availability blocks?
        const blocked = blocks.some((b) => {
          const bStart = dayStartMs + b.startMinutes * 60_000;
          const bEnd = dayStartMs + b.endMinutes * 60_000;
          return bStart < slotEnd.getTime() && bEnd > slotStart.getTime();
        });
        if (blocked) {
          available = false;
          reason = "blocked";
        }
      }
    }

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      startMinutes: m,
      available,
      reason,
    });
  }

  return { date: dateStr, dayOfWeek, isWorkingDay: true, slots };
}

export async function isSlotBookable(args: {
  slotStart: Date;
  durationMinutes: number;
  excludeAppointmentId?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { slotStart, durationMinutes, excludeAppointmentId } = args;

  if (isBefore(slotStart, new Date())) {
    return { ok: false, reason: "That time has already passed." };
  }

  const slotEnd = addMinutes(slotStart, durationMinutes);
  const dow = slotStart.getDay();
  const dateStr = `${slotStart.getFullYear()}-${pad(slotStart.getMonth() + 1)}-${pad(slotStart.getDate())}`;

  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.dayOfWeek, dow));
  const rule = rules.find((r) => r.active);
  if (!rule) return { ok: false, reason: "Closed on that day." };

  const startMin = slotStart.getHours() * 60 + slotStart.getMinutes();
  if (
    startMin < rule.startMinutes ||
    startMin + durationMinutes > rule.endMinutes
  ) {
    return { ok: false, reason: "Outside working hours." };
  }

  const blocks = await db
    .select()
    .from(schema.availabilityBlocks)
    .where(eq(schema.availabilityBlocks.date, dateStr));
  const startMs = slotStart.getTime();
  const endMs = slotEnd.getTime();
  const blocked = blocks.some((b) => {
    const bStart = startOfDay(slotStart).getTime() + b.startMinutes * 60_000;
    const bEnd = startOfDay(slotStart).getTime() + b.endMinutes * 60_000;
    return bStart < endMs && bEnd > startMs;
  });
  if (blocked) return { ok: false, reason: "Time blocked off." };

  const appts = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, new Date(startMs)),
        ne(schema.appointments.status, "cancelled"),
        ne(schema.appointments.status, "declined"),
      ),
    );
  const conflict = appts.some((a) => {
    if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
    const aStart = a.scheduledAt.getTime();
    const aEnd = aStart + a.durationMinutes * 60_000;
    return aStart < endMs && aEnd > startMs;
  });
  if (conflict) return { ok: false, reason: "Slot already booked." };

  return { ok: true };
}

export { hhmmToMinutes, minutesToHHMM };

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export { addDays, addMinutes, isSameDay };