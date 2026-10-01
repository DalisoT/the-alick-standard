import { PublicShell } from "@/components/public/PublicShell";
import { Award, Heart, MapPin } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="container-x py-16 sm:py-24">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <p className="label-eyebrow mb-3">About Alick</p>
            <h1 className="display-h1">
              A craftsperson, not just a barber.
            </h1>
            <p className="mt-6 text-lg text-cream/70 leading-relaxed">
              Alick Tembo built THE ALICK STANDARD on a simple belief: that
              every man deserves a grooming experience that respects his time,
              his standard, and his story. No rushed lines. No chatter you
              didn't ask for. Just consistent, premium craft.
            </p>
            <p className="mt-4 text-cream/65 leading-relaxed">
              Trained in classic barbering and modern line-up technique, Alick
              blends tradition with precision — hot towel shaves, sharp fades,
              sculpted beards. Every service is one-on-one. Every appointment
              is reserved.
            </p>
            <p className="mt-4 text-cream/65 leading-relaxed">
              Whether you come to the studio in Kabulonga or invite Alick to
              your home, hotel, or office, you get the same standard.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="card-base p-8">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-ink-card to-ink-soft border border-ink-border grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 grid-bg opacity-30" />
                <Image
                  src="/logo-640.webp"
                  alt="THE ALICK STANDARD"
                  width={640}
                  height={640}
                  className="relative w-full h-auto p-6"
                  priority
                />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { icon: Award, label: "Certified, classically trained" },
                  { icon: Heart, label: "One-on-one, never rushed" },
                  { icon: MapPin, label: "In-shop & home service" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 text-cream/75"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-ink-soft">
                      <Icon size={14} className="text-accent" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}