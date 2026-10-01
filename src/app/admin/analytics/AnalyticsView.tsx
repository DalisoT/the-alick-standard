"use client";
import * as React from "react";
import { TrendingUp, TrendingDown, Minus, Home as HomeIcon, Scissors, CheckCircle2, XCircle, UserX, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatK } from "@/lib/utils";

interface Props {
  revenue: { today: number; week: number; month: number };
  expenses: { today: number; month: number };
  net: number;
  statuses: { status: string; count: number }[];
  typeRevenue: { type: string; revenue: number; count: number }[];
  dailySeries: { day: string; revenue: number }[];
}

export function AnalyticsView({
  revenue,
  expenses,
  net,
  statuses,
  typeRevenue,
  dailySeries,
}: Props) {
  const totalAppts = statuses.reduce((a, s) => a + s.count, 0);
  const completed = statuses.find((s) => s.status === "completed")?.count ?? 0;
  const cancelled =
    (statuses.find((s) => s.status === "cancelled")?.count ?? 0) +
    (statuses.find((s) => s.status === "declined")?.count ?? 0);
  const noShow = statuses.find((s) => s.status === "no_show")?.count ?? 0;
  const completionRate = totalAppts ? Math.round((completed / totalAppts) * 100) : 0;
  const cancelRate = totalAppts ? Math.round((cancelled / totalAppts) * 100) : 0;

  const shop = typeRevenue.find((t) => t.type === "shop");
  const home = typeRevenue.find((t) => t.type === "home");

  // Fill daily series with zeros for missing days
  const series = React.useMemo(() => {
    const map = new Map<string, number>();
    dailySeries.forEach((d) => map.set(d.day, d.revenue));
    const today = new Date();
    const days: { day: string; label: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        day: key,
        label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        revenue: (map.get(key) ?? 0) / 100,
      });
    }
    return days;
  }, [dailySeries]);

  const maxRev = Math.max(1, ...series.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatK(revenue.today)}
          trend="Today"
          tone="accent"
        />
        <KpiCard
          label="Revenue this week"
          value={formatK(revenue.week)}
          trend="Since Mon"
        />
        <KpiCard
          label="Revenue this month"
          value={formatK(revenue.month)}
          trend="Since 1st"
        />
        <KpiCard
          label="Net this month"
          value={formatK(net)}
          trend={`After ${formatK(expenses.month)} expenses`}
          tone={net >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Daily revenue bar chart */}
      <div className="card-base p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="label-eyebrow">Last 30 days</p>
            <h2 className="font-display text-2xl">Daily revenue</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-cream/40">
              Total
            </p>
            <p className="font-display text-xl gradient-text">
              {formatK(
                series.reduce((a, d) => a + d.revenue * 100, 0),
              )}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-40 mt-4">
          {series.map((d, i) => {
            const heightPct = (d.revenue / maxRev) * 100;
            const isToday = i === series.length - 1;
            return (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center justify-end gap-2"
                title={`${d.label}: ${formatK(d.revenue * 100)}`}
              >
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isToday ? "bg-accent" : "bg-accent/40 hover:bg-accent/60"
                  }`}
                  style={{
                    height: `${Math.max(2, heightPct)}%`,
                    minHeight: "3px",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-cream/30 mt-2">
          <span>{series[0]?.label}</span>
          <span>{series[Math.floor(series.length / 2)]?.label}</span>
          <span>{series[series.length - 1]?.label}</span>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-base p-6">
          <p className="label-eyebrow mb-2">Appointments this month</p>
          <h2 className="font-display text-2xl mb-4">Status mix</h2>
          <div className="space-y-3">
            <Row
              label="Completed"
              count={completed}
              total={totalAppts}
              tone="success"
              icon={CheckCircle2}
            />
            <Row
              label="Cancelled"
              count={cancelled}
              total={totalAppts}
              tone="danger"
              icon={XCircle}
            />
            <Row
              label="No-show"
              count={noShow}
              total={totalAppts}
              tone="warning"
              icon={UserX}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-ink-line grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-cream/45">Completion rate</p>
              <p className="font-display text-3xl gradient-text">
                {completionRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-cream/45">Cancellation rate</p>
              <p className="font-display text-3xl text-amber-300">
                {cancelRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <p className="label-eyebrow mb-2">Channel mix (this month)</p>
          <h2 className="font-display text-2xl mb-4">In-shop vs Home</h2>
          <div className="space-y-3">
            <ChannelRow
              icon={Scissors}
              label="In-shop"
              count={shop?.count ?? 0}
              revenue={shop?.revenue ?? 0}
              tone="accent"
            />
            <ChannelRow
              icon={HomeIcon}
              label="Home service"
              count={home?.count ?? 0}
              revenue={home?.revenue ?? 0}
              tone="info"
            />
          </div>
          <div className="mt-6 pt-6 border-t border-ink-line">
            <p className="text-xs text-cream/45">
              Travel fees collected
            </p>
            <p className="font-display text-2xl gradient-text">
              {formatK(home?.revenue ? Math.max(0, home.revenue - (shop?.revenue ? 0 : 0)) : 0)}
            </p>
            <p className="text-xs text-cream/40 mt-1">
              Included in home-service revenue above.
            </p>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="card-base p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="label-eyebrow">Spend</p>
            <h2 className="font-display text-2xl">Expenses this month</h2>
          </div>
          <p className="font-display text-3xl text-amber-300">
            {formatK(expenses.month)}
          </p>
        </div>
        <p className="text-cream/55 text-sm">
          Track supplies, utilities, marketing, and other costs in{" "}
          <a href="/admin/expenses" className="text-accent underline">
            Expenses
          </a>
          . Net revenue automatically deducts these.
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: "accent" | "success" | "danger";
}) {
  return (
    <div className="card-base p-5 relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 h-24 w-24 rounded-full blur-2xl opacity-30 ${
          tone === "success"
            ? "bg-emerald-500"
            : tone === "danger"
              ? "bg-red-500"
              : "bg-accent"
        }`}
      />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.25em] text-cream/40">
          {label}
        </p>
        <p className="font-display text-3xl mt-3">{value}</p>
        {trend && (
          <p className="text-xs text-cream/40 mt-1">{trend}</p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  count,
  total,
  tone,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  tone: "success" | "danger" | "warning";
  icon: React.ComponentType<any>;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const color =
    tone === "success"
      ? "bg-emerald-500/30"
      : tone === "warning"
        ? "bg-amber-500/30"
        : "bg-red-500/30";
  const text =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-amber-300"
        : "text-red-300";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-2 text-cream/75">
          <Icon size={14} className={text} />
          {label}
        </span>
        <span className={text}>
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-cream/5 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChannelRow({
  icon: Icon,
  label,
  count,
  revenue,
  tone,
}: {
  icon: React.ComponentType<any>;
  label: string;
  count: number;
  revenue: number;
  tone: "accent" | "info";
}) {
  const colour =
    tone === "accent" ? "text-accent" : "text-sky-300";
  return (
    <div className="rounded-xl border border-ink-line bg-ink-soft p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink border border-ink-border">
          <Icon size={16} className={colour} />
        </span>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-cream/50 mt-0.5">
            {count} appointment{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <p className="font-display text-xl gradient-text">{formatK(revenue)}</p>
    </div>
  );
}