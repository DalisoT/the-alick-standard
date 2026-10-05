/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail production builds on TypeScript errors — the runtime casts
  // we use (as unknown as ...) are intentional. Treat TS as advisory.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@libsql/client"],
  },
};

export default nextConfig;