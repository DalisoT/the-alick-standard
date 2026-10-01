"use client";
import * as React from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Crown,
  TrendingUp,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatK, normalisePhone, minutesTo12Hour } from "@/lib/utils";
import { statusTone } from "@/lib/status";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  totalBookings: number;
  completedBookings: number;
  lifetimeSpend: number;
  lastVisit: string | null;
}

interface HistoryRow {
  id: string;
  bookingRef: string;
  scheduledAt: string;
  serviceName: string;
  type: string;
  status: string;
  totalNgwee: number;
}

export function CustomersManager({
  customers,
  openId,
}: {
  customers: Customer[];
  openId?: string;
}) {
  const [active, setActive] = React.useState<Customer | null>(null);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!openId) return;
    const c = customers.find((x) => x.id === openId);
    if (c) setActive(c);
  }, [openId, customers]);

  React.useEffect(() => {
    if (!active) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoadingHistory(true);
      try {
        const r = await fetch(`/api/admin/customers/${active!.id}/history`);
        const j = await r.json();
        if (!cancelled) setHistory(j.history ?? []);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const filtered = customers.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone or email…"
          className="w-full rounded-xl border border-ink-border bg-ink-soft px-4 py-2.5 text-sm text-cream placeholder-cream/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const isLoyal = c.totalBookings >= 5;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className="card-base p-5 text-left hover:border-accent/50 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/30 text-accent font-display">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                {isLoyal && (
                  <Badge tone="accent">
                    <Crown size={10} />
                    Loyal
                  </Badge>
                )}
              </div>
              <p className="font-display text-lg truncate">{c.name}</p>
              <p className="text-xs text-cream/55 mt-0.5">
                +{normalisePhone(c.phone)}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-cream/45">
                  {c.totalBookings} booking{c.totalBookings === 1 ? "" : "s"}
                </span>
                <span className="font-display text-base gradient-text">
                  {formatK(c.lifetimeSpend)}
                </span>
              </div>
              {c.lastVisit && (
                <p className="text-[10px] uppercase tracking-wider text-cream/35 mt-2">
                  Last visit: {format(new Date(c.lastVisit), "d MMM yyyy")}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <Modal open onClose={() => setActive(null)} title={active.name} size="lg">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/30 text-accent font-display text-2xl">
                {active.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-2xl">{active.name}</p>
                <p className="text-sm text-cream/50">
                  Customer since {format(new Date(active.id), "MMM yyyy")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total bookings" value={active.totalBookings.toString()} />
              <Stat
                label="Completed"
                value={active.completedBookings.toString()}
              />
              <Stat
                label="Lifetime spend"
                value={formatK(active.lifetimeSpend)}
              />
            </div>

            <div className="space-y-2">
              <Detail icon={Phone} label="Phone">
                +{normalisePhone(active.phone)}
              </Detail>
              {active.email && (
                <Detail icon={Mail} label="Email">{active.email}</Detail>
              )}
              {active.address && (
                <Detail icon={MapPin} label="Address">{active.address}</Detail>
              )}
            </div>

            <div>
              <p className="label-eyebrow mb-3">Booking history</p>
              {loadingHistory ? (
                <p className="text-sm text-cream/45">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-cream/45">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-ink-line bg-ink-soft px-4 py-3 flex items-center gap-3 text-sm"
                    >
                      <div className="text-center shrink-0 w-14">
                        <p className="text-xs text-cream/45">
                          {format(new Date(h.scheduledAt), "d MMM")}
                        </p>
                        <p className="text-[10px] text-cream/40">
                          {format(new Date(h.scheduledAt), "EEE")}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{h.serviceName}</p>
                        <p className="text-xs text-cream/45">
                          {h.bookingRef} · {h.type === "home" ? "Home" : "In-shop"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={statusTone(h.status)}>
                          {h.status}
                        </Badge>
                        <p className="text-xs text-cream/45 mt-1">
                          {formatK(h.totalNgwee)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-soft p-4">
      <p className="text-[10px] uppercase tracking-wider text-cream/40">
        {label}
      </p>
      <p className="font-display text-xl mt-1">{value}</p>
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
    <div className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-card border border-ink-border text-accent shrink-0">
        <Icon size={12} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-cream/40">
          {label}
        </p>
        <p className="text-sm truncate">{children}</p>
      </div>
    </div>
  );
}

