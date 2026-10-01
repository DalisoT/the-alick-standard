import { db, schema } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { ServicesManager } from "./ServicesManager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const services = await db
    .select()
    .from(schema.services)
    .orderBy(asc(schema.services.displayOrder));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Catalogue</p>
        <h1 className="font-display text-4xl">Services & Prices</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Edit the menu shown to customers. Changes apply instantly.
        </p>
      </div>

      <ServicesManager
        initial={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          priceNgwee: s.priceNgwee,
          type: s.type as "shop" | "home" | "both",
          active: !!s.active,
          displayOrder: s.displayOrder,
        }))}
      />
    </div>
  );
}