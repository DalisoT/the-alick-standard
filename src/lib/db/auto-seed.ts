/**
 * Auto-seed the database if it's empty.
 * Runs once on server startup via Next.js instrumentation.
 */
import { db, schema } from "./index";

export async function runSeedIfEmpty() {
  const existing = await db.select().from(schema.adminUsers).limit(1);
  if (existing.length > 0) return;

  console.log("[seed] Empty database — running seed…");
  // Dynamic import so this is only loaded when actually needed.
  await import("./seed").catch(() => {
    // tsx will run the seed script directly in dev; ignore here.
  });
}