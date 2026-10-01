"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, AlertCircle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatK, kwachaToNgwee, ngweeToKwacha } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceNgwee: number;
  type: "shop" | "home" | "both";
  active: boolean;
  displayOrder: number;
}

export function ServicesManager({ initial }: { initial: Service[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Service[]>(initial);
  const [savingId, setSavingId] = React.useState<string | "new" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function update<K extends keyof Service>(id: string, key: K, value: Service[K]) {
    setItems((arr) =>
      arr.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    );
  }

  async function save(s: Service) {
    setError(null);
    setSavingId(s.id);
    try {
      const r = await fetch(`/api/admin/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Save failed.");
        return;
      }
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function createNew() {
    setError(null);
    setSavingId("new");
    try {
      const r = await fetch(`/api/admin/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New service",
          description: "",
          durationMinutes: 30,
          priceNgwee: 5000,
          type: "both",
          active: true,
          displayOrder: items.length + 1,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not create.");
        return;
      }
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function remove(s: Service) {
    if (!confirm(`Delete "${s.name}"? This is irreversible.`)) return;
    setSavingId(s.id);
    try {
      const r = await fetch(`/api/admin/services/${s.id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not delete.");
        return;
      }
      setItems((arr) => arr.filter((x) => x.id !== s.id));
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {items.map((s) => (
        <div key={s.id} className="card-base p-5">
          <div className="flex items-start gap-3 mb-4">
            <GripVertical size={16} className="text-cream/30 mt-1" />
            <div className="flex-1 grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Input
                  label="Name"
                  value={s.name}
                  onChange={(e) => update(s.id, "name", e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Price (K)"
                  type="number"
                  step="0.01"
                  value={ngweeToKwacha(s.priceNgwee)}
                  onChange={(e) =>
                    update(
                      s.id,
                      "priceNgwee",
                      kwachaToNgwee(e.target.value),
                    )
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Duration (min)"
                  type="number"
                  value={s.durationMinutes}
                  onChange={(e) =>
                    update(
                      s.id,
                      "durationMinutes",
                      Number(e.target.value),
                    )
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Select
                  label="Type"
                  value={s.type}
                  onChange={(e) =>
                    update(s.id, "type", e.target.value as any)
                  }
                >
                  <option value="both">In-shop & home</option>
                  <option value="shop">In-shop only</option>
                  <option value="home">Home only</option>
                </Select>
              </div>
              <div className="sm:col-span-3 flex items-end">
                <label className="flex items-center gap-2 text-sm py-3">
                  <input
                    type="checkbox"
                    checked={s.active}
                    onChange={(e) =>
                      update(s.id, "active", e.target.checked)
                    }
                    className="rounded border-ink-border bg-ink-soft accent-accent"
                  />
                  Active
                </label>
              </div>
              <div className="sm:col-span-12">
                <Textarea
                  label="Description"
                  value={s.description}
                  onChange={(e) =>
                    update(s.id, "description", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-ink-line">
            <div className="flex items-center gap-3 text-xs text-cream/40">
              <span>Order: {s.displayOrder}</span>
              <Badge tone={s.active ? "success" : "neutral"}>
                {s.active ? "Live" : "Hidden"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => remove(s)}
                disabled={savingId === s.id}
              >
                <Trash2 size={14} />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={() => save(s)}
                loading={savingId === s.id}
              >
                <Save size={14} />
                Save
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button onClick={createNew} loading={savingId === "new"} size="lg">
        <Plus size={16} />
        Add service
      </Button>
    </div>
  );
}