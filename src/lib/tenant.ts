/**
 * Barbero — tenant resolution (Node runtime only)
 *
 * Resolves which tenant a request belongs to from the Host header, then
 * exposes a `tenantDb()` helper for tenant-scoped queries. The pure
 * hostname-parsing logic lives in `./tenant-slug` (Edge-runtime safe);
 * the middleware uses that. This file is for server components and
 * API routes (Node runtime), which is why it imports the database.
 */

import { headers } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import {
  getTenantSlugFromHost,
  slugify,
  tenantCssVars,
  DEFAULT_BRANDING,
  PLATFORM_DOMAIN,
  APEX_HOSTS,
  type TenantBranding,
} from "./tenant-slug";

// Re-export Edge-safe helpers so existing imports keep working.
export {
  getTenantSlugFromHost,
  slugify,
  tenantCssVars,
  DEFAULT_BRANDING,
  PLATFORM_DOMAIN,
  APEX_HOSTS,
  type TenantBranding,
} from "./tenant-slug";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  branding: TenantBranding;
};

/**
 * Cached per-request tenant lookup. `cache()` dedupes across server
 * components in the same render so we only hit the DB once.
 */
export const getCurrentTenant = cache(async (): Promise<TenantContext | null> => {
  const h = await headers();
  const host = h.get("host");
  const slug = getTenantSlugFromHost(host);
  if (!slug) return null;

  const rows = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.status === "suspended" || row.status === "cancelled") return null;

  let branding: TenantBranding = { ...DEFAULT_BRANDING };
  try {
    if (row.brandingJson) {
      const parsed = JSON.parse(row.brandingJson);
      branding = { ...DEFAULT_BRANDING, ...parsed };
    }
  } catch {
    // ignore malformed JSON
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    plan: row.plan,
    branding,
  };
});

/** Hard guard — throws if no tenant context. */
export async function requireTenant(): Promise<TenantContext> {
  const t = await getCurrentTenant();
  if (!t) {
    throw new Error("Tenant context required for this page");
  }
  return t;
}

/** Check slug availability for new-tenant sign-up. */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  return rows.length === 0;
}