import { db, schema } from "@/lib/db";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import type { Appointment } from "@/lib/db/schema";
import { normalisePhone } from "@/lib/utils";

export type NotificationType =
  | "booking_received"
  | "booking_confirmed"
  | "booking_cancelled"
  | "appointment_reminder"
  | "appointment_completed";

/**
 * Record a notification that would have been sent to a customer.
 * The WhatsApp integration layer (added later) will read from
 * notification_log and dispatch accordingly.
 */
export async function queueNotification(args: {
  appointmentId: string | null;
  type: NotificationType;
  recipient: string;
  payload: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.notificationLog).values({
      id: nanoid(12),
      appointmentId: args.appointmentId,
      type: args.type,
      channel: "whatsapp",
      recipient: normalisePhone(args.recipient),
      payload: JSON.stringify(args.payload),
      status: "queued",
    });
  } catch (err) {
    // Notifications must never block booking flow.
    console.error("[notifications] queue failed:", err);
  }
}

export async function buildNotificationPayload(
  appt: Appointment,
  customer: { name: string; phone: string },
  service: { name: string },
  type: NotificationType,
) {
  const settings = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);
  const biz = settings[0];

  const lines: Record<NotificationType, string> = {
    booking_received: `Hi ${customer.name}! Your booking request with THE ALICK STANDARD has been received. Ref: ${appt.bookingRef}. We'll confirm shortly.`,
    booking_confirmed: `Hi ${customer.name}! Your appointment with THE ALICK STANDARD is CONFIRMED. Ref: ${appt.bookingRef}. See you then.`,
    booking_cancelled: `Hi ${customer.name}, your appointment with THE ALICK STANDARD (Ref: ${appt.bookingRef}) has been cancelled. Re-book anytime.`,
    appointment_reminder: `Hi ${customer.name}, this is a reminder of your appointment with THE ALICK STANDARD today. Ref: ${appt.bookingRef}.`,
    appointment_completed: `Thanks for choosing THE ALICK STANDARD, ${customer.name}! Hope you enjoyed the experience. Ref: ${appt.bookingRef}.`,
  };

  return {
    business: biz?.businessName ?? "THE ALICK STANDARD",
    message: lines[type],
    customer: { name: customer.name, phone: customer.phone },
    service: { name: service.name },
    appointment: {
      ref: appt.bookingRef,
      scheduledAt: appt.scheduledAt.toISOString(),
      type: appt.type,
    },
  };
}