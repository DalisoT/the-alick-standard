/**
 * Barbero — pure tenant-slug utilities (Edge-runtime safe)
 *
 * This file has NO database imports and NO Node-only modules. The
 * middleware (src/middleware.ts) runs on the Edge runtime and can only
 * import from here. Server components may also import the same helpers.
 *
 * The DB-bound tenant lookup (getCurrentTenant etc.) lives in
 * src/lib/tenant.ts and is Node-only.
 */

export const APEX_HOSTS = new Set([
  "barbero.local",
  "barbero.co.zm",
  "barbero.localhost",
  "www.barbero.local",
  "www.barbero.co.zm",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

/** Platform domain — driven by NEXT_PUBLIC_PLATFORM_DOMAIN at build time. */
export const PLATFORM_DOMAIN: string =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "barbero.local";

/** Reserved subdomain slugs that should never resolve to a tenant. */
const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "static",
  "assets",
  "_next",
  "auth",
  "status",
  "docs",
  "blog",
  "app",
  "cdn",
]);

/**
 * Read the Host header and return the tenant slug, or null if the request
 * is for the marketing site (apex domain, reserved subdomain, or
 * malformed hostname).
 */
export function getTenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname) return null;

  if (APEX_HOSTS.has(hostname)) return null;
  if (hostname === PLATFORM_DOMAIN) return null;
  if (hostname === "www." + PLATFORM_DOMAIN) return null;

  const suffix = "." + PLATFORM_DOMAIN;
  if (!hostname.endsWith(suffix)) return null;

  let slug = hostname.slice(0, -suffix.length);
  if (slug.startsWith("www.")) slug = slug.slice(4);

  if (RESERVED_SLUGS.has(slug)) return null;

  // Slugs: 3-40 chars, lowercase letters / digits / hyphens, must start
  // and end with alphanumeric. This is the inverse of the slugify() output.
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return null;

  return slug;
}

/**
 * Convert a business name to a URL-safe slug.
 *   "Alick's Standard" -> "alicks-standard"
 *   "Cut & Shave"     -> "cut-shave"
 *   "  Hello World  "  -> "hello-world"
 */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u2018\u2019]/g, "") // smart quotes
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

/**
 * Brand-aware theme tokens — every page can pull these to render
 * tenant-specific CSS variables. Push to <body style={{...}}>.
 */
export type TenantBranding = {
  business_name?: string;
  tagline?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  currency?: string;
  locale?: string;
  whatsapp_number?: string;
};

export const DEFAULT_BRANDING: Required<Pick<TenantBranding, "primary_color" | "accent_color" | "currency" | "locale">> = {
  primary_color: "#c7a24b",
  accent_color: "#e6c887",
  currency: "ZMW",
  locale: "en-ZM",
};

export function tenantCssVars(branding: TenantBranding | undefined): Record<string, string> {
  const b = { ...DEFAULT_BRANDING, ...(branding || {}) };
  return {
    "--tenant-primary": b.primary_color,
    "--tenant-accent": b.accent_color,
    "--tenant-business-name": JSON.stringify(b.business_name || ""),
  };
}