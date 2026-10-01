export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./lib/db/migrate");
    await ensureSchema();
    const { runSeedIfEmpty } = await import("./lib/db/auto-seed");
    await runSeedIfEmpty();
  }
}