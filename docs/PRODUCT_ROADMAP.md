# Smart Display: Strategic Product Roadmap & Competitive Landscape (2026 – 2027)

---

## Executive Summary

**Smart Display** has evolved into a versatile, high-performance, web-native digital wall canvas combining **custom visual layout freedom** (like DAKboard), **family productivity & routine management** (like Skylight Calendar & Hearth Display), and **zero-friction hardware commissioning** (like Yodeck).

> **Phase naming:** "Phase 1–4" in this document refers to the original *widget & integration* roadmap. The *design & UX* work (themes, scaling, editor redesign, fleet hub, widget SDK) is tracked separately as Phases 0–5 in [`DESIGN_ENHANCEMENT_PLAN.md`](./DESIGN_ENHANCEMENT_PLAN.md), whose Progress table is the most up-to-date record of what has shipped.

This document outlines:
1. **Competitive Landscape Benchmark** (Feature-by-Feature matrix against market leaders).
2. **Current Implementation Status** (What is shipped, hardened, and verified live in production).
3. **Phased Feature Roadmap** (Organized into Horizons 1, 2, and 3) to guide ongoing engineering and product evolution.

---

## 1. Competitive Landscape Matrix

| Feature Domain | Smart Display (Current) | DAKboard (v4) | Skylight Calendar | Hearth Display | MagicMirror² |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pricing & Deployment** | **Free / Self-Hosted + Cloud** | $5–$12/mo Subscription | $150–$600 Proprietary HW + Sub | $300+ HW + $10/mo Sub | Free / Self-Hosted Open Source |
| **Hardware Compatibility** | **Any Browser, Pi 3/4/5, Fire TV, iPad, Android** | Pi, Fire TV, Web, Custom Frame | Proprietary Touch Display | Proprietary Touch Display | Raspberry Pi (Linux only) |
| **Drag & Drop Canvas Editor** | ✅ **WYSIWYG, touch & pen, smart guides, drafts, version history** | ✅ WYSIWYG Grid/Freeform | ❌ Fixed Templates Only | ❌ Fixed Templates Only | ❌ Manual JSON / CSS Config |
| **Resolution Support** | ✅ **Design once, Fit/Fill scaling to any screen, TV safe area** | ✅ 1080p, 4K | ❌ 1080p fixed | ❌ 1080p fixed | ⚠️ Depends on CSS |
| **6-Digit PIN Device Pairing** | ✅ **Instant Zero-Friction PIN Pairing** | ⚠️ Serial Number / Web Login | ⚠️ QR Code / Account App | ⚠️ Account Pairing | ❌ Manual Token Config |
| **Multi-Feed Calendar Grid & Agenda** | ✅ **Multi-iCal, Google, Color-Coded Members** | ✅ iCal, Google, Outlook, Apple | ✅ Google, Outlook, Apple | ✅ Google, Apple, Outlook | ✅ iCal Modules |
| **AI Paper Schedule / Flyer Scanner** | ✅ **Gemini flyer scanner via WallDrop** | ❌ None | ✅ "Magic Import" (Photo to events) | ⚠️ Basic Text Assistant | ❌ None |
| **Photo Slideshows** | ✅ **Google Photos (100+), Drive CDN, Ken Burns** | ✅ Google, Dropbox, Flickr | ✅ Instant Phone App Upload | ✅ Slideshow Screensaver | ✅ Local/Google modules |
| **Chore Charts & Gamified Streaks** | ✅ **Chores, Kid Avatars, Points, Streaks** | ❌ None (Basic Todo only) | ✅ Chores & Star Rewards | ✅ Streaks & Progress Bars | ⚠️ Community Modules |
| **Meal Planning** | ✅ **7-Day Breakfast / Lunch / Dinner** | ❌ Custom HTML Only | ✅ Meal Planning Tab | ✅ Daily Meal Schedule | ⚠️ Custom Modules |
| **Live Weather & Rain Radar** | ✅ **Keyless Open-Meteo, AQI/UV, hourly & daily, animated radar** | ✅ Radar, Hourly, Alerts | ⚠️ Current & 5-Day Only | ⚠️ Basic Forecast | ✅ OpenWeather modules |
| **Financial / Stock & Crypto Tickers** | ✅ **Live Yahoo Tickers, Sparklines, 24h %** | ⚠️ Basic Stock Ticker | ❌ None | ❌ None | ✅ Crypto modules |
| **Smart Home / IoT Entity Controls** | ✅ **Home Assistant Entity Toggle Cards** | ✅ Home Assistant, SmartThings | ❌ None | ❌ None | ✅ HA modules |
| **Voice / AI Audio Read-Aloud** | ✅ **AI Morning Briefing + SpeechSynthesis** | ❌ None | ❌ None | ⚠️ Voice Notes | ⚠️ Alexa/Assistant mods |
| **Mobile Instant Beam (WallDrop)** | ✅ **QR Code Instant Mobile Sticky Notes & Photos**| ❌ None | ⚠️ Companion App Only | ⚠️ App Only | ❌ None |
| **Emergency Broadcast System** | ✅ **1-Click Strobe & Siren Takeover** | ❌ Signage only | ❌ None | ❌ None | ❌ None |
| **OLED Burn-In Protection** | ✅ **Micro Pixel-Shift & Ambient Night Mode** | ⚠️ Basic Sleep Screen | ⚠️ Screen Blanking | ⚠️ Screen Blanking | ❌ None |
| **Fleet Status, Screenshots & Remote Control** | ✅ **Live status, thumbnails, reload/identify/sleep, bulk actions** | ✅ | ❌ | ❌ | ❌ |
| **Third-Party Widgets** | ✅ **Sandboxed custom widget SDK** | ⚠️ Custom HTML block | ❌ | ❌ | ✅ ~1,000 modules |

---

## 2. Current Implementation Breakdown (Shipped)

### 🎨 Visual Canvas Engine & Fleet Management
* **Freeform Canvas Editor**: Drag-and-drop, 8-point handles, pixel-exact alignment tools (Left, Center H/V, Right, Top, Bottom), duplication (`Ctrl+D`), full Undo/Redo stack (`Ctrl+Z`/`Ctrl+Y`), grid snapping (10px, 20px), and real-time dimension HUD.
* **Resolution Engine**: Native aspect ratio math for 1280×720 (720p), 1920×1080 (1080p), 2560×1440 (2K QHD), and 3840×2160 (4K UHD) in both **Landscape** and **Portrait** orientations.
* **Multi-Page Carousels**: Timed page rotations with independent durations, carousel navigation dots, touch swipe gestures, and TV remote arrow navigation.
* **Zero-Friction Commissioning**: 6-digit hardware PIN pairing screen (`/#/pair`) with instant database bonding from the Fleet Hub.

### 🧩 Full Widget Suite (37 Production Widgets Shipped)

The authoritative list is `frontend-angular/src/app/components/widgets/widget-registry.ts`; the admin catalog is in [`ADMIN_USER_GUIDE.md`](./ADMIN_USER_GUIDE.md#4-widget-catalog-37-widgets).

#### Original Core Suite (19 Widgets)
1. **Clock & Date**: Digital options with seconds toggle and time zone selection.
2. **Weather & Forecast**: Zero-config Open-Meteo current stats, EPA AQI, UV index, 5-day daily forecast, and 12-hour hourly timeline curve.
3. **Multi-Feed Family Calendar**: Agenda and monthly grid views with category tags, custom colors, on-screen `+ Add Event`, and WebCal/Outlook/iCal support.
4. **Photo Slideshow & Google Photos Stream**: Unlimited photo streaming from Google Photos shared albums, Drive CDN, and Unsplash with cinematic Ken Burns effect.
5. **Live Stock & Crypto Market Ticker**: Real-time prices, 24h percentage delta, and smooth SVG sparklines (AAPL, NVDA, TSLA, BTC, ETH, SOL).
6. **Live Rain Radar**: High-resolution Doppler precipitation overlay from RainViewer on inverted OpenStreetMap dark tiles (no watermark).
7. **AI Morning Briefing & Voice Synthesis**: Gemini-powered LLM summary with Web Speech API read-aloud.
8. **Chores & Gamified Rewards**: Kid avatars, star points, streaks, and celebratory confetti particle bursts.
9. **Meal Planner**: 7-day breakfast, lunch, dinner, and snack meal planner.
10. **Smart Home Assistant**: IoT entity status cards with direct toggle controls via Home Assistant REST API.
11. **Mobile WallDrop**: Instant QR-code portal for family members to beam sticky notes and photos directly to the display.
12. **Spotify Interactive Controller**: Album art, track progress, interactive play/pause/skip, seek scrubber, volume slider, mute, and device indicator.
13. **YouTube Video & Live Streams**: Kiosk autoplay for ambient video, nature scenes, or lo-fi radio streams.
14. **Camera PiP / RTSP Video Stream**: Security camera live viewer for driveways, front doors, or baby monitors.
15. **Morning Commute & Traffic**: Real-time travel duration, route names, and traffic delay indicators.
16. **Countdown Timer**: Target date countdown with days/hours/minutes cards.
17. **Daily Quotes**: Rotating motivational and inspirational quotes with author attribution.
18. **RSS News Feed**: Multi-source news ticker with headlines and source badges.
19. **Interactive Todo List**: Quick-add touch tasks with priority tags, inline deletion, and backend sync.

#### Phase 1: Quick Wins (8 Widgets)
20. **Text / Announcement**: Rich static text with size, alignment, and gradient header.
21. **QR Code Generator**: Scannable dynamic QR codes for WiFi, URLs, and guest access.
22. **World Clocks**: Multi-city timezone array with local clock offsets.
23. **Shapes & Dividers**: Decorative rectangles, circles, and horizontal/vertical dividers.
24. **Scheduled Text**: Time-sensitive announcements that auto-show/hide based on time and day.
25. **Button / Link**: Interactive touch buttons for navigating between pages or external URLs.
26. **Sun & Moon Phases**: Geocoded sunrise, sunset, golden hour, and lunar illumination phase.
27. **Analog Clock**: Classic rotating SVG dial with hour, minute, and second hands.

#### Phase 2: Data Platform (2 Widgets)
28. **External Data / REST Fetch**: Generic JSON polling widget with custom auth headers and JSONPath extraction.
29. **Radial Gauge Meter**: Semicircular SVG dial with warning/critical color thresholds and inbound webhook push (`/api/push_widget.php`).

#### Phase 3: Interactivity & Integrations (4 Widgets)
30. **Whiteboard / Drawing Canvas**: Touch and stylus HTML5 canvas with pen, highlighter, eraser, 6 chalk colors, and auto-syncing vector strokes.
31. **Google Maps Embed**: Interactive and aerial satellite maps with location search, zoom slider, and live traffic badge.
32. **Slack Channel Feed**: Real-time channel announcements feed with user avatars, handles, and timestamps.
33. **Gmail Inbox Unread Badge**: Prominent badge counter with subject/sender preview snippets.

#### Phase 4 Milestone 4A (2 Widgets + Dock)
34. **TradingView Financial Charts**: Candlestick, line, area and Heikin-Ashi charts.
35. **Reddit Curated Media**: Photo slideshows from chosen subreddits.
* Plus the **TouchHub Navigation Dock** (a display feature, not a widget) and iCloud shared album support in the photo widget.

#### Design Plan Phase 5 (2 Widgets)
36. **Greeting & Compliments**: MagicMirror-style time-of-day greetings that react to weather and the next calendar event.
37. **Custom Widget (SDK)**: User HTML or https pages in a sandboxed iframe with a `postMessage` protocol ([`WIDGET_SDK.md`](./WIDGET_SDK.md)).

### 🖥️ Design & Fleet (Design Plan Phases 0–5, shipped)
* **Themes**: Glass, Paper, Solid, Mirror, Ambient and High Contrast presets on shared design tokens, plus an accent colour.
* **Display runtime**: resolution-independent Fit/Fill/Stretch scaling, instant publish (~5 s), Raspberry Pi performance mode, page transitions, burn-in shift.
* **Editor**: right-hand inspector, touch/pen drag with smart guides, local drafts, version history, publish checks, device preview, 14 templates, Snap to Region.
* **Fleet hub**: kiosk heartbeat, online/offline status, screenshot thumbnails, remote reload/identify/sleep/wake/change page, bulk actions, copy layout, duplicate display.
* **Calendar views**: week, 3-day and today + upcoming, with weather on day headers.
* **Widget event bus & text placeholders**: widgets share weather and next-event data; text widgets support live `{{placeholders}}`.

### 🛡️ Hardened Security & Kiosk Architecture
* **SSRF Protection Shield**: Strict IP subnet resolution blocking RFC-1918 private subnets, loopback, and cloud metadata endpoints.
* **Token-Bucket Rate Limiter**: Granular IP rate limiting on login, registration, PIN pairing, and proxy requests.
* **XSS & Input Sanitization**: Server-side escaping and HTML tag stripping on all inputs.
* **Resilient Offline Cache**: Instant recovery on Pi power-on before network connectivity with live diagnostic error pills.
* **OLED & Hardware Sleep Protection**: Continuous sub-pixel micro-shift in Night Mode to prevent panel burn-in.

---

## 3. Phased Strategic Roadmap & Current State

```mermaid
timeline
    title Smart Display Product Evolution & Implementation Status
    section Phase 1 (Shipped) : 8 New Widgets : Screen Backup JSON : Custom Aspect Ratios : Auto-Arrange Engine
    section Phase 2 (Shipped) : Block Scheduling : Screen Scheduling : REST Fetch & Inbound Webhooks : Gauge Meter : Severe Weather Banner : Block Layers : 11 Google Fonts : 6 Starter Templates
    section Phase 3 (Shipped) : On-Screen Calendar : On-Screen Tasks : Interactive Spotify Controls : Whiteboard Canvas : Google Maps : Slack Feed : Gmail Badge : Rules Engine : Web Audio Chimes : Custom CSS
    section Phase 4A (Shipped) : TouchHub Navigation Dock : Apple iCloud Photos : TradingView Embed : Reddit Media
    section Design Plan 0-5 (Shipped) : Themes & Tokens : Resolution Scaling : Editor Redesign : Fleet Hub : Calendar Views : Greeting Widget : Widget SDK
    section Phase 4 (Next Up) : Android Play Store App : Fire TV / Android TV App : Sonos Controller : SmartThings : Nest SDM
```

---

### ✅ Completed Horizons (Phases 1, 2, and 3 — 100% Shipped)

#### 1.1: AI Vision Flyer & Schedule Scanner (Shipped)
* **Shipped**: Vision heuristic and Gemini scanner parsing paper schedule flyers, announcements, and invitations into structured calendar events via WallDrop.

#### 1.2: Microsoft 365 & Outlook WebCal Support (Shipped)
* **Shipped**: Full WebCal (`webcal://`) and iCal parsing with Outlook/Exchange recurring RRULE expansion and all-day event formatting.

#### 1.3: Two-Way Interactive Task Synchronization & Creation (Shipped)
* **Shipped**: On-screen `+ Add Task` drawer, priority tags, instant check-off, deletion, and backend API sync (`tasks_sync.php`).

#### 1.4: On-Screen Calendar Event Creation (Shipped)
* **Shipped**: On-screen `+ Add Event` modal with date/time pickers, category tagging, month grid day tap, and backend sync (`calendar_sync.php`).

#### 1.5: Air Quality Index (AQI), UV Index & Severe Weather Auto-Alerts (Shipped)
* **Shipped**: EPA AQI and UV index integrated into the weather widget via Open-Meteo, plus screen-wide pulsing emergency warning banner with automatic NWS detection.

#### 1.6: Interactive Spotify Media Controller (Shipped)
* **Shipped**: Play/pause/skip tactile controls, seek scrubber slider, volume slider, mute toggle, and active Spotify Connect device indicator.

#### 1.7: Rules Engine & Web Audio Chimes (Shipped)
* **Shipped**: Data rule threshold engine with 4 neon alert glow presets, plus client-side Web Audio API synthesizer for doorbell, marimba, hourly gong, and alert beep.

#### 1.8: Whiteboard & Modern Integrations (Shipped)
* **Shipped**: HTML5 Canvas drawing board with pen/highlighter/eraser and stroke sync, Google Maps embed with live traffic badge, Slack channel feed, and Gmail unread counter.

---

### 🧠 Horizon 2 / Phase 4: Next Priorities (Platform, TV Apps & Contextual Intelligence)

*Target Goal: Exceed Hearth Display with smart family routines, voice, and presence automation.*

#### 2.1: Voice Memos & On-Device AI Family Assistant
* **Description**: Tap-to-talk microphone button on touch screens allowing family members to say: *"Remind Mom to pick up groceries at 4 PM"* or *"Add tacos to Tuesday dinner"*.
* **Implementation**: Web Audio recording streamed to Whisper API for transcription, parsed via LLM into calendar events, meal plans, or WallDrop sticky notes.

#### 2.2: Gamified Chore Store & Point Redemption System
* **Description**: Kids accumulate stars/points from completing chores and can redeem them for configured family rewards (e.g. 50 stars = 1 hour gaming, 100 stars = ice cream trip).
* **Implementation**: Parent PIN-protected reward approval dashboard with kid celebratory confetti animations.

#### 2.3: Camera-Based Facial Recognition Profile Switching
* **Description**: When a family member approaches the wall display, a USB camera or Raspberry Pi Camera Module recognizes their face and automatically switches the dashboard to their personalized page (their personal agenda, chores, and commute).
* **Implementation**: Lightweight on-device face detection (`face-api.js` or OpenCV Python sidecar) communicating via local WebSocket.

#### 2.4: PIR Motion Wake & Ultrasonic Gesture Page Flipping
* **Description**: Display screen wakes instantly when motion is detected in the room, and waving a hand left/right in front of an ultrasonic/infrared sensor flips carousel pages hands-free (ideal for kitchens with dirty hands).

#### 2.5: Smart Video Doorbell Pop-Up (Ring / Nest / UniFi Protect)
* **Description**: When someone rings the doorbell or motion is detected at the front door, the display automatically pops up a live video feed in Picture-in-Picture mode for 30 seconds before returning to the dashboard.

---

### 🌐 Horizon 3: Long-Term (Q2 2027) — Enterprise Fleet, Extensibility & Community Marketplace

*Target Goal: Provide commercial digital signage power (Yodeck) with an open developer marketplace.*

#### 3.1: Remote Fleet Diagnostics & Screen Preview Telemetry (Mostly Shipped)
* **Shipped**: Live status, last seen, resolution, app version, memory, screenshot thumbnails and remote reload/identify/sleep/wake in the fleet hub.
* **Remaining**: Raspberry Pi CPU temperature, network latency and remote reboot (need an on-device agent outside the browser).
* **Description**: Enterprise and multi-home administrators can view live screenshot captures of active wall displays, monitor Raspberry Pi CPU temperatures, memory usage, network latency, and trigger remote reboots from the Fleet Hub.

#### 3.2: Community Widget Marketplace & Sandboxed Developer SDK (SDK Shipped)
* **Shipped**: Sandboxed iframe SDK with `postMessage` protocol, theme tokens and 4 examples ([`WIDGET_SDK.md`](./WIDGET_SDK.md)).
* **Remaining**: Widget manifest, gallery / marketplace.
* **Description**: Enable third-party developers to build and publish custom widgets using standard HTML5/TypeScript in isolated Shadow DOM / Web Component sandboxes.
* **Examples**: Flight trackers, Tesla / EV battery monitors, package delivery tracking, sports live scores (NFL, NBA, Premier League), Duolingo streak cards.

#### 3.3: Conditional Formatting & Smart Rules Engine (First Version Shipped)
* **Shipped**: Per-widget data rules with alert glow presets (Phase 3) and a widget event bus for shared weather / next-event state.
* **Description**: Trigger visual widget state changes based on environmental or data rules:
  * *Rule: If rain probability > 60%, pulse Umbrella reminder badge.*
  * *Rule: If kid chore is overdue after 7 PM, highlight chore card in orange.*
  * *Rule: If room temperature > 78°F, trigger Home Assistant AC thermostat card.*

#### 3.4: Role-Based Access Control (RBAC) & Multi-Tenant Team Management
* **Description**: Support multiple user roles: **Owner** (full billing/settings), **Manager** (edit displays and widgets), **Family Member** (WallDrop notes and check chores only), and **Display Screen** (read-only kiosk).

#### 3.5: "Smart Display OS" Pre-Configured Raspberry Pi Disk Image
* **Description**: 1-click bootable `.img.xz` flashable via Raspberry Pi Imager. Automatically boots into pairing mode with zero terminal setup, zero keyring prompts, and automated WiFi hotspot configuration.

---

## 4. Prioritization & Engineering Resource Matrix

| Horizon | Feature Initiative | Business Impact | Technical Complexity | Priority |
| :--- | :--- | :---: | :---: | :---: |
| **H1** | AI Magic Flyer Photo-to-Calendar Scanner | 🔥 High (Skylight Parity) | Medium | ✅ Shipped |
| **H1** | Direct Google / Apple / Outlook OAuth Sync | 🔥 High (User Convenience) | Medium | **P0** |
| **H1** | Two-Way Todoist / Google Tasks Check-off | Medium | Low | **P1** |
| **H1** | HDMI-CEC TV Power Sleep Control | High (Energy & Screen Life) | Low | ✅ Shipped |
| **H1** | AQI & Severe Weather Warning Badges | Medium | Low | ✅ Shipped |
| **H2** | Voice Memos & AI Voice Assistant | 🔥 High (Hands-Free Family) | High | **P1** |
| **H2** | Gamified Chore Store & Point Leaderboard | High (Kids Engagement) | Low | **P1** |
| **H2** | Smart Video Doorbell Motion Pop-Up | High (Smart Home Value) | Medium | **P2** |
| **H2** | PIR Motion Wake & Gesture Page Flip | Medium | Medium | **P2** |
| **H2** | Facial Recognition Profile Switching | High (Personalization) | High | **P3** |
| **H3** | Remote Fleet Screenshots & Telemetry | High (Signage & Power Users) | Medium | ✅ Shipped (Pi agent remaining) |
| **H3** | Smart Rules & Conditional Trigger Engine | High (Power Automation) | Medium | **P2** |
| **H3** | Community Widget Marketplace SDK | 🔥 High (Ecosystem Growth) | High | SDK ✅ / Gallery **P2** |
| **H3** | Multi-Tenant RBAC Permissions | Medium | Medium | **P3** |
| **H3** | Dedicated Flashable Pi OS Image | High (Zero-Config Setup) | Medium | **P2** |

---

## 5. Summary & Current Implementation Status

Shipped: the widget & integration Phases 1–3, Phase 4 Milestone 4A (TouchHub dock, TradingView, Reddit media, iCloud shared albums), and design plan Phases 0–5 (themes, resolution scaling, editor redesign, fleet hub, calendar views, greeting widget, widget SDK). Smart Display now has **37 production widgets**, runs in production at `smart-kiosk.online`, and is verified on Raspberry Pi kiosk hardware.

Next up:
1. Native Android and Fire TV application wrappers for Google Play Store and Amazon Fire TV Appstore distribution.
2. Expanded smart home controls (Sonos, SmartThings, Nest SDM).
3. Additional cloud photo sources (Dropbox, OneDrive, Immich), photo collage and captions.
4. Horizon 2 family features: voice memos, chore rewards store, presence / motion wake, doorbell pop-up.
5. Editor follow-ups from the design plan: schema-driven inspector forms, splitting the editor component, multi-select, onboarding wizard.
