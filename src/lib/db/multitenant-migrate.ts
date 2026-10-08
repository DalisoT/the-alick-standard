/**
 * Barbero — multi-tenant migration
 *
 * Idempotent. Safe to run multiple times. Backwards compatible with the
 * pre-multi-tenant TAS schema — old `admin_users` row is kept and re-pointed
 * to tenant #1 so existing sessions / cookies still work until users
 * re-login with Auth.js.
 *
 * Strategy:
 *   1. Create the `tenants` table if it doesn't exist (CREATE TABLE IF NOT EXISTS
 *      handles the case where the migration script runs before the new schema is
 *      in place).
 *   2. Insert a "default" tenant pointing at Alick's data — slug "alicks-standard".
 *   3. Add a nullable `tenant_id TEXT` column to every existing table.
 *   4. Backfill: set `tenant_id` to the default tenant id on every existing row.
 *   5. Re-create indexes for fast `WHERE tenant_id = ?` lookups.
 *
 * The first `tenants` row created here is treated as the system "default
 * tenant" — Alick's data — and gets `slug = "alicks-standard"`. When the
 * user goes to `alicks-standard.barbero.local` in Week 1 they see exactly
 * what they had at `the-alick-standard.vercel.app` today.
 */

import { sqliteConn, db, schema } from "./index";
import { nanoid } from "nanoid";

const DEFAULT_TENANT_ID = "tenant_alicks_standard";
const DEFAULT_TENANT_SLUG = "alicks-standard";
const DEFAULT_BRANDING = JSON.stringify({
  business_name: "THE ALICK STANDARD",
  tagline: "More Than a Cut. It's the Standard.",
  primary_color: "#c7a24b",
  accent_color: "#e6c887",
  currency: "ZMW",
  locale: "en-ZM",
  whatsapp_number: "260977000000",
});

/**
 * Idempotent check — does a table exist in this SQLite db?
 */
async function tableExists(name: string): Promise<boolean> {
  const r = await sqliteConn.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [name],
  });
  return r.rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  // PRAGMA table_info returns one row per column. Wrap in SELECT 1 because
  // PRAGMA can't be used in a subquery.
  const r = await sqliteConn.execute({
    sql: `SELECT 1 FROM pragma_table_info(?) WHERE name = ? LIMIT 1`,
    args: [table, column],
  });
  return r.rows.length > 0;
}

async function safeExec(sql: string): Promise<void> {
  try {
    await sqliteConn.execute(sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Ignore "duplicate column" / "table already exists" — these mean
    // the migration is already partially applied.
    if (
      msg.includes("duplicate column") ||
      msg.includes("already exists") ||
      msg.includes("no such column")
    ) {
      return;
    }
    throw err;
  }
}

export async function ensureMultitenantSchema(): Promise<void> {
  // 1. Tenants table — create from inline SQL so we don't depend on
  //    drizzle's table inference matching the actual db.
  await safeExec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      plan TEXT NOT NULL DEFAULT 'free',
      owner_user_id TEXT,
      branding_json TEXT NOT NULL DEFAULT '{}',
      onboarding_step TEXT NOT NULL DEFAULT 'created',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan_renews_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // 2. Default tenant — Alick
  const existing = await sqliteConn.execute({
    sql: "SELECT id FROM tenants WHERE slug = ?",
    args: [DEFAULT_TENANT_SLUG],
  });
  if (existing.rows.length === 0) {
    await sqliteConn.execute({
      sql: `INSERT INTO tenants (id, slug, name, status, plan, branding_json, onboarding_step)
            VALUES (?, ?, ?, 'active', 'pro', ?, 'complete')`,
      args: [DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG, "THE ALICK STANDARD", DEFAULT_BRANDING],
    });
    console.log("[multitenant] created default tenant 'alicks-standard'");
  } else {
    console.log("[multitenant] default tenant already exists");
  }

  // 3. Add tenant_id column to every existing table (idempotent)
  const tablesToScope = [
    "admin_users",
    "customers",
    "services",
    "availability_rules",
    "availability_blocks",
    "appointments",
    "business_settings",
    "expenses",
    "notification_log",
  ];

  for (const table of tablesToScope) {
    const exists = await tableExists(table);
    if (!exists) {
      // Table doesn't exist yet — likely a fresh install. ensureSchema() will
      // create it without tenant_id; that's fine, it will be empty.
      continue;
    }
    const hasCol = await columnExists(table, "tenant_id");
    if (!hasCol) {
      await safeExec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT`);
      // Index for fast tenant-scoped queries
      await safeExec(`CREATE INDEX IF NOT EXISTS ${table}_tenant_idx ON ${table}(tenant_id)`);
      console.log(`[multitenant] added tenant_id to ${table}`);
    }
  }

  // 4. Backfill tenant_id for all existing rows.
  // SQLite stores them as the new default tenant so Alick's data is scoped.
  for (const table of tablesToScope) {
    const exists = await tableExists(table);
    const hasCol = await columnExists(table, "tenant_id");
    if (!exists || !hasCol) continue;
    await safeExec(
      `UPDATE ${table} SET tenant_id = '${DEFAULT_TENANT_ID}' WHERE tenant_id IS NULL`,
    );
  }

  // 5. Bridge the legacy admin_users row into the new users table.
  // Alick's existing bcrypt-hashed password will keep working until he
  // re-verifies his email through the new auth flow.
  if (await tableExists("admin_users")) {
    const existingUser = await sqliteConn.execute({
      sql: "SELECT id, username FROM admin_users WHERE tenant_id = ? LIMIT 1",
      args: [DEFAULT_TENANT_ID],
    });
    if (existingUser.rows.length > 0) {
      const adminId = existingUser.rows[0].id as string;
      const adminName = existingUser.rows[0].username as string;
      const userExists = await sqliteConn.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: ["alick@barbero.local"],
      });
      if (userExists.rows.length === 0) {
        await sqliteConn.execute({
          sql: `INSERT INTO users (id, tenant_id, email, name, role, email_verified_at)
                VALUES (?, ?, ?, ?, 'owner', unixepoch() * 1000)`,
          args: [`user_alick_${nanoid(6)}`, DEFAULT_TENANT_ID, "alick@barbero.local", adminName],
        });
        // Link the tenant's owner_user_id to this new user
        await sqliteConn.execute({
          sql: "UPDATE tenants SET owner_user_id = (SELECT id FROM users WHERE email = ?) WHERE id = ?",
          args: ["alick@barbero.local", DEFAULT_TENANT_ID],
        });
        console.log(`[multitenant] bridged admin_users(${adminId}) -> users (owner of ${DEFAULT_TENANT_ID})`);
      }
    }
  }

  console.log("[multitenant] migration complete");
}

/**
 * One-shot CLI entry: `npx tsx src/lib/db/multitenant-migrate.ts`
 */
if (process.argv[1]?.includes("multitenant-migrate")) {
  ensureMultitenantSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}