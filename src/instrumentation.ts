export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./lib/db/migrate");
    await ensureSchema();
    // Multi-tenant migration: add tenants, users, tenant_id to existing tables,
    // seed the default "alicks-standard" tenant. Idempotent.
    const { ensureMultitenantSchema } = await import("./lib/db/multitenant-migrate");
    await ensureMultitenantSchema();
    const { runSeedIfEmpty } = await import("./lib/db/auto-seed");
    await runSeedIfEmpty();
  }
}