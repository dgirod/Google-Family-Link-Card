import type { FamilyLinkCardConfig, HomeAssistant, HassEntity, AppData } from "./types";
import { getTranslations, type Translations } from "./translations";
import { minutesToDisplay, formatTime, escapeHtml, slugToName } from "./utils";
import { GoogleFamilyLinkCardEditor } from "./editor";

const CARD_VERSION = "1.1.0";

class GoogleFamilyLinkCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config: Required<FamilyLinkCardConfig> | null = null;
  private _appsOpen = true;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("google-family-link-card-editor");
  }

  static getStubConfig(): Partial<FamilyLinkCardConfig> {
    return { child: "", devices: [], show_apps: true, max_apps: 5, show_schedules: true };
  }

  setConfig(config: FamilyLinkCardConfig): void {
    if (!config.child) throw new Error("Please define a child entity slug.");
    this._config = {
      type: config.type,
      child: config.child,
      devices: config.devices ?? [],
      show_apps: config.show_apps !== false,
      max_apps: Math.min(10, Math.max(1, config.max_apps ?? 5)),
      show_schedules: config.show_schedules !== false,
      name: config.name ?? "",
    };
    this._render();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._render();
  }

  getCardSize(): number { return 5; }

  // ── Entity helpers ──────────────────────────────────────────────────────────

  /** Full entity-prefix for a device: "<child>_<device>" */
  private _dp(device: string): string {
    return `${this._config!.child}_${device}`;
  }

  private _e(id: string): HassEntity | null {
    return this._hass?.states?.[id] ?? null;
  }

  private _t(): Translations {
    return getTranslations(this._hass);
  }

  private _childName(): string {
    const cfg = this._config!;
    if (cfg.name) return cfg.name;
    const c = cfg.child;
    return (
      (this._e(`sensor.${c}_daily_screen_time`)?.attributes?.child_name as string | undefined) ??
      (this._e(`switch.${c}_bedtime`)?.attributes?.child_name as string | undefined) ??
      slugToName(c)
    );
  }

  // ── Data extraction ─────────────────────────────────────────────────────────

  /** Total screen time today (aggregated across all devices by the integration) */
  private _usedToday(): number {
    const e = this._e(`sensor.${this._config!.child}_daily_screen_time`);
    if (!e) return 0;
    const n = parseFloat(e.state);
    return isNaN(n) ? 0 : n;
  }

  /**
   * App usage list from sensor.<child>_daily_screen_time.attributes.apps.
   * Already aggregated across all devices by the integration.
   */
  private _topApps(): AppData[] {
    const e = this._e(`sensor.${this._config!.child}_daily_screen_time`);
    const raw = e?.attributes?.apps;
    if (!Array.isArray(raw)) return [];

    return (raw as Array<Record<string, unknown>>)
      .filter((a) => typeof a.minutes === "number" && (a.minutes as number) > 0)
      .sort((a, b) => (b.minutes as number) - (a.minutes as number))
      .slice(0, this._config!.max_apps)
      .map((a) => ({
        name: (a.name as string | undefined) ?? (a.package as string | undefined) ?? "Unknown",
        minutes: a.minutes as number,
        package: (a.package as string | undefined) ?? "",
      }));
  }

  // ── HTML builders ───────────────────────────────────────────────────────────

  private _deviceCardHtml(device: string): string {
    const t   = this._t();
    const dp  = this._dp(device);                  // "<child>_<device>"
    const c   = this._config!.child;

    // Per-device entities — all prefixed with "<child>_<device>"
    const remainEnt  = this._e(`sensor.${dp}_screen_time_remaining`);
    const bedBin     = this._e(`binary_sensor.${dp}_bedtime_active`);
    const schoolBin  = this._e(`binary_sensor.${dp}_schooltime_active`);
    const limitReach = this._e(`binary_sensor.${dp}_daily_limit_reached`);
    const lockSw     = this._e(`switch.${dp}`);
    const bonusEnt   = this._e(`sensor.${dp}_active_bonus`);

    // Prefer attribute values (more accurate); fall back to calculated
    const usedMins   = (remainEnt?.attributes?.used_minutes   as number | undefined) ?? null;
    const totalMins  = (remainEnt?.attributes?.total_allowed_minutes as number | undefined) ?? null;
    const limitEnabled = (remainEnt?.attributes?.daily_limit_enabled as boolean | undefined) ?? true;
    const remainMins = remainEnt ? parseFloat(remainEnt.state) : null;

    // switch ON = device unlocked (bypass restrictions), OFF = locked
    const isLocked       = lockSw?.state === "off";
    const isBedtime      = bedBin?.state   === "on";
    const isSchool       = schoolBin?.state === "on";
    const isLimitReached = limitReach?.state === "on";
    const bonusMins      = bonusEnt ? parseFloat(bonusEnt.state) : 0;
    const hasBonus       = !isNaN(bonusMins) && bonusMins > 0;

    const devName = escapeHtml(
      (lockSw?.attributes?.friendly_name     as string | undefined) ??
      (remainEnt?.attributes?.device_name    as string | undefined) ??
      slugToName(device)
    );

    const badges = [
      isLocked       ? `<span class="badge bdg-lock"><ha-icon icon="mdi:lock"></ha-icon>${escapeHtml(t.lock)}</span>`         : "",
      isBedtime      ? `<span class="badge bdg-sleep"><ha-icon icon="mdi:sleep"></ha-icon>${escapeHtml(t.bedtime)}</span>`     : "",
      isSchool       ? `<span class="badge bdg-school"><ha-icon icon="mdi:school"></ha-icon>${escapeHtml(t.school_time)}</span>`: "",
      isLimitReached ? `<span class="badge bdg-limit"><ha-icon icon="mdi:timer-alert"></ha-icon>${escapeHtml(t.limit_reached)}</span>` : "",
      hasBonus       ? `<span class="badge bdg-bonus"><ha-icon icon="mdi:clock-plus"></ha-icon>+${bonusMins} ${t.min}</span>` : "",
    ].join("");

    const showBar   = limitEnabled && totalMins !== null && totalMins > 0 && usedMins !== null;
    const usedPct   = showBar ? Math.min(100, ((usedMins as number) / totalMins!) * 100) : 0;
    const barColor  = usedPct >= 100 ? "var(--error-color,#db4437)" :
                      usedPct >= 80  ? "var(--warning-color,#ff9800)" : "var(--primary-color)";

    const devE = escapeHtml(device);
    const dpE  = escapeHtml(dp);

    return `
      <div class="device-card">
        <div class="device-header">
          <ha-icon icon="mdi:cellphone" class="device-icon"></ha-icon>
          <span class="device-name">${devName}</span>
          ${lockSw ? `
            <button class="icon-btn${isLocked ? " locked" : ""}"
              title="${escapeHtml(isLocked ? t.unlock : t.lock)}"
              data-action="toggle-lock" data-dp="${dpE}">
              <ha-icon icon="${isLocked ? "mdi:lock" : "mdi:lock-open-outline"}"></ha-icon>
            </button>` : ""}
        </div>
        ${badges ? `<div class="badge-row">${badges}</div>` : ""}
        ${showBar ? `
          <div class="time-bar-row">
            <span class="time-stat">
              <span class="time-val">${minutesToDisplay(usedMins, t)}</span>
              <span class="time-lbl">${t.used}</span>
            </span>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${usedPct.toFixed(1)}%;background:${barColor}"></div>
            </div>
            <span class="time-stat right">
              <span class="time-val">${minutesToDisplay(remainMins, t)}</span>
              <span class="time-lbl">${t.remaining}</span>
            </span>
          </div>
          <div class="time-limit-row">
            <ha-icon icon="mdi:timer-outline" class="icon-sm"></ha-icon>
            <span>${t.limit}: ${minutesToDisplay(totalMins, t)}</span>
          </div>` : ""}
        <div class="bonus-row">
          <span class="bonus-lbl">${t.add_time}:</span>
          <button class="chip-btn" data-action="bonus" data-dp="${dpE}" data-minutes="15">+15 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-dp="${dpE}" data-minutes="30">+30 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-dp="${dpE}" data-minutes="60">+60 ${t.min}</button>
          ${hasBonus ? `
            <button class="chip-btn chip-danger" data-action="reset-bonus" data-dp="${dpE}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>${escapeHtml(t.reset_bonus)}
            </button>` : ""}
        </div>
      </div>`;
  }

  private _scheduleItemHtml(
    icon: string, label: string, timeRange: string,
    isActive: boolean, isEnabled: boolean, entityId: string,
  ): string {
    const t = this._t();
    return `
      <div class="schedule-item">
        <ha-icon icon="${icon}" class="sched-icon${isActive ? " s-active" : ""}"></ha-icon>
        <div class="sched-info">
          <span class="sched-name">${escapeHtml(label)}</span>
          ${timeRange ? `<span class="sched-time">${escapeHtml(timeRange)}</span>` : ""}
        </div>
        <span class="sched-badge ${isActive ? "s-on" : "s-off"}">${escapeHtml(isActive ? t.active : t.inactive)}</span>
        ${entityId ? `
          <button class="toggle-btn ${isEnabled ? "t-on" : "t-off"}"
            data-action="toggle-switch" data-entity="${escapeHtml(entityId)}">
            <ha-icon icon="${isEnabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline"}"></ha-icon>
          </button>` : ""}
      </div>`;
  }

  private _schedulesHtml(): string {
    const t     = this._t();
    const child = this._config!.child;
    const childBedSw    = this._e(`switch.${child}_bedtime`);
    const childSchoolSw = this._e(`switch.${child}_school_time`);

    let bedHtml = "", schoolHtml = "";

    for (const device of this._config!.devices) {
      const dp = this._dp(device);
      const bedBin    = this._e(`binary_sensor.${dp}_bedtime_active`);
      const schoolBin = this._e(`binary_sensor.${dp}_schooltime_active`);

      if (!bedHtml && bedBin) {
        bedHtml = this._scheduleItemHtml(
          "mdi:sleep", t.bedtime,
          `${t.from} ${formatTime(bedBin.attributes.bedtime_start)} ${t.to} ${formatTime(bedBin.attributes.bedtime_end)}`,
          bedBin.state === "on",
          childBedSw?.state === "on" ?? false,
          childBedSw?.entity_id ?? "",
        );
      }
      if (!schoolHtml && schoolBin) {
        schoolHtml = this._scheduleItemHtml(
          "mdi:school", t.school_time,
          `${t.from} ${formatTime(schoolBin.attributes.schooltime_start)} ${t.to} ${formatTime(schoolBin.attributes.schooltime_end)}`,
          schoolBin.state === "on",
          childSchoolSw?.state === "on" ?? false,
          childSchoolSw?.entity_id ?? "",
        );
      }
      if (bedHtml && schoolHtml) break;
    }

    // Fallback: child-level switches only (no time details)
    if (!bedHtml && childBedSw) {
      bedHtml = this._scheduleItemHtml(
        "mdi:sleep", t.bedtime, "", false,
        childBedSw.state === "on", childBedSw.entity_id,
      );
    }
    if (!schoolHtml && childSchoolSw) {
      schoolHtml = this._scheduleItemHtml(
        "mdi:school", t.school_time, "", false,
        childSchoolSw.state === "on", childSchoolSw.entity_id,
      );
    }
    return bedHtml + schoolHtml;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  private _styles(): string {
    return `
      :host { display: block; }
      ha-card { overflow: hidden; }

      /* Header */
      .card-header { display: flex; align-items: center; gap: 12px; padding: 16px 16px 0; }
      .avatar {
        width: 42px; height: 42px; border-radius: 50%; background: var(--primary-color);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 20px; font-weight: 600; flex-shrink: 0;
      }
      .child-name { font-size: 20px; font-weight: 500; color: var(--primary-text-color); flex: 1; }
      .header-icon { color: var(--secondary-text-color); opacity: .6; }

      /* Screen-time total — no progress ring */
      .st-section { display: flex; align-items: center; gap: 16px; padding: 14px 16px 16px; }
      .time-bubble {
        width: 96px; height: 96px; border-radius: 50%; flex-shrink: 0;
        background: rgba(var(--rgb-primary-color, 3,169,244), .08);
        border: 3px solid var(--primary-color, #03a9f4);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 1px;
      }
      .bubble-time {
        font-size: 18px; font-weight: 700; line-height: 1.1;
        color: var(--primary-text-color);
      }
      .bubble-lbl {
        font-size: 9px; text-transform: uppercase; letter-spacing: .5px;
        color: var(--secondary-text-color);
      }
      .st-meta { flex: 1; }
      .st-title {
        font-size: 13px; font-weight: 600; color: var(--primary-text-color);
        margin-bottom: 6px;
      }
      .st-subtitle { font-size: 12px; color: var(--secondary-text-color); }

      /* Section */
      .section { border-top: 1px solid var(--divider-color, rgba(0,0,0,.1)); padding: 10px 16px 12px; }
      .section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .section-head.toggleable { cursor: pointer; user-select: none; }
      .section-title {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: .6px; color: var(--secondary-text-color); flex: 1;
      }
      .chevron { color: var(--secondary-text-color); transition: transform .2s; }
      .chevron.open { transform: rotate(180deg); }

      /* Device card */
      .device-card {
        background: var(--secondary-background-color, rgba(0,0,0,.04));
        border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
      }
      .device-card:last-child { margin-bottom: 0; }
      .device-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .device-icon { color: var(--secondary-text-color); --mdc-icon-size: 20px; }
      .device-name { font-size: 14px; font-weight: 500; color: var(--primary-text-color); flex: 1; }
      .icon-btn {
        background: none; border: none; padding: 4px; cursor: pointer;
        border-radius: 4px; color: var(--secondary-text-color);
        display: flex; align-items: center; --mdc-icon-size: 20px; transition: background .15s;
      }
      .icon-btn:hover { background: var(--divider-color, rgba(0,0,0,.1)); }
      .icon-btn.locked { color: var(--error-color, #db4437); }

      /* Badges */
      .badge-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
      .badge {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;
      }
      .badge ha-icon { --mdc-icon-size: 12px; }
      .bdg-lock   { background: rgba(219,68,55,.12);  color: var(--error-color, #db4437); }
      .bdg-sleep  { background: rgba(103,58,183,.12); color: #7b5ea7; }
      .bdg-school { background: rgba(33,150,243,.12); color: var(--primary-color, #2196f3); }
      .bdg-limit  { background: rgba(255,152,0,.12);  color: var(--warning-color, #ff9800); }
      .bdg-bonus  { background: rgba(76,175,80,.12);  color: #4caf50; }

      /* Device progress bar */
      .time-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .time-stat { text-align: center; flex-shrink: 0; min-width: 52px; }
      .time-stat.right { text-align: right; }
      .time-val { display: block; font-size: 13px; font-weight: 600; color: var(--primary-text-color); }
      .time-lbl { display: block; font-size: 9px; color: var(--secondary-text-color); text-transform: uppercase; }
      .progress-bar {
        flex: 1; height: 6px; background: var(--divider-color, rgba(0,0,0,.12));
        border-radius: 3px; overflow: hidden;
      }
      .progress-fill { height: 100%; border-radius: 3px; transition: width .3s ease; }
      .time-limit-row {
        display: flex; align-items: center; gap: 4px;
        font-size: 11px; color: var(--secondary-text-color); margin-bottom: 8px;
      }
      .icon-sm { --mdc-icon-size: 13px; opacity: .7; }

      /* Bonus buttons */
      .bonus-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
      .bonus-lbl { font-size: 11px; color: var(--secondary-text-color); }
      .chip-btn {
        padding: 3px 10px; border: none; border-radius: 14px;
        background: var(--primary-color); color: #fff;
        font-size: 12px; font-weight: 500; cursor: pointer;
        display: inline-flex; align-items: center; gap: 3px;
        font-family: inherit; transition: opacity .15s;
      }
      .chip-btn:hover { opacity: .82; }
      .chip-btn ha-icon { --mdc-icon-size: 14px; }
      .chip-danger { background: var(--error-color, #db4437); }

      /* App usage */
      .app-item { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
      .app-name {
        font-size: 13px; color: var(--primary-text-color);
        width: 130px; flex-shrink: 0;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .app-bar {
        flex: 1; height: 6px; background: var(--divider-color, rgba(0,0,0,.1));
        border-radius: 3px; overflow: hidden;
      }
      .app-fill { height: 100%; background: var(--primary-color); border-radius: 3px; }
      .app-time { font-size: 11px; color: var(--secondary-text-color); width: 40px; text-align: right; flex-shrink: 0; }

      /* Schedules */
      .schedule-item {
        display: flex; align-items: center; gap: 10px; padding: 8px 0;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.07));
      }
      .schedule-item:last-child { border-bottom: none; padding-bottom: 0; }
      .sched-icon { color: var(--secondary-text-color); }
      .sched-icon.s-active { color: var(--primary-color); }
      .sched-info { flex: 1; }
      .sched-name { display: block; font-size: 14px; color: var(--primary-text-color); }
      .sched-time { display: block; font-size: 11px; color: var(--secondary-text-color); }
      .sched-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; flex-shrink: 0; }
      .s-on  { background: rgba(76,175,80,.14); color: #4caf50; }
      .s-off { background: var(--divider-color, rgba(0,0,0,.07)); color: var(--secondary-text-color); }
      .toggle-btn {
        background: none; border: none; padding: 4px; cursor: pointer;
        border-radius: 4px; display: flex; align-items: center;
        --mdc-icon-size: 24px; color: var(--secondary-text-color); transition: background .15s;
      }
      .toggle-btn:hover { background: var(--divider-color, rgba(0,0,0,.1)); }
      .t-on  { color: var(--primary-color); }
      .t-off { color: var(--disabled-text-color, #9e9e9e); }
    `;
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  private _render(): void {
    if (!this._config || !this.shadowRoot) return;

    const t        = this._t();
    const cfg      = this._config;
    const name     = escapeHtml(this._childName());
    const initial  = (this._childName()[0] ?? "?").toUpperCase();
    const used     = this._usedToday();
    const apps     = this._topApps();
    const maxMins  = apps.length > 0 ? Math.max(...apps.map((a) => a.minutes)) : 1;

    // Count devices with an active daily limit for the subtitle
    const limitedDevices = cfg.devices.filter((d) => {
      const e = this._e(`sensor.${this._dp(d)}_screen_time_remaining`);
      return e?.attributes?.daily_limit_enabled !== false && parseFloat(e?.attributes?.total_allowed_minutes as string) > 0;
    });

    const devicesHtml = cfg.devices.length > 0 ? `
      <div class="section">
        <div class="section-head">
          <ha-icon icon="mdi:devices"></ha-icon>
          <span class="section-title">${t.devices}</span>
        </div>
        ${cfg.devices.map((d) => this._deviceCardHtml(d)).join("")}
      </div>` : "";

    const appsHtml = cfg.show_apps && apps.length > 0 ? `
      <div class="section">
        <div class="section-head toggleable" id="apps-toggle">
          <ha-icon icon="mdi:apps"></ha-icon>
          <span class="section-title">${t.apps}</span>
          <ha-icon icon="mdi:chevron-down" class="chevron${this._appsOpen ? " open" : ""}"></ha-icon>
        </div>
        ${this._appsOpen ? `<div>
          ${apps.map((a) => `
            <div class="app-item">
              <span class="app-name">${escapeHtml(a.name)}</span>
              <div class="app-bar">
                <div class="app-fill" style="width:${((a.minutes / maxMins) * 100).toFixed(1)}%"></div>
              </div>
              <span class="app-time">${minutesToDisplay(a.minutes, t)}</span>
            </div>`).join("")}
        </div>` : ""}
      </div>` : "";

    const schedBody   = cfg.show_schedules ? this._schedulesHtml() : "";
    const schedulesHtml = schedBody ? `
      <div class="section">
        <div class="section-head">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          <span class="section-title">${t.schedules}</span>
        </div>
        ${schedBody}
      </div>` : "";

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="card-header">
          <div class="avatar">${initial}</div>
          <span class="child-name">${name}</span>
          <ha-icon icon="mdi:account-child" class="header-icon"></ha-icon>
        </div>

        <div class="st-section">
          <div class="time-bubble">
            <span class="bubble-time">${minutesToDisplay(used, t)}</span>
            <span class="bubble-lbl">${t.today}</span>
          </div>
          <div class="st-meta">
            <div class="st-title">${t.screen_time_today}</div>
            ${limitedDevices.length > 0
              ? `<div class="st-subtitle">${limitedDevices.length} ${t.devices.toLowerCase()} ${t.with_limit}</div>`
              : `<div class="st-subtitle">${t.no_limit}</div>`}
          </div>
        </div>

        ${devicesHtml}
        ${appsHtml}
        ${schedulesHtml}
      </ha-card>`;

    this._attachListeners();
  }

  private _attachListeners(): void {
    const root = this.shadowRoot!;

    root.getElementById("apps-toggle")?.addEventListener("click", () => {
      this._appsOpen = !this._appsOpen;
      this._render();
    });

    root.querySelectorAll<HTMLElement>("[data-action='bonus']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dp      = btn.dataset.dp!;
        const minutes = btn.dataset.minutes!;
        this._hass?.callService("button", "press", { entity_id: `button.${dp}_bonus_${minutes}min` });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='toggle-lock']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dp  = btn.dataset.dp!;
        const eid = `switch.${dp}`;
        const svc = this._e(eid)?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: eid });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='reset-bonus']").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._hass?.callService("button", "press", { entity_id: `button.${btn.dataset.dp!}_reset_bonus` });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='toggle-switch']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const eid = btn.dataset.entity!;
        const svc = this._hass?.states?.[eid]?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: eid });
      });
    });
  }
}

customElements.define("google-family-link-card",        GoogleFamilyLinkCard);
customElements.define("google-family-link-card-editor", GoogleFamilyLinkCardEditor);

(window as unknown as Record<string, unknown>).customCards =
  ((window as unknown as Record<string, unknown[]>).customCards ?? []);
((window as unknown as { customCards: unknown[] }).customCards).push({
  type:             "google-family-link-card",
  name:             "Google Family Link Card",
  description:      "Displays Google Family Link screen time and controls for a child",
  preview:          false,
  documentationURL: "https://github.com/dgirod/google-family-link-card",
});

console.info(
  `%c GOOGLE-FAMILY-LINK-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#4285f4;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#4285f4;background:#e8f0fe;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
