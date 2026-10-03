# Smart Display: Admin & Power User Guide

This guide covers the fleet hub, the dashboard editor, display settings, and the full widget catalog.

---

## 1. Fleet Hub (`/#/admin/displays`)

The fleet hub manages every screen from one page.

* **Displays tab**: one card per display, with a live screenshot thumbnail (refreshed every 15 minutes), status (**Online**, **Not seen recently**, **Offline**, **Never connected**), last seen time, resolution and app version. Summary counts sit at the top, and the page refreshes every 30 seconds.
* **Per-display menu**: identify (shows the display's name full-screen for 10 s), sleep / wake, refresh screenshot, duplicate display, copy layout to other displays, copy kiosk link, copy WallDrop link, delete.
* **Bulk actions**: select several displays to reload, identify, sleep, wake or refresh screenshots together, or **Apply a layout…** to all of them.
* **Paired Hardware tab**: every paired device (Raspberry Pi, iPad, Fire TV, tablets) with its live status, IP address and user agent.
* **Emergency Takeover**: broadcast an amber or red full-screen alert, with a siren chime, to the whole fleet or selected screens.
* **Pair Screen with PIN**: open `/#/pair` on the new screen, then enter the 6-character code it shows (for example `UP-5610`) and choose a display.

Remote commands (reload, identify, sleep / wake, change page, screenshot) reach a screen within about 5 seconds and expire after 2 minutes if the screen is offline.

---

## 2. Dashboard Editor (`/#/admin/editor/:token`)

### 2.1 Layout of the editor
* **Left panel**: searchable widget palette grouped by category, the **Layers** list, pages, and display **Settings**.
* **Canvas**: drag and resize with mouse, touch or pen. Smart alignment guides snap edges and centres to other widgets and the canvas (hold **Alt** to bypass). Grid snapping, align tools, duplicate (`Ctrl+D`) and undo / redo (`Ctrl+Z` / `Ctrl+Y`) are available.
* **Right panel (Inspector)**: settings for the selected widget in three tabs:
  * **Content**: what the widget shows.
  * **Style**: background, text colour, blur, corner radius, and **Snap to Region** (MagicMirror-style top / middle / bottom × left / centre / right, plus full-width top and bottom bars).
  * **Behaviour**: schedule, rules, linked widgets, lock / hide.

### 2.2 Saving, publishing and history
* The top bar shows **Unpublished changes** or **All changes published**. A local draft is kept automatically; after a reload or crash, a banner offers to restore it. You are asked before leaving with unpublished changes.
* **Publish** runs checks first (widgets off the canvas, invalid URLs, calendars with no feeds, unconnected Home Assistant). Published changes appear on screens within about 5 seconds.
* **Version history** keeps the last 20 publishes. Restoring loads a version into the editor without publishing it.
* **Preview** shows the layout full-screen in device frames: TV 1080p, TV 4K, portrait, iPad, Raspberry Pi 7" and laptop, using the same scaling as the real screen.

### 2.3 Canvas size
Pick a design canvas under **Settings → Orientation & Resolution**: landscape or portrait 720p, 1080p, 1440p (2K) and 4K; 16:10 tablet; 4:3 iPad; ultrawide 21:9; or **Freeform** with a custom width and height.

The layout is scaled to whatever screen shows it, so one design works at any resolution. See **Fit Layout to Screen** below.

### 2.4 Editor zoom
On a laptop, the canvas fits the window automatically. The bottom toolbar has **Fit**, **50% / 75% / 100%** and **+ / −**.

### 2.5 Templates
Start from one of 14 templates (for example Family, MagicMirror-style, Kitchen Hub, Office Lobby, Photo Frame, Fitness, Classroom, Night Stand, DevOps Wall). Each has landscape and portrait layouts and may apply a recommended theme. An empty page also offers templates.

---

## 3. Display Settings

| Setting | Options |
| :--- | :--- |
| **Theme** | Glass (default), Paper (light), Solid (no blur, best for Raspberry Pi), Mirror (pure black, for two-way mirrors and OLED), Ambient (photo-first), High Contrast. Plus an **accent colour** override. |
| **Background** | Theme default, solid colour, gradient, image URL, Unsplash wallpaper, direct `.mp4`/`.webm` video, or a looping YouTube stream. |
| **Font** | A choice of Google Fonts. |
| **Fit Layout to Screen** | **Fit** (show everything, letterbox if needed — recommended), **Fill** (cover the screen, crop edges), **Stretch**, or **Actual size**. |
| **TV safe area** | 0–8% inset on every edge for TVs that overscan. |
| **Page transition** | Fade (default), slide, zoom or none. |
| **Performance mode** | Auto (turns on for Raspberry Pi and other low-power devices), on, or off. Removes blur, shadows and animations. |
| **Burn-in protection** | Shifts the whole layout a few pixels every few minutes. |
| **Sleep schedule** | Times when the screen sleeps. **Night mode** shows a dim red/amber clock instead of a black screen. |
| **Weather alerts** | Screen-wide severe weather banner. |
| **Audio chimes** | Doorbell, marimba, alert beep and an optional hourly gong. |
| **TouchHub dock** | Touch dock for page switching, whiteboard, tasks, Spotify mini-player and sleep. |
| **Custom CSS** | Extra CSS applied to the display. |

---

## 4. Widget Catalog (37 widgets)

| Widget | Type key | Key configuration |
| :--- | :--- | :--- |
| **Time & Date** | | |
| Digital Clock | `clock` | 12h / 24h formats, seconds, date |
| Analog Clock | `analog_clock` | Dial style, second hand |
| World Clocks | `world_clocks` | Cities with IANA time zones (e.g. `Europe/London`) |
| Countdown Timer | `countdown` | Target date / time, event title |
| Sun & Moon | `sun_moon` | City name (coordinates looked up automatically) |
| **Weather** | | |
| Weather Forecast | `weather` | City, °C / °F. Uses Open-Meteo with no key; an OpenWeather API key is optional |
| Weather Radar | `radar` | City preset or latitude / longitude, zoom. No key needed |
| **Family & Home** | | |
| Family Calendar | `calendar` | iCal / WebCal URLs (Google, Apple, Outlook), member colours. Views: month, agenda, week, 3-day, today + upcoming. On-screen **+ Add Event** |
| Tasks & To-Do | `todo` | Items, priorities, on-screen add / check-off |
| Chores & Habit Streaks | `chores` | Members, avatars, points per task |
| Meal Planner | `meal_planner` | Daily menu entries |
| Sticky Notes | `sticky_note` | Message, author, note colour |
| Whiteboard | `whiteboard` | Background, default pen colour |
| **Photos & Media** | | |
| Photo Slideshow | `photo` | Google Photos shared link, iCloud shared album, image URLs, interval |
| Reddit Media | `reddit` | Subreddits, time range |
| YouTube Video & Stream | `youtube` | Watch URL, youtu.be, shorts or video ID; autoplay, mute, loop |
| Live Camera PiP | `camera_pip` | Stream URL or snapshot URL, refresh interval |
| Spotify Now Playing | `spotify` | Account connection; play / pause / skip, seek, volume |
| **News & Info** | | |
| RSS News Feed | `rss` | RSS / Atom feed URL |
| Daily Quotes | `quote` | Category or custom quote |
| AI Ambient Briefing | `ai_briefing` | Name, tone (Warm / Executive / Motivational), optional Gemini API key |
| Greeting & Compliments | `greeting` | Names to rotate, custom lines; reacts to weather and the next calendar event |
| Commute & Transit | `commute` | Destinations, route badges |
| Google Maps | `google_maps` | Location, zoom, map type |
| Slack Channel | `slack` | Bot token, channel ID |
| Gmail Unread | `gmail` | Google account with Gmail read access |
| **Smart Home & Data** | | |
| Home Assistant | `homeassistant` | Home Assistant URL and long-lived access token |
| Markets & Stocks Ticker | `stock_crypto` | Stock symbols and crypto tokens |
| TradingView Chart | `tradingview` | Symbol (e.g. `NASDAQ:AAPL`), interval, theme |
| External Data (REST) | `rest_fetch` | URL, optional auth header, JSONPath to the value |
| Radial Gauge | `gauge` | Min / max, thresholds, unit; accepts pushed values (`/api/push_widget.php`) |
| Custom Widget (SDK) | `custom` | Your own HTML or an https URL in a sandbox. See [`WIDGET_SDK.md`](./WIDGET_SDK.md) |
| **Text & Layout** | | |
| Text & Announcements | `text` | Text, size, alignment. Live placeholders such as `{{time}}`, `{{date}}`, `{{greeting}}`, `{{weather.temp}}`, `{{next_event.title}}` |
| Scheduled Text | `scheduled_text` | Messages with start / end time and weekdays |
| QR Code | `qrcode` | URL or Wi-Fi credentials |
| Button / Link | `button` | Label, icon, target page or link |
| Shapes & Dividers | `shapes` | Shape, fill, border, opacity |

On a live display, a widget that is not configured or cannot load data shows an empty or error state. Sample data is shown only in the editor.
