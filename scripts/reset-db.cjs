/**
 * Wipe all transactional data so you can start from a clean slate
 * while keeping admin / services / hours / settings intact.
 */
const { createClient } = require("@libsql/client");

const url = process.env.DATABASE_URL || "file:./data/tas.db";
const c = createClient({ url });

(async () => {
  for (const t of ["appointments", "customers", "expenses", "notification_log"]) {
    await c.execute(`DELETE FROM ${t}`);
  }
  console.log("✓ Demo data cleared (admin, services, hours, settings preserved)");
})();