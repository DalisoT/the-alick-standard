import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isSlotBookable } from "@/lib/time-slots";
import { nanoid } from "nanoid";
import { z } from "zod";
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
    name: z.string().min(2).max(80),
    phone: z.string().min(8).max(20),
    address: z.string().nullable().optional(),
  }),
  customerNotes: z.string().max(500).nullable().optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { bookType, serviceId, scheduledAt, customer, customerNotes } =
    parsed.data;

  const service = (
    await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, serviceId))
      .limit(1)
  )[0];
  if (!service || !service.active) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 404 });
  }
  if (service.type !== "both" && service.type !== bookType) {
    return NextResponse.json(
      { error: `This service is only available in-shop.` },
      { status: 400 },
    );
  }
  if (bookType === "home" && (!customer.address || customer.address.length < 5)) {
    return NextResponse.json(
      { error: "Address is required for home service." },
      { status: 400 },
    );
  }

  const slotDate = new Date(scheduledAt);
  if (Number.isNaN(slotDate.getTime())) {
    return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
  }

  const slot = await isSlotBookable({
    slotStart: slotDate,
    durationMinutes: service.durationMinutes,
  });
  if (!slot.ok) {
    return NextResponse.json({ error: slot.reason }, { status: 409 });
  }

  const [settings] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);
  const travelFee =
    bookType === "home" ? settings?.defaultTravelFeeNgwee ?? 5000 : 0;
  const total = service.priceNgwee + travelFee;

  // Find or create customer
  const phone = normalisePhone(customer.phone);
  const existingCustomers = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.phone, phone))
    .limit(1);

  let customerId: string;
  let created = false;
  if (existingCustomers[0]) {
    customerId = existingCustomers[0].id;
    // Optionally update address
    if (customer.address && !existingCustomers[0].address) {
      await db
        .update(schema.customers)
        .set({ address: customer.address })
        .where(eq(schema.customers.id, customerId));
    }
  } else {
    customerId = nanoid(12);
    created = true;
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

  const appointmentId = nanoid(12);
  let bookingRef = shortRef();
  // Ensure uniqueness (paranoid)
  for (let i = 0; i < 5; i++) {
    const exists = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.bookingRef, bookingRef))
      .limit(1);
    if (!exists[0]) break;
    bookingRef = shortRef();
  }

  await db.insert(schema.appointments).values({
    id: appointmentId,
    bookingRef,
    customerId,
    serviceId: service.id,
    type: bookType,
    scheduledAt: slotDate,
    durationMinutes: service.durationMinutes,
    status: "pending",
    address: customer.address ?? null,
    customerNotes: customerNotes ?? null,
    servicePriceNgwee: service.priceNgwee,
    travelFeeNgwee: travelFee,
    totalNgwee: total,
    source: "online",
  });

  // Notifications (queued for future WhatsApp integration)
  const payload = await buildNotificationPayload(
    {
      id: appointmentId,
      bookingRef,
      customerId,
      serviceId: service.id,
      type: bookType,
      scheduledAt: slotDate,
      durationMinutes: service.durationMinutes,
      status: "pending",
      address: customer.address ?? null,
      customerNotes: customerNotes ?? null,
      servicePriceNgwee: service.priceNgwee,
      travelFeeNgwee: travelFee,
      totalNgwee: total,
      adminNotes: null,
      source: "online",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as schema.Appointment,
    { name: customer.name, phone },
    { name: service.name },
    "booking_received",
  );
  await queueNotification({
    appointmentId,
    type: "booking_received",
    recipient: phone,
    payload,
  });

  // Live push to any admin dashboard listening right now
  liveBus.publish(adminChannel(), {
    type: "booking_received",
    title: "New booking request",
    body: `${customer.name} · ${service.name} · ${format(slotDate, "EEE d MMM")} ${minutesTo12Hour(slotDate.getHours() * 60 + slotDate.getMinutes())}`,
    url: `/admin/appointments?id=${appointmentId}`,
    ref: bookingRef,
    data: {
      appointmentId,
      bookingRef,
      customerName: customer.name,
      serviceName: service.name,
      status: "pending",
      type: bookType,
    },
  });

  return NextResponse.json({
    ok: true,
    bookingRef,
    appointmentId,
    createdCustomer: created,
  });
}