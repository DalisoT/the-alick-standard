import { db, schema } from "@/lib/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { formatK, ngweeToKwacha } from "@/lib/utils";
import { AnalyticsView } from "./AnalyticsView";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = subDays(today, 30);

  // Revenue buckets
  const revToday = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, today),
        eq(schema.appointments.status, "completed"),
      ),
    );
  const revWeek = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, weekStart),
        eq(schema.appointments.status, "completed"),
      ),
    );
  const revMonth = await db
    .select({ sum: sql<number>`coalesce(sum(total_ngwee),0)` })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.status, "completed"),
      ),
    );

  // Expense buckets
  const expToday = await db
    .select({ sum: sql<number>`coalesce(sum(amount_ngwee),0)` })
    .from(schema.expenses)
    .where(gte(schema.expenses.incurredAt, today));
  const expMonth = await db
    .select({ sum: sql<number>`coalesce(sum(amount_ngwee),0)` })
    .from(schema.expenses)
    .where(gte(schema.expenses.incurredAt, monthStart));

  // Status breakdown (month)
  const statusRows = await db
    .select({ status: schema.appointments.status, count: sql<number>`count(*)` })
    .from(schema.appointments)
    .where(gte(schema.appointments.scheduledAt, monthStart))
    .groupBy(schema.appointments.status);

  // In-shop vs home (month)
  const typeRevenue = await db
    .select({
      type: schema.appointments.type,
      sum: sql<number>`coalesce(sum(total_ngwee),0)`,
      count: sql<number>`count(*)`,
    })
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.scheduledAt, monthStart),
        eq(schema.appointments.status, "completed"),
      ),
    )
    .groupBy(schema.appointments.type);

  // Daily revenue (last 30 days)
  const daily = await db.all<{ day: string; revenue: number }>(
    sql`SELECT strftime('%Y-%m-%d', datetime(scheduled_at/1000, 'unixepoch')) as day, sum(total_ngwee) as revenue FROM appointments WHERE status='completed' AND scheduled_at >= ${thirtyDaysAgo.getTime()} GROUP BY day ORDER BY day`,
  ).catch(() => [] as { day: string; revenue: number }[]);

  // The above SQL is best-effort. If `db.all` is not on the drizzle proxy, the next query covers it.
  let dailySeries: { day: string; revenue: number }[] = [];
  try {
    const conn = await import("@/lib/db").then((m) => m.sqliteConn);
    const res = await conn.execute({
      sql: `SELECT strftime('%Y-%m-%d', datetime(scheduled_at/1000, 'unixepoch')) as day, sum(total_ngwee) as revenue FROM appointments WHERE status='completed' AND scheduled_at >= ? GROUP BY day ORDER BY day`,
      args: [thirtyDaysAgo.getTime()],
    });
    dailySeries = (res.rows ?? []).map((r) => ({
      day: String(r.day),
      revenue: Number(r.revenue ?? 0),
    }));
  } catch (err) {
    console.error("[analytics] daily series failed", err);
  }

  const totalRevenueMonth = revMonth[0]?.sum ?? 0;
  const totalExpenseMonth = expMonth[0]?.sum ?? 0;
  const net = totalRevenueMonth - totalExpenseMonth;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Business</p>
        <h1 className="font-display text-4xl">Analytics</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Revenue, bookings, and the numbers behind THE ALICK STANDARD.
        </p>
      </div>

      <AnalyticsView
        revenue={{
          today: revToday[0]?.sum ?? 0,
          week: revWeek[0]?.sum ?? 0,
          month: revMonth[0]?.sum ?? 0,
        }}
        expenses={{
          today: expToday[0]?.sum ?? 0,
          month: expMonth[0]?.sum ?? 0,
        }}
        net={net}
        statuses={statusRows.map((s) => ({ status: s.status, count: s.count }))}
        typeRevenue={typeRevenue.map((t) => ({
          type: t.type,
          revenue: Number(t.sum ?? 0),
          count: t.count,
        }))}
        dailySeries={dailySeries}
      />
    </div>
  );
}