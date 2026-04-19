type MinuteFormatter = (h: number, m: number) => string;

export interface Translations {
  screen_time_today: string;
  used: string;
  remaining: string;
  limit: string;
  no_limit: string;
  devices: string;
  lock: string;
  unlock: string;
  add_time: string;
  apps: string;
  bedtime: string;
  school_time: string;
  active: string;
  inactive: string;
  bonus_active: string;
  reset_bonus: string;
  from: string;
  to: string;
  limit_reached: string;
  min: string;
  of: string;
  schedules: string;
  today: string;
  with_limit: string;
  minutes_format: MinuteFormatter;
}

export const TRANSLATIONS: Record<string, Translations> = {
  en: {
    screen_time_today: "Screen Time Today",
    used: "Used",
    remaining: "Remaining",
    limit: "Daily Limit",
    no_limit: "No Limit",
    devices: "Devices",
    lock: "Lock",
    unlock: "Unlock",
    add_time: "Add Time",
    apps: "App Usage",
    bedtime: "Bedtime",
    school_time: "School Time",
    active: "Active",
    inactive: "Inactive",
    bonus_active: "Bonus active",
    reset_bonus: "Reset Bonus",
    from: "from",
    to: "to",
    limit_reached: "Limit reached",
    min: "min",
    of: "of",
    schedules: "Schedules",
    today: "Today",
    with_limit: "with time limit",
    minutes_format: (h, m) => (h > 0 ? `${h}h ${m}m` : `${m}m`),
  },
  de: {
    screen_time_today: "Bildschirmzeit Heute",
    used: "Genutzt",
    remaining: "Verbleibend",
    limit: "Tageslimit",
    no_limit: "Kein Limit",
    devices: "Geräte",
    lock: "Sperren",
    unlock: "Entsperren",
    add_time: "Zeit hinzufügen",
    apps: "App-Nutzung",
    bedtime: "Schlafenszeit",
    school_time: "Schulzeit",
    active: "Aktiv",
    inactive: "Inaktiv",
    bonus_active: "Bonus aktiv",
    reset_bonus: "Bonus zurücksetzen",
    from: "von",
    to: "bis",
    limit_reached: "Limit erreicht",
    min: "Min",
    of: "von",
    schedules: "Zeitpläne",
    today: "Heute",
    with_limit: "mit Zeitlimit",
    minutes_format: (h, m) => (h > 0 ? `${h} Std ${m} Min` : `${m} Min`),
  },
};

export function getTranslations(hass: { locale?: { language: string }; language?: string } | null): Translations {
  const lang = hass?.locale?.language ?? hass?.language ?? "en";
  const key = lang.toLowerCase().startsWith("de") ? "de" : "en";
  return TRANSLATIONS[key];
}
