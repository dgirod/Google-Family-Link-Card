# Google Family Link Card — Home Assistant Lovelace Card

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/dgirod/Google-Family-Link-Card.svg)](https://github.com/dgirod/Google-Family-Link-Card/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](package.json)

A Lovelace card for Home Assistant that displays **Google Family Link** screen time and device controls for your kids. It visualizes the entities created by the [HAFamilyLink](https://github.com/noiwid/HAFamilyLink) integration — one card per child, with per-device lock, bedtime/school-time status, bonus time, and app usage.

---

## Features

- **Screen-time circle** — today's total screen time per child, always centered and readable regardless of length (e.g. `59 Min` or `1 Std 58 Min`)
- **Per-device cards** — lock/unlock button, status badges (Locked, Bedtime, School Time, Limit reached, Bonus active), and a used/remaining progress bar against the daily limit
- **One-tap bonus time** — `+15 / +30 / +60 Min` buttons per device, plus a reset button when a bonus is active
- **App usage** — top apps used today per child, with app icons, usage bars, and a configurable max (1–10)
- **Schedules overview** — bedtime and school-time windows with an active/inactive badge and a toggle
- **Auto-detection** — the visual card editor detects children and devices from your Home Assistant entities, no YAML required to get started
- German and English translations (auto-detected from your Home Assistant locale)

---

## Requirements

This card only **displays** data — it needs the [HAFamilyLink](https://github.com/noiwid/HAFamilyLink) integration installed and configured first, since that integration is what creates the underlying sensors, switches and buttons.

---

## Installation via HACS

1. Open HACS in your Home Assistant instance.
2. Go to **Frontend** → click the three-dot menu (⋮) → **Custom repositories**.
3. Add `https://github.com/dgirod/Google-Family-Link-Card` as category **Dashboard**.
4. Click **Download** on the Google Family Link Card.
5. Reload your browser (Ctrl+Shift+R) so Home Assistant picks up the new resource.
6. Edit a dashboard → **Add Card** → search for **Google Family Link Card**.

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | required | `custom:google-family-link-card` |
| `child` | string | required | Entity slug of the child (pick it from the dropdown in the visual editor) |
| `devices` | list | `[]` | Device slugs to show as device cards below the screen-time circle |
| `name` | string | auto-detected | Overrides the displayed child name |
| `show_apps` | boolean | `true` | Show the App Usage section |
| `max_apps` | number | `5` | Max number of apps shown (1–10) |
| `show_schedules` | boolean | `true` | Show the Schedules section (bedtime / school time) |

### Example

```yaml
type: custom:google-family-link-card
child: amelie
devices:
  - samsung_a52
name: Amélie
show_apps: true
max_apps: 5
show_schedules: true
```

The easiest way to configure the card is via the **visual editor** — it lists all children and devices it detects from your HAFamilyLink entities, so you rarely need to write YAML by hand.

---

## What the card shows

- **Screen Time Today** — a circle with the child's total screen time used today, and how many devices currently have a time limit
- **Devices** — one card per configured device with:
  - device name and lock/unlock toggle
  - badges: Locked, Bedtime, School Time, Limit reached, Bonus active
  - a progress bar: used / remaining, against the daily limit
  - **Add Time**: `+15 / +30 / +60 Min` buttons, plus a **Reset Bonus** button once a bonus is active
- **App Usage** — the top apps used today (configurable count), each with an icon, a usage bar, and the time spent
- **Schedules** — bedtime and school-time windows for the child, each with an active/inactive badge and an on/off toggle

---

## Entity reference

For troubleshooting, these are the entities the card reads (created by HAFamilyLink):

**Child-level** — `sensor.<child>_daily_screen_time` (or `sensor.<child>_family_link_<child>_daily_screen_time`)
- state: total minutes used today
- attributes: `child_name`, `apps` (list of `{name, package, minutes}`)

**Per device** (`<device>` = device slug):
- `sensor.<device>_screen_time_remaining` — remaining minutes; attributes: `used_minutes`, `total_allowed_minutes`, `daily_limit_enabled`, `device_name`
- `binary_sensor.<device>_bedtime_active`
- `binary_sensor.<device>_school_time_active`
- `binary_sensor.<device>_daily_limit_reached`
- `switch.<device>` — on = unlocked, off = locked
- `sensor.<device>_active_bonus` — active bonus minutes
- `button.<device>_15min` / `_30min` / `_60min` — grant bonus time
- `button.<device>_reset_bonus`

**Child-level schedules:**
- `switch.<child>_bedtime`
- `switch.<child>_school_time`

---

## Troubleshooting

**"Please define a child entity slug"** — no `child` set in the card config, or the HAFamilyLink integration isn't installed/configured yet.

**No devices shown** — device slugs aren't auto-added; pick them in the visual editor, or add them under `devices:` in YAML. Verify they exist as `sensor.<device>_screen_time_remaining`.

**Card doesn't update after a new release** — HACS/browser caching; check the version in HACS, then hard-refresh (Ctrl+Shift+R).

---

## License

MIT

## Credits

Built to visualize data from the [HAFamilyLink](https://github.com/noiwid/HAFamilyLink) integration by noiwid.

