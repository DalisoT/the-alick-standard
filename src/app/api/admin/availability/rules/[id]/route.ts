import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(24 * 60),
  endMinutes: z.number().int().min(0).max(24 * 60),
  active: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  if (parsed.data.endMinutes <= parsed.data.startMinutes) {
    return NextResponse.json(
      { error: "End must be after start." },
      { status: 400 },
    );
  }
  let id = params.id;
  // If the rule doesn't exist yet (missing-* sentinel), create it
  if (id.startsWith("missing-")) {
    id = nanoid(12);
    await db.insert(schema.availabilityRules).values({
      id,
      dayOfWeek: parsed.data.dayOfWeek,
      startMinutes: parsed.data.startMinutes,
      endMinutes: parsed.data.endMinutes,
      active: parsed.data.active,
    });
    return NextResponse.json({ ok: true, id });
  }

  await db
    .update(schema.availabilityRules)
    .set({
      startMinutes: parsed.data.startMinutes,
      endMinutes: parsed.data.endMinutes,
      active: parsed.data.active,
    })
    .where(eq(schema.availabilityRules.id, params.id));
  return NextResponse.json({ ok: true });
}