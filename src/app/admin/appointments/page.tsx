import { db, schema } from "@/lib/db";
import { eq, and, gte, lt, ne, desc, asc, or, like, sql } from "drizzle-orm";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import Link from "next/link";
import { ArrowUpRight, Home as HomeIcon, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatK, minutesTo12Hour } from "@/lib/utils";
import { statusTone, labelStatus } from "@/lib/status";
import { AppointmentsTable } from "./AppointmentsTable";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string; id?: string; new?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const todayStart = startOfDay(new Date());

  // Determine range
  const filter = searchParams.filter ?? "upcoming";
  let rangeStart: Date;
  let rangeEnd: Date;
  let whereStatusNotIn: string[] = [];
  let label = "";

  switch (filter) {
    case "today":
      rangeStart = todayStart;
      rangeEnd = endOfDay(todayStart);
      label = "Today";
      break;
    case "week":
      rangeStart = todayStart;
      rangeEnd = addDays(todayStart, 7);
      label = "Next 7 days";
      whereStatusNotIn = ["cancelled", "declined"];
      break;
    case "pending":
      rangeStart = todayStart;
      rangeEnd = addDays(todayStart, 30);
      label = "Pending approval";
      whereStatusNotIn = ["cancelled", "declined"];
      break;
    case "completed":
      rangeStart = addDays(todayStart, -30);
      rangeEnd = addDays(todayStart, 30);
      label = "Completed (recent)";
      break;
    case "cancelled":
      rangeStart = addDays(todayStart, -30);
      rangeEnd = addDays(todayStart, 30);
      label = "Cancelled & declined";
      break;
    case "all":
    default:
      rangeStart = addDays(todayStart, -60);
      rangeEnd = addDays(todayStart, 60);
      label = "All appointments";
  }

  const conds: any[] = [
    gte(schema.appointments.scheduledAt, rangeStart),
    lt(schema.appointments.scheduledAt, rangeEnd),
  ];
  if (whereStatusNotIn.length > 0) {
    if (filter === "week" || filter === "pending") {
      conds.push(ne(schema.appointments.status, "cancelled"));
      conds.push(ne(schema.appointments.status, "declined"));
    }
  }

  // search by name/phone/ref
  const q = searchParams.q?.trim();
  if (q) {
    conds.push(
      or(
        like(schema.customers.name, `%${q}%`),
        like(schema.customers.phone, `%${q}%`),
        like(schema.appointments.bookingRef, `%${q}%`),
      ),
    );
  }

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
    .where(and(...conds))
    .orderBy(
      filter === "completed" || filter === "cancelled"
        ? desc(schema.appointments.scheduledAt)
        : asc(schema.appointments.scheduledAt),
    );

  const services = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.active, true))
    .orderBy(asc(schema.services.displayOrder));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="label-eyebrow mb-2">Bookings</p>
          <h1 className="font-display text-4xl">{label}</h1>
          <p className="text-cream/55 mt-1 text-sm">
            {rows.length} appointment{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/customers" className="btn-secondary text-sm py-2.5">
            Customers
          </Link>
          <Link
            href="/admin/appointments?new=walk-in"
            className="btn-primary text-sm py-2.5"
          >
            + Walk-in Booking
          </Link>
        </div>
      </div>

      <form className="mb-6 flex flex-col sm:flex-row gap-3" action="/admin/appointments">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by customer, phone or booking ref…"
            className="w-full rounded-xl border border-ink-border bg-ink-soft pl-9 pr-3 py-2.5 text-sm text-cream placeholder-cream/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          name="filter"
          defaultValue={filter}
          className="rounded-xl border border-ink-border bg-ink-soft px-3 py-2.5 text-sm text-cream focus:border-accent focus:outline-none"
        >
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
          <option value="week">Next 7 days</option>
          <option value="pending">Pending approval</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled / Declined</option>
          <option value="all">All</option>
        </select>
        <button type="submit" className="btn-secondary text-sm py-2.5 px-4">
          <Filter size={14} />
          Filter
        </button>
      </form>

      <AppointmentsTable
        rows={rows.map((r) => ({
          id: r.appt.id,
          bookingRef: r.appt.bookingRef,
          scheduledAt: r.appt.scheduledAt.toISOString(),
          durationMinutes: r.appt.durationMinutes,
          status: r.appt.status,
          type: r.appt.type,
          address: r.appt.address,
          totalNgwee: r.appt.totalNgwee,
          source: r.appt.source,
          customer: {
            id: r.customer?.id ?? "",
            name: r.customer?.name ?? "Unknown",
            phone: r.customer?.phone ?? "",
          },
          service: {
            id: r.service?.id ?? "",
            name: r.service?.name ?? "Service",
            durationMinutes: r.service?.durationMinutes ?? 0,
          },
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          priceNgwee: s.priceNgwee,
        }))}
        openId={searchParams.id}
        showNew={searchParams["new"] === "walk-in"}
      />
    </div>
  );
}