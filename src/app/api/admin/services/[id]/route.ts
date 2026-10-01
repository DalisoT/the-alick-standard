import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(240).optional(),
  priceNgwee: z.number().int().min(0).optional(),
  type: z.enum(["shop", "home", "both"]).optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
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
  await db
    .update(schema.services)
    .set(parsed.data)
    .where(eq(schema.services.id, params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db
    .delete(schema.services)
    .where(eq(schema.services.id, params.id));
  return NextResponse.json({ ok: true });
}