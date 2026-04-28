# Google Family Link Card — Entwicklungsanweisungen

## Projekt-Übersicht
HACS Custom Lovelace Card für Google Family Link Screentime-Daten.
Repository: https://github.com/dgirod/Google-Family-Link-Card

## Repo-Struktur
```
src/                    ← TypeScript Source-Dateien
  google-family-link-card.ts  ← Haupt-Karte (enthält CARD_VERSION)
  editor.ts             ← Karten-Editor
  translations.ts       ← i18n
  types.ts              ← TypeScript-Typen
  utils.ts              ← Hilfsfunktionen
dist/                   ← Gebauter Output (NICHT manuell bearbeiten)
  google-family-link-card.js
.github/workflows/      ← GitHub Actions
  build-dist.yml        ← Auto-Build bei Push auf main
  auto-release.yml      ← Auto-Release bei Versionsänderung
  release.yml           ← Release-Asset bei Tag-Push (Legacy)
hacs.json               ← HACS-Konfiguration + Version
package.json            ← npm-Konfiguration + Version
rollup.config.js        ← Build-Konfiguration
tsconfig.json           ← TypeScript-Konfiguration
```

## Versionierung
Bei jedem Release müssen **drei Stellen** synchron aktualisiert werden:

1. `hacs.json` → `"version": "x.y.z"`
2. `package.json` → `"version": "x.y.z"`
3. `src/google-family-link-card.ts` → `const CARD_VERSION = "x.y.z";`

## Branch-Strategie
- **Direkt auf `main` committen** — keine Feature-Branches erstellen.
- Claude Code soll alle Änderungen direkt auf `main` pushen.

## Build & Release (automatisch via GitHub Actions)
Der Build- und Release-Prozess ist vollständig automatisiert:

1. Push auf `main` → `build-dist.yml` baut `dist/google-family-link-card.js` automatisch
2. Versionsänderung in `hacs.json` → `auto-release.yml` erstellt automatisch Git-Tag + GitHub Release

**Wichtig:** Niemals `dist/` manuell bearbeiten oder committen. Das erledigt der Workflow.

## Was Claude Code tun soll
1. Source-Dateien in `src/` bearbeiten
2. Bei neuen Features/Fixes: Version in allen 3 Stellen hochzählen
3. Direkt auf `main` committen und pushen
4. **Nicht** versuchen Git-Tags zu pushen (wird vom Proxy blockiert)
5. **Nicht** `dist/` bearbeiten (wird automatisch gebaut)

## Entwicklungshinweise
- `npm install --legacy-peer-deps` wegen Dependency-Konflikten
- Build-Befehl: `npm run build` (Rollup)
- Die Karte nutzt LitElement / lit-html
- Entity-Naming-Pattern: `sensor.<child>_family_link_<child>_*`
- HACS erkennt Versionen über GitHub Releases oder Fallback via `hacs.json` auf `main`

## Semantic Versioning
- **Patch** (x.y.Z): Bugfixes, kleine Korrekturen
- **Minor** (x.Y.0): Neue Features, neue Entities
- **Major** (X.0.0): Breaking Changes
