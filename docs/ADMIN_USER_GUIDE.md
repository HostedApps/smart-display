# Smart Display: Admin & Power User Guide

This guide covers all administrative features, visual canvas customization, 19-widget configurations, multi-screen rotations, and fleet takeover controls.

---

## 1. Fleet Dashboard Overview (`/#/admin/displays`)

The Fleet Hub allows you to manage unlimited digital screens from a single interface:
* **Displays Tab**: Create, edit, preview, duplicate, and delete screen configurations.
* **Paired Hardware Tab**: View all bound physical devices (Raspberry Pi, iPad, Fire TV, Tablets), their IP addresses, user agents, and last ping timestamps.
* **1-Click Emergency Takeover**: Broadcast urgent amber or critical red takeover messages across your entire fleet or to selected screens with synthesized siren chimes.
* **6-Digit PIN Pairing**: Bond new screens without typing admin passwords on remote devices.
* **WallDrop Beam Link**: Copy instant mobile beam portals (`/#/drop/:token`) to share with family or office staff.

---

## 2. Visual Canvas Editor (`/#/admin/editor/:token`)

### 2.1 Resolution & Screen Orientation Modes
* **Landscape 720p** (1280 × 720) — Standard HD
* **Landscape 1080p** (1920 × 1080) — Full HD TVs & Monitors
* **Landscape 1440p** (2560 × 1440) — 2K QHD Monitors & Displays
* **Landscape 4K** (3840 × 2160) — 4K Ultra HD Commercial Displays
* **Portrait 720p / 1080p / 1440p / 4K** — Vertical wall tablets & rotated monitors

### 2.2 Intelligent Auto-Fit Zoom Engine
When editing high-resolution canvases (1080p, 1440p, 4K) on laptop screens, the editor automatically scales the viewport to fit your screen with zero cutoff.
Use the floating toolbar at the bottom:
* **Fit %**: Fits the canvas to the available viewport.
* **50% / 75% / 100%**: One-click zoom presets.
* **+ / −**: Fine zoom adjustments.

### 2.3 Canvas Background Options
* **Theme Default**: Glassmorphic dark slate, minimal light, or OLED true black.
* **Solid Color / Gradient**: Hex codes or CSS linear gradients.
* **Curated Wallpaper**: High-resolution photography via Unsplash.
* **Direct Video**: Direct `.mp4` or `.webm` ambient video loops.
* **Ambient YouTube Stream**: Continuous looping YouTube live streams with blur controls.

---

## 3. The 19-Widget Reference Guide

| Widget | Type Key | Purpose | Key Configurations |
| :--- | :--- | :--- | :--- |
| **YouTube Player** | `youtube` | Ambient video loops & live news | Video URL/ID, Autoplay, Muted, Loop, Live Badge |
| **AI Briefing** | `ai_briefing` | Ambient daily executive briefing | User Name, Tone (Warm/Executive/Motivational), Gemini API Key |
| **Chores & Habits** | `chores` | Gamified family chores & habit streaks | Members, Avatars, Point values, Confetti celebrations |
| **Live Camera PIP** | `camera_pip` | Low-latency security / doorbell stream | Stream URL, Snapshot URL, Refresh rate, 16:9 / 4:3 |
| **Commute Matrix** | `commute` | Live traffic ETA & transit countdowns | Destinations, Icons, Route delay badges |
| **Digital Clock** | `clock` | Time & date display | 12h/24h formats, show date toggle |
| **Weather Forecast** | `weather` | Live weather & 5-day forecasts | City Name, Imperial/Metric, OpenWeather API Key |
| **Family Calendar** | `calendar` | Monthly grid & agenda synchronized via iCal | Google/Apple/Outlook iCal URLs, multi-member colors |
| **Photos** | `photo` | Rotating photo album slideshow | Image URLs, transition intervals |
| **RSS News** | `rss` | Live headline news ticker | RSS XML Feed URL (e.g. BBC, NYT, TechCrunch) |
| **Tasks & To-Do** | `todo` | Shared interactive checklist | Task items, strike-through completion |
| **Home Assistant** | `homeassistant` | Smart home sensors, lights, switches | Home Assistant URL & Long-Lived Access Token |
| **Spotify** | `spotify` | Now playing track art & progress | Track title, artist, album art |
| **Crypto & Markets** | `stock_crypto` | Live Bitcoin & stock price tickers | CoinGecko token IDs (bitcoin, ethereum, solana) |
| **Sticky Notes** | `sticky_note` | Virtual colored post-it notes | Message content, author name, note color |
| **Countdown** | `countdown` | Event countdown timer | Target date/time, event title |
| **Meal Planner** | `meal_planner` | Monday-Sunday dinner schedule | Daily lunch & dinner menu entries |
| **Weather Radar** | `radar` | Live animated rain/storm Doppler map | Latitude, Longitude, Zoom level, Color scheme |
| **Daily Quote** | `quote` | Daily philosophical & inspirational quotes | Category (Inspirational/Wisdom/History/Custom) |
