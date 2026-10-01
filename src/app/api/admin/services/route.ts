import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  durationMinutes: z.number().int().min(5).max(240),
  priceNgwee: z.number().int().min(0),
  type: z.enum(["shop", "home", "both"]).default("both"),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
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
  const id = nanoid(12);
  await db.insert(schema.services).values({
    id,
    ...parsed.data,
    active: parsed.data.active ? true : false,
  });
  return NextResponse.json({ ok: true, id });
}