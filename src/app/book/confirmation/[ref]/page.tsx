import { PublicShell } from "@/components/public/PublicShell";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatK, minutesTo12Hour, normalisePhone } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircle2, MessageCircle, Home as HomeIcon, MapPin, Calendar, Clock, User, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
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
  const [settings] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);

  const whatsappNumber = settings?.whatsappNumber || "260977000000";
  const phone = customer?.phone ?? "";
  const when = appt.scheduledAt;
  const isHome = appt.type === "home";

  const message = encodeURIComponent(
    `Hi Alick, I just booked an appointment.\n\nRef: ${appt.bookingRef}\nService: ${service?.name}\nDate: ${format(when, "EEE d MMM yyyy")} · ${minutesTo12Hour(when.getHours() * 60 + when.getMinutes())}\n${isHome ? `Location: ${appt.address}\n` : ""}Looking forward to it.`,
  );
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <PublicShell>
      <section className="container-x py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full overflow-hidden border border-accent/40 mb-5 bg-ink-soft">
              <Image
                src="/mark-192.webp"
                alt=""
                width={192}
                height={192}
                className="h-full w-full object-contain p-1"
              />
            </div>
            <p className="label-eyebrow mb-2">Booking Received</p>
            <h1 className="display-h1">You're on the books.</h1>
            <p className="mt-4 text-cream/65 max-w-md mx-auto">
              Alick has received your request and will confirm shortly via
              WhatsApp. Save your booking reference below.
            </p>
          </div>

          <div className="card-base p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="text-center pb-6 border-b border-dashed border-ink-line">
              <p className="label-eyebrow">Booking Reference</p>
              <p className="font-display text-5xl tracking-wider gradient-text mt-2">
                {appt.bookingRef}
              </p>
              <p className="text-xs text-cream/40 mt-2">
                Show this at the studio or quote it on WhatsApp.
              </p>
            </div>

            <div className="mt-6 divide-y divide-ink-line">
              <Detail icon={Calendar} label="Date">
                {format(when, "EEEE, d MMMM yyyy")}
              </Detail>
              <Detail icon={Clock} label="Time">
                {minutesTo12Hour(when.getHours() * 60 + when.getMinutes())} ·{" "}
                <span className="text-cream/55 text-sm">{service?.durationMinutes} min</span>
              </Detail>
              <Detail icon={User} label="Service">
                {service?.name}
              </Detail>
              <Detail icon={isHome ? HomeIcon : MapPin} label={isHome ? "Location" : "Studio"}>
                {isHome ? appt.address : "The studio, Kabulonga"}
              </Detail>
              <Detail icon={User} label="Customer">
                {customer?.name} · +{normalisePhone(phone)}
              </Detail>
            </div>

            <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <p className="label-eyebrow mb-3">Total Due</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-cream/65">{service?.name}</span>
                  <span>{formatK(appt.servicePriceNgwee)}</span>
                </div>
                {appt.travelFeeNgwee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-cream/65">Travel fee</span>
                    <span>{formatK(appt.travelFeeNgwee)}</span>
                  </div>
                )}
                <div className="hairline-thin my-2" />
                <div className="flex justify-between font-display text-2xl">
                  <span>Total</span>
                  <span className="gradient-text">
                    {formatK(appt.totalNgwee)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-cream/45">
                Pay after your appointment.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href={`/book/live/${appt.bookingRef}`} className="btn-primary">
              <Sparkles size={18} />
              Watch live
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <MessageCircle size={18} />
              WhatsApp Alick
            </a>
          </div>

          <div className="mt-8 rounded-xl border border-ink-line bg-ink-soft/50 p-5 text-sm text-cream/65">
            <p className="font-medium text-cream mb-2">What happens next</p>
            <ol className="space-y-1.5 list-decimal list-inside text-cream/55">
              <li>Alick reviews and confirms your booking on WhatsApp.</li>
              <li>You'll get a reminder on the day of your appointment.</li>
              <li>Pay after your service — no online payment required.</li>
            </ol>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<any>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-soft border border-ink-border text-accent shrink-0">
        <Icon size={14} />
      </span>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-cream/40">
          {label}
        </p>
        <p className="text-cream">{children}</p>
      </div>
    </div>
  );
}