import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { computeDaySlots } from "@/lib/time-slots";
import { parseISO, format, eachDayOfInterval } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const serviceId = sp.get("serviceId");
  const date = sp.get("date");
  const start = sp.get("start");
  const end = sp.get("end");

  if (!serviceId) {
    return NextResponse.json(
      { error: "serviceId required" },
      { status: 400 },
    );
  }

  const service = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.id, serviceId))
    .limit(1);
  if (!service[0]) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Settings
  const [settings] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);
  const slotInterval = settings?.slotIntervalMinutes ?? 30;
  const duration = service[0].durationMinutes;

  // Single-date mode
  if (date) {
    const parsed = parseISO(date);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const day = await computeDaySlots({
      date: parsed,
      durationMinutes: duration,
      slotIntervalMinutes: slotInterval,
    });
    return NextResponse.json(day);
  }

  // Range mode (for calendar month overview)
  if (start && end) {
    const startD = parseISO(start);
    const endD = parseISO(end);
    if (
      Number.isNaN(startD.getTime()) ||
      Number.isNaN(endD.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid range" },
        { status: 400 },
      );
    }
    const days: Record<
      string,
      { isWorkingDay: boolean; hasSlots: boolean }
    > = {};
    const dayList = eachDayOfInterval({ start: startD, end: endD });
    for (const d of dayList) {
      const result = await computeDaySlots({
        date: d,
        durationMinutes: duration,
        slotIntervalMinutes: slotInterval,
      });
      days[format(d, "yyyy-MM-dd")] = {
        isWorkingDay: result.isWorkingDay,
        hasSlots: result.slots.some((s) => s.available),
      };
    }
    return NextResponse.json({ days });
  }

  return NextResponse.json(
    { error: "Provide date=YYYY-MM-DD or start & end=YYYY-MM-DD" },
    { status: 400 },
  );
}