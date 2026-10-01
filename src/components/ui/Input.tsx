"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] uppercase tracking-[0.2em] text-cream/60"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-ink-border bg-ink-soft px-4 py-3 text-cream placeholder-cream/40 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
            error && "border-red-500/50 focus:border-red-500",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-cream/40">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] uppercase tracking-[0.2em] text-cream/60"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-ink-border bg-ink-soft px-4 py-3 text-cream placeholder-cream/40 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[96px] resize-none",
            error && "border-red-500/50 focus:border-red-500",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-cream/40">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, hint, error, id, children, ...props },
    ref,
  ) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] uppercase tracking-[0.2em] text-cream/60"
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            "w-full appearance-none rounded-xl border border-ink-border bg-ink-soft px-4 py-3 text-cream transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
            error && "border-red-500/50 focus:border-red-500",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {hint && !error && (
          <p className="text-xs text-cream/40">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";