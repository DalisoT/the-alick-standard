import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-cream/5 text-cream/70 border border-cream/10",
  accent:
    "bg-accent/10 text-accent border border-accent/30",
  success:
    "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  warning:
    "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  danger: "bg-red-500/10 text-red-300 border border-red-500/30",
  info: "bg-sky-500/10 text-sky-300 border border-sky-500/30",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}