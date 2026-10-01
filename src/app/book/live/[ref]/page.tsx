import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PublicShell } from "@/components/public/PublicShell";
import { CustomerLiveStatus } from "@/components/notifications/CustomerLiveStatus";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LiveBookingPage({
  params,
}: {
  params: { ref: string };
}) {
  const ref = params.ref.toUpperCase();
  const appt = (
    await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.bookingRef, ref))
      .limit(1)
  )[0];
  if (!appt) notFound();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, appt.customerId))
    .limit(1);
  const [service] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.id, appt.serviceId))
    .limit(1);

  return (
    <PublicShell>
      <section className="container-x py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full overflow-hidden border border-accent/40 mb-4 bg-ink-soft">
              <Image
                src="/mark-96.webp"
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <p className="label-eyebrow mb-2">Booking {appt.bookingRef}</p>
            <h1 className="font-display text-3xl sm:text-4xl">
              Watch it live.
            </h1>
            <p className="text-cream/55 mt-2 text-sm">
              This page updates in real time as Alick reviews and confirms your booking.
              Keep it open.
            </p>
          </div>

          <CustomerLiveStatus
            initial={{
              id: appt.id,
              bookingRef: appt.bookingRef,
              status: appt.status,
              type: appt.type,
              scheduledAt: appt.scheduledAt.toISOString(),
              durationMinutes: appt.durationMinutes,
              totalNgwee: appt.totalNgwee,
              travelFeeNgwee: appt.travelFeeNgwee,
              servicePriceNgwee: appt.servicePriceNgwee,
              address: appt.address,
              customerName: customer?.name ?? "Customer",
              customerPhone: customer?.phone ?? "",
              serviceName: service?.name ?? "Service",
            }}
          />
        </div>
      </section>
    </PublicShell>
  );
}