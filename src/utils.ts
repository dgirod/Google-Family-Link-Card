import type { Translations } from "./translations";

const PACKAGE_ICON_MAP: Array<[string, string]> = [
  // Exact or substring matches — checked in order, first match wins
  ["facebook.orca",        "mdi:facebook-messenger"],
  ["facebook.katana",      "mdi:facebook"],
  ["facebook",             "mdi:facebook"],
  ["instagram",            "mdi:instagram"],
  ["whatsapp",             "mdi:whatsapp"],
  ["youtube",              "mdi:youtube"],
  ["spotify",              "mdi:spotify"],
  ["netflix",              "mdi:netflix"],
  ["twitch",               "mdi:twitch"],
  ["discord",              "mdi:discord"],
  ["snapchat",             "mdi:snapchat"],
  ["twitter",              "mdi:twitter"],
  ["reddit",               "mdi:reddit"],
  ["tiktok",               "mdi:music-note"],
  ["linkedin",             "mdi:linkedin"],
  ["pinterest",            "mdi:pinterest"],
  ["skype",                "mdi:skype"],
  ["microsoft.teams",      "mdi:microsoft-teams"],
  ["microsoft.outlook",    "mdi:microsoft-outlook"],
  ["microsoft.office.word","mdi:microsoft-word"],
  ["microsoft.office.excel","mdi:microsoft-excel"],
  ["microsoft.office.powerpoint","mdi:microsoft-powerpoint"],
  ["amazon",               "mdi:amazon"],
  ["minecraft",            "mdi:minecraft"],
  ["roblox",               "mdi:gamepad-variant"],
  ["zoom.video",           "mdi:video"],
  ["duolingo",             "mdi:school"],
  ["google.android.gm",   "mdi:gmail"],
  ["google.android.maps",  "mdi:google-maps"],
  ["google.android.chrome","mdi:google-chrome"],
  ["android.chrome",       "mdi:google-chrome"],
  ["google.android.calendar","mdi:calendar"],
  ["play.games",           "mdi:google-play"],
  ["vending",              "mdi:google-play"],
  ["google.android.apps.photos","mdi:image-multiple"],
  ["google.android.apps.tachyon","mdi:video"],
  ["google.android.GoogleCamera","mdi:camera"],
  ["camera",               "mdi:camera"],
  ["vlc",                  "mdi:play-circle"],
  ["telegram",             "mdi:send"],
  ["signal",               "mdi:message-lock"],
  ["gmail",                "mdi:gmail"],
  ["chrome",               "mdi:google-chrome"],
  ["google",               "mdi:google"],
];

export function packageToMdiIcon(pkg: string): string {
  if (!pkg) return "mdi:application";
  const lower = pkg.toLowerCase();
  for (const [key, icon] of PACKAGE_ICON_MAP) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return "mdi:application";
}

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
