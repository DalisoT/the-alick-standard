import { PublicShell } from "@/components/public/PublicShell";
import { db, schema } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { Scissors, Clock, Home as HomeIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatK } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.active, true))
    .orderBy(asc(schema.services.displayOrder));

  return (
    <PublicShell>
      <section className="container-x py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="label-eyebrow mb-3">Services & Pricing</p>
          <h1 className="display-h1">The full menu.</h1>
          <p className="mt-5 text-lg text-cream/65">
            Every service is crafted by Alick himself — no juniors, no rush,
            no compromises. Choose in-shop or home service at checkout.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="card-base p-6 sm:p-8 hover:border-accent/40 transition"
            >
              <div className="grid sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-7">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-ink-soft">
                      <Scissors size={14} className="text-accent -rotate-45" />
                    </span>
                    <h3 className="font-display text-2xl">{s.name}</h3>
                  </div>
                  <p className="text-cream/65 leading-relaxed">
                    {s.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-cream/55">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-accent" />
                      {s.durationMinutes} minutes
                    </span>
                    <span className="text-cream/30">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <HomeIcon size={12} className="text-accent" />
                      {s.type === "shop"
                        ? "In-shop only"
                        : s.type === "home"
                          ? "Home service only"
                          : "In-shop & home service"}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-5 sm:text-right">
                  <p className="font-display text-4xl gradient-text">
                    {formatK(s.priceNgwee)}
                  </p>
                  <p className="mt-1 text-xs text-cream/40 uppercase tracking-wider">
                    per service
                  </p>
                  <Link
                    href={`/book?service=${s.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-soft"
                  >
                    Book {s.name}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 card-base p-8 sm:p-12 bg-gradient-to-br from-ink-card to-ink-soft">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-display text-3xl">
                Home service adds a travel fee.
              </h3>
              <p className="mt-3 text-cream/65 leading-relaxed">
                Home service bookings include a flat travel fee to cover
                Alick's transit time. The fee is shown clearly at checkout,
                before you confirm.
              </p>
            </div>
            <div className="sm:text-right">
              <Link
                href="/book"
                className="btn-primary inline-flex text-base"
              >
                Start Booking
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}