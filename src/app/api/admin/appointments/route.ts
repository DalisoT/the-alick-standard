import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";
import { isSlotBookable } from "@/lib/time-slots";
import { buildNotificationPayload, queueNotification } from "@/lib/notifications";
import { normalisePhone, shortRef } from "@/lib/utils";
import { liveBus, adminChannel } from "@/lib/live-bus";
import { format } from "date-fns";
import { minutesTo12Hour } from "@/lib/utils";

const Body = z.object({
  bookType: z.enum(["shop", "home"]),
  serviceId: z.string().min(1),
  scheduledAt: z.string(),
  customer: z.object({
    name: z.string().min(1).max(80),
    phone: z.string().min(8).max(20),
    address: z.string().nullable().optional(),
  }),
  customerNotes: z.string().nullable().optional(),
  source: z.enum(["walk_in", "whatsapp", "online"]).default("walk_in"),
  adminNotes: z.string().nullable().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "declined", "no_show"]).default("confirmed"),
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
  const { bookType, serviceId, scheduledAt, customer, customerNotes, source, adminNotes, status } =
    parsed.data;

  const service = (
    await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, serviceId))
      .limit(1)
  )[0];
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const slotDate = new Date(scheduledAt);
  if (Number.isNaN(slotDate.getTime())) {
    return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
  }

  // Allow walk-ins to override double-booking check if status is set directly;
  // otherwise validate. (Admin can override anyway via PATCH.)
  if (source !== "walk_in") {
    const ok = await isSlotBookable({
      slotStart: slotDate,
      durationMinutes: service.durationMinutes,
    });
    if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 409 });
  }

  const [settings] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);
  const travelFee = bookType === "home" ? settings?.defaultTravelFeeNgwee ?? 5000 : 0;
  const total = service.priceNgwee + travelFee;

  const phone = normalisePhone(customer.phone);
  const existing = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.phone, phone))
    .limit(1);

  let customerId: string;
  if (existing[0]) {
    customerId = existing[0].id;
  } else {
    customerId = nanoid(12);
    await db.insert(schema.customers).values({
      id: customerId,
      name: customer.name,
      phone,
      address: customer.address ?? null,
      totalBookings: 0,
      completedBookings: 0,
      lifetimeSpend: 0,
    });
  }

  const id = nanoid(12);
  let ref = shortRef();
  for (let i = 0; i < 5; i++) {
    const exists = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.bookingRef, ref))
      .limit(1);
    if (!exists[0]) break;
    ref = shortRef();
  }

  await db.insert(schema.appointments).values({
    id,
    bookingRef: ref,
    customerId,
    serviceId: service.id,
    type: bookType,
    scheduledAt: slotDate,
    durationMinutes: service.durationMinutes,
    status,
    address: customer.address ?? null,
    customerNotes: customerNotes ?? null,
    adminNotes: adminNotes ?? null,
    servicePriceNgwee: service.priceNgwee,
    travelFeeNgwee: travelFee,
    totalNgwee: total,
    source,
  });

  // notifications
  await queueNotification({
    appointmentId: id,
    type: status === "confirmed" ? "booking_confirmed" : "booking_received",
    recipient: phone,
    payload: await buildNotificationPayload(
      {
        id,
        bookingRef: ref,
        customerId,
        serviceId: service.id,
        type: bookType,
        scheduledAt: slotDate,
        durationMinutes: service.durationMinutes,
        status,
        address: customer.address ?? null,
        customerNotes: customerNotes ?? null,
        servicePriceNgwee: service.priceNgwee,
        travelFeeNgwee: travelFee,
        totalNgwee: total,
        adminNotes: adminNotes ?? null,
        source,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as schema.Appointment,
      { name: customer.name, phone },
      { name: service.name },
      status === "confirmed" ? "booking_confirmed" : "booking_received",
    ),
  });

  // Live push to admin feed
  liveBus.publish(adminChannel(), {
    type: "booking_received",
    title: source === "walk_in" ? "Walk-in booking" : "New booking",
    body: `${customer.name} · ${service.name} · ${format(slotDate, "EEE d MMM")} ${minutesTo12Hour(slotDate.getHours() * 60 + slotDate.getMinutes())}`,
    url: `/admin/appointments?id=${id}`,
    ref: ref,
    data: { appointmentId: id, bookingRef: ref, source },
  });

  return NextResponse.json({ ok: true, id, bookingRef: ref });
}