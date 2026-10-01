import { PublicShell } from "@/components/public/PublicShell";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { BookingForm } from "@/components/booking/BookingForm";
import { formatK } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookHomePage() {
  const [services, [settings]] = await Promise.all([
    db
      .select()
      .from(schema.services)
      .where(eq(schema.services.active, true))
      .orderBy(asc(schema.services.displayOrder)),
    db
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, "singleton"))
      .limit(1),
  ]);

  return (
    <PublicShell>
      <section className="container-x py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <p className="label-eyebrow mb-1">Home Service</p>
            <p className="text-cream/85">
              Alick comes to your location with full setup. A flat travel
              fee of{" "}
              <span className="font-display text-accent">
                {formatK(settings?.defaultTravelFeeNgwee ?? 5000)}
              </span>{" "}
              applies and is shown before you confirm.
            </p>
          </div>
          <BookingForm
            bookType="home"
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              durationMinutes: s.durationMinutes,
              priceNgwee: s.priceNgwee,
              type: s.type as "shop" | "home" | "both",
            }))}
            defaultTravelFeeNgwee={settings?.defaultTravelFeeNgwee ?? 5000}
            businessPhone={settings?.shopPhone ?? ""}
          />
        </div>
      </section>
    </PublicShell>
  );
}