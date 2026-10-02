# Smart Display — Design & UX Enhancement Plan

> Scope: visual design, usability, and feature depth of the **display runtime**, the **dashboard editor**, and the **fleet hub**, benchmarked against **DAKboard** and **MagicMirror²**.
> Companion to [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md), which covers integrations. This plan is about making what already exists *look* and *feel* first-class.

---

## 1. Where we stand

Smart Display already ships more widgets (35) than DAKboard's block catalog and offers things neither competitor has: WallDrop, emergency takeover, AI flyer scanner, TouchHub dock. **The gap is not feature count — it is polish, consistency, and scale.** DAKboard wins on "looks professional out of the box on any screen"; MagicMirror² wins on "ecosystem + aesthetic identity + runs forever on a Pi".

### 1.1 Key findings from the code audit

| # | Finding | Evidence | Impact |
|---|---|---|---|
| F1 | **No resolution scaling.** Widgets are absolutely positioned in raw px; a 1080p layout clips on 720p and floats on 4K. | `display-viewer.component.ts:97-108` | 🔴 Biggest visual defect vs DAKboard |
| F2 | **No shared widget frame.** The glass card (`linear-gradient … blur(16px)`, radius 16) is copy-pasted into ~30 widgets; Slack/Spotify/Gauge/Reddit drift to different backgrounds. Wrapper radius 12 ≠ card radius 16. | `widgets/clock:35`, `slack:40`, `gauge:92`, `reddit:62`, viewer `:106` | 🔴 Inconsistent look |
| F3 | **Theme system is skin-deep.** `dark/light/oled` only change canvas bg; widgets hardcode `#fff`/`#94a3b8`, so **Light theme is broken**. `--glass-*` tokens are defined but never used; 14 widget files use no CSS variables at all. | `styles.css:5-60` | 🔴 |
| F4 | **Per-widget style fields ignored.** `backgroundColor`, `textColor`, `backdropBlur` are stored but never applied; `dimLevel` unused. | `display.model.ts:79-86, 450` | 🟠 Silent broken settings |
| F5 | **No typography scale.** Ad-hoc rem sizes; text doesn't grow with widget size (only clock uses `clamp`). | widgets/* | 🟠 Readability at 3 m distance |
| F6 | **Pi performance.** `backdrop-filter` in all 37 widgets, ~8 independent 1 s timers, no `OnPush`, no `runOutsideAngular`, template getters re-evaluated every CD pass, `transition: all` on every wrapper. | viewer `:728`, `:268-273` | 🟠 Jank on Pi 3/4 |
| F7 | **Each widget fetches independently;** no shared cache/dedupe; inconsistent loading/empty/error states (several silently fall back to *demo data*). | weather, stock, sun-moon, ai-briefing | 🟠 Users see fake data |
| F8 | **Polling only** (60 s config, 5 s emergency). Push widget API changes take up to 60 s to appear. | `backend-api/*` | 🟡 |
| F9 | **Editor is a 5,674-line single component.** Widget list duplicated in 5 places (palette, `addWidget` switch, label map, canvas `*ngIf` chain, inspector forms). | `dashboard-editor.component.ts` | 🔴 Slows every future feature |
| F10 | **Inspector lives under the palette** — users scroll past 35 tiles to edit the selected widget. No search/categories/drag-from-palette. | DE:117-262 | 🔴 Core usability |
| F11 | **Editor is mouse-only & desktop-only** (fixed 400 px sidebar, `mousedown` handlers, 2 media queries). Zero `aria-`/`role` attributes. | DE:1913, 4826 | 🟠 |
| F12 | **Feedback via `alert()`/`confirm()`,** no dirty-state indicator, no leave guard, no version history. | DE:5275, 3987 | 🟠 |
| F13 | **Fleet hub has no live status:** no online/offline, no last-seen on cards, placeholder mini-grid instead of a real thumbnail. | `display-list.component.ts:91-130` | 🟠 DAKboard shows this |
| F14 | **Data/content bugs:** template chores use `assignedTo/streak` but widget reads `memberId/points`; commute template uses `etaMinutes/trafficLevel` vs model `durationMinutes/trafficStatus`; "29 Widgets" badge (35 exist); "19-Widget Catalog"; "2K QHD (Your Monitor)" label. | `dashboard-templates.util.ts:56`, DE:114, DE:1567 | 🟡 Quick fixes |
| F15 | **Repo hygiene:** `tmp_layout.ts`, `update_layouts.ts`, `update_target.txt` are unreferenced scratch copies. | repo root | 🟢 |

### 1.2 Competitor benchmark — what to learn from each

| Capability | DAKboard | MagicMirror² | Smart Display today | Target |
|---|---|---|---|---|
| Layout scales to any resolution | ✅ | ✅ (region-based) | ❌ | ✅ Fit/Fill scaling |
| Consistent block styling, global style presets | ✅ | ✅ (one CSS) | ⚠️ | ✅ Design tokens + theme presets |
| Per-block bg / font / color / shadow | ✅ | via CSS | ⚠️ partially stored, not applied | ✅ |
| "Mirror" aesthetic (pure black, thin type, no cards) | ❌ | ✅ signature look | ❌ | ✅ *Mirror theme* |
| Region/snap layout (top_left, middle_center…) | grid | ✅ | freeform only | ✅ Regions as optional layout mode |
| Module ecosystem (≈1,000 3rd-party modules) | ❌ | ✅ | ❌ | ✅ Widget SDK + gallery |
| Inter-module notifications | ❌ | ✅ `sendNotification` | linkedWidgetId only | ✅ Event bus |
| Device status / screenshots / remote refresh | ✅ | ❌ | ❌ | ✅ |
| Calendar views (week, 2-week, 3-day, month, agenda) | ✅ | agenda | month + agenda | ✅ |
| Photo sources (Dropbox, OneDrive, Flickr, local) | ✅ | ✅ | Google, iCloud, Drive, Reddit, Unsplash | + Dropbox/OneDrive/Immich |
| Compliments / contextual greetings | ❌ | ✅ | quotes only | ✅ Greeting widget |
| Touch-first interactivity | ⚠️ | ❌ | ✅ TouchHub | keep & polish |
| Mobile-friendly editor | ✅ | n/a | ❌ | ✅ |

**Positioning:** *"DAKboard's polish + MagicMirror's openness + family features neither has — free & self-hostable."*

---

## Progress

| Phase | Status |
|---|---|
| Phase 0 — Hygiene & quick wins | ✅ Done |
| 3.1 Widget registry (single widget list) | ✅ Done — `components/widgets/widget-registry.ts`; palette, defaults, labels, help and both renderers read from it. Inspector forms are still per-widget (schema-driven forms remain in 3.1/3.2). |
| Phase 1 — Design system | ✅ Done — `src/theme-tokens.css` (tokens, container-relative type scale, `.sd-card` frame), six theme presets + accent colour, all 35 widgets on tokens (803 → 203 hardcoded colour lines; the rest are brand marks, data scales and media overlays), Lucide SVG icons in editor/fleet chrome. |
| Phase 2 onward | Not started |

## 2. Design principles

1. **Glanceable from 3 m.** Every widget has one hero number/word; secondary info is ≥ 60 % smaller; minimum on-screen text = 1.6 % of screen height.
2. **One frame, many skins.** All widgets render inside a shared `<sd-widget-frame>`; themes change tokens, never widget code.
3. **Calm by default.** No infinite animations unless they carry information (radar, alerts). Respect a `performanceMode`.
4. **Honest data.** Never show demo data on a live display; show skeleton → content → explicit empty/error state.
5. **Resolution-independent.** Design once at a reference canvas, render anywhere.
6. **Edit in 3 clicks.** Select → right inspector → change. No scrolling to find settings.

---

## 3. The plan

Effort: **S** ≤ 2 days · **M** ≈ 1 week · **L** ≈ 2–3 weeks (one developer).

### Phase 0 — Hygiene & quick wins (≈ 1 week)

| Item | Effort | Fixes |
|---|---|---|
| Delete `tmp_layout.ts`, `update_layouts.ts`, `update_target.txt` | S | F15 |
| Fix template config keys (chores → `memberId/points`, commute → `durationMinutes/trafficStatus`); add a spec that validates every template config against its widget's interface | S | F14 |
| Derive palette count and help copy from the registry (no hardcoded "29"/"19"); rename "2K QHD (Your Monitor)" | S | F14 |
| Apply `backgroundColor`, `textColor`, `backdropBlur`, `dimLevel` in the viewer | S | F4 |
| Replace demo-data fallbacks on the *display* with an explicit "Not configured — open editor" empty state (keep demo data in editor previews only) | S | F7 |
| Replace `alert()`/`confirm()` with a toast + confirm-dialog service | S | F12 |

### Phase 1 — Design system foundation (≈ 3 weeks)

**1.1 Design tokens** (`styles/tokens.css`)
- Semantic tokens only: `--sd-surface`, `--sd-surface-raised`, `--sd-border`, `--sd-text`, `--sd-text-muted`, `--sd-accent`, `--sd-success|warning|danger`, `--sd-radius`, `--sd-blur`, `--sd-shadow`, `--sd-gap`.
- Type scale in container-query units: `--sd-fs-hero: clamp(…, 22cqh, …)`, `--sd-fs-title`, `--sd-fs-body`, `--sd-fs-caption`. Widgets become `container-type: size`, so text scales with the widget box automatically (F5).

**1.2 `<sd-widget-frame>` shared component**
- Owns card background, radius, border, padding, optional header (icon + title + "updated 2 m ago"), and the **loading skeleton / empty / error** slots.
- Migrate all 35 widgets to it; remove per-widget glass CSS (F2). Target: zero hex colours inside `components/widgets/*` (lint rule).

**1.3 Theme presets** (replace dark/light/oled with a token-driven gallery)

| Preset | Inspired by | Notes |
|---|---|---|
| **Glass** (current look, cleaned) | — | default |
| **Mirror** | MagicMirror² | pure `#000`, no cards, thin Roboto Condensed/Inter Light, white/grey only — for two-way mirrors & OLED |
| **Paper / Light** | DAKboard light | actually works now that widgets use tokens |
| **Solid Cards** | DAKboard | opaque cards, no blur — also the Pi performance default |
| **Frame / Ambient** | Nixplay / Aura | photo-first, minimal text overlay with scrim |
| **High Contrast** | accessibility | WCAG AAA, large type |

Plus: accent-colour picker, card opacity slider, corner-radius & shadow presets, auto light/dark by sunrise/sunset (Sun & Moon widget already geocodes).

**1.4 Icon system** — replace emoji in UI chrome with an SVG icon set (e.g. Lucide, inline sprite) and weather glyphs (Meteocons). Emoji remain available as user content (chores, notes).

### Phase 2 — Display runtime quality (≈ 3 weeks)

| Item | Effort | Notes |
|---|---|---|
| **Resolution-independent rendering** — store a `designWidth/designHeight` per display; wrap widgets in a stage with `transform: scale()` and modes *Fit* (letterbox), *Fill* (crop), *Stretch*; safe-area/overscan inset setting for TVs | M | F1 — highest-value item in this plan |
| **Page transitions** — fade / slide / Ken-Burns cross-fade, per page, GPU-only (`opacity`/`transform`) | S | |
| **Performance mode** (auto-on for Pi 3/4 via UA/`hardwareConcurrency` heuristic, manual toggle): disables `backdrop-filter`, infinite keyframes, box-shadow animation | M | F6 |
| **Change-detection overhaul**: `OnPush` on all widgets; one shared `ClockService` tick run `outsideAngular` and emitting per-minute/second signals; memoise `activeWidgets`; replace `*ngIf` chain with `NgComponentOutlet` from the registry | M | F6, F9 |
| **Shared `DataService`** — keyed cache with TTL + request dedupe (weather fetched once per location, reused by weather widget, alert banner, rules engine, greeting), stale-while-revalidate, backoff on failure | M | F7 |
| **Real-time push** — Server-Sent Events endpoint (`events.php`) for config publish, emergency, push_widget, WallDrop; fall back to polling | M | F8. Instant "Publish" is a DAKboard-level expectation |
| **Burn-in protection for whole dashboard** — ±4 px orbit every 10 min, optional periodic pixel refresh | S | |
| **Ambient brightness schedule** — use `dimLevel` + time-based dimming curve, not just on/off night mode | S | F4 |

### Phase 3 — Editor UX redesign (≈ 5 weeks)

**3.1 Widget Registry (do this first — unblocks everything)**
```ts
// widgets/registry.ts
export interface WidgetDefinition<C> {
  type: WidgetType; label: string; icon: string; category: 'Time'|'Info'|'Family'|'Media'|'Smart Home'|'Data'|'Decor';
  component: Type<unknown>; defaultSize: Size; defaultConfig: C;
  configSchema: FieldSchema[];            // drives the inspector form
  minSize?: Size; keywords?: string[];
}
```
Palette, `addWidget`, labels, canvas render, viewer render and inspector all read from this. Adding a widget = 1 file + 1 registry line (F9).

**3.2 Layout: three-pane editor**
```
┌ Top bar: display name · page tabs · undo/redo · zoom · device preview ▾ · ● Saved · [Publish] ┐
├ Left: Add (search + categories, drag to canvas) / Layers / Pages ──┬ Canvas ──┬ Right: Inspector ┤
│                                                                   │          │ Content │ Style │ Behaviour │
└────────────────────────────────────────────────────────────────────┴──────────┴───────────────────┘
```
- Inspector moves to a **right panel** with tabs *Content* (schema-driven form), *Style* (bg, text colour, blur, border, shadow, font, padding, header on/off), *Behaviour* (schedule, rules, links, lock) (F10).
- Palette: search box, categories, recently used, drag-and-drop onto canvas, hover preview thumbnail.
- Split DE into `editor-shell`, `canvas`, `palette`, `inspector`, `layers-panel`, `pages-panel`, `settings-panel`, plus `editor.store` (signals) holding state + history.

**3.3 Interaction upgrades**
- Pointer events (mouse + touch + pen) for drag/resize (F11); pinch-zoom on tablets.
- Multi-select (shift/marquee), group/ungroup, distribute evenly, smart alignment guides & spacing indicators (Figma/DAKboard-style), copy/paste across pages and displays.
- Optional **Grid / Regions mode** (MagicMirror-style 9 regions, or 12-column grid) in addition to freeform — great for beginners and for auto-reflow between orientations.
- Proper colour pickers (with theme swatches + eyedropper), gradient builder, image picker with upload (reuse WallDrop upload pipeline) instead of free-text URL fields.

**3.4 Safety & confidence**
- Autosave draft + explicit **Publish**; "● Unsaved changes" indicator; route-leave guard (F12).
- **Version history** (last 20 publishes, restore) — new `display_versions` table.
- **Preview mode**: device frames (TV 16:9, portrait, iPad, Pi 7"), simulate time-of-day (tests schedules/night mode), "open live on this browser".
- Inline validation (URLs, required API keys, min/max sizes) with a "3 issues" badge before publish.

**3.5 Onboarding**
- First-run wizard: *Who is this for?* (Family / Office / Mirror / Photo frame) → *Location* → *Calendars & photos* → generated starter layout.
- Expand templates from 6 → 20+, each with a real thumbnail, in a gallery with filters (resolution, orientation, theme).
- Empty-state canvas with "Start from template" / "Add your first widget".

**3.6 Accessibility & responsive admin**
- `aria-*`, roles, focus rings, keyboard-reachable canvas items (Tab to cycle, arrows to nudge — already partly there).
- Admin pages responsive down to 768 px (tablet editing) and 375 px (fleet + quick edits on phone).
- Light/dark mode for the admin UI itself.

### Phase 4 — Fleet hub (≈ 2 weeks)

| Item | Notes |
|---|---|
| **Live status** on cards: 🟢 online / 🟡 stale / 🔴 offline, last-seen, app version, resolution | heartbeat already exists via device ping |
| **Real thumbnails** — viewer renders a periodic canvas snapshot (html2canvas, low-res) and uploads it; editor also snapshots on publish | replaces placeholder mini-grid (F13) |
| **Remote actions**: reload, change page, sleep/wake, identify (flash device name), reboot (Pi agent) | via SSE channel from Phase 2 |
| **Bulk ops**: publish layout to many displays, duplicate display, share read-only link / template export | |
| **Health**: Pi CPU temp, memory, uptime (optional tiny agent in `raspberry-pi/`) | roadmap H3.1 |

### Phase 5 — Feature depth vs competitors (ongoing, ≈ 6+ weeks)

**Closing DAKboard gaps**
- Calendar: week, 2-week, 3-day and "today + upcoming" views; per-member colour legend; event icons; weather-on-day overlay.
- Photo: Dropbox, OneDrive, Immich, local USB folder (Pi); face-aware crop; photo metadata caption (date/place); collage mode (2–4 photos).
- Text/Data blocks with templating: `{{weather.temp}}°, {{calendar.next.title}}` using the shared DataService.
- Screen "playlists" per time-of-day (morning family / daytime photo frame / evening calm) — builds on existing page schedules with a visual timeline editor.

**Closing MagicMirror² gaps**
- **Mirror mode** end-to-end: Mirror theme + region layout + portrait default + no-touch chrome + compliments.
- **Greeting / Compliments widget**: time-of-day and weather-aware messages ("Good morning, bring an umbrella ☔"), per-member names.
- **Widget event bus** (MagicMirror `sendNotification` analogue): widgets publish/subscribe typed events — e.g. calendar "event starting" → chime + page switch; doorbell → camera PiP; presence → wake. Generalises `linkedWidgetId` and the rules engine.
- **Widget SDK & gallery**: Web Component-based custom widgets (`<sd-custom-widget src=…>`) in a sandboxed iframe/Shadow DOM, with a manifest (name, config schema, permissions). Seed with 10 first-party examples (sports scores, package tracking, flight tracker, EV battery, Duolingo streak, public-transit departures, F1/cricket, Pi-hole stats, UniFi stats, printer ink).
- **Local-first mode**: offline-capable PWA cache of widgets and assets; optional "LAN-only" deployment profile for privacy-focused MagicMirror users.

**Unique differentiators to double down on**
- Family profiles with avatars across chores, calendar, meals, WallDrop (one identity model).
- Voice + AI (roadmap 2.1) surfaced via TouchHub mic button.
- Presence/motion wake (roadmap 2.4) wired into the event bus.

---

## 4. Sequencing & milestones

```
Wk 1      Phase 0 quick wins
Wk 2-4    Phase 1 tokens · widget-frame · theme presets · icons
Wk 3-6    Phase 3.1 registry  ──► Phase 2 scaling · perf · DataService · SSE
Wk 7-11   Phase 3.2-3.6 editor redesign
Wk 12-13  Phase 4 fleet hub
Wk 14+    Phase 5 feature depth (calendar views, photo sources, Mirror mode, SDK)
```

Critical path: **Registry (3.1) → widget-frame (1.2) → scaling (2) → editor split (3.2)**. Doing the registry and frame first turns every later change from "edit 35 files" into "edit 1".

## 5. Success metrics

| Metric | Today | Target |
|---|---|---|
| Hex colours in `components/widgets/*` | hundreds | 0 |
| Largest component file | 5,674 lines | < 600 |
| Places to touch to add a widget | 5 | 1 |
| Layout correct at 720p / 1080p / 4K from one design | ❌ | ✅ |
| Pi 4 idle CPU on Family template | measure | −40 % |
| Publish → visible on display | ≤ 60 s | < 2 s |
| Time for new user to first useful dashboard | measure | < 3 min (wizard) |
| Lighthouse a11y score (admin) | measure | ≥ 90 |
| Displays showing demo data in production | possible | 0 |

## 6. Risks

- **Migration of saved layouts** to scaled design canvas — add `designWidth/Height` defaulting to the current resolution preset so existing displays render identically.
- **Theme regressions** across 35 widgets — add Playwright visual snapshots per widget × theme (Chromium is available in CI) before migrating.
- **SSE on shared PHP hosting** — keep polling fallback; consider a small Node/Go sidecar later.
- **SDK security** — sandboxed iframes with `postMessage` API only; no access to tokens.
