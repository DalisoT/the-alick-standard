import { PublicShell } from "@/components/public/PublicShell";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { BookingForm } from "@/components/booking/BookingForm";

export const dynamic = "force-dynamic";

export default async function BookShopPage() {
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
          <BookingForm
            bookType="shop"
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              durationMinutes: s.durationMinutes,
              priceNgwee: s.priceNgwee,
              type: s.type as "shop" | "home" | "both",
            }))}
            defaultTravelFeeNgwee={0}
            businessPhone={settings?.shopPhone ?? ""}
          />
        </div>
      </section>
    </PublicShell>
  );
}