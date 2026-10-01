import { db, schema } from "@/lib/db";
import { eq, asc, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AvailabilityManager } from "./AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .orderBy(asc(schema.availabilityRules.dayOfWeek));

  // ensure 7 rows always
  const ruleMap = new Map(rules.map((r) => [r.dayOfWeek, r]));
  const fullRules = Array.from({ length: 7 }, (_, i) => {
    const r = ruleMap.get(i);
    return (
      r ?? {
        id: `missing-${i}`,
        dayOfWeek: i,
        startMinutes: 540,
        endMinutes: 1080,
        active: i !== 0,
      }
    );
  });

  const blocks = await db
    .select()
    .from(schema.availabilityBlocks)
    .where(gte(schema.availabilityBlocks.date, new Date().toISOString().slice(0, 10)))
    .orderBy(asc(schema.availabilityBlocks.date));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Working Hours</p>
        <h1 className="font-display text-4xl">Availability</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Set the standard weekly schedule and block out specific days or
          hours when you're unavailable.
        </p>
      </div>

      <AvailabilityManager
        rules={fullRules.map((r) => ({
          id: r.id,
          dayOfWeek: r.dayOfWeek,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
          active: !!r.active,
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          date: b.date,
          startMinutes: b.startMinutes,
          endMinutes: b.endMinutes,
          reason: b.reason,
        }))}
      />
    </div>
  );
}