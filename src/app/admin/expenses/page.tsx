import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { ExpensesManager } from "./ExpensesManager";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const expenses = await db
    .select()
    .from(schema.expenses)
    .orderBy(desc(schema.expenses.incurredAt))
    .limit(100);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Spend</p>
        <h1 className="font-display text-4xl">Expenses</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Track supplies, utilities, transport, marketing and other costs.
        </p>
      </div>
      <ExpensesManager
        initial={expenses.map((e) => ({
          id: e.id,
          amountNgwee: e.amountNgwee,
          category: e.category,
          description: e.description,
          incurredAt: e.incurredAt.toISOString().slice(0, 10),
        }))}
      />
    </div>
  );
}