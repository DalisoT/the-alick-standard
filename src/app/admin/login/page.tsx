import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-ink-line">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="relative h-10 w-10 rounded-full border border-accent/40 bg-ink shrink-0 overflow-hidden">
            <Image
              src="/mark-96.webp"
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-contain p-0.5"
            />
          </span>
          <span className="font-display text-lg">THE ALICK STANDARD</span>
        </Link>

        <div className="relative">
          <p className="label-eyebrow mb-4">Barber Dashboard</p>
          <h1 className="font-display text-5xl leading-tight">
            Manage your craft,
            <br />
            <span className="gradient-text italic">in one place.</span>
          </h1>
          <p className="mt-5 text-cream/60 max-w-md leading-relaxed">
            Appointments, customers, revenue, availability — everything you
            need to run THE ALICK STANDARD with precision.
          </p>
        </div>

        <p className="relative text-xs text-cream/40">
          Alick Tembo · Premium Barbering
        </p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <span className="relative h-10 w-10 rounded-full border border-accent/40 bg-ink shrink-0 overflow-hidden">
              <Image
                src="/mark-96.webp"
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-contain p-0.5"
              />
            </span>
            <span className="font-display text-lg">THE ALICK STANDARD</span>
          </div>

          <p className="label-eyebrow mb-3">Sign in</p>
          <h2 className="font-display text-3xl mb-2">Welcome back, Alick.</h2>
          <p className="text-cream/60 mb-8 text-sm">
            Enter your credentials to access the dashboard.
          </p>

          <LoginForm />

          <div className="mt-8 rounded-xl border border-ink-line bg-ink-soft/50 p-4 text-xs text-cream/50">
            <p className="font-medium text-cream/80 mb-1">First time?</p>
            Run <code className="px-1.5 py-0.5 rounded bg-ink font-mono text-accent">npm run db:seed</code> to create the admin account if it doesn't exist.
          </div>
        </div>
      </div>
    </div>
  );
}