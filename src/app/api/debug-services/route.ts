import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    step: "init",
    activeColumnType: typeof schema.services.active,
    schemaActiveMode: (schema.services.active as any).config?.mode,
  };

  try {
    result.step = "before-query-all";
    const allServices = await db.select().from(schema.services);
    result.step = "after-query-all";
    result.allCount = allServices.length;
    result.allSample = allServices.slice(0, 2);

    result.step = "before-query-active";
    const activeServices = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.active, true))
      .orderBy(asc(schema.services.displayOrder));
    result.step = "after-query-active";
    result.activeCount = activeServices.length;

    result.ok = true;
    return NextResponse.json(result);
  } catch (err: any) {
    result.ok = false;
    result.step = "ERROR";
    result.errorName = err?.name;
    result.errorMessage = err?.message;
    result.errorStack = (err?.stack ?? "").split("\n").slice(0, 8).join("\n");
    result.causeName = err?.cause?.name;
    result.causeMessage = err?.cause?.message;
    return NextResponse.json(result, { status: 500 });
  }
}
