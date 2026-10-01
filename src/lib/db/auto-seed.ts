/**
 * Auto-seed the database if it's empty.
 * Runs once on server startup via Next.js instrumentation.
 *
 * On Vercel/Netlify/etc. this is the only place the seed happens — there
 * is no shell to run `npm run db:seed` in. Safe to call repeatedly: each
 * section only inserts when the relevant table is empty.
 */
import { db, schema } from "./index";
import { seedDefaults } from "./seed";

export async function runSeedIfEmpty() {
  try {
    const existing = await db.select().from(schema.adminUsers).limit(1);
    if (existing.length > 0) return;

    console.log("[seed] Empty database — seeding operating config…");
    const lines = await seedDefaults({
      quiet: false,
      adminUsername: process.env.ADMIN_USERNAME,
      adminPassword: process.env.ADMIN_PASSWORD,
      adminDisplayName: "Alick Tembo",
    });
    const inserted = lines.filter((l) => l.startsWith("✓"));
    console.log(`[seed] Done — ${inserted.length} sections inserted.`);
  } catch (err) {
    console.error("[seed] auto-seed failed (non-fatal):", err);
  }
}