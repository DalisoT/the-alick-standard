import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";

const Body = z.object({
  businessName: z.string().min(1).max(120),
  tagline: z.string().min(1).max(200),
  shopAddress: z.string().max(300).default(""),
  shopPhone: z.string().max(40).default(""),
  whatsappNumber: z.string().max(40).default(""),
  defaultTravelFeeNgwee: z.number().int().min(0),
  slotIntervalMinutes: z.number().int().min(5).max(120),
  notificationsEnabled: z.boolean(),
  notifyOnBookingReceived: z.boolean(),
  notifyOnBookingConfirmed: z.boolean(),
  notifyOnBookingCancelled: z.boolean(),
  notifyOnAppointmentReminder: z.boolean(),
  notifyOnAppointmentCompleted: z.boolean(),
});

export async function PUT(req: NextRequest) {
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
  const exists = (
    await db
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, "singleton"))
      .limit(1)
  )[0];
  if (exists) {
    await db
      .update(schema.businessSettings)
      .set(parsed.data)
      .where(eq(schema.businessSettings.id, "singleton"));
  } else {
    await db.insert(schema.businessSettings).values({
      id: "singleton",
      ...parsed.data,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [row] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);
  return NextResponse.json({ settings: row });
}