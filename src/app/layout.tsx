import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegister } from "@/components/pwa/PWARegister";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "THE ALICK STANDARD — Premium Barber & Grooming",
    template: "%s · THE ALICK STANDARD",
  },
  description:
    "Book your appointment with Alick Tembo — premium barbering, in-shop and home-service grooming across Lusaka.",
  applicationName: "THE ALICK STANDARD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TAS",
  },
  openGraph: {
    title: "THE ALICK STANDARD",
    description: "More Than a Cut. It's the Standard.",
    type: "website",
    images: ["/icon-512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "THE ALICK STANDARD",
    description: "More Than a Cut. It's the Standard.",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Schema bootstrap is handled by src/instrumentation.ts

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ink text-cream font-sans antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}