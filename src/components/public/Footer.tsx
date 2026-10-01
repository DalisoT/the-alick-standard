import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 sm:mt-32 border-t border-ink-line bg-ink-soft safe-bottom">
      <div className="container-x py-12 sm:py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo-320.webp"
                alt="THE ALICK STANDARD — More Than a Cut. It's the Standard."
                width={320}
                height={320}
                className="h-28 sm:h-36 w-auto"
              />
            </div>
            <p className="text-cream/60 max-w-md leading-relaxed">
              Premium barbering crafted for the modern gentleman. In-shop
              precision and home-service grooming, on your schedule.
            </p>
            <p className="label-eyebrow mt-6">More Than a Cut. It's the Standard.</p>
          </div>

          <div>
            <p className="label-eyebrow mb-4">Visit</p>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="/services" className="hover:text-accent">
                  Services & Prices
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-accent">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent">
                  About Alick
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="label-eyebrow mb-4">Connect</p>
            <ul className="space-y-2 text-sm text-cream/70">
              <li className="flex items-center gap-2">
                <MessageCircle size={14} className="text-accent" />
                WhatsApp Alick
              </li>
              <li className="flex items-center gap-2">
                <Instagram size={14} className="text-accent" />
                @thealickstandard
              </li>
              <li className="flex items-center gap-2">
                <Facebook size={14} className="text-accent" />
                The Alick Standard
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ink-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-cream/40">
          <p>© {new Date().getFullYear()} THE ALICK STANDARD. All rights reserved.</p>
          <p>Crafted in Lusaka · Powered by precision.</p>
        </div>
      </div>
    </footer>
  );
}