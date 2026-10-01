"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { kwachaToNgwee, ngweeToKwacha } from "@/lib/utils";

interface Settings {
  businessName: string;
  tagline: string;
  shopAddress: string;
  shopPhone: string;
  whatsappNumber: string;
  defaultTravelFeeNgwee: number;
  slotIntervalMinutes: number;
  notificationsEnabled: boolean;
  notifyOnBookingReceived: boolean;
  notifyOnBookingConfirmed: boolean;
  notifyOnBookingCancelled: boolean;
  notifyOnAppointmentReminder: boolean;
  notifyOnAppointmentCompleted: boolean;
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = React.useState<Settings>(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((cur) => ({ ...cur, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Save failed.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex gap-2 text-sm text-emerald-300">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>Settings saved.</span>
        </div>
      )}

      <section className="card-base p-6 space-y-4">
        <h2 className="font-display text-xl">Brand</h2>
        <Input
          label="Business name"
          value={s.businessName}
          onChange={(e) => update("businessName", e.target.value)}
        />
        <Input
          label="Tagline"
          value={s.tagline}
          onChange={(e) => update("tagline", e.target.value)}
        />
      </section>

      <section className="card-base p-6 space-y-4">
        <h2 className="font-display text-xl">Shop details</h2>
        <Textarea
          label="Shop address"
          value={s.shopAddress}
          onChange={(e) => update("shopAddress", e.target.value)}
          rows={2}
        />
        <Input
          label="Shop phone"
          value={s.shopPhone}
          onChange={(e) => update("shopPhone", e.target.value)}
          placeholder="+260 977 000 000"
        />
        <Input
          label="WhatsApp number (digits only, with country code)"
          value={s.whatsappNumber}
          onChange={(e) => update("whatsappNumber", e.target.value)}
          placeholder="260977000000"
          hint="Used for the 'Message Alick on WhatsApp' button on the customer confirmation page."
        />
      </section>

      <section className="card-base p-6 space-y-4">
        <h2 className="font-display text-xl">Booking rules</h2>
        <Input
          label="Home-service travel fee (K)"
          type="number"
          step="0.01"
          value={ngweeToKwacha(s.defaultTravelFeeNgwee)}
          onChange={(e) =>
            update("defaultTravelFeeNgwee", kwachaToNgwee(e.target.value))
          }
          hint="Shown to customers before they confirm a home service booking."
        />
        <Select
          label="Time-slot interval"
          value={s.slotIntervalMinutes.toString()}
          onChange={(e) =>
            update("slotIntervalMinutes", parseInt(e.target.value, 10))
          }
        >
          <option value="15">Every 15 minutes</option>
          <option value="30">Every 30 minutes</option>
          <option value="60">Every hour</option>
        </Select>
      </section>

      <section className="card-base p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Notifications</h2>
            <p className="text-xs text-cream/50 mt-1">
              The system records each notification for future WhatsApp
              integration. Toggle which events should fire.
            </p>
          </div>
          <Badge tone={s.notificationsEnabled ? "success" : "neutral"}>
            {s.notificationsEnabled ? "Enabled" : "Paused"}
          </Badge>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
          <span className="text-sm">Enable notification logging</span>
          <input
            type="checkbox"
            checked={s.notificationsEnabled}
            onChange={(e) =>
              update("notificationsEnabled", e.target.checked)
            }
            className="rounded border-ink-border bg-ink-card accent-accent"
          />
        </label>

        <div className="space-y-2">
          {(
            [
              ["notifyOnBookingReceived", "Booking received"],
              ["notifyOnBookingConfirmed", "Booking confirmed"],
              ["notifyOnBookingCancelled", "Booking cancelled"],
              ["notifyOnAppointmentReminder", "Appointment reminder"],
              ["notifyOnAppointmentCompleted", "Appointment completed"],
            ] as [keyof Settings, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-soft px-4 py-3"
            >
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={s[key] as boolean}
                disabled={!s.notificationsEnabled}
                onChange={(e) =>
                  update(key, e.target.checked as any)
                }
                className="rounded border-ink-border bg-ink-card accent-accent"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={save} loading={saving} size="lg">
          <Save size={16} />
          Save settings
        </Button>
      </div>
    </div>
  );
}

import { Select } from "@/components/ui/Input";