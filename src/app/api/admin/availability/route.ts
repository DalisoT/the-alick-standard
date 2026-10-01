import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().min(0).max(24 * 60),
  endMinutes: z.number().int().min(0).max(24 * 60),
  reason: z.string().max(120).default(""),
});

export async function POST(req: NextRequest) {
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
  const id = nanoid(12);
  await db.insert(schema.availabilityBlocks).values({
    id,
    date: parsed.data.date,
    startMinutes: parsed.data.startMinutes,
    endMinutes: parsed.data.endMinutes,
    reason: parsed.data.reason,
  });
  return NextResponse.json({ ok: true, id });
}