/**
 * Google Family Link Card
 * Home Assistant Lovelace custom card for Google Family Link (HAFamilyLink integration)
 * https://github.com/dgirod/google-family-link-card
 * @version 1.0.0
 * @license MIT
 */

const CARD_VERSION = "1.0.0";

// ── Translations ──────────────────────────────────────────────────────────────

const TRANSLATIONS = {
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
    minutes_format: (h, m) => h > 0 ? `${h}h ${m}m` : `${m}m`,
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
    minutes_format: (h, m) => h > 0 ? `${h} Std ${m} Min` : `${m} Min`,
  },
};

function getT(hass) {
  const lang = hass?.locale?.language ?? hass?.language ?? "en";
  return TRANSLATIONS[lang.toLowerCase().startsWith("de") ? "de" : "en"];
}

// ── Utility functions ─────────────────────────────────────────────────────────

function minsDisplay(minutes, t) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  return t.minutes_format(Math.floor(total / 60), total % 60);
}

function fmtTime(iso) {
  if (!iso || typeof iso !== "string") return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return String(iso); }
}

function esc(v) {
  const s = (v === null || v === undefined) ? "" : String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function toName(slug) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// ── Card styles ────────────────────────────────────────────────────────────────

const CARD_STYLES = `
  :host { display: block; }
  ha-card { overflow: hidden; }

  /* Header */
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

  /* Screen-time ring */
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
  .stat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .stat-lbl { font-size: 13px; color: var(--secondary-text-color); flex: 1; }
  .stat-val { font-size: 13px; font-weight: 500; color: var(--primary-text-color); }

  /* Section */
  .section {
    border-top: 1px solid var(--divider-color, rgba(0,0,0,.1));
    padding: 10px 16px 12px;
  }
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

// ── Main Card ──────────────────────────────────────────────────────────────────

class GoogleFamilyLinkCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._appsOpen = true;
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("google-family-link-card-editor");
  }

  static getStubConfig() {
    return { child: "", devices: [], show_apps: true, max_apps: 5, show_schedules: true };
  }

  setConfig(config) {
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

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 5; }

  // ── Entity helpers ──────────────────────────────────────────────────────────

  _e(id) { return this._hass?.states?.[id] ?? null; }

  _num(id) {
    const e = this._e(id);
    if (!e) return null;
    const n = parseFloat(e.state);
    return isNaN(n) ? null : n;
  }

  _childName() {
    const cfg = this._config;
    if (cfg.name) return cfg.name;
    const c = cfg.child;
    return (
      this._e(`sensor.${c}_daily_screen_time`)?.attributes?.child_name ??
      this._e(`switch.${c}_bedtime`)?.attributes?.child_name ??
      toName(c)
    );
  }

  _screenTimeData() {
    const used = this._num(`sensor.${this._config.child}_daily_screen_time`) ?? 0;
    let total = null;
    for (const dev of this._config.devices) {
      const le = this._e(`sensor.${dev}_daily_limit`);
      if (!le || le.attributes?.enabled === false) continue;
      const v = parseFloat(le.state);
      if (!isNaN(v) && v > 0) { total = v; break; }
    }
    return { used, total, pct: total ? Math.min(100, (used / total) * 100) : 0 };
  }

  _topApps() {
    const c = this._config.child;
    const apps = [];
    for (let i = 1; i <= this._config.max_apps; i++) {
      const e = this._e(`sensor.${c}_top_app_${i}`);
      if (!e || e.state === "unavailable" || e.state === "unknown") continue;
      const m = parseFloat(e.state);
      if (isNaN(m) || m <= 0) continue;
      apps.push({
        name: e.attributes?.app_name ?? toName(e.entity_id),
        minutes: m,
      });
    }
    return apps;
  }

  // ── HTML builders ───────────────────────────────────────────────────────────

  _ringHtml(pct, color) {
    const r = 52, cx = 60, cy = 60;
    const circ = 2 * Math.PI * r;
    const off = circ * (1 - Math.min(1, (pct || 0) / 100));
    return `<svg width="120" height="120" class="ring">
      <circle class="ring-bg" cx="${cx}" cy="${cy}" r="${r}"/>
      <circle class="ring-fill" cx="${cx}" cy="${cy}" r="${r}"
        stroke="${color}"
        stroke-dasharray="${circ.toFixed(2)}"
        stroke-dashoffset="${off.toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})"/>
    </svg>`;
  }

  _deviceHtml(device) {
    const t = getT(this._hass);
    const remainEnt = this._e(`sensor.${device}_screen_time_remaining`);
    const limitEnt  = this._e(`sensor.${device}_daily_limit`);
    const bedBin    = this._e(`binary_sensor.${device}_bedtime_active`);
    const schoolBin = this._e(`binary_sensor.${device}_school_time_active`);
    const limReach  = this._e(`binary_sensor.${device}_daily_limit_reached`);
    const lockSw    = this._e(`switch.${device}`);
    const bonusEnt  = this._e(`sensor.${device}_active_bonus`);

    const remainMins = remainEnt ? parseFloat(remainEnt.state) : null;
    const limitMins  = limitEnt  ? parseFloat(limitEnt.state)  : null;

    // switch OFF = device locked (restrictions active)
    const isLocked       = lockSw?.state === "off";
    const isBedtime      = bedBin?.state === "on";
    const isSchool       = schoolBin?.state === "on";
    const isLimitReached = limReach?.state === "on";
    const bonusMins      = bonusEnt ? parseFloat(bonusEnt.state) : 0;
    const hasBonus       = !isNaN(bonusMins) && bonusMins > 0;

    const devName = esc(
      lockSw?.attributes?.friendly_name ??
      remainEnt?.attributes?.friendly_name ??
      toName(device)
    );

    const badges = [
      isLocked       ? `<span class="badge bdg-lock"><ha-icon icon="mdi:lock"></ha-icon>${esc(t.lock)}</span>` : "",
      isBedtime      ? `<span class="badge bdg-sleep"><ha-icon icon="mdi:sleep"></ha-icon>${esc(t.bedtime)}</span>` : "",
      isSchool       ? `<span class="badge bdg-school"><ha-icon icon="mdi:school"></ha-icon>${esc(t.school_time)}</span>` : "",
      isLimitReached ? `<span class="badge bdg-limit"><ha-icon icon="mdi:timer-alert"></ha-icon>${esc(t.limit_reached)}</span>` : "",
      hasBonus       ? `<span class="badge bdg-bonus"><ha-icon icon="mdi:clock-plus"></ha-icon>+${bonusMins} ${t.min}</span>` : "",
    ].join("");

    const limitEnabled = limitEnt?.attributes?.enabled !== false;
    const showBar = limitEnabled && limitMins !== null && !isNaN(limitMins) && limitMins > 0;
    const usedMins = showBar && remainMins !== null ? Math.max(0, limitMins - remainMins) : null;
    const usedPct  = showBar && usedMins !== null ? Math.min(100, (usedMins / limitMins) * 100) : 0;
    const barColor = usedPct >= 100 ? "var(--error-color,#db4437)" : usedPct >= 80 ? "var(--warning-color,#ff9800)" : "var(--primary-color)";

    return `
      <div class="device-card">
        <div class="device-header">
          <ha-icon icon="mdi:cellphone" class="device-icon"></ha-icon>
          <span class="device-name">${devName}</span>
          ${lockSw ? `
            <button class="icon-btn${isLocked ? " locked" : ""}"
              title="${esc(isLocked ? t.unlock : t.lock)}"
              data-action="toggle-lock" data-device="${esc(device)}">
              <ha-icon icon="${isLocked ? "mdi:lock" : "mdi:lock-open-outline"}"></ha-icon>
            </button>` : ""}
        </div>
        ${badges ? `<div class="badge-row">${badges}</div>` : ""}
        ${showBar ? `
          <div class="time-bar-row">
            <span class="time-stat">
              <span class="time-val">${minsDisplay(usedMins, t)}</span>
              <span class="time-lbl">${t.used}</span>
            </span>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${usedPct.toFixed(1)}%;background:${barColor}"></div>
            </div>
            <span class="time-stat right">
              <span class="time-val">${minsDisplay(remainMins, t)}</span>
              <span class="time-lbl">${t.remaining}</span>
            </span>
          </div>
          <div class="time-limit-row">
            <ha-icon icon="mdi:timer-outline" class="icon-sm"></ha-icon>
            <span>${t.limit}: ${minsDisplay(limitMins, t)}</span>
          </div>` : ""}
        <div class="bonus-row">
          <span class="bonus-lbl">${t.add_time}:</span>
          <button class="chip-btn" data-action="bonus" data-device="${esc(device)}" data-minutes="15">+15 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-device="${esc(device)}" data-minutes="30">+30 ${t.min}</button>
          <button class="chip-btn" data-action="bonus" data-device="${esc(device)}" data-minutes="60">+60 ${t.min}</button>
          ${hasBonus ? `
            <button class="chip-btn chip-danger" data-action="reset-bonus" data-device="${esc(device)}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>${esc(t.reset_bonus)}
            </button>` : ""}
        </div>
      </div>`;
  }

  _scheduleItemHtml(icon, label, timeRange, isActive, isEnabled, entityId) {
    const t = getT(this._hass);
    return `
      <div class="schedule-item">
        <ha-icon icon="${icon}" class="sched-icon${isActive ? " s-active" : ""}"></ha-icon>
        <div class="sched-info">
          <span class="sched-name">${esc(label)}</span>
          ${timeRange ? `<span class="sched-time">${esc(timeRange)}</span>` : ""}
        </div>
        <span class="sched-badge ${isActive ? "s-on" : "s-off"}">${esc(isActive ? t.active : t.inactive)}</span>
        ${entityId ? `
          <button class="toggle-btn ${isEnabled ? "t-on" : "t-off"}"
            data-action="toggle-switch" data-entity="${esc(entityId)}">
            <ha-icon icon="${isEnabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline"}"></ha-icon>
          </button>` : ""}
      </div>`;
  }

  _schedulesHtml() {
    const t = getT(this._hass);
    const child = this._config.child;
    const devices = this._config.devices;
    const childBedSw    = this._e(`switch.${child}_bedtime`);
    const childSchoolSw = this._e(`switch.${child}_school_time`);

    let bedHtml = "", schoolHtml = "";

    for (const dev of devices) {
      const bedBin    = this._e(`binary_sensor.${dev}_bedtime_active`);
      const schoolBin = this._e(`binary_sensor.${dev}_school_time_active`);

      if (!bedHtml && bedBin) {
        bedHtml = this._scheduleItemHtml(
          "mdi:sleep", t.bedtime,
          `${t.from} ${fmtTime(bedBin.attributes?.bedtime_start)} ${t.to} ${fmtTime(bedBin.attributes?.bedtime_end)}`,
          bedBin.state === "on",
          childBedSw?.state === "on",
          childBedSw?.entity_id ?? ""
        );
      }
      if (!schoolHtml && schoolBin) {
        schoolHtml = this._scheduleItemHtml(
          "mdi:school", t.school_time,
          `${t.from} ${fmtTime(schoolBin.attributes?.schooltime_start)} ${t.to} ${fmtTime(schoolBin.attributes?.schooltime_end)}`,
          schoolBin.state === "on",
          childSchoolSw?.state === "on",
          childSchoolSw?.entity_id ?? ""
        );
      }
      if (bedHtml && schoolHtml) break;
    }

    if (!bedHtml && childBedSw) {
      bedHtml = this._scheduleItemHtml(
        "mdi:sleep", t.bedtime, "", false,
        childBedSw.state === "on", childBedSw.entity_id
      );
    }
    if (!schoolHtml && childSchoolSw) {
      schoolHtml = this._scheduleItemHtml(
        "mdi:school", t.school_time, "", false,
        childSchoolSw.state === "on", childSchoolSw.entity_id
      );
    }

    return bedHtml + schoolHtml;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    if (!this._config || !this.shadowRoot) return;

    const t     = getT(this._hass);
    const cfg   = this._config;
    const name  = esc(this._childName());
    const init  = (this._childName()[0] ?? "?").toUpperCase();
    const { used, total, pct } = this._screenTimeData();

    const ringColor =
      pct >= 90 ? "var(--error-color,#db4437)" :
      pct >= 70 ? "var(--warning-color,#ff9800)" :
      "var(--primary-color,#03a9f4)";

    const apps    = this._topApps();
    const maxMins = apps.length > 0 ? Math.max(...apps.map(a => a.minutes)) : 1;

    // Devices section
    const devicesHtml = cfg.devices.length > 0 ? `
      <div class="section">
        <div class="section-head">
          <ha-icon icon="mdi:devices"></ha-icon>
          <span class="section-title">${t.devices}</span>
        </div>
        ${cfg.devices.map(d => this._deviceHtml(d)).join("")}
      </div>` : "";

    // Apps section
    const appsHtml = cfg.show_apps && apps.length > 0 ? `
      <div class="section">
        <div class="section-head toggleable" id="apps-toggle">
          <ha-icon icon="mdi:apps"></ha-icon>
          <span class="section-title">${t.apps}</span>
          <ha-icon icon="mdi:chevron-down" class="chevron${this._appsOpen ? " open" : ""}"></ha-icon>
        </div>
        ${this._appsOpen ? `<div>
          ${apps.map(a => `
            <div class="app-item">
              <span class="app-name">${esc(a.name)}</span>
              <div class="app-bar">
                <div class="app-fill" style="width:${((a.minutes / maxMins) * 100).toFixed(1)}%"></div>
              </div>
              <span class="app-time">${minsDisplay(a.minutes, t)}</span>
            </div>`).join("")}
        </div>` : ""}
      </div>` : "";

    // Schedules section
    const schedBody = cfg.show_schedules ? this._schedulesHtml() : "";
    const schedulesHtml = schedBody ? `
      <div class="section">
        <div class="section-head">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          <span class="section-title">${t.schedules}</span>
        </div>
        ${schedBody}
      </div>` : "";

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="card-header">
          <div class="avatar">${init}</div>
          <span class="child-name">${name}</span>
          <ha-icon icon="mdi:account-child" class="header-icon"></ha-icon>
        </div>

        <div class="st-section">
          <div class="ring-wrap">
            ${this._ringHtml(pct, ringColor)}
            <div class="ring-center">
              <span class="ring-time">${minsDisplay(used, t)}</span>
              <span class="ring-lbl">${t.used}</span>
            </div>
          </div>
          <div class="st-stats">
            <div class="st-title">${t.screen_time_today}</div>
            <div class="stat-row">
              <div class="stat-dot" style="background:${ringColor}"></div>
              <span class="stat-lbl">${t.used}</span>
              <span class="stat-val">${minsDisplay(used, t)}</span>
            </div>
            ${total !== null ? `
              <div class="stat-row">
                <div class="stat-dot" style="background:var(--divider-color,#ccc)"></div>
                <span class="stat-lbl">${t.remaining}</span>
                <span class="stat-val">${minsDisplay(Math.max(0, total - used), t)}</span>
              </div>
              <div class="stat-row">
                <div class="stat-dot" style="background:transparent"></div>
                <span class="stat-lbl">${t.limit}</span>
                <span class="stat-val">${minsDisplay(total, t)}</span>
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

    this._listen();
  }

  _listen() {
    const r = this.shadowRoot;

    r.getElementById("apps-toggle")?.addEventListener("click", () => {
      this._appsOpen = !this._appsOpen;
      this._render();
    });

    r.querySelectorAll("[data-action='bonus']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass?.callService("button", "press",
          { entity_id: `button.${btn.dataset.device}_${btn.dataset.minutes}min` });
      });
    });

    r.querySelectorAll("[data-action='toggle-lock']").forEach(btn => {
      btn.addEventListener("click", () => {
        const eid = `switch.${btn.dataset.device}`;
        const svc = this._e(eid)?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: eid });
      });
    });

    r.querySelectorAll("[data-action='reset-bonus']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass?.callService("button", "press",
          { entity_id: `button.${btn.dataset.device}_reset_bonus` });
      });
    });

    r.querySelectorAll("[data-action='toggle-switch']").forEach(btn => {
      btn.addEventListener("click", () => {
        const eid = btn.dataset.entity;
        const svc = this._hass?.states?.[eid]?.state === "on" ? "turn_off" : "turn_on";
        this._hass?.callService("switch", svc, { entity_id: eid });
      });
    });
  }
}

// ── Editor ────────────────────────────────────────────────────────────────────

class GoogleFamilyLinkCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;
    const cfg = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        .form { padding: 4px 0; }
        .row { margin-bottom: 14px; display: flex; flex-direction: column; gap: 4px; }
        label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .4px; color: var(--secondary-text-color);
        }
        input[type=text], input[type=number] {
          padding: 8px 10px;
          border: 1px solid var(--divider-color, rgba(0,0,0,.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-family: inherit; font-size: 14px;
          width: 100%; box-sizing: border-box; outline: none;
        }
        input:focus { border-color: var(--primary-color); }
        .cb-row { flex-direction: row; align-items: center; gap: 8px; }
        .cb-row label { text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 400; cursor: pointer; }
        input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-color); }
        .hint { font-size: 11px; color: var(--secondary-text-color); opacity: .75; }
      </style>
      <div class="form">
        <div class="row">
          <label>Child slug *</label>
          <input type="text" id="child" value="${escE(cfg?.child)}" placeholder="e.g. john_smith"/>
          <span class="hint">Entity slug of the child (from HAFamilyLink integration)</span>
        </div>
        <div class="row">
          <label>Devices (comma-separated)</label>
          <input type="text" id="devices" value="${escE((cfg?.devices ?? []).join(", "))}" placeholder="e.g. iphone_john, tablet_john"/>
          <span class="hint">Device slugs linked to this child</span>
        </div>
        <div class="row">
          <label>Display name (optional)</label>
          <input type="text" id="name" value="${escE(cfg?.name)}" placeholder="Overrides auto-detected name"/>
        </div>
        <div class="row">
          <label>Max apps to show (1–10)</label>
          <input type="number" id="max_apps" value="${cfg?.max_apps ?? 5}" min="1" max="10"/>
        </div>
        <div class="row cb-row">
          <input type="checkbox" id="show_apps" ${cfg?.show_apps !== false ? "checked" : ""}/>
          <label for="show_apps">Show App Usage section</label>
        </div>
        <div class="row cb-row">
          <input type="checkbox" id="show_schedules" ${cfg?.show_schedules !== false ? "checked" : ""}/>
          <label for="show_schedules">Show Schedules section</label>
        </div>
      </div>`;

    this.shadowRoot.querySelectorAll("input").forEach(el => {
      el.addEventListener("change", () => this._changed());
      el.addEventListener("input",  () => this._changed());
    });
  }

  _changed() {
    if (!this.shadowRoot || !this._config) return;
    const child = this.shadowRoot.getElementById("child").value.trim();
    const devices = this.shadowRoot.getElementById("devices").value
      .split(",").map(d => d.trim()).filter(Boolean);
    const name    = this.shadowRoot.getElementById("name").value.trim();
    const maxApps = parseInt(this.shadowRoot.getElementById("max_apps").value, 10) || 5;
    const showApps      = this.shadowRoot.getElementById("show_apps").checked;
    const showSchedules = this.shadowRoot.getElementById("show_schedules").checked;

    const config = { ...this._config, child, devices, max_apps: Math.min(10, Math.max(1, maxApps)), show_apps: showApps, show_schedules: showSchedules };
    if (name) config.name = name; else delete config.name;

    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

function escE(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// ── Registration ──────────────────────────────────────────────────────────────

customElements.define("google-family-link-card",        GoogleFamilyLinkCard);
customElements.define("google-family-link-card-editor", GoogleFamilyLinkCardEditor);

window.customCards = window.customCards ?? [];
window.customCards.push({
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
