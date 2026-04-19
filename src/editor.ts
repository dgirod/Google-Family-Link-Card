import type { FamilyLinkCardConfig, HomeAssistant } from "./types";

interface ChildOption {
  slug: string;
  name: string;
}

interface DeviceOption {
  slug: string;  // short slug (without child prefix)
  name: string;
}

export class GoogleFamilyLinkCardEditor extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config: FamilyLinkCardConfig | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass: HomeAssistant) {
    const firstTime = !this._hass;
    this._hass = hass;
    if (firstTime && this._config) this._render();
  }

  setConfig(config: FamilyLinkCardConfig): void {
    this._config = { ...config };
    this._render();
  }

  // ── Auto-detection ──────────────────────────────────────────────────────────

  /** Detect all children via sensor.<child>_daily_screen_time */
  private _detectChildren(): ChildOption[] {
    if (!this._hass) return [];
    const result: ChildOption[] = [];
    const seen = new Set<string>();
    for (const [eid, entity] of Object.entries(this._hass.states)) {
      const m = eid.match(/^sensor\.(.+)_daily_screen_time$/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      result.push({
        slug: m[1],
        name: (entity.attributes.child_name as string | undefined) ?? toEditorName(m[1]),
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Detect devices for a child by scanning sensor.<child>_<device>_screen_time_remaining.
   * Returns only the short device slug (without child prefix).
   */
  private _detectDevices(childSlug: string): DeviceOption[] {
    if (!this._hass || !childSlug) return [];
    const prefix = `sensor.${childSlug}_`;
    const suffix = "_screen_time_remaining";
    const result: DeviceOption[] = [];
    const seen = new Set<string>();

    for (const [eid, entity] of Object.entries(this._hass.states)) {
      if (!eid.startsWith(prefix) || !eid.endsWith(suffix)) continue;
      // Extract short device slug: everything between child prefix and suffix
      const devSlug = eid.slice(prefix.length, eid.length - suffix.length);
      if (!devSlug || seen.has(devSlug)) continue;
      seen.add(devSlug);

      const devName =
        (this._hass.states[`switch.${childSlug}_${devSlug}`]?.attributes?.friendly_name as string | undefined) ??
        (entity.attributes?.friendly_name as string | undefined) ??
        toEditorName(devSlug);
      result.push({ slug: devSlug, name: devName });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  private _render(): void {
    if (!this.shadowRoot) return;
    const cfg = this._config;
    const children = this._detectChildren();
    const currentChild = cfg?.child ?? "";
    const devices = this._detectDevices(currentChild);
    const selectedDevices = new Set(cfg?.devices ?? []);
    const noIntegration = !!this._hass && children.length === 0;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .editor { padding: 4px 0 8px; }
        .sec-title {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .5px; color: var(--secondary-text-color);
          margin: 14px 0 6px; display: flex; align-items: center; gap: 6px;
        }
        .sec-title:first-child { margin-top: 0; }
        .sec-title ha-icon { --mdc-icon-size: 15px; opacity: .7; }
        select, input[type=text], input[type=number] {
          width: 100%; box-sizing: border-box; padding: 8px 10px;
          border: 1px solid var(--divider-color, rgba(0,0,0,.2)); border-radius: 6px;
          background: var(--card-background-color, #fff); color: var(--primary-text-color);
          font-family: inherit; font-size: 14px; outline: none; transition: border-color .15s;
          appearance: none; -webkit-appearance: none;
        }
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath fill='%23888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center;
          padding-right: 30px; cursor: pointer;
        }
        select:focus, input:focus { border-color: var(--primary-color); }
        .field-wrap { margin-bottom: 10px; }
        .field-label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; display: block; }
        .hint { font-size: 11px; color: var(--secondary-text-color); opacity: .75; margin-top: 3px; }
        .device-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 6px; margin-top: 2px;
        }
        .device-item {
          display: flex; align-items: center; gap: 8px; padding: 7px 10px;
          border: 1px solid var(--divider-color, rgba(0,0,0,.12)); border-radius: 6px;
          cursor: pointer; transition: background .12s, border-color .12s;
          background: var(--card-background-color, #fff);
        }
        .device-item:hover { background: var(--secondary-background-color, rgba(0,0,0,.04)); }
        .device-item.selected {
          border-color: var(--primary-color);
          background: rgba(var(--rgb-primary-color, 3,169,244), .07);
        }
        .device-item input[type=checkbox] {
          width: 16px; height: 16px; flex-shrink: 0; cursor: pointer;
          accent-color: var(--primary-color); margin: 0; padding: 0; border: none;
        }
        .device-lbl {
          font-size: 13px; color: var(--primary-text-color);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .device-ico { --mdc-icon-size: 16px; color: var(--secondary-text-color); flex-shrink: 0; }
        .no-devices { font-size: 13px; color: var(--secondary-text-color); padding: 6px 0; opacity: .8; }
        .toggle-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; cursor: pointer; }
        .toggle-row input[type=checkbox] {
          width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color);
          margin: 0; padding: 0; border: none;
        }
        .toggle-lbl { font-size: 14px; color: var(--primary-text-color); }
        .warn-box {
          background: rgba(255,152,0,.1); border: 1px solid rgba(255,152,0,.3);
          border-radius: 6px; padding: 10px 12px; font-size: 13px;
          color: var(--warning-color, #e65100);
          display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px;
        }
        .warn-box ha-icon { --mdc-icon-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .divider { border: none; border-top: 1px solid var(--divider-color, rgba(0,0,0,.1)); margin: 14px 0 4px; }
        .no-child-hint { font-size: 13px; color: var(--secondary-text-color); padding: 4px 0; opacity: .8; }
      </style>

      <div class="editor">
        ${noIntegration ? `
          <div class="warn-box">
            <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
            <span>No HAFamilyLink entities found. Make sure the
              <strong>HAFamilyLink</strong> integration is installed and configured.</span>
          </div>` : ""}

        <div class="sec-title"><ha-icon icon="mdi:account-child"></ha-icon>Child</div>
        <div class="field-wrap">
          ${children.length > 0 ? `
            <select id="child">
              <option value="" ${!currentChild ? "selected" : ""}>— Select child —</option>
              ${children.map(c => `
                <option value="${escE(c.slug)}" ${c.slug === currentChild ? "selected" : ""}>
                  ${escE(c.name)}
                </option>`).join("")}
            </select>` : `
            <input type="text" id="child"
              value="${escE(currentChild)}"
              placeholder="e.g. john_smith" />
            <span class="hint">Entity slug of the child (HAFamilyLink integration)</span>`}
        </div>

        ${currentChild ? `
          <div class="sec-title"><ha-icon icon="mdi:devices"></ha-icon>Devices</div>
          ${devices.length > 0 ? `
            <div class="device-grid">
              ${devices.map(d => {
                const checked = selectedDevices.has(d.slug);
                return `<label class="device-item${checked ? " selected" : ""}">
                  <input type="checkbox" class="device-cb" value="${escE(d.slug)}" ${checked ? "checked" : ""} />
                  <ha-icon icon="mdi:cellphone" class="device-ico"></ha-icon>
                  <span class="device-lbl" title="${escE(d.name)}">${escE(d.name)}</span>
                </label>`;
              }).join("")}
            </div>
            <span class="hint" style="margin-top:6px;display:block">
              Select the devices that belong to this child
            </span>` : `
            <span class="no-devices">
              No devices auto-detected for this child yet.
              Data will populate after the integration fetches its first update.
            </span>`}
        ` : `<span class="no-child-hint">Select a child to configure devices.</span>`}

        <hr class="divider" />

        <div class="sec-title"><ha-icon icon="mdi:tune"></ha-icon>Options</div>
        <div class="field-wrap">
          <label class="field-label">Display name (optional)</label>
          <input type="text" id="name" value="${escE(cfg?.name)}"
            placeholder="Overrides auto-detected name" />
        </div>
        <div class="field-wrap">
          <label class="field-label">Max apps to show (1–10)</label>
          <input type="number" id="max_apps" value="${cfg?.max_apps ?? 5}" min="1" max="10" />
        </div>
        <div class="toggle-row">
          <input type="checkbox" id="show_apps" ${cfg?.show_apps !== false ? "checked" : ""} />
          <span class="toggle-lbl">Show App Usage section</span>
        </div>
        <div class="toggle-row">
          <input type="checkbox" id="show_schedules" ${cfg?.show_schedules !== false ? "checked" : ""} />
          <span class="toggle-lbl">Show Schedules section</span>
        </div>
      </div>`;

    this._attachEditorListeners();
  }

  private _attachEditorListeners(): void {
    const root = this.shadowRoot!;
    const childEl = root.getElementById("child");
    if (childEl) {
      childEl.addEventListener("change", () => this._onChildChange());
      if (childEl.tagName === "INPUT") childEl.addEventListener("input", () => this._onChildChange());
    }
    root.querySelectorAll<HTMLInputElement>(".device-cb").forEach((cb) => {
      cb.addEventListener("change", () => {
        cb.closest(".device-item")?.classList.toggle("selected", cb.checked);
        this._fireChange();
      });
    });
    ["name", "max_apps", "show_apps", "show_schedules"].forEach((id) => {
      const el = root.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => this._fireChange());
      if ((el as HTMLInputElement).type !== "checkbox") el.addEventListener("input", () => this._fireChange());
    });
  }

  private _onChildChange(): void {
    if (!this._config) return;
    const childEl = this.shadowRoot!.getElementById("child") as HTMLSelectElement | HTMLInputElement;
    this._config = { ...this._config, child: childEl.value.trim(), devices: [] };
    this._render();
    this._fireChange();
  }

  private _fireChange(): void {
    if (!this.shadowRoot || !this._config) return;
    const root = this.shadowRoot;
    const child = (root.getElementById("child") as HTMLSelectElement | HTMLInputElement | null)?.value.trim() ?? "";
    const devices = Array.from(root.querySelectorAll<HTMLInputElement>(".device-cb:checked")).map((cb) => cb.value);
    const name    = (root.getElementById("name")    as HTMLInputElement | null)?.value.trim() ?? "";
    const maxApps = parseInt((root.getElementById("max_apps") as HTMLInputElement | null)?.value ?? "5", 10) || 5;
    const showApps      = (root.getElementById("show_apps")      as HTMLInputElement | null)?.checked ?? true;
    const showSchedules = (root.getElementById("show_schedules") as HTMLInputElement | null)?.checked ?? true;

    const config: FamilyLinkCardConfig = {
      ...this._config, child, devices,
      max_apps: Math.min(10, Math.max(1, maxApps)),
      show_apps: showApps,
      show_schedules: showSchedules,
    };
    if (name) config.name = name; else delete config.name;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

function toEditorName(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function escE(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
