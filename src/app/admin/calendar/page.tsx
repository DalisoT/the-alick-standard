import { db, schema } from "@/lib/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { startOfDay, addDays } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { CalendarView } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const todayStart = startOfDay(new Date());
  const rangeEnd = addDays(todayStart, 14);

  const rows = await db
    .select({
      appt: schema.appointments,
      customer: schema.customers,
      service: schema.services,
    })
    .from(schema.appointments)
    .leftJoin(
      schema.customers,
      eq(schema.appointments.customerId, schema.customers.id),
    )
    .leftJoin(
      schema.services,
      eq(schema.appointments.serviceId, schema.services.id),
    )
    .where(
      and(
        gte(schema.appointments.scheduledAt, todayStart),
        lt(schema.appointments.scheduledAt, rangeEnd),
      ),
    );

  const blocks = await db.select().from(schema.availabilityBlocks);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Schedule</p>
        <h1 className="font-display text-4xl">Calendar</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Two weeks ahead · Tap any booking to manage it.
        </p>
      </div>

      <CalendarView
        startDate={todayStart.toISOString()}
        days={14}
        appointments={rows.map((r) => ({
          id: r.appt.id,
          bookingRef: r.appt.bookingRef,
          scheduledAt: r.appt.scheduledAt.toISOString(),
          durationMinutes: r.appt.durationMinutes,
          status: r.appt.status,
          type: r.appt.type,
          customerName: r.customer?.name ?? "Unknown",
          serviceName: r.service?.name ?? "Service",
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          date: b.date,
          startMinutes: b.startMinutes,
          endMinutes: b.endMinutes,
          reason: b.reason,
        }))}
      />
    </div>
  );
}