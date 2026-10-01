import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: schema.appointments.id,
      bookingRef: schema.appointments.bookingRef,
      scheduledAt: schema.appointments.scheduledAt,
      type: schema.appointments.type,
      status: schema.appointments.status,
      totalNgwee: schema.appointments.totalNgwee,
      serviceName: schema.services.name,
    })
    .from(schema.appointments)
    .leftJoin(
      schema.services,
      eq(schema.appointments.serviceId, schema.services.id),
    )
    .where(eq(schema.appointments.customerId, params.id))
    .orderBy(desc(schema.appointments.scheduledAt))
    .limit(50);

  return NextResponse.json({
    history: rows.map((r) => ({
      ...r,
      scheduledAt: r.scheduledAt.toISOString(),
    })),
  });
}