import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert ngwee (integer) → Kwacha decimal string e.g. 7500 → "75.00" */
export function ngweeToKwacha(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0.00";
  const kwacha = value / 100;
  return kwacha.toFixed(2);
}

/** Format ngwee as "K 75.00" or "K 1,250.00" */
export function formatK(value: number | null | undefined): string {
  const kwacha = ngweeToKwacha(value);
  const [intPart, decPart] = kwacha.split(".");
  const formatted = Number(intPart).toLocaleString("en-US");
  return `K ${formatted}.${decPart}`;
}

export function kwachaToNgwee(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Short booking reference like "TAS-7H3K" */
export function shortRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TAS-";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesTo12Hour(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad2(m)} ${period}`;
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isZambianPhone(s: string): boolean {
  // Accepts 0977000000, +260977000000, 260977000000
  const cleaned = s.replace(/[\s\-+]/g, "");
  return /^260\d{9}$/.test(cleaned) || /^(0)?[97]\d{8}$/.test(cleaned);
}

export function normalisePhone(s: string): string {
  const cleaned = s.replace(/[\s\-+]/g, "");
  if (cleaned.startsWith("260")) return cleaned;
  if (cleaned.startsWith("0")) return `260${cleaned.slice(1)}`;
  return `260${cleaned}`;
}