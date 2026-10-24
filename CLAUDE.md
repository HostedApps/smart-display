# CLAUDE.md — Smart Display

Self-hosted DAKboard / MagicMirror² alternative: a browser-based wall-display ("kiosk") platform with a WYSIWYG dashboard editor, a fleet hub, and ~37 widgets. Production: **https://smart-kiosk.online** (Hostinger shared hosting). Primary hardware target: Raspberry Pi 3/4/5 running Chromium in kiosk mode; also Fire TV, iPad, Android, Windows mini-PCs.

## Repo layout

| Path | What |
|---|---|
| `frontend-angular/` | Angular 17 SPA (NgModule-based, **hash routing**). Admin editor, fleet hub, kiosk viewer, pairing, WallDrop — all in one app. |
| `backend-api/` | Plain PHP 8 + PDO/MySQL (MariaDB), one file per endpoint, no framework, no Composer. Served at `/api/`. |
| `backend-api/tests/` | PHP test suite (`run_all_tests.php`). **Never deployed** — it creates/deletes users. |
| `database/` | `schema.sql` (base), legacy `migration_v2..v6.sql` (historical, not run by the runner), `migrations/*.sql` (applied by `migrate.php`), `backup.sh`, `prune_logs.php`. |
| `raspberry-pi/` | `start_dashboard.sh` (Chromium kiosk supervisor loop), `display_power.sh` (HDMI-CEC / wlr-randr sleep), autostart `.desktop`, setup docs. |
| `docs/` | Product & design docs (see below) + `widget-examples/` for the custom-widget SDK. |
| `deploy.sh` | The only deploy path (rsync over SSH to Hostinger). |
| `.htaccess` | Apache SPA fallback; `index.html` never cached, hashed assets immutable; denies `.env`/`db.php`/`.sql`. |

## Routes (frontend, `app-routing.module.ts`)

Public: `/#/display/:token` (kiosk viewer), `/#/pair` and `/#/display` (6-digit PIN pairing), `/#/drop/:token` (WallDrop mobile beam), `/#/docs/installation`.
Admin (AuthGuard): `/#/admin/displays` (fleet hub), `/#/admin/editor/:token` (editor, `canDeactivate` leave guard), `/#/admin/superadmin` (+ SuperAdminGuard), `/#/admin/login`.

## Core architecture & conventions

### Widgets
- **`components/widgets/widget-registry.ts` is the single source of truth** for every widget type (label, icon, category, help text, component, default size, default config factory). The palette, `addWidget`, layer labels, help catalog and both renderers (editor canvas and kiosk viewer, via `NgComponentOutlet`) read from it.
- **Adding a widget** = create `xxx-widget.component.ts`, add its type to `WIDGET_TYPES` in `models/display.model.ts` (+ config interface), add one registry entry, and add its inspector form in `dashboard-editor.component.ts` (inspector forms are not yet schema-driven).
- **Honest data:** widgets inject the optional `LIVE_DISPLAY` token (`widget-context.ts`). On a live display never show sample/demo data — use `<app-widget-state>` empty/error states. Sample data is allowed only in editor previews.
- **Styling uses design tokens only** (`src/theme-tokens.css`: `--sd-*` surfaces, text, accent, status, radius, container-query type scale `--sd-fs-*`). Wrap content in the shared `.sd-card` frame; each widget box is a size container. Don't hardcode hex colours in widgets (exceptions: brand marks, data scales, media overlays). Six themes: `glass` (default), `paper`, `solid`, `mirror`, `ambient`, `contrast`; legacy `dark/light/minimal/oled` map onto these.
- Icons in editor/fleet chrome are inline Lucide SVGs via `components/shared/icon.component.ts` — no emoji in UI chrome.
- **Shared services, don't duplicate:** `ClockService` (one second-aligned tick — no per-widget `setInterval(…,1000)`), `DataCacheService` (dedupe + TTL + stale-if-error for HTTP fetches), `WidgetBusService` (cross-widget state: `weather`, `nextEvent`), `NotificationService` (toasts — no `alert()`/`confirm()`).
- **Raspberry Pi performance matters.** Performance mode (auto on ARM/low-memory) strips blur/shadows/animations. Avoid `transition: all`, infinite animations, `backdrop-filter` without the perf-mode escape, and template getters that recompute every CD pass.
- Custom widgets (SDK, `custom-widget.component.ts`) run in `sandbox="allow-scripts"` iframes with an opaque origin and a `postMessage` protocol (`sd:init`, `sd:tick`, `sd:data`, `sd:ready`). **Never add `allow-same-origin`**. Spec: `docs/WIDGET_SDK.md`.

### Layouts & rendering
- Layouts are designed on a fixed canvas (`utils/canvas-size.util.ts` → `getCanvasSize()`, shared by editor and viewer) and scaled on the kiosk: Fit (default) / Fill / Stretch / Actual, plus TV overscan safe area.
- Pages rotate as a carousel; widgets and pages have schedules; rules engine, linked widgets, lock/hide and layer names live in `widget.style_json._meta` (no dedicated columns). `save_display.php` **upserts widgets by id** (ids must stay stable — push_widget webhooks and `linkedWidgetId` depend on them) and returns an `id_map` for new widgets; `get_display.php` unpacks `_meta`.
- Editor: right-hand inspector (Content / Style / Behaviour tabs), pointer events with smart guides, local draft autosave + restore, version history (last 20 publishes, `display_versions.php`), publish checks, device preview. `dashboard-editor.component.ts` is ~6.7k lines — splitting it is a planned but not-yet-done task; keep new code out of it where a separate component/util works.

### Kiosk runtime (`display-viewer.component.ts`)
- Kiosks authenticate with a **device token** (`X-Device-Token` header, stored in `localStorage.device_token`) obtained via PIN pairing; admins with a Bearer token. `auth.interceptor.ts` must **never log out or redirect a kiosk** on 401 (`/display/` or `/pair` routes). On 401/403 with a device token present the viewer keeps retrying instead of wiping the token — a Pi that boots before Wi-Fi must not get unpaired.
- `emergency.php` is polled every **5 s**: returns emergency takeover state, a **layout version stamp** (kiosk reloads config when it changes → "instant publish"), and queued **remote commands** (`reload`, `identify`, `sleep`, `wake`, `goto_page`, `screenshot`; 2-min expiry, never replayed after restart). Full config resync is a 5-min safety net.
- Heartbeat every 60 s (`display_heartbeat.php`) and an `html2canvas-pro` screenshot thumbnail (kiosk-only lazy chunk) every 15 min feed the fleet hub's online/stale/offline status. Heartbeats must not bump the layout version.
- Offline cache (`offline-cache.service.ts`) serves the last config when the network is down; retry fast (~8 s) on errors. `index.html` body has an inline dark background to avoid a white flash on boot.
- Bump `APP_VERSION` in `src/app/app-version.ts` for kiosk-visible releases (shown in the fleet hub).

### Backend
- Every endpoint starts with `require_once 'db.php'`, which sets CORS/JSON headers, loads `.env` (searched outside web root first), creates `$pdo` (exceptions, assoc fetch, real prepared statements), and provides helpers: `getAuthenticatedUser($pdo)`, `checkRateLimit()`, `isSafeExternalUrl()` (SSRF guard — use it for any server-side fetch, e.g. in `proxy.php`), `sanitizeText()`, `logUserActivity()`, `resolveGeminiModel()`, fleet helpers.
- Always use bound parameters. Authorize by ownership: owner (`display.user_id`), `superadmin` role, or a paired device token for that display.
- Users: public registration is disabled; 50-user ceiling (`MAX_SYSTEM_USERS`); login supports email/password, email OTP, reCAPTCHA v2, Google Identity Services. Secrets come from env (`backend-api/.env.example`) — never commit real keys.
- New features should **degrade gracefully when their migration hasn't run** (e.g. version stamp null → old 60 s polling). Existing code follows this pattern.

### Database migrations
- Add new files to `database/migrations/` (sorted by filename). They run **without a transaction** (MySQL DDL auto-commits), so they must be **idempotent**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` (MariaDB syntax).
- Run locally: `php database/migrate.php` (uses `backend-api/db.php`; `SD_DB_PHP` overrides the path). Tracked in the `migrations` table.

## Commands

```bash
# Frontend dev server (expects API at http://localhost:8000/api — environment.ts)
cd frontend-angular && npm start

# Production build (output: frontend-angular/dist/smart-display-frontend)
cd frontend-angular && npm run build -- --configuration production

# Frontend specs (Karma/Jasmine): watch mode, or once in headless Chrome as CI does
cd frontend-angular && npm test
cd frontend-angular && npm run test:ci

# Local backend: PHP 8.2 + MariaDB. Build the DB, write backend-api/.env (see .env.example), serve /api on :8000
DB_HOST=127.0.0.1 DB_USER=root DB_PASS=... scripts/setup-dev-db.sh
scripts/dev-api.sh

# Backend tests — hit the running dev API over HTTP (SD_API_BASE, default http://localhost:8000/api)
# and the DB from backend-api/.env. NEVER run against production.
php backend-api/tests/run_all_tests.php

# Deploy to production (CI check → build → DB backup → backend rsync → migrations → frontend rsync → smoke test)
./deploy.sh prod
```

- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every PR: frontend specs + production build, PHP lint, and the backend suite against MariaDB 11.4 / PHP 8.2 (production's versions). `deploy.sh` refuses to deploy a commit that is uncommitted, unpushed or without green CI (`SKIP_CI_CHECK=1` overrides for emergencies). There's no PHP on the main dev Mac, so CI is where PHP actually runs — push a branch to test backend changes.
- Production bundle budget: initial 1 MB warn / 2 MB error; component styles 35 KB warn / 50 KB error.
- `deploy.sh` is outward-facing (touches the live site and DB) — only run it when the user asks.
- Add specs next to the code (`*.spec.ts`) and backend tests in `backend-api/tests/` (register them in `run_all_tests.php`); widget logic that only fails in production (timers, retries, external APIs) is exactly what they're for.

## Docs to read before larger work

- `docs/DESIGN_ENHANCEMENT_PLAN.md` — the active plan (code-audit findings F1–F15, design principles, Phases 0–5 with a **Progress** table of what's done / not done). Update its Progress table when finishing plan items.
- `docs/PRODUCT_ROADMAP.md` — competitive matrix (DAKboard, Skylight, Hearth, MagicMirror²) and Horizons 1–3 roadmap. Its "Phase 1–4" are the widget/integration roadmap, distinct from the design plan's Phases 0–5.
- `docs/WIDGET_SDK.md` — custom-widget protocol, security model, theme tokens.
- `docs/ADMIN_USER_GUIDE.md`, `docs/CLIENT_INSTALLATION_GUIDE.md`, `raspberry-pi/README_*.md` — end-user docs; keep them in sync with the registry and display settings when features change.

Design principles (from the plan): glanceable from 3 m; one frame, many skins (themes change tokens, not widget code); calm by default; **honest data**; resolution-independent; edit in 3 clicks.

## Open / not-yet-done (per the plan)

Schema-driven inspector forms; splitting the editor component; multi-select/grouping in the editor; onboarding wizard; light admin theme; `OnPush` on all widgets; SSE push (polling chosen for shared hosting); Pi CPU temp/reboot (needs an on-device agent); Dropbox/OneDrive/Immich photo sources; photo collage/captions; page-schedule timeline; offline PWA; family profiles; voice/presence; native Android/Fire TV wrappers.

## Working conventions

- Commit style: Conventional Commits with scope — `feat(phase5): …`, `fix(kiosk): …`, `fix(deploy): …`, `docs: …`, `sec(auth): …`. Larger commits have a bulleted body grouped by area and a "Verified …" paragraph describing how it was tested.
- Commit to `main` directly for small fixes; multi-phase work has gone through PRs (#1, #2).
- Kiosk regressions are the most costly bugs (a blank/white or unpaired screen on a wall nobody is watching). When touching the viewer, interceptor, pairing or `start_dashboard.sh`, think through: cold boot without network, 401/403 with a device token, server 5xx, and Chromium crash-restore.
