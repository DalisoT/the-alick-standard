import { NextRequest, NextResponse } from "next/server";
import { db, schema, sqliteConn } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";
import { isSlotBookable } from "@/lib/time-slots";
import { buildNotificationPayload, queueNotification } from "@/lib/notifications";
import { liveBus, customerChannel, adminChannel } from "@/lib/live-bus";
import { format } from "date-fns";
import { minutesTo12Hour } from "@/lib/utils";

const Patch = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled", "declined", "no_show"])
    .optional(),
  scheduledAt: z.string().optional(),
  adminNotes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appt = (
    await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, params.id))
      .limit(1)
  )[0];
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ appointment: appt });
}

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
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = (
    await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, params.id))
      .limit(1)
  )[0];
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.scheduledAt) {
    const slotDate = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(slotDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const ok = await isSlotBookable({
      slotStart: slotDate,
      durationMinutes: existing.durationMinutes,
      excludeAppointmentId: existing.id,
    });
    if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 409 });
    updates.scheduledAt = slotDate;
  }
  if (parsed.data.adminNotes !== undefined) {
    updates.adminNotes = parsed.data.adminNotes;
  }
  updates.updatedAt = new Date();

  await db
    .update(schema.appointments)
    .set(updates)
    .where(eq(schema.appointments.id, params.id));

  // If status changed to completed, increment customer aggregates
  if (
    parsed.data.status === "completed" &&
    existing.status !== "completed"
  ) {
    await sqliteConn.execute({
      sql: `UPDATE customers SET total_bookings = total_bookings + 1, completed_bookings = completed_bookings + 1, lifetime_spend = lifetime_spend + ?, last_visit = ? WHERE id = ?`,
      args: [existing.totalNgwee, Date.now(), existing.customerId],
    });
  }

  // Notifications on status transitions
  const newStatus = parsed.data.status;
  if (newStatus && newStatus !== existing.status) {
    const customer = (
      await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, existing.customerId))
        .limit(1)
    )[0];
    const service = (
      await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.id, existing.serviceId))
        .limit(1)
    )[0];

    let notifType:
      | "booking_confirmed"
      | "booking_cancelled"
      | "appointment_completed"
      | null = null;
    if (newStatus === "confirmed" && existing.status === "pending") {
      notifType = "booking_confirmed";
    } else if (newStatus === "cancelled" || newStatus === "declined") {
      notifType = "booking_cancelled";
    } else if (newStatus === "completed") {
      notifType = "appointment_completed";
    }

    if (notifType && customer && service) {
      const fresh = (
        await db
          .select()
          .from(schema.appointments)
          .where(eq(schema.appointments.id, existing.id))
          .limit(1)
      )[0];
      await queueNotification({
        appointmentId: fresh.id,
        type: notifType,
        recipient: customer.phone,
        payload: await buildNotificationPayload(
          fresh,
          { name: customer.name, phone: customer.phone },
          { name: service.name },
          notifType,
        ),
      });

      // Live push to the customer's open confirmation page
      const titles = {
        booking_confirmed: "Booking confirmed",
        booking_cancelled: "Booking cancelled",
        appointment_completed: "Completed — thank you",
      } as const;
      const bodies = {
        booking_confirmed: `Hi ${customer.name}, your ${service.name} appointment is confirmed for ${format(fresh.scheduledAt, "EEE d MMM")} at ${minutesTo12Hour(fresh.scheduledAt.getHours() * 60 + fresh.scheduledAt.getMinutes())}.`,
        booking_cancelled: `Your booking ${existing.bookingRef} has been cancelled. Re-book anytime.`,
        appointment_completed: `Thanks for choosing THE ALICK STANDARD, ${customer.name}!`,
      } as const;
      liveBus.publish(customerChannel(existing.bookingRef), {
        type: notifType,
        title: titles[notifType],
        body: bodies[notifType],
        url: `/book/live/${existing.bookingRef}`,
        ref: existing.bookingRef,
        data: { status: newStatus, appointmentId: existing.id },
      });

      // And to the admin feed
      liveBus.publish(adminChannel(), {
        type: notifType,
        title: `${customer.name} — ${notifType.replace("_", " ")}`,
        body: `${service.name} · ${existing.bookingRef}`,
        url: `/admin/appointments?id=${existing.id}`,
        ref: existing.bookingRef,
        data: { status: newStatus, appointmentId: existing.id },
      });
    }
  }

  // Reschedule — even if status didn't change, notify both sides
  if (parsed.data.scheduledAt) {
    const fresh = (
      await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, existing.id))
        .limit(1)
    )[0];
    const customer = (
      await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, existing.customerId))
        .limit(1)
    )[0];
    if (customer) {
      const when = new Date(parsed.data.scheduledAt);
      const title = "Booking rescheduled";
      const body = `New time: ${format(when, "EEE d MMM")} at ${minutesTo12Hour(when.getHours() * 60 + when.getMinutes())}`;
      liveBus.publish(customerChannel(existing.bookingRef), {
        type: "booking_rescheduled",
        title,
        body,
        url: `/book/live/${existing.bookingRef}`,
        ref: existing.bookingRef,
        data: { scheduledAt: fresh.scheduledAt.toISOString(), status: fresh.status },
      });
      liveBus.publish(adminChannel(), {
        type: "booking_rescheduled",
        title: `${customer.name} — rescheduled`,
        body,
        url: `/admin/appointments?id=${existing.id}`,
        ref: existing.bookingRef,
        data: { scheduledAt: fresh.scheduledAt.toISOString() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(schema.appointments)
    .where(eq(schema.appointments.id, params.id));
  return NextResponse.json({ ok: true });
}