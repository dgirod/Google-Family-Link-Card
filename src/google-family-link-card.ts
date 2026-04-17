import type { FamilyLinkCardConfig, HomeAssistant, HassEntity, AppData, ScreenTimeData } from "./types";
import { getTranslations, type Translations } from "./translations";
import { minutesToDisplay, formatTime, escapeHtml, slugToName } from "./utils";
import { GoogleFamilyLinkCardEditor } from "./editor";

const CARD_VERSION = "1.0.0";

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
    return {
      child: "",
      devices: [],
      show_apps: true,
      max_apps: 5,
      show_schedules: true,
    };
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

  getCardSize(): number {
    return 5;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _t(): Translations {
    return getTranslations(this._hass);
  }

  private _entity(id: string): HassEntity | null {
    return this._hass?.states?.[id] ?? null;
  }

  private _numState(id: string): number | null {
    const e = this._entity(id);
    if (!e) return null;
    const n = parseFloat(e.state);
    return isNaN(n) ? null : n;
  }

  private _childName(): string {
    const cfg = this._config!;
    if (cfg.name) return cfg.name;
    const child = cfg.child;
    const attr =
      (this._entity(`sensor.${child}_daily_screen_time`)?.attributes?.child_name as string | undefined) ??
      (this._entity(`switch.${child}_bedtime`)?.attributes?.child_name as string | undefined);
    return attr ?? slugToName(child);
  }

  private _screenTimeData(): ScreenTimeData {
    const child = this._config!.child;
    const used = this._numState(`sensor.${child}_daily_screen_time`) ?? 0;

    let total: number | null = null;
    for (const device of this._config!.devices) {
      const limitEntity = this._entity(`sensor.${device}_daily_limit`);
      if (!limitEntity) continue;
      const enabled = limitEntity.attributes?.enabled;
      if (enabled === false) continue;
      const val = parseFloat(limitEntity.state);
      if (!isNaN(val) && val > 0) {
        total = val;
        break;
      }
    }

    const percentage = total ? Math.min(100, (used / total) * 100) : 0;
    return { used, total, percentage };
  }

  private _topApps(): AppData[] {
    const child = this._config!.child;
    const apps: AppData[] = [];
    for (let i = 1; i <= this._config!.max_apps; i++) {
      const e = this._entity(`sensor.${child}_top_app_${i}`);
      if (!e || e.state === "unavailable" || e.state === "unknown") continue;
      const minutes = parseFloat(e.state);
      if (isNaN(minutes) || minutes <= 0) continue;
      apps.push({
        name: (e.attributes.app_name as string | undefined) ?? slugToName(e.entity_id),
        minutes,
        package: (e.attributes.package_name as string | undefined) ?? "",
      });
    }
    return apps;
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  private _progressRingHtml(pct: number, color: string): string {
    const r = 52;
    const cx = 60;
    const cy = 60;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(1, (pct || 0) / 100));
    return `
      <svg width="120" height="120" class="ring">
        <circle class="ring-bg" cx="${cx}" cy="${cy}" r="${r}" />
        <circle class="ring-fill" cx="${cx}" cy="${cy}" r="${r}"
          stroke="${color}"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cy})" />
      </svg>`;
  }

  private _deviceCardHtml(device: string): string {
    const t = this._t();
    const remaining = this._entity(`sensor.${device}_screen_time_remaining`);
    const limitEnt = this._entity(`sensor.${device}_daily_limit`);
    const bedtimeBin = this._entity(`binary_sensor.${device}_bedtime_active`);
    const schoolBin = this._entity(`binary_sensor.${device}_school_time_active`);
    const limitReached = this._entity(`binary_sensor.${device}_daily_limit_reached`);
    const lockSw = this._entity(`switch.${device}`);
    const bonusEnt = this._entity(`sensor.${device}_active_bonus`);

    const remainMins = remaining ? parseFloat(remaining.state) : null;
    const limitMins = limitEnt ? parseFloat(limitEnt.state) : null;

    // switch.ON = bypass active = device unlocked; OFF = locked
    const isLocked = lockSw?.state === "off";
    const isBedtime = bedtimeBin?.state === "on";
    const isSchool = schoolBin?.state === "on";
    const isLimitReached = limitReached?.state === "on";
    const bonusMins = bonusEnt ? parseFloat(bonusEnt.state) : 0;
    const hasBonusActive = !isNaN(bonusMins) && bonusMins > 0;

    const deviceName = escapeHtml(
      (lockSw?.attributes?.friendly_name as string | undefined) ??
      (remaining?.attributes?.friendly_name as string | undefined) ??
      slugToName(device)
    );

    const badges = [
      isLocked ? `<span class="badge badge-lock"><ha-icon icon="mdi:lock"></ha-icon>${t.lock}</span>` : "",
      isBedtime ? `<span class="badge badge-sleep"><ha-icon icon="mdi:sleep"></ha-icon>${t.bedtime}</span>` : "",
      isSchool ? `<span class="badge badge-school"><ha-icon icon="mdi:school"></ha-icon>${t.school_time}</span>` : "",
      isLimitReached ? `<span class="badge badge-limit"><ha-icon icon="mdi:timer-alert"></ha-icon>${t.limit_reached}</span>` : "",
      hasBonusActive ? `<span class="badge badge-bonus"><ha-icon icon="mdi:clock-plus"></ha-icon>+${bonusMins} ${t.min}</span>` : "",
    ].join("");

    const usedMins = limitMins && remainMins !== null ? Math.max(0, limitMins - remainMins) : null;
    const usedPct = limitMins && usedMins !== null ? Math.min(100, (usedMins / limitMins) * 100) : 0;
    const barColor = usedPct >= 100 ? "var(--error-color, #db4437)" : usedPct >= 80 ? "var(--warning-color, #ff9800)" : "var(--primary-color)";

    const limitEnabled = limitEnt?.attributes?.enabled !== false;
    const showBar = limitEnabled && limitMins !== null && limitMins > 0;

    const lockBtnIcon = isLocked ? "mdi:lock" : "mdi:lock-open-outline";
    const lockBtnTitle = isLocked ? t.unlock : t.lock;

    return `
      <div class="device-card">
        <div class="device-header">
          <ha-icon icon="mdi:cellphone" class="device-icon"></ha-icon>
          <span class="device-name">${deviceName}</span>
          ${lockSw ? `
            <button class="icon-btn ${isLocked ? "locked" : ""}" title="${lockBtnTitle}"
              data-action="toggle-lock" data-device="${escapeHtml(device)}">
              <ha-icon icon="${lockBtnIcon}"></ha-icon>
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
              <div class="progress-fill" style="width:${usedPct}%;background:${barColor}"></div>
            </div>
            <span class="time-stat right">
              <span class="time-val">${minutesToDisplay(remainMins, t)}</span>
              <span class="time-lbl">${t.remaining}</span>
            </span>
          </div>
          <div class="time-limit-row">
            <ha-icon icon="mdi:timer-outline" class="icon-small"></ha-icon>
            <span>${t.limit}: ${minutesToDisplay(limitMins, t)}</span>
          </div>` : ""}
        <div class="bonus-row">
          <span class="bonus-lbl">${t.add_time}:</span>
          <button class="chip-btn" data-action="bonus" data-device="${escapeHtml(device)}" data-minutes="15">+15 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-device="${escapeHtml(device)}" data-minutes="30">+30 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-device="${escapeHtml(device)}" data-minutes="60">+60 ${t.min}</button>
          ${hasBonusActive ? `
            <button class="chip-btn chip-danger" data-action="reset-bonus" data-device="${escapeHtml(device)}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>${t.reset_bonus}
            </button>` : ""}
        </div>
      </div>`;
  }

  private _schedulesHtml(): string {
    const t = this._t();
    const child = this._config!.child;
    const devices = this._config!.devices;

    // Prefer per-device binary_sensor for schedule details; fall back to child-level switches
    const childBedtimeSw = this._entity(`switch.${child}_bedtime`);
    const childSchoolSw = this._entity(`switch.${child}_school_time`);

    // Collect unique schedule items (avoid duplicates across devices)
    let bedtimeHtml = "";
    let schoolHtml = "";

    for (const device of devices) {
      const bedBin = this._entity(`binary_sensor.${device}_bedtime_active`);
      const schoolBin = this._entity(`binary_sensor.${device}_school_time_active`);

      if (!bedtimeHtml && bedBin) {
        const isActive = bedBin.state === "on";
        const isEnabled = childBedtimeSw?.state === "on";
        const start = formatTime(bedBin.attributes.bedtime_start);
        const end = formatTime(bedBin.attributes.bedtime_end);
        const entityId = escapeHtml(childBedtimeSw?.entity_id ?? "");
        bedtimeHtml = this._scheduleItemHtml(
          "mdi:sleep", t.bedtime, `${t.from} ${start} ${t.to} ${end}`,
          isActive, isEnabled, entityId
        );
      }
      if (!schoolHtml && schoolBin) {
        const isActive = schoolBin.state === "on";
        const isEnabled = childSchoolSw?.state === "on";
        const start = formatTime(schoolBin.attributes.schooltime_start);
        const end = formatTime(schoolBin.attributes.schooltime_end);
        const entityId = escapeHtml(childSchoolSw?.entity_id ?? "");
        schoolHtml = this._scheduleItemHtml(
          "mdi:school", t.school_time, `${t.from} ${start} ${t.to} ${end}`,
          isActive, isEnabled, entityId
        );
      }
      if (bedtimeHtml && schoolHtml) break;
    }

    // Fallback: show child-level switches without time details
    if (!bedtimeHtml && childBedtimeSw) {
      const isEnabled = childBedtimeSw.state === "on";
      bedtimeHtml = this._scheduleItemHtml(
        "mdi:sleep", t.bedtime, "", false, isEnabled, escapeHtml(childBedtimeSw.entity_id)
      );
    }
    if (!schoolHtml && childSchoolSw) {
      const isEnabled = childSchoolSw.state === "on";
      schoolHtml = this._scheduleItemHtml(
        "mdi:school", t.school_time, "", false, isEnabled, escapeHtml(childSchoolSw.entity_id)
      );
    }

    return bedtimeHtml + schoolHtml;
  }

  private _scheduleItemHtml(
    icon: string,
    label: string,
    timeRange: string,
    isActive: boolean,
    isEnabled: boolean,
    entityId: string
  ): string {
    const t = this._t();
    return `
      <div class="schedule-item">
        <ha-icon icon="${icon}" class="sched-icon ${isActive ? "sched-active" : ""}"></ha-icon>
        <div class="sched-info">
          <span class="sched-name">${label}</span>
          ${timeRange ? `<span class="sched-time">${timeRange}</span>` : ""}
        </div>
        <span class="sched-badge ${isActive ? "badge-on" : "badge-off"}">${isActive ? t.active : t.inactive}</span>
        ${entityId ? `
          <button class="toggle-btn ${isEnabled ? "toggle-on" : "toggle-off"}"
            data-action="toggle-switch" data-entity="${entityId}">
            <ha-icon icon="${isEnabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline"}"></ha-icon>
          </button>` : ""}
      </div>`;
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  private _styles(): string {
    return `
      :host { display: block; }
      ha-card { overflow: hidden; }

      /* ── Header ── */
      .card-header {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 16px 0;
      }
      .avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: var(--primary-color);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 20px; font-weight: 600; flex-shrink: 0;
      }
      .child-name {
        font-size: 20px; font-weight: 500;
        color: var(--primary-text-color); flex: 1;
      }
      .header-icon { color: var(--secondary-text-color); opacity: .6; }

      /* ── Screen Time ── */
      .st-section {
        display: flex; align-items: center; gap: 20px;
        padding: 12px 16px 16px;
      }
      .ring-wrap { position: relative; flex-shrink: 0; }
      .ring circle { fill: none; stroke-width: 8; }
      .ring-bg { stroke: var(--divider-color, rgba(0,0,0,.12)); }
      .ring-fill { stroke-linecap: round; transition: stroke-dashoffset .5s ease; }
      .ring-center {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%,-50%); text-align: center;
      }
      .ring-time {
        display: block; font-size: 17px; font-weight: 700;
        color: var(--primary-text-color); line-height: 1.1;
      }
      .ring-lbl {
        display: block; font-size: 9px; text-transform: uppercase;
        letter-spacing: .5px; color: var(--secondary-text-color);
      }
      .st-stats { flex: 1; }
      .st-title {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: .6px; color: var(--secondary-text-color); margin-bottom: 8px;
      }
      .stat-row {
        display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
      }
      .stat-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      }
      .stat-lbl { font-size: 13px; color: var(--secondary-text-color); flex: 1; }
      .stat-val { font-size: 13px; font-weight: 500; color: var(--primary-text-color); }

      /* ── Section ── */
      .section {
        border-top: 1px solid var(--divider-color, rgba(0,0,0,.1));
        padding: 10px 16px 12px;
      }
      .section-head {
        display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
      }
      .section-head.toggle-head { cursor: pointer; user-select: none; }
      .section-title {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: .6px; color: var(--secondary-text-color); flex: 1;
      }
      .chevron { color: var(--secondary-text-color); transition: transform .2s; }
      .chevron.open { transform: rotate(180deg); }

      /* ── Device card ── */
      .device-card {
        background: var(--secondary-background-color, rgba(0,0,0,.04));
        border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
      }
      .device-card:last-child { margin-bottom: 0; }
      .device-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .device-icon { color: var(--secondary-text-color); --mdc-icon-size: 20px; }
      .device-name {
        font-size: 14px; font-weight: 500;
        color: var(--primary-text-color); flex: 1;
      }
      .icon-btn {
        background: none; border: none; padding: 4px; cursor: pointer;
        border-radius: 4px; color: var(--secondary-text-color);
        display: flex; align-items: center; --mdc-icon-size: 20px;
        transition: background .15s;
      }
      .icon-btn:hover { background: var(--divider-color, rgba(0,0,0,.1)); }
      .icon-btn.locked { color: var(--error-color, #db4437); }

      /* ── Badges ── */
      .badge-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
      .badge {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 2px 8px; border-radius: 12px;
        font-size: 11px; font-weight: 500;
      }
      .badge ha-icon { --mdc-icon-size: 12px; }
      .badge-lock  { background: rgba(219,68,55,.12);  color: var(--error-color, #db4437); }
      .badge-sleep { background: rgba(103,58,183,.12); color: #7b5ea7; }
      .badge-school{ background: rgba(33,150,243,.12); color: var(--primary-color, #2196f3); }
      .badge-limit { background: rgba(255,152,0,.12);  color: var(--warning-color, #ff9800); }
      .badge-bonus { background: rgba(76,175,80,.12);  color: #4caf50; }

      /* ── Progress bar (device) ── */
      .time-bar-row {
        display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
      }
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
        font-size: 11px; color: var(--secondary-text-color);
        margin-bottom: 8px;
      }
      .icon-small { --mdc-icon-size: 13px; opacity: .7; }

      /* ── Bonus buttons ── */
      .bonus-row {
        display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 4px;
      }
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

      /* ── App usage ── */
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
      .app-time {
        font-size: 11px; color: var(--secondary-text-color);
        width: 40px; text-align: right; flex-shrink: 0;
      }

      /* ── Schedules ── */
      .schedule-item {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 0; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.07));
      }
      .schedule-item:last-child { border-bottom: none; padding-bottom: 0; }
      .sched-icon { color: var(--secondary-text-color); }
      .sched-icon.sched-active { color: var(--primary-color); }
      .sched-info { flex: 1; }
      .sched-name { display: block; font-size: 14px; color: var(--primary-text-color); }
      .sched-time { display: block; font-size: 11px; color: var(--secondary-text-color); }
      .sched-badge {
        font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; flex-shrink: 0;
      }
      .badge-on  { background: rgba(76,175,80,.14);  color: #4caf50; }
      .badge-off { background: var(--divider-color, rgba(0,0,0,.07)); color: var(--secondary-text-color); }
      .toggle-btn {
        background: none; border: none; padding: 4px; cursor: pointer;
        border-radius: 4px; display: flex; align-items: center; --mdc-icon-size: 24px;
        color: var(--secondary-text-color); transition: background .15s;
      }
      .toggle-btn:hover { background: var(--divider-color, rgba(0,0,0,.1)); }
      .toggle-btn.toggle-on { color: var(--primary-color); }
      .toggle-btn.toggle-off { color: var(--disabled-text-color, #9e9e9e); }
    `;
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  private _render(): void {
    if (!this._config || !this.shadowRoot) return;

    const t = this._t();
    const cfg = this._config;
    const childName = escapeHtml(this._childName());
    const initial = (this._childName()[0] ?? "?").toUpperCase();
    const { used, total, percentage } = this._screenTimeData();

    const ringColor =
      percentage >= 90 ? "var(--error-color, #db4437)" :
      percentage >= 70 ? "var(--warning-color, #ff9800)" :
      "var(--primary-color, #03a9f4)";

    const topApps = this._topApps();
    const maxMins = topApps.length > 0 ? Math.max(...topApps.map((a) => a.minutes)) : 1;

    const devicesHtml = cfg.devices.length > 0
      ? `<div class="section">
           <div class="section-head">
             <ha-icon icon="mdi:devices"></ha-icon>
             <span class="section-title">${t.devices}</span>
           </div>
           ${cfg.devices.map((d) => this._deviceCardHtml(d)).join("")}
         </div>`
      : "";

    const appsHtml = cfg.show_apps && topApps.length > 0
      ? `<div class="section">
           <div class="section-head toggle-head" id="apps-toggle">
             <ha-icon icon="mdi:apps"></ha-icon>
             <span class="section-title">${t.apps}</span>
             <ha-icon icon="mdi:chevron-down" class="chevron ${this._appsOpen ? "open" : ""}"></ha-icon>
           </div>
           ${this._appsOpen ? `<div class="apps-list">
             ${topApps.map((app) => `
               <div class="app-item">
                 <span class="app-name">${escapeHtml(app.name)}</span>
                 <div class="app-bar">
                   <div class="app-fill" style="width:${((app.minutes / maxMins) * 100).toFixed(1)}%"></div>
                 </div>
                 <span class="app-time">${minutesToDisplay(app.minutes, t)}</span>
               </div>`).join("")}
           </div>` : ""}
         </div>`
      : "";

    const schedulesBody = cfg.show_schedules ? this._schedulesHtml() : "";
    const schedulesHtml = cfg.show_schedules && schedulesBody
      ? `<div class="section">
           <div class="section-head">
             <ha-icon icon="mdi:calendar-clock"></ha-icon>
             <span class="section-title">${t.schedules}</span>
           </div>
           ${schedulesBody}
         </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="card-header">
          <div class="avatar">${initial}</div>
          <span class="child-name">${childName}</span>
          <ha-icon icon="mdi:account-child" class="header-icon"></ha-icon>
        </div>

        <div class="st-section">
          <div class="ring-wrap">
            ${this._progressRingHtml(percentage, ringColor)}
            <div class="ring-center">
              <span class="ring-time">${minutesToDisplay(used, t)}</span>
              <span class="ring-lbl">${t.used}</span>
            </div>
          </div>
          <div class="st-stats">
            <div class="st-title">${t.screen_time_today}</div>
            <div class="stat-row">
              <div class="stat-dot" style="background:${ringColor}"></div>
              <span class="stat-lbl">${t.used}</span>
              <span class="stat-val">${minutesToDisplay(used, t)}</span>
            </div>
            ${total !== null ? `
              <div class="stat-row">
                <div class="stat-dot" style="background:var(--divider-color,#ccc)"></div>
                <span class="stat-lbl">${t.remaining}</span>
                <span class="stat-val">${minutesToDisplay(Math.max(0, total - used), t)}</span>
              </div>
              <div class="stat-row">
                <div class="stat-dot" style="background:transparent"></div>
                <span class="stat-lbl">${t.limit}</span>
                <span class="stat-val">${minutesToDisplay(total, t)}</span>
              </div>` : `
              <div class="stat-row">
                <div class="stat-dot" style="background:transparent"></div>
                <span class="stat-lbl">${t.limit}</span>
                <span class="stat-val">${t.no_limit}</span>
              </div>`}
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
        const device = btn.dataset.device!;
        const minutes = btn.dataset.minutes!;
        this._hass?.callService("button", "press", { entity_id: `button.${device}_${minutes}min` });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='toggle-lock']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const device = btn.dataset.device!;
        const entity = this._entity(`switch.${device}`);
        const svc = entity?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: `switch.${device}` });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='reset-bonus']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const device = btn.dataset.device!;
        this._hass?.callService("button", "press", { entity_id: `button.${device}_reset_bonus` });
      });
    });

    root.querySelectorAll<HTMLElement>("[data-action='toggle-switch']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const entityId = btn.dataset.entity!;
        const current = this._hass?.states?.[entityId];
        const svc = current?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: entityId });
      });
    });
  }
}

// Register card
customElements.define("google-family-link-card", GoogleFamilyLinkCard);
customElements.define("google-family-link-card-editor", GoogleFamilyLinkCardEditor);

// HACS / HA card registry
(window as unknown as Record<string, unknown>).customCards =
  ((window as unknown as Record<string, unknown[]>).customCards ?? []);
((window as unknown as { customCards: unknown[] }).customCards).push({
  type: "google-family-link-card",
  name: "Google Family Link Card",
  description: "Displays Google Family Link screen time and controls for a child",
  preview: false,
  documentationURL: "https://github.com/dgirod/google-family-link-card",
});

console.info(
  `%c GOOGLE-FAMILY-LINK-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#4285f4;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#4285f4;background:#e8f0fe;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
