import { PublicShell } from "@/components/public/PublicShell";
import Link from "next/link";
import { Scissors, Home as HomeIcon, ArrowRight } from "lucide-react";

export default function BookIntroPage() {
  return (
    <PublicShell>
      <section className="container-x py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="label-eyebrow mb-3">Reserve Your Time</p>
          <h1 className="display-h1">Where will you be groomed?</h1>
          <p className="mt-4 text-lg text-cream/65">
            Choose your setting. You'll pick your service, date and time on
            the next step.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <Link
            href="/book/shop"
            className="card-base p-8 hover:border-accent transition group relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ink-soft mb-5">
                <Scissors size={20} className="text-accent -rotate-45" />
              </span>
              <h2 className="font-display text-3xl">In-Shop</h2>
              <p className="mt-2 text-cream/65 leading-relaxed">
                Visit Alick at the studio in Kabulonga, Lusaka. The full
                setup, the sharpest lines, the complete experience.
              </p>
              <div className="mt-6 flex items-center gap-2 text-accent group-hover:gap-3 transition-all">
                <span className="font-medium">Book In-Shop</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>

          <Link
            href="/book/home"
            className="card-base p-8 hover:border-accent transition group relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ink-soft mb-5">
                <HomeIcon size={20} className="text-accent" />
              </span>
              <h2 className="font-display text-3xl">Home Service</h2>
              <p className="mt-2 text-cream/65 leading-relaxed">
                Alick comes to you — your home, office, hotel or event.
                Same standard, with a transparent travel fee.
              </p>
              <div className="mt-6 flex items-center gap-2 text-accent group-hover:gap-3 transition-all">
                <span className="font-medium">Book Home Service</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-ink-line bg-ink-soft/50 p-6 text-sm text-cream/60">
          <p className="label-eyebrow mb-2 text-cream/70">A note from Alick</p>
          Every booking is reserved one-on-one. Please book only when you're
          confident you can make it. Rescheduling or cancelling is free up to
          4 hours before your appointment.
        </div>
      </section>
    </PublicShell>
  );
}