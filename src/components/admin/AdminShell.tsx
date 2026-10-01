"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLiveFeed } from "@/components/notifications/AdminLiveFeed";

interface AdminShellProps {
  displayName: string;
  username: string;
  children: React.ReactNode;
}

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
  { href: "/admin/calendar", label: "Calendar", icon: Clock },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/services", label: "Services", icon: Scissors },
  { href: "/admin/availability", label: "Availability", icon: Clock },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ displayName, username, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-ink">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-ink-line bg-ink-soft sticky top-0 h-screen">
        <SidebarContent
          pathname={pathname}
          displayName={displayName}
          username={username}
          onLogout={logout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-ink-soft border-r border-ink-line flex flex-col">
            <SidebarContent
              pathname={pathname}
              displayName={displayName}
              username={username}
              onLogout={logout}
              loggingOut={loggingOut}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-ink/80 backdrop-blur-xl border-b border-ink-line h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-full p-2 text-cream/80 hover:bg-cream/5"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 font-display text-base"
          >
            <span className="relative h-7 w-7 rounded-full border border-accent/40 overflow-hidden">
              <Image
                src="/mark-96.webp"
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-contain p-0.5"
              />
            </span>
            THE ALICK STANDARD
          </Link>
        </header>

        <main className="flex-1 min-w-0">{children}</main>

        <AdminLiveFeed />
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  displayName,
  username,
  onLogout,
  loggingOut,
  onClose,
}: {
  pathname: string;
  displayName: string;
  username: string;
  onLogout: () => void;
  loggingOut: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 border-b border-ink-line">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <span className="relative h-9 w-9 rounded-full border border-accent/40 bg-ink shrink-0 overflow-hidden">
            <Image
              src="/mark-96.webp"
              alt="THE ALICK STANDARD"
              width={96}
              height={96}
              className="h-full w-full object-contain p-0.5"
            />
          </span>
          <div className="leading-tight">
            <p className="font-display text-base">TAS Admin</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-accent/80">
              {displayName}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition group",
                active
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-cream/70 hover:text-cream hover:bg-cream/5 border border-transparent",
              )}
            >
              <item.icon size={16} className={active ? "text-accent" : ""} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-line p-4 space-y-3">
        <div>
          <p className="text-sm text-cream font-medium">{displayName}</p>
          <p className="text-xs text-cream/40">@{username}</p>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-cream/70 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          <LogOut size={14} />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );
}