import { PublicShell } from "@/components/public/PublicShell";
import { db, schema } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import Link from "next/link";
import {
  Scissors,
  Sparkles,
  Crown,
  Home as HomeIcon,
  CalendarDays,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatK, minutesTo12Hour } from "@/lib/utils";
import { addDays, startOfDay } from "date-fns";
import Image from "next/image";

// Render at build time, revalidate every 60s. Avoids hitting Turso on every
// request — important because Vercel cold starts + libsql native binary load
// can exceed the function execution budget on Hobby plan.
export const revalidate = 60;

/* ─── Hardcoded fallbacks ─────────────────────────────────────────
 * Guarantees the homepage ALWAYS renders. If the DB is unreachable or
 * slow, the page shows these values instead of 500ing. */
const FALLBACK_SERVICES = [
  { id: "fb-classic-haircut", name: "Classic Haircut", description: "Precision scissor + clipper cut, tailored line-up, hot towel finish.", durationMinutes: 45, priceNgwee: 12000, type: "both" as const, active: 1, displayOrder: 1 },
  { id: "fb-beard-sculpt", name: "Beard Sculpt", description: "Shape, line and condition. Hot towel, oil treatment, sharp edges.", durationMinutes: 30, priceNgwee: 8000, type: "both" as const, active: 1, displayOrder: 2 },
  { id: "fb-hot-towel-shave", name: "Hot Towel Shave", description: "Traditional straight-razor shave with steamed towels and balm.", durationMinutes: 45, priceNgwee: 10000, type: "both" as const, active: 1, displayOrder: 3 },
  { id: "fb-the-standard", name: "The Standard", description: "Haircut + beard sculpt + black mask. Our signature full reset.", durationMinutes: 75, priceNgwee: 18000, type: "both" as const, active: 1, displayOrder: 4 },
  { id: "fb-line-up", name: "Line-Up & Edge", description: "Crisp hairline, beard line and neck cleanup between full cuts.", durationMinutes: 20, priceNgwee: 6000, type: "both" as const, active: 1, displayOrder: 5 },
  { id: "fb-kids-cut", name: "Kids Cut", description: "Clean, patient cut for the young gentlemen (under 12).", durationMinutes: 30, priceNgwee: 8000, type: "shop" as const, active: 1, displayOrder: 6 },
  { id: "fb-black-mask", name: "Black Mask Treatment", description: "Deep-cleanse peel-off mask for face and neck.", durationMinutes: 20, priceNgwee: 7000, type: "both" as const, active: 1, displayOrder: 7 },
];

const FALLBACK_TRAVEL_FEE_NGWEE = 5000;

export default async function HomePage() {
  // Defensive: each DB query falls back independently. The page always returns 200.
  let travelFeeNgwee = FALLBACK_TRAVEL_FEE_NGWEE;
  let services: typeof FALLBACK_SERVICES = FALLBACK_SERVICES;
  let nextLabel = "Booking opening soon";

  try {
    const settingsRows = await db
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, "singleton"))
      .limit(1);
    if (settingsRows[0]) {
      travelFeeNgwee = settingsRows[0].defaultTravelFeeNgwee ?? FALLBACK_TRAVEL_FEE_NGWEE;
    }
  } catch (err) {
    console.error("[home] settings query failed:", err);
  }

  try {
    const liveServices = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.active, true))
      .orderBy(asc(schema.services.displayOrder));
    if (liveServices.length > 0) {
      services = liveServices as typeof FALLBACK_SERVICES;
      console.log(`[home] using ${liveServices.length} live services`);
    } else {
      console.log(`[home] DB returned 0 services, using fallback`);
    }
  } catch (err) {
    console.error("[home] services query failed, using fallback:", err);
  }

  try {
    const dow = new Date().getDay();
    const rulesRows = await db
      .select()
      .from(schema.availabilityRules)
      .where(
        and(
          eq(schema.availabilityRules.dayOfWeek, dow),
          eq(schema.availabilityRules.active, true),
        ),
      )
      .limit(1);
    const rulesRow = rulesRows[0];
    if (rulesRow) {
      const now = new Date();
      const today = startOfDay(now);
      let target = today;
      if (rulesRow.startMinutes <= now.getHours() * 60 + now.getMinutes()) {
        target = addDays(today, 1);
      }
      nextLabel = `Next opening: ${target.toLocaleDateString("en-GB", {
        weekday: "long",
      })} · ${minutesTo12Hour(rulesRow.startMinutes)}`;
    }
  } catch (err) {
    console.error("[home] availability query failed:", err);
  }

  const featured = services.slice(0, 4);

  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="container-x relative pt-12 pb-20 sm:pt-20 sm:pb-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <Badge tone="accent" className="mb-6">
                <Sparkles size={12} />
                Lusaka · Premium Barbering
              </Badge>
              <h1 className="display-h1 text-balance">
                More than a cut.
                <br />
                <span className="gradient-text italic">It&apos;s the standard.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-cream/70 leading-relaxed">
                Alick Tembo crafts a grooming experience that respects your
                time and your standard. Book in-shop precision, or have Alick
                come to you.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link href="/book" className="btn-primary text-base">
                  Book Your Appointment
                  <ArrowRight size={18} />
                </Link>
                <Link href="/services" className="btn-secondary">
                  View Services & Prices
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-3 text-sm text-cream/60">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-accent text-accent -mr-1"
                    />
                  ))}
                </div>
                <span>
                  Trusted by Lusaka&apos;s most discerning gentlemen.
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="card-base p-8 relative overflow-hidden">
                  <div className="absolute -top-px left-0 right-0 h-px bg-hairline" />
                  <p className="label-eyebrow">Quick Book</p>
                  <h3 className="mt-3 font-display text-2xl text-cream">
                    Reserve in under a minute.
                  </h3>
                  <p className="mt-2 text-sm text-cream/60">
                    {nextLabel}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Link
                      href="/book/shop"
                      className="rounded-xl border border-ink-border bg-ink-soft p-4 hover:border-accent transition group"
                    >
                      <Scissors
                        size={18}
                        className="text-accent mb-3 -rotate-45"
                      />
                      <p className="font-medium text-cream">In-Shop</p>
                      <p className="text-xs text-cream/50 mt-1">
                        Kabulonga studio
                      </p>
                    </Link>
                    <Link
                      href="/book/home"
                      className="rounded-xl border border-ink-border bg-ink-soft p-4 hover:border-accent transition group"
                    >
                      <HomeIcon size={18} className="text-accent mb-3" />
                      <p className="font-medium text-cream">Home Service</p>
                      <p className="text-xs text-cream/50 mt-1">
                        We come to you
                      </p>
                    </Link>
                  </div>

                  <div className="hairline-thin mt-6 -mx-8" />
                  <div className="mt-4 flex items-center gap-2 text-xs text-cream/50">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Real-time availability
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full border border-accent/20" />
                <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full border border-accent/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES STRIP */}
      <section className="container-x py-20">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <p className="label-eyebrow mb-3">Signature Services</p>
            <h2 className="display-h2 max-w-xl">
              Crafted for the modern gentleman.
            </h2>
          </div>
          <Link
            href="/services"
            className="hidden sm:inline-flex items-center gap-2 text-sm text-accent hover:text-accent-soft"
          >
            Full menu
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <div
              key={s.id}
              className="card-base p-6 hover:border-accent/60 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-ink-soft">
                  <Scissors size={16} className="text-accent -rotate-45" />
                </div>
                <Badge tone="accent">
                  {s.durationMinutes} min
                </Badge>
              </div>
              <h3 className="mt-5 font-display text-xl">{s.name}</h3>
              <p className="mt-2 text-sm text-cream/55 leading-relaxed line-clamp-2">
                {s.description}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-display text-2xl gradient-text">
                  {formatK(s.priceNgwee)}
                </span>
                <span className="text-xs text-cream/40 uppercase tracking-wider">
                  from
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-x py-20 border-t border-ink-line">
        <div className="text-center mb-16">
          <p className="label-eyebrow mb-3">How It Works</p>
          <h2 className="display-h2 max-w-2xl mx-auto">
            Four steps. No friction.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { n: "01", icon: Scissors, title: "Choose Service", text: "Haircut, beard, shave, or the full Standard." },
            { n: "02", icon: CalendarDays, title: "Pick a Time", text: "Real-time availability — book what you see." },
            { n: "03", icon: HomeIcon, title: "In-Shop or Home", text: "Choose your location. Clear pricing, no surprises." },
            { n: "04", icon: Crown, title: "Show Up", text: "Confirmation, reminder, and the best cut in Lusaka." },
          ].map((step) => (
            <div key={step.n} className="card-base p-6 relative">
              <span className="absolute top-4 right-5 font-mono text-xs text-accent/50">
                {step.n}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 border border-accent/30">
                <step.icon size={20} className="text-accent" />
              </div>
              <h3 className="mt-5 font-display text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-cream/55 leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TRAVEL FEE TRANSPARENCY */}
      <section className="container-x py-20">
        <div className="card-base p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <div className="grid gap-10 md:grid-cols-2 items-center relative">
            <div>
              <Badge tone="accent" className="mb-4">
                Home Service
              </Badge>
              <h2 className="display-h2">
                Convenience, priced clearly.
              </h2>
              <p className="mt-4 text-cream/65 leading-relaxed">
                Book Alick at your home, office, hotel or event. You&apos;ll always
                see the travel fee before you confirm — no surprises, no
                haggling.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="rounded-xl border border-ink-line bg-ink-soft px-5 py-4">
                  <p className="text-xs text-cream/40 uppercase tracking-wider">
                    Travel Fee
                  </p>
                  <p className="font-display text-2xl gradient-text">
                    {formatK(travelFeeNgwee)}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-line bg-ink-soft px-5 py-4">
                  <p className="text-xs text-cream/40 uppercase tracking-wider">
                    Coverage
                  </p>
                  <p className="font-display text-2xl">Greater Lusaka</p>
                </div>
              </div>
              <Link href="/book/home" className="btn-primary mt-8 inline-flex">
                Book Home Service
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-ink-card via-ink-soft to-ink border border-ink-border relative overflow-hidden">
                <div className="absolute inset-0 grid-bg opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center p-10">
                  <Image
                    src="/logo-480.webp"
                    alt="THE ALICK STANDARD"
                    width={480}
                    height={480}
                    className="w-full h-auto drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="label-eyebrow mb-4">Reserve Your Time</p>
          <h2 className="display-h2">
            Your next cut is one tap away.
          </h2>
          <p className="mt-4 text-cream/60">
            Booking takes less than 60 seconds. Choose your service, your time,
            and whether you&apos;d like to come in or have Alick come to you.
          </p>
          <Link
            href="/book"
            className="btn-primary mt-8 inline-flex text-base px-8 py-4"
          >
            Start Booking
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}