import { db, schema } from "@/lib/db";
import { eq, and, gte, lt, ne, desc, sql } from "drizzle-orm";
import { startOfDay, startOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Home as HomeIcon,
  Scissors,
  ArrowUpRight,
  Users,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatK, minutesTo12Hour } from "@/lib/utils";
import { statusTone, labelStatus } from "@/lib/status";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  // ── Today's appointments
  const todayAppts = await db
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
        lt(schema.appointments.scheduledAt, todayEnd),
      ),
    )
    .orderBy(schema.appointments.scheduledAt);

  // ── Upcoming (next 7 days, excluding today)
  const upcomingEnd = new Date(todayStart.getTime() + 7 * 86_400_000);
  const upcomingAppts = await db
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
        gte(schema.appointments.scheduledAt, todayEnd),
        lt(schema.appointments.scheduledAt, upcomingEnd),
        ne(schema.appointments.status, "cancelled"),
        ne(schema.appointments.status, "declined"),
      ),
    )
    .orderBy(schema.appointments.scheduledAt);

  // ── Pending (any future)
  const pendingAppts = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.status, "pending"),
        gte(schema.appointments.scheduledAt, now),
      ),
    );

  // ── Revenue today / week / month
  const revenueToday = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, todayStart),
        lt(schema.appointments.scheduledAt, todayEnd),
        eq(schema.appointments.status, "completed"),
      ),
    );

  const revenueWeek = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, weekStart),
        eq(schema.appointments.status, "completed"),
      ),
    );

  const revenueMonth = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.status, "completed"),
      ),
    );

  // ── Completed count vs cancelled this month
  const completedMonth = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.status, "completed"),
      ),
    );
  const cancelledMonth = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.status, "cancelled"),
      ),
    );

  // ── In-shop vs home this month
  const shopRevenue = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.type, "shop"),
        eq(schema.appointments.status, "completed"),
      ),
    );
  const homeRevenue = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.type, "home"),
        eq(schema.appointments.status, "completed"),
      ),
    );

  // ── Total customers
  const totalCustomers = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.customers);
  const returningCustomers = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.customers)
    .where(gte(schema.customers.totalBookings, 2));

  const fmtGreeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="label-eyebrow mb-2">{fmtGreeting()},</p>
          <h1 className="font-display text-4xl">{admin.displayName.split(" ")[0]}</h1>
          <p className="text-cream/55 mt-1 text-sm">
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/appointments" className="btn-secondary text-sm py-2.5">
            All Appointments
          </Link>
          <Link
            href="/admin/appointments?new=walk-in"
            className="btn-primary text-sm py-2.5"
          >
            <Scissors size={14} />
            New Walk-in
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Revenue Today"
          value={formatK(revenueToday[0]?.sum ?? 0)}
          icon={TrendingUp}
          tone="accent"
          sub={`${todayAppts.filter((a) => a.appt.status === "completed").length} completed`}
        />
        <Kpi
          label="Revenue This Week"
          value={formatK(revenueWeek[0]?.sum ?? 0)}
          icon={Calendar}
          sub={`${formatK(revenueMonth[0]?.sum ?? 0)} this month`}
        />
        <Kpi
          label="Today's Bookings"
          value={todayAppts.length.toString()}
          icon={Clock}
          sub={`${pendingAppts[0]?.count ?? 0} pending overall`}
        />
        <Kpi
          label="Customers"
          value={totalCustomers[0]?.count.toString() ?? "0"}
          icon={Users}
          sub={`${returningCustomers[0]?.count ?? 0} returning`}
        />
      </div>

      {/* Quick stats row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="In-Shop Revenue (month)"
          value={formatK(shopRevenue[0]?.sum ?? 0)}
        />
        <MiniStat
          label="Home Service Revenue (month)"
          value={formatK(homeRevenue[0]?.sum ?? 0)}
        />
        <MiniStat
          label="Completed (month)"
          value={(completedMonth[0]?.count ?? 0).toString()}
          tone="success"
        />
        <MiniStat
          label="Cancelled (month)"
          value={(cancelledMonth[0]?.count ?? 0).toString()}
          tone="warning"
        />
      </div>

      {/* Today */}
      <section className="mt-10">
        <SectionHeader title="Today" subtitle={`${todayAppts.length} appointment${todayAppts.length === 1 ? "" : "s"}`} actionHref="/admin/appointments" actionLabel="Manage all" />
        {todayAppts.length === 0 ? (
          <EmptyState text="No appointments today. Enjoy the quiet." />
        ) : (
          <div className="grid gap-3">
            {todayAppts.map(({ appt, customer, service }) => (
              <ApptRow
                key={appt.id}
                appt={appt}
                customer={customer!}
                service={service!}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section className="mt-10">
        <SectionHeader title="Upcoming" subtitle="Next 7 days" actionHref="/admin/appointments" actionLabel="View calendar" />
        {upcomingAppts.length === 0 ? (
          <EmptyState text="Nothing scheduled in the next 7 days." />
        ) : (
          <div className="grid gap-3">
            {upcomingAppts.slice(0, 6).map(({ appt, customer, service }) => (
              <ApptRow
                key={appt.id}
                appt={appt}
                customer={customer!}
                service={service!}
                compact
              />
            ))}
            {upcomingAppts.length > 6 && (
              <Link
                href="/admin/appointments"
                className="text-center text-sm text-accent hover:text-accent-soft py-3"
              >
                + {upcomingAppts.length - 6} more
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  tone?: "accent" | "success";
  sub?: string;
}) {
  return (
    <div className="card-base p-5 relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 h-24 w-24 rounded-full blur-2xl opacity-30 ${
          tone === "success" ? "bg-emerald-500" : "bg-accent"
        }`}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-cream/40">
            {label}
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-soft border border-ink-border text-accent">
            <Icon size={14} />
          </span>
        </div>
        <p className="font-display text-3xl mt-3">{value}</p>
        {sub && <p className="text-xs text-cream/40 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  const colour =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-red-300"
          : "text-cream";
  return (
    <div className="card-base p-4 flex items-center justify-between">
      <p className="text-xs text-cream/50 uppercase tracking-wider">
        {label}
      </p>
      <p className={`font-display text-lg ${colour}`}>{value}</p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {subtitle && (
          <p className="text-cream/45 text-xs uppercase tracking-wider mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-soft"
        >
          {actionLabel}
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card-base p-8 text-center text-cream/45 text-sm">
      {text}
    </div>
  );
}

function ApptRow({
  appt,
  customer,
  service,
  compact,
}: {
  appt: schema.Appointment;
  customer: schema.Customer;
  service: schema.Service;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/admin/appointments?id=${appt.id}`}
      className="card-base p-4 sm:p-5 flex items-center gap-4 hover:border-accent/50 transition group"
    >
      <div className="text-center shrink-0 w-16">
        <p className="font-display text-lg gradient-text leading-none">
          {minutesTo12Hour(
            appt.scheduledAt.getHours() * 60 + appt.scheduledAt.getMinutes(),
          ).replace(" ", "").slice(0, -2)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-cream/40 mt-1">
          {minutesTo12Hour(
            appt.scheduledAt.getHours() * 60 + appt.scheduledAt.getMinutes(),
          ).slice(-2)}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{customer.name}</p>
          <Badge tone={statusTone(appt.status)}>{labelStatus(appt.status)}</Badge>
          {appt.type === "home" && (
            <Badge tone="info">
              <HomeIcon size={10} />
              Home
            </Badge>
          )}
        </div>
        <p className="text-xs text-cream/55 mt-0.5 truncate">
          {service.name} · {appt.bookingRef}
        </p>
      </div>
      {!compact && (
        <div className="text-right hidden sm:block">
          <p className="font-display text-base">{formatK(appt.totalNgwee)}</p>
        </div>
      )}
      <ArrowUpRight size={16} className="text-cream/30 group-hover:text-accent transition shrink-0" />
    </Link>
  );
}

