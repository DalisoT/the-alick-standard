"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatK, kwachaToNgwee, ngweeToKwacha } from "@/lib/utils";

interface Expense {
  id: string;
  amountNgwee: number;
  category: string;
  description: string;
  incurredAt: string;
}

const CATEGORIES = [
  { value: "supplies", label: "Supplies" },
  { value: "utilities", label: "Utilities" },
  { value: "marketing", label: "Marketing" },
  { value: "transport", label: "Transport" },
  { value: "rent", label: "Rent" },
  { value: "general", label: "General" },
];

export function ExpensesManager({ initial }: { initial: Expense[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Expense[]>(initial);
  const [draft, setDraft] = React.useState<Expense>({
    id: "draft",
    amountNgwee: 5000,
    category: "supplies",
    description: "",
    incurredAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add() {
    setError(null);
    if (!draft.description.trim()) {
      setError("Description required.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountNgwee: draft.amountNgwee,
          category: draft.category,
          description: draft.description,
          incurredAt: draft.incurredAt,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not add.");
        return;
      }
      setItems((arr) => [
        { ...draft, id: j.id },
        ...arr,
      ]);
      setDraft({
        id: "draft",
        amountNgwee: 5000,
        category: "supplies",
        description: "",
        incurredAt: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: Expense) {
    if (!confirm(`Delete "${e.description}"?`)) return;
    const r = await fetch(`/api/admin/expenses/${e.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "Could not delete.");
      return;
    }
    setItems((arr) => arr.filter((x) => x.id !== e.id));
    router.refresh();
  }

  const total = items.reduce((a, e) => a + e.amountNgwee, 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Add form */}
      <div className="card-base p-6">
        <p className="label-eyebrow mb-3">Add expense</p>
        <div className="grid gap-4 sm:grid-cols-12 items-end">
          <div className="sm:col-span-3">
            <Input
              type="number"
              step="0.01"
              label="Amount (K)"
              value={ngweeToKwacha(draft.amountNgwee)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, amountNgwee: kwachaToNgwee(e.target.value) }))
              }
            />
          </div>
          <div className="sm:col-span-3">
            <Select
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Input
              type="date"
              label="Date"
              value={draft.incurredAt}
              onChange={(e) => setDraft((d) => ({ ...d, incurredAt: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              label="Description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="What was it for?"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add} loading={saving}>
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="card-base p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-cream/45 uppercase tracking-wider">
            Total tracked (last 100)
          </p>
          <p className="font-display text-3xl text-amber-300 mt-1">
            {formatK(total)}
          </p>
        </div>
        <Badge tone="neutral">{items.length} entries</Badge>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="card-base p-8 text-center text-cream/45 text-sm">
          No expenses yet. Add one above to start tracking.
        </div>
      ) : (
        <div className="card-base overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-soft border-b border-ink-line">
              <tr className="text-left text-[10px] uppercase tracking-wider text-cream/40">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-ink-line last:border-0">
                  <td className="px-5 py-3 align-top">{e.incurredAt}</td>
                  <td className="px-5 py-3 align-top">
                    <Badge tone="neutral">
                      {CATEGORIES.find((c) => c.value === e.category)?.label ??
                        e.category}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 align-top text-cream/75">
                    {e.description || <span className="text-cream/40">—</span>}
                  </td>
                  <td className="px-5 py-3 align-top text-right font-display text-base">
                    {formatK(e.amountNgwee)}
                  </td>
                  <td className="px-5 py-3 align-top text-right">
                    <button
                      onClick={() => remove(e)}
                      className="text-cream/30 hover:text-red-300 transition"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}