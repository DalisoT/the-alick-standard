"use client";
import * as React from "react";
import Image from "next/image";

/**
 * Registers the service worker and shows an in-app install banner
 * when the browser fires the `beforeinstallprompt` event.
 *
 * Also asks the user once for native notification permission so the
 * live alert system can fire even when the tab isn't focused.
 */
export function PWARegister() {
  const [installEvent, setInstallEvent] = React.useState<any>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [notifAsked, setNotifAsked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip PWA bits in dev — HMR + SW don't mix well.
    if (process.env.NODE_ENV !== "production") return;

    // ── Service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] SW registration failed", err));
    }

    // ── Install prompt
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("appinstalled", onInstalled);

    // ── Notification permission (one-shot)
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !notifAsked
    ) {
      // Defer to first user gesture so we don't trigger browser block.
      const ask = () => {
        setNotifAsked(true);
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("pointerdown", ask);
        window.removeEventListener("keydown", ask);
      };
      window.addEventListener("pointerdown", ask, { once: true });
      window.addEventListener("keydown", ask, { once: true });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [notifAsked]);

  async function install() {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  }

  if (!installEvent) return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:max-w-sm z-50 animate-floatIn">
      <div className="card-base p-4 shadow-luxury flex items-center gap-3">
        <Image
          src="/mark-96.webp"
          alt=""
          width={96}
          height={96}
          className="h-12 w-12 rounded-xl border border-accent/30 object-contain p-1 bg-ink-soft"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm">Install THE ALICK STANDARD</p>
          <p className="text-xs text-cream/55 mt-0.5">
            Add to home screen for one-tap booking & live alerts.
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={install}
            className="rounded-full bg-accent text-ink text-xs font-medium px-3 py-1.5"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[10px] uppercase tracking-wider text-cream/45 hover:text-cream px-3 py-0.5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}