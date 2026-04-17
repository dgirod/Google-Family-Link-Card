import type { FamilyLinkCardConfig, HomeAssistant } from "./types";

export class GoogleFamilyLinkCardEditor extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config: FamilyLinkCardConfig | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  setConfig(config: FamilyLinkCardConfig): void {
    this._config = { ...config };
    this._render();
  }

  private _render(): void {
    if (!this.shadowRoot) return;
    const cfg = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        .form { padding: 8px 0; }
        .form-row {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        input[type="text"],
        input[type="number"] {
          padding: 8px 10px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-family: inherit;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s;
        }
        input:focus {
          border-color: var(--primary-color);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-direction: row;
        }
        .checkbox-row label {
          text-transform: none;
          letter-spacing: 0;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
        }
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary-color);
        }
        .hint {
          font-size: 11px;
          color: var(--secondary-text-color);
          opacity: 0.8;
          margin-top: 2px;
        }
      </style>
      <div class="form">
        <div class="form-row">
          <label>Child slug *</label>
          <input type="text" id="child"
            value="${escEditorVal(cfg?.child)}"
            placeholder="e.g. john_smith" />
          <span class="hint">Entity slug of the child (from HAFamilyLink integration)</span>
        </div>
        <div class="form-row">
          <label>Devices (comma-separated)</label>
          <input type="text" id="devices"
            value="${escEditorVal((cfg?.devices ?? []).join(", "))}"
            placeholder="e.g. iphone_john, tablet_john" />
          <span class="hint">Device slugs associated with this child</span>
        </div>
        <div class="form-row">
          <label>Display name (optional)</label>
          <input type="text" id="name"
            value="${escEditorVal(cfg?.name)}"
            placeholder="Overrides auto-detected name" />
        </div>
        <div class="form-row">
          <label>Max apps to show (1–10)</label>
          <input type="number" id="max_apps"
            value="${cfg?.max_apps ?? 5}" min="1" max="10" />
        </div>
        <div class="form-row">
          <div class="checkbox-row">
            <input type="checkbox" id="show_apps"
              ${cfg?.show_apps !== false ? "checked" : ""} />
            <label for="show_apps">Show App Usage section</label>
          </div>
        </div>
        <div class="form-row">
          <div class="checkbox-row">
            <input type="checkbox" id="show_schedules"
              ${cfg?.show_schedules !== false ? "checked" : ""} />
            <label for="show_schedules">Show Schedules section</label>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.querySelectorAll("input").forEach((el) => {
      el.addEventListener("change", () => this._valueChanged());
      el.addEventListener("input", () => this._valueChanged());
    });
  }

  private _valueChanged(): void {
    if (!this.shadowRoot || !this._config) return;

    const child = (this.shadowRoot.getElementById("child") as HTMLInputElement).value.trim();
    const devicesRaw = (this.shadowRoot.getElementById("devices") as HTMLInputElement).value;
    const devices = devicesRaw
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    const name = (this.shadowRoot.getElementById("name") as HTMLInputElement).value.trim();
    const maxApps = parseInt((this.shadowRoot.getElementById("max_apps") as HTMLInputElement).value, 10) || 5;
    const showApps = (this.shadowRoot.getElementById("show_apps") as HTMLInputElement).checked;
    const showSchedules = (this.shadowRoot.getElementById("show_schedules") as HTMLInputElement).checked;

    const config: FamilyLinkCardConfig = {
      ...this._config,
      child,
      devices,
      max_apps: Math.min(10, Math.max(1, maxApps)),
      show_apps: showApps,
      show_schedules: showSchedules,
    };
    if (name) config.name = name;
    else delete config.name;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

function escEditorVal(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}
