import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { CustomersManager } from "./CustomersManager";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const customers = await db
    .select()
    .from(schema.customers)
    .orderBy(desc(schema.customers.lastVisit));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">People</p>
        <h1 className="font-display text-4xl">Customers</h1>
        <p className="text-cream/55 mt-1 text-sm">
          {customers.length} total · {customers.filter((c) => c.totalBookings >= 2).length} returning
        </p>
      </div>

      <CustomersManager
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          totalBookings: c.totalBookings,
          completedBookings: c.completedBookings,
          lifetimeSpend: c.lifetimeSpend,
          lastVisit: c.lastVisit?.toISOString() ?? null,
        }))}
        openId={searchParams.id}
      />
    </div>
  );
}