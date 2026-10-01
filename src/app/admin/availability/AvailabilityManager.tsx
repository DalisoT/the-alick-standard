"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/utils";

interface Rule {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  active: boolean;
}

interface Block {
  id: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  reason: string;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AvailabilityManager({
  rules,
  blocks,
}: {
  rules: Rule[];
  blocks: Block[];
}) {
  const router = useRouter();
  const [ruleState, setRuleState] = React.useState<Rule[]>(rules);
  const [blockState, setBlockState] = React.useState<Block[]>(blocks);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function saveRule(r: Rule) {
    setError(null);
    setSavingId(r.id);
    try {
      const resp = await fetch(`/api/admin/availability/rules/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: r.dayOfWeek,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
          active: r.active,
        }),
      });
      const j = await resp.json();
      if (!resp.ok) {
        setError(j.error || "Save failed.");
        return;
      }
      if (j.id) {
        setRuleState((arr) =>
          arr.map((x) => (x.id === r.id ? { ...x, id: j.id } : x)),
        );
      }
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function createBlock() {
    setError(null);
    try {
      const resp = await fetch(`/api/admin/availability/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          startMinutes: 540,
          endMinutes: 1080,
          reason: "Unavailable",
        }),
      });
      const j = await resp.json();
      if (!resp.ok) {
        setError(j.error || "Could not add block.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError("Network error.");
    }
  }

  async function removeBlock(b: Block) {
    try {
      const resp = await fetch(`/api/admin/availability/blocks/${b.id}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const j = await resp.json();
        setError(j.error || "Delete failed.");
        return;
      }
      setBlockState((arr) => arr.filter((x) => x.id !== b.id));
      router.refresh();
    } catch {
      setError("Network error.");
    }
  }

  function updateRule(id: string, key: keyof Rule, value: any) {
    setRuleState((arr) =>
      arr.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );
  }

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section>
        <h2 className="font-display text-2xl mb-4">Weekly schedule</h2>
        <div className="space-y-3">
          {ruleState.map((r) => (
            <div
              key={r.id}
              className="card-base p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 sm:w-48">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) =>
                      updateRule(r.id, "active", e.target.checked)
                    }
                    className="rounded border-ink-border bg-ink-soft accent-accent"
                  />
                  <span className="font-display text-lg">
                    {dayNames[r.dayOfWeek]}
                  </span>
                </label>
                {r.active ? (
                  <Badge tone="success">Open</Badge>
                ) : (
                  <Badge tone="neutral">Closed</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 flex-1">
                <Input
                  type="time"
                  value={minutesToHHMM(r.startMinutes)}
                  onChange={(e) =>
                    updateRule(r.id, "startMinutes", hhmmToMinutes(e.target.value))
                  }
                  disabled={!r.active}
                  className="max-w-[140px]"
                />
                <span className="text-cream/40">→</span>
                <Input
                  type="time"
                  value={minutesToHHMM(r.endMinutes)}
                  onChange={(e) =>
                    updateRule(r.id, "endMinutes", hhmmToMinutes(e.target.value))
                  }
                  disabled={!r.active}
                  className="max-w-[140px]"
                />
              </div>
              <Button
                size="sm"
                onClick={() => saveRule(r)}
                loading={savingId === r.id}
                disabled={!r.active}
              >
                <Save size={14} />
                Save
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl">Days off & blocks</h2>
            <p className="text-cream/55 text-xs mt-1">
              Block out holidays, personal time, or one-off half-days.
            </p>
          </div>
          <Button size="sm" onClick={createBlock}>
            <Plus size={14} />
            Add block
          </Button>
        </div>
        {blockState.length === 0 ? (
          <div className="card-base p-8 text-center text-cream/45 text-sm">
            No blocks scheduled. The shop is fully open by default.
          </div>
        ) : (
          <div className="space-y-3">
            {blockState.map((b) => (
              <div
                key={b.id}
                className="card-base p-5 grid gap-4 sm:grid-cols-12 items-end"
              >
                <div className="sm:col-span-3">
                  <Input
                    type="date"
                    label="Date"
                    value={b.date}
                    onChange={(e) =>
                      setBlockState((arr) =>
                        arr.map((x) =>
                          x.id === b.id ? { ...x, date: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="time"
                    label="Start"
                    value={minutesToHHMM(b.startMinutes)}
                    onChange={(e) =>
                      setBlockState((arr) =>
                        arr.map((x) =>
                          x.id === b.id
                            ? { ...x, startMinutes: hhmmToMinutes(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="time"
                    label="End"
                    value={minutesToHHMM(b.endMinutes)}
                    onChange={(e) =>
                      setBlockState((arr) =>
                        arr.map((x) =>
                          x.id === b.id
                            ? { ...x, endMinutes: hhmmToMinutes(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Reason"
                    value={b.reason}
                    onChange={(e) =>
                      setBlockState((arr) =>
                        arr.map((x) =>
                          x.id === b.id ? { ...x, reason: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="e.g. Personal day"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const resp = await fetch(
                        `/api/admin/availability/blocks/${b.id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(b),
                        },
                      );
                      const j = await resp.json();
                      if (!resp.ok) setError(j.error || "Save failed.");
                      else router.refresh();
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeBlock(b)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}