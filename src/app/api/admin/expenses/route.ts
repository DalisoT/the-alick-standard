import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  amountNgwee: z.number().int().min(0),
  category: z.string().max(40).default("general"),
  description: z.string().max(300).default(""),
  incurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  const date = new Date(parsed.data.incurredAt);
  await db.insert(schema.expenses).values({
    id,
    amountNgwee: parsed.data.amountNgwee,
    category: parsed.data.category,
    description: parsed.data.description,
    incurredAt: date,
  });
  return NextResponse.json({ ok: true, id });
}