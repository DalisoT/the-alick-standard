"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Home as HomeIcon,
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { formatK, minutesTo12Hour, normalisePhone } from "@/lib/utils";
import { format } from "date-fns";
import { statusTone, labelStatus } from "@/lib/status";

interface Row {
  id: string;
  bookingRef: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  address: string | null;
  totalNgwee: number;
  source: string;
  customer: { id: string; name: string; phone: string };
  service: { id: string; name: string; durationMinutes: number };
}

interface ServiceLite {
  id: string;
  name: string;
  durationMinutes: number;
  priceNgwee: number;
}

export function AppointmentsTable({
  rows,
  services,
  openId,
  showNew,
}: {
  rows: Row[];
  services: ServiceLite[];
  openId?: string;
  showNew?: boolean;
}) {
  const [active, setActive] = React.useState<Row | null>(null);
  const [showWalkIn, setShowWalkIn] = React.useState(!!showNew);

  React.useEffect(() => {
    if (openId) {
      const r = rows.find((x) => x.id === openId);
      if (r) setActive(r);
    }
  }, [openId, rows]);

  return (
    <>
      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-soft border-b border-ink-line">
              <tr className="text-left text-[10px] uppercase tracking-wider text-cream/40">
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Service</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell text-right">
                  Total
                </th>
                <th className="px-5 py-3 font-medium w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-cream/45">
                    No appointments match this filter.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const when = new Date(r.scheduledAt);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setActive(r)}
                    className="border-b border-ink-line last:border-0 hover:bg-cream/[0.02] cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 align-top">
                      <p className="font-medium">
                        {format(when, "EEE d MMM")}
                      </p>
                      <p className="text-xs text-accent mt-0.5">
                        {minutesTo12Hour(
                          when.getHours() * 60 + when.getMinutes(),
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <p className="font-medium truncate max-w-[180px]">
                        {r.customer.name}
                      </p>
                      <p className="text-xs text-cream/40 mt-0.5">
                        {r.bookingRef}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 align-top hidden md:table-cell">
                      <p className="text-cream/80 truncate max-w-[160px]">
                        {r.service.name}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-cream/65 text-xs">
                        {r.type === "home" ? (
                          <>
                            <HomeIcon size={12} className="text-accent" />
                            Home
                          </>
                        ) : (
                          <>
                            <Scissors size={12} className="text-accent" />
                            In-shop
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <Badge tone={statusTone(r.status)}>
                        {labelStatus(r.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 align-top hidden sm:table-cell text-right">
                      <p className="font-display text-base">
                        {formatK(r.totalNgwee)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 align-top text-right">
                      <ArrowUpRight
                        size={14}
                        className="text-cream/30 inline"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <AppointmentDetail
          appt={active}
          onClose={() => setActive(null)}
        />
      )}

      {showWalkIn && (
        <WalkInModal
          services={services}
          onClose={() => setShowWalkIn(false)}
        />
      )}
    </>
  );
}

function AppointmentDetail({
  appt,
  onClose,
}: {
  appt: Row;
  onClose: () => void;
}) {
  const router = useRouter();
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function patch(payload: any, label: string) {
    setError(null);
    setUpdating(label);
    try {
      const r = await fetch(`/api/admin/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Update failed.");
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError("Network error.");
    } finally {
      setUpdating(null);
    }
  }

  const when = new Date(appt.scheduledAt);
  const phone = normalisePhone(appt.customer.phone);

  return (
    <>
      <Modal open onClose={onClose} title={`Booking ${appt.bookingRef}`} size="lg">
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 text-sm text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(appt.status)}>
              {labelStatus(appt.status)}
            </Badge>
            {appt.type === "home" && (
              <Badge tone="info">
                <HomeIcon size={10} />
                Home service
              </Badge>
            )}
            <Badge tone="neutral">Source: {appt.source.replace("_", " ")}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail icon={Calendar} label="Date">
              {format(when, "EEEE, d MMMM yyyy")}
            </Detail>
            <Detail icon={Clock} label="Time">
              {minutesTo12Hour(when.getHours() * 60 + when.getMinutes())} ·{" "}
              <span className="text-cream/55 text-sm">
                {appt.durationMinutes} min
              </span>
            </Detail>
            <Detail icon={User} label="Customer">
              <Link
                href={`/admin/customers?id=${appt.customer.id}`}
                className="hover:text-accent"
                onClick={onClose}
              >
                {appt.customer.name}
              </Link>
              <p className="text-xs text-cream/40 mt-0.5">+{phone}</p>
            </Detail>
            <Detail icon={Scissors} label="Service">
              {appt.service.name}
            </Detail>
            {appt.type === "home" && appt.address && (
              <div className="sm:col-span-2">
                <Detail icon={HomeIcon} label="Address">
                  {appt.address}
                </Detail>
              </div>
            )}
            <Detail icon={Clock} label="Total">
              <span className="font-display text-lg gradient-text">
                {formatK(appt.totalNgwee)}
              </span>
            </Detail>
          </div>

          <div className="border-t border-ink-line pt-5">
            <p className="label-eyebrow mb-3">Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {appt.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => patch({ status: "confirmed" }, "Confirm")}
                  loading={updating === "Confirm"}
                  disabled={!!updating}
                  className="!bg-emerald-500/15 !text-emerald-300 hover:!bg-emerald-500/25 border !border-emerald-500/30"
                >
                  <CheckCircle2 size={14} />
                  Confirm
                </Button>
              )}
              {["pending", "confirmed"].includes(appt.status) && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRescheduleOpen(true)}
                    disabled={!!updating}
                  >
                    <Calendar size={14} />
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => patch({ status: "cancelled" }, "Cancel")}
                    loading={updating === "Cancel"}
                    disabled={!!updating}
                  >
                    <XCircle size={14} />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => patch({ status: "no_show" }, "No-show")}
                    loading={updating === "No-show"}
                    disabled={!!updating}
                  >
                    <UserX size={14} />
                    No-show
                  </Button>
                </>
              )}
              {appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "declined" && (
                <Button
                  size="sm"
                  onClick={() => patch({ status: "completed" }, "Complete")}
                  loading={updating === "Complete"}
                  disabled={!!updating}
                >
                  <CheckCircle2 size={14} />
                  Mark completed
                </Button>
              )}
              {appt.status === "pending" && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => patch({ status: "declined" }, "Decline")}
                  loading={updating === "Decline"}
                  disabled={!!updating}
                >
                  Decline
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {rescheduleOpen && (
        <RescheduleModal
          apptId={appt.id}
          currentDate={when}
          durationMinutes={appt.durationMinutes}
          onClose={() => setRescheduleOpen(false)}
          onDone={() => {
            setRescheduleOpen(false);
            onClose();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RescheduleModal({
  apptId,
  currentDate,
  durationMinutes,
  onClose,
  onDone,
}: {
  apptId: string;
  currentDate: Date;
  durationMinutes: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = React.useState(
    format(currentDate, "yyyy-MM-dd"),
  );
  const [time, setTime] = React.useState(
    format(currentDate, "HH:mm"),
  );
  const [slots, setSlots] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // We don't have serviceId here directly — pass the appointment's existing
  // service via parent or fetch. To keep the modal simple, send a serviceId
  // dummy that matches the existing service. Easier: server-side fetch by id.
  const [serviceId, setServiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const r = await fetch(`/api/admin/appointments/${apptId}`);
      const j = await r.json();
      if (j?.appointment) setServiceId(j.appointment.serviceId);
    }
    load();
  }, [apptId]);

  React.useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      const r = await fetch(
        `/api/availability?serviceId=${serviceId}&date=${date}`,
      );
      const j = await r.json();
      if (cancelled) return;
      setSlots(j.slots ?? []);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [serviceId, date]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const iso = new Date(`${date}T${time}:00`).toISOString();
      const r = await fetch(`/api/admin/appointments/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: iso }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Reschedule failed.");
        return;
      }
      onDone();
    } catch (err) {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Reschedule appointment">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <Input
          type="date"
          label="New date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cream/60 mb-1.5">
            New time
          </p>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} fullWidth>
            Save new time
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function WalkInModal({
  services,
  onClose,
}: {
  services: ServiceLite[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [type, setType] = React.useState<"shop" | "home">("shop");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = React.useState(format(new Date(), "HH:mm"));
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name || !phone || !serviceId) {
      setError("Name, phone and service are required.");
      return;
    }
    setSubmitting(true);
    try {
      const iso = new Date(`${date}T${time}:00`).toISOString();
      const r = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookType: type,
          serviceId,
          scheduledAt: iso,
          customer: {
            name,
            phone,
            address: type === "home" ? address : null,
          },
          customerNotes: notes || null,
          source: "walk_in",
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not create.");
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New walk-in booking" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Walk-in name"
            required
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="097 700 0000"
            required
          />
          <Select
            label="Service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes}m)
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as "shop" | "home")}
          >
            <option value="shop">In-shop</option>
            <option value="home">Home service</option>
          </Select>
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="time"
            label="Time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        {type === "home" && (
          <Textarea
            label="Service address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
          />
        )}
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} fullWidth>
            Create walk-in
          </Button>
        </div>
      </div>
    </Modal>
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