"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink/80 border-b border-ink-line safe-top">
      <div className="container-x flex h-14 sm:h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-accent/40 bg-ink-soft group-hover:border-accent transition shrink-0 overflow-hidden">
            <Image
              src="/mark-96.webp"
              alt="THE ALICK STANDARD"
              width={96}
              height={96}
              priority
              className="h-full w-full object-contain p-0.5"
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base sm:text-lg text-cream tracking-tight">
              THE ALICK STANDARD
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-accent/80 mt-0.5">
              Premium Grooming
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm tracking-wide transition",
                pathname === item.href
                  ? "text-accent"
                  : "text-cream/70 hover:text-cream",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/admin/login" className="btn-ghost text-sm">
            Barber
          </Link>
          <Link href="/book" className="btn-primary text-sm py-2.5 px-5">
            Book Now
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden rounded-full p-2 text-cream hover:bg-cream/5"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink-line bg-ink-soft">
          <div className="container-x py-4 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "py-3 text-base border-b border-ink-line",
                  pathname === item.href
                    ? "text-accent"
                    : "text-cream/80",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/admin/login"
                className="btn-secondary text-sm py-2.5"
              >
                Barber Login
              </Link>
              <Link href="/book" className="btn-primary text-sm py-2.5">
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}