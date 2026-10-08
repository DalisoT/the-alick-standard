/**
 * Barbero — middleware
 *
 * Resolves the tenant from the request's Host header. Two strategies run
 * together:
 *
 *   1. APEX domain (barbero.local, barbero.co.zm, localhost)  -> marketing site (passthrough)
 *   2. SUBDOMAIN (alicks-standard.barbero.local)               -> rewrite to /_tenant/[slug]/...
 *
 * For subdomain requests we also pre-load the tenant and stash it in a
 * request header so server components can read it without a DB hit per
 * request. (Server components still re-verify via getCurrentTenant(),
 * but the header avoids a roundtrip in the common path.)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getTenantSlugFromHost, PLATFORM_DOMAIN } from "@/lib/tenant-slug";

// Paths that should never be rewritten (assets, API, internal Next.js routes)
const PASSTHROUGH_PREFIXES = [
  "/_next",
  "/api",
  "/favicon",
  "/icon",
  "/mark",
  "/logo",
  "/apple-touch-icon",
  "/manifest",
  "/sw",
  "/static",
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host")?.toLowerCase() ?? null;

  // Always let framework assets + API routes through untouched
  if (PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const slug = getTenantSlugFromHost(host);

  // Apex or marketing site -> passthrough
  if (!slug) {
    // Optional: redirect www -> apex for cleaner URLs
    if (host === "www." + PLATFORM_DOMAIN) {
      const url = req.nextUrl.clone();
      url.host = PLATFORM_DOMAIN;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  // Tenant subdomain -> rewrite to /_tenant/[slug]/<original-path>
  // (The /_tenant segment is just a route group for clarity; pages
  // under app/_tenant/[slug]/ are tenant-scoped.)
  const url = req.nextUrl.clone();
  const newPath = `/_tenant/${slug}${pathname === "/" ? "" : pathname}${search}`;
  url.pathname = newPath;

  const res = NextResponse.rewrite(url);
  // Stash the slug for downstream code (auth, analytics, etc.)
  res.headers.set("x-barbero-tenant-slug", slug);
  return res;
}

export const config = {
  // Run on every request EXCEPT framework internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};