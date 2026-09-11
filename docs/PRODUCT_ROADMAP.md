# Smart Display: Strategic Product Roadmap & Competitive Landscape (2026 – 2027)

---

## Executive Summary

**Smart Display** has evolved into a versatile, high-performance, web-native digital wall canvas combining **custom visual layout freedom** (like DAKboard), **family productivity & routine management** (like Skylight Calendar & Hearth Display), and **zero-friction hardware commissioning** (like Yodeck).

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
| **Drag & Drop Canvas Editor** | ✅ **Full WYSIWYG, Undo/Redo, Align, HUD** | ✅ WYSIWYG Grid/Freeform | ❌ Fixed Templates Only | ❌ Fixed Templates Only | ❌ Manual JSON / CSS Config |
| **Resolution Support** | ✅ **720p, 1080p, 2K QHD (1440p), 4K UHD** | ✅ 1080p, 4K | ❌ 1080p fixed | ❌ 1080p fixed | ⚠️ Depends on CSS |
| **6-Digit PIN Device Pairing** | ✅ **Instant Zero-Friction PIN Pairing** | ⚠️ Serial Number / Web Login | ⚠️ QR Code / Account App | ⚠️ Account Pairing | ❌ Manual Token Config |
| **Multi-Feed Calendar Grid & Agenda** | ✅ **Multi-iCal, Google, Color-Coded Members** | ✅ iCal, Google, Outlook, Apple | ✅ Google, Outlook, Apple | ✅ Google, Apple, Outlook | ✅ iCal Modules |
| **AI Paper Schedule / Flyer Scanner** | 🔄 *Roadmap Horizon 1* | ❌ None | ✅ "Magic Import" (Photo to events) | ⚠️ Basic Text Assistant | ❌ None |
| **Photo Slideshows** | ✅ **Google Photos (100+), Drive CDN, Ken Burns** | ✅ Google, Dropbox, Flickr | ✅ Instant Phone App Upload | ✅ Slideshow Screensaver | ✅ Local/Google modules |
| **Chore Charts & Gamified Streaks** | ✅ **Chores, Kid Avatars, Points, Streaks** | ❌ None (Basic Todo only) | ✅ Chores & Star Rewards | ✅ Streaks & Progress Bars | ⚠️ Community Modules |
| **Meal Planning** | ✅ **7-Day Breakfast / Lunch / Dinner** | ❌ Custom HTML Only | ✅ Meal Planning Tab | ✅ Daily Meal Schedule | ⚠️ Custom Modules |
| **Live Weather & Rain Radar** | ✅ **12h Hourly, 5d Daily, Animated Rain Radar** | ✅ Radar, Hourly, Alerts | ⚠️ Current & 5-Day Only | ⚠️ Basic Forecast | ✅ OpenWeather modules |
| **Financial / Stock & Crypto Tickers** | ✅ **Live Yahoo Tickers, Sparklines, 24h %** | ⚠️ Basic Stock Ticker | ❌ None | ❌ None | ✅ Crypto modules |
| **Smart Home / IoT Entity Controls** | ✅ **Home Assistant Entity Toggle Cards** | ✅ Home Assistant, SmartThings | ❌ None | ❌ None | ✅ HA modules |
| **Voice / AI Audio Read-Aloud** | ✅ **AI Morning Briefing + SpeechSynthesis** | ❌ None | ❌ None | ⚠️ Voice Notes | ⚠️ Alexa/Assistant mods |
| **Mobile Instant Beam (WallDrop)** | ✅ **QR Code Instant Mobile Sticky Notes & Photos**| ❌ None | ⚠️ Companion App Only | ⚠️ App Only | ❌ None |
| **Emergency Broadcast System** | ✅ **1-Click Strobe & Siren Takeover** | ❌ Signage only | ❌ None | ❌ None | ❌ None |
| **OLED Burn-In Protection** | ✅ **Micro Pixel-Shift & Ambient Night Mode** | ⚠️ Basic Sleep Screen | ⚠️ Screen Blanking | ⚠️ Screen Blanking | ❌ None |

---

## 2. Current Implementation Breakdown (Shipped)

### 🎨 Visual Canvas Engine & Fleet Management
* **Freeform Canvas Editor**: Drag-and-drop, 8-point handles, pixel-exact alignment tools (Left, Center H/V, Right, Top, Bottom), duplication (`Ctrl+D`), full Undo/Redo stack (`Ctrl+Z`/`Ctrl+Y`), grid snapping (10px, 20px), and real-time dimension HUD.
* **Resolution Engine**: Native aspect ratio math for 1280×720 (720p), 1920×1080 (1080p), 2560×1440 (2K QHD), and 3840×2160 (4K UHD) in both **Landscape** and **Portrait** orientations.
* **Multi-Page Carousels**: Timed page rotations with independent durations, carousel navigation dots, touch swipe gestures, and TV remote arrow navigation.
* **Zero-Friction Commissioning**: 6-digit hardware PIN pairing screen (`/#/pair`) with instant database bonding from the Fleet Hub.

### 🧩 Core Widget Suite (19 Interactive Widgets)
1. **Clock & Date**: Digital and analog visual options with seconds toggle and time zone selection.
2. **Weather & Forecast**: Real-time conditions, 5-day daily forecast, and interactive 12-hour hourly timeline with weather icons and temperature curves.
3. **Multi-Feed Family Calendar**: Agenda view and monthly grid view with color-coded family members and live iCal/.ics parsing.
4. **Photo Slideshow & Google Photos Stream**: Unlimited photo extraction from Google Photos shared albums, Google Drive file/folder CDNs, Unsplash nature collections, and custom image feeds with cinematic Ken Burns pan-zoom animations.
5. **Live Stock & Crypto Market Ticker**: Real-time price tracking, 24-hour delta percentage, sparkline graphs, and 1-click ticker additions (AAPL, NVDA, TSLA, BTC, ETH, SOL).
6. **Live Rain Radar**: High-resolution interactive weather radar maps powered by RainViewer API with animated precipitation overlays and color presets.
7. **AI Morning Briefing & Voice Synthesis**: Local text-to-speech audio reader providing personalized morning overviews of calendar events, weather, and headlines.
8. **Chores & Gamified Rewards**: Interactive chore checklists, kid avatars, star point rewards, and streak tracking.
9. **Meal Planner**: 7-day breakfast, lunch, dinner, and snack calendar with dietary tags.
10. **Smart Home Assistant**: IoT entity status cards with direct toggle controls via Home Assistant REST API.
11. **Mobile WallDrop**: Instant QR-code beam portal for family members to drop sticky notes and photos onto the wall display from their phones.
12. **Spotify Now Playing**: Live music player card with album art, track progress bar, and simulated playback controls.
13. **YouTube Video & Live Streams**: URL parser supporting live YouTube streams, relaxing lofi streams, and video playback with kiosk autoplay.
14. **Camera PiP / RTSP Video Stream**: Security camera viewer for driveways, front doors, or baby monitors.
15. **Morning Commute & Traffic**: Real-time transit duration, route names, and traffic delay indicators.
16. **Countdown Timer**: Target date countdown with days/hours/minutes cards.
17. **Daily Quotes**: Rotating motivational and inspirational quotes with author attribution.
18. **RSS News Feed**: Multi-source news marquee with title headlines and source badges.
19. **Interactive Todo List**: Quick-add touch tasks with priority tags.

### 🛡️ Hardened Security & Kiosk Architecture
* **SSRF Protection Shield**: Strict IP subnet resolution blocking RFC-1918 private subnets, loopback, and cloud metadata endpoints.
* **Token-Bucket Rate Limiter**: Granular IP rate limiting on login, registration, PIN pairing, and proxy requests.
* **XSS & Input Sanitization**: Server-side escaping and HTML tag stripping on all inputs.
* **Resilient Offline Cache**: Instant recovery on Pi power-on before network connectivity with live diagnostic error pills.
* **OLED & Hardware Sleep Protection**: Continuous sub-pixel micro-shift in Night Mode to prevent panel burn-in.

---

## 3. Phased Strategic Roadmap (2026 – 2027)

```mermaid
timeline
    title Smart Display Product Evolution
    section Horizon 1 (Q4 2026) : AI Magic Flyer Import : Apple / Outlook Direct OAuth : 2-Way Todoist / Google Tasks : Severe Weather Alerts : HDMI-CEC Power Control
    section Horizon 2 (Q1 2027) : Voice Assistant & Whisper : Gamified Chore Store : Facial Recognition Profiles : PIR Motion & Gesture Flip : Video Doorbell Pop-Up
    section Horizon 3 (Q2 2027) : Remote Fleet Telemetry : Widget Marketplace SDK : Conditional Rules Engine : Multi-Tenant Enterprise RBAC : Smart Display OS Image
```

---

### 🚀 Horizon 1: Near-Term (Q4 2026) — Ecosystem, AI Ingestion & Smart Integrations

*Target Goal: Match and exceed Skylight & DAKboard's top calendar and task workflows.*

#### 1.1: AI "Magic Flyer" Photo-to-Calendar Scanner (Skylight Magic Import Alternative)
* **Description**: Allow users to snap a photo of a paper school schedule, sports flyer, birthday invitation, or doctor appointment card from the mobile WallDrop page.
* **Implementation**: Send the photo to Gemini Vision API / GPT-4o Vision to extract dates, times, event titles, and locations, automatically adding them to the display's calendar feed with confirmation.

#### 1.2: Native Direct OAuth2 Integrations (Google, Apple iCloud, Microsoft Outlook)
* **Description**: Direct 1-click OAuth login for Google Calendar, Apple iCloud Calendar, and Microsoft 365 / Outlook without copying raw `.ics` secret URLs.
* **Implementation**: Secure token exchange stored in encrypted database credentials, supporting two-way event synchronization.

#### 1.3: Two-Way Interactive Task Synchronization (Todoist & Google Tasks)
* **Description**: Enable checking off tasks directly on wall touchscreens and having the check-off status immediately sync back to Todoist and Google Tasks.
* **Implementation**: Webhook and REST polling integration with Todoist Sync API v9 and Google Tasks API.

#### 1.4: Air Quality Index (AQI), UV Index & Severe Weather Warnings
* **Description**: Weather widget enhancements showing EPA Air Quality Index (PM2.5, Ozone), UV Index forecast, and pulsating National Weather Service (NWS) thunderstorm/tornado alert banners.

#### 1.5: HDMI-CEC Raspberry Pi Screen Power Automation
* **Description**: Turn physical TV/monitor screens on and off over HDMI rather than just displaying a black image during scheduled sleep hours.
* **Implementation**: Background service calling `vcgencmd display_power 0/1` or `cec-client` based on the display's configured `sleep_schedule`.

---

### 🧠 Horizon 2: Mid-Term (Q1 2027) — Advanced Family Hub & Contextual Intelligence

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

#### 3.1: Remote Fleet Diagnostics & Screen Preview Telemetry
* **Description**: Enterprise and multi-home administrators can view live screenshot captures of active wall displays, monitor Raspberry Pi CPU temperatures, memory usage, network latency, and trigger remote reboots from the Fleet Hub.

#### 3.2: Community Widget Marketplace & Sandboxed Developer SDK
* **Description**: Enable third-party developers to build and publish custom widgets using standard HTML5/TypeScript in isolated Shadow DOM / Web Component sandboxes.
* **Examples**: Flight trackers, Tesla / EV battery monitors, package delivery tracking, sports live scores (NFL, NBA, Premier League), Duolingo streak cards.

#### 3.3: Conditional Formatting & Smart Rules Engine
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
| **H1** | AI Magic Flyer Photo-to-Calendar Scanner | 🔥 High (Skylight Parity) | Medium | **P0** |
| **H1** | Direct Google / Apple / Outlook OAuth Sync | 🔥 High (User Convenience) | Medium | **P0** |
| **H1** | Two-Way Todoist / Google Tasks Check-off | Medium | Low | **P1** |
| **H1** | HDMI-CEC TV Power Sleep Control | High (Energy & Screen Life) | Low | **P1** |
| **H1** | AQI & Severe Weather Warning Badges | Medium | Low | **P2** |
| **H2** | Voice Memos & AI Voice Assistant | 🔥 High (Hands-Free Family) | High | **P1** |
| **H2** | Gamified Chore Store & Point Leaderboard | High (Kids Engagement) | Low | **P1** |
| **H2** | Smart Video Doorbell Motion Pop-Up | High (Smart Home Value) | Medium | **P2** |
| **H2** | PIR Motion Wake & Gesture Page Flip | Medium | Medium | **P2** |
| **H2** | Facial Recognition Profile Switching | High (Personalization) | High | **P3** |
| **H3** | Remote Fleet Screenshots & Telemetry | High (Signage & Power Users) | Medium | **P1** |
| **H3** | Smart Rules & Conditional Trigger Engine | High (Power Automation) | Medium | **P2** |
| **H3** | Community Widget Marketplace SDK | 🔥 High (Ecosystem Growth) | High | **P2** |
| **H3** | Multi-Tenant RBAC Permissions | Medium | Medium | **P3** |
| **H3** | Dedicated Flashable Pi OS Image | High (Zero-Config Setup) | Medium | **P2** |

---

## 5. Summary & Next Steps

With the completion of **Security Hardening**, the **2K/4K Canvas Power Editor**, **19 Specialized Widgets**, and **Google Photos Album Streaming**, Smart Display currently matches or exceeds DAKboard in layout flexibility while offering family hub capabilities like Hearth and Skylight without proprietary hardware lock-in.

Executing **Horizon 1** (AI Magic Flyer import, Direct Calendar OAuth2, and HDMI-CEC power automation) will solidify Smart Display as the most comprehensive self-hosted and cloud-ready wall display platform available.
