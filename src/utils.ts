import type { Translations } from "./translations";

export function minutesToDisplay(minutes: number | null | undefined, t: Translations): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return t.minutes_format(h, m);
}

export function formatTime(isoString: unknown): string {
  if (!isoString || typeof isoString !== "string") return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(isoString);
  }
}

export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function slugToName(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
