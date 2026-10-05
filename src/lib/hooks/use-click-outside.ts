"use client";
import * as React from "react";

/**
 * Close-on-outside-click + Escape-key handler.
 * Used by dropdowns (notification bell, mobile menu, etc.) that should
 * dismiss when the user taps anywhere outside.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   const [open, setOpen] = useState(false);
 *   useClickOutside(ref, () => setOpen(false), open);
 *   return <div ref={ref}>{open && <Menu />}</div>;
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
  enabled = true,
) {
  React.useEffect(() => {
    if (!enabled) return;

    function onPointerDown(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const target = event.target as Node | null;
      if (target && !el.contains(target)) {
        handler();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handler();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, handler, enabled]);
}