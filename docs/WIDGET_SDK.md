# Smart Display Widget SDK

Build your own widget with plain HTML, CSS and JavaScript. No build step and no fork of the app are needed. A custom widget is one HTML document. It runs in a sandboxed iframe on the display and gets the time, the theme and shared data (weather, the next calendar event) through a small `postMessage` protocol.

This is Smart Display's answer to MagicMirror² modules. The difference is that a widget can't break, slow down or snoop on the rest of the display.

---

## 1. Install a widget

1. In the editor, add **Custom Widget** (palette → *Smart Home & Data*).
2. In the inspector, pick a **Source**:
   - **HTML**: paste the whole HTML document into the code box. It is stored in the dashboard config and works offline.
   - **URL**: host the `.html` file anywhere that serves **https** (GitHub Pages, a static bucket, your NAS behind TLS) and paste the link. `http:`, `file:`, `data:` and `javascript:` links are refused with an error state.
3. Optionally set a **Title** (shown as a header; hidden when empty), **Refresh (minutes)** (reloads the frame; `0` = never), and **Settings**, a JSON object your widget receives.
4. Or pick **Load example** to start from a template.

Config shape (`CustomWidgetConfig`):

```ts
{
  source: 'html' | 'url';
  html?: string;            // source = 'html'
  url?: string;             // source = 'url', must be https://
  title?: string;
  refreshMinutes?: number;  // 0 = never
  settings?: string;        // JSON text, parsed by the host
  allowPopups?: boolean;    // adds allow-popups to the sandbox (default false)
}
```

If the settings text is not valid JSON, the widget receives `{}`. A warning shows on the widget in the editor only, never on the live display.

---

## 2. Security model

| What | How |
|---|---|
| Sandbox | `<iframe sandbox="allow-scripts">`, plus `allow-popups` only when `allowPopups` is on. **Never** `allow-same-origin`, `allow-top-navigation`, `allow-forms` or `allow-modals`. |
| Origin | Opaque (`"null"`). The widget can't read the host DOM, cookies, `localStorage` or the session token, and can't make same-origin requests to the Smart Display API. |
| Navigation | The widget can't navigate the display (no top navigation). The host never navigates, evaluates or `innerHTML`s anything a widget sends. |
| Referrer | `referrerpolicy="no-referrer"`, so remote servers don't learn the display's URL. |
| Messages in | The host accepts a message only if `event.source === iframe.contentWindow`. Unknown types are ignored. |
| Messages out | The host posts only to its own iframe's `contentWindow`. It uses `targetOrigin: '*'` because the frame's origin is opaque and can't be named. Never put secrets in settings that you wouldn't give the widget's code. |
| Not available | `alert/confirm/prompt`, form submission, pointer lock, downloads, top navigation, opening popups (unless enabled), storage APIs (`localStorage`, `IndexedDB` and cookies throw or are unavailable in an opaque origin). |

Network access works, but requests carry `Origin: null` and no cookies. Any API you `fetch` must send `Access-Control-Allow-Origin: *`.

Treat widget code like any third-party script. It can still use network and CPU, so only install widgets you've read or trust.

---

## 3. Message reference (protocol version 1)

All messages are plain objects with a string `type`. Every message goes through `postMessage`.

### Widget → host

Always send to `window.parent` and always check `event.source === window.parent` on incoming messages.

#### `sd:ready`
Send this once your message listener is installed. The host replies with `sd:init` and then the latest `sd:data` values. The host also sends `sd:init` on the frame's `load` event, so you'll usually get init either way. Treat repeated inits as "re-apply everything".

```json
{ "type": "sd:ready" }
```

#### `sd:resize-request` *(reserved)*
Reserved for a future version. The host currently ignores it, because layout is decided in the editor.

```json
{ "type": "sd:resize-request", "width": 320, "height": 200 }
```

Any other message type is ignored.

### Host → widget

#### `sd:init`
Sent on iframe load, in reply to `sd:ready`, when the settings change, and when the display theme or accent colour changes.

```json
{
  "type": "sd:init",
  "version": 1,
  "settings": { "date": "2026-12-25", "label": "Christmas" },
  "theme": {
    "name": "glass",
    "fontFamily": "Inter, system-ui, sans-serif",
    "tokens": {
      "--sd-text": "#f8fafc",
      "--sd-text-muted": "#94a3b8",
      "--sd-accent": "#38bdf8",
      "--sd-fs-body": "clamp(0.85rem, 3.4cqmin, 1.35rem)"
    }
  },
  "isLive": true,
  "locale": "en-GB",
  "timeZone": "Europe/London"
}
```

- `settings`: the parsed Settings JSON (any JSON value; `{}` when empty or invalid).
- `theme.name`: one of `glass`, `paper`, `solid`, `mirror`, `ambient`, `contrast`.
- `theme.tokens`: the host's computed `--sd-*` values (see §4). Copy them onto your `:root`.
- `theme.fontFamily`: the display font stack. Web fonts loaded by the host are **not** loaded inside your frame, so the stack falls back to the next available font unless you load the font yourself.
- `isLive`: `true` on the kiosk display, `false` in the editor preview. Show sample data only when `false`.
- `locale` and `timeZone`: the display's BCP-47 locale and IANA zone. Pass them to `toLocaleString` and `Intl`.

#### `sd:tick`
Sent once a minute, on the minute boundary. Use it instead of your own timers for anything clock-like.

```json
{ "type": "sd:tick", "now": "2026-10-03T14:05:00.004Z" }
```

#### `sd:data`
Shared state published by other widgets on the same screen. Sent after every `sd:init` (latest values) and whenever a value changes. A topic is never sent if no widget has published it, for example when the screen has no weather widget.

```json
{ "type": "sd:data", "topic": "weather", "value": {
  "city": "London", "temp": 14, "units": "metric", "condition": "Light rain",
  "kind": "rain", "high": 16, "low": 9,
  "daily": [{ "date": "2026-10-03", "high": 16, "low": 9, "condition": "Rain" }],
  "updatedAt": 1791036000000
} }
```

```json
{ "type": "sd:data", "topic": "nextEvent", "value": {
  "title": "Dentist", "start": 1791043200000, "allDay": false, "feedName": "Family"
} }
```

`nextEvent.value` can be `null` (nothing upcoming). Timestamps are epoch milliseconds. `weather.kind` is one of `clear | cloudy | rain | snow | storm | fog | unknown`.

### Minimal skeleton

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;          // only trust the host
    const msg = event.data;
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'sd:init') {
      for (const [k, v] of Object.entries(msg.theme.tokens)) document.documentElement.style.setProperty(k, v);
      render(msg.settings);
    }
    if (msg.type === 'sd:tick') render();
    if (msg.type === 'sd:data' && msg.topic === 'weather') showWeather(msg.value);
  });
  window.parent.postMessage({ type: 'sd:ready' }, '*');
</script>
```

---

## 4. Theme tokens

Style your widget only with these tokens and give each one a fallback, for example `color: var(--sd-text, #fff)`. Your widget then matches all six themes and the user's accent colour.

| Token | Use |
|---|---|
| `--sd-text`, `--sd-text-muted`, `--sd-text-subtle` | Primary, secondary and tertiary text |
| `--sd-accent`, `--sd-on-accent`, `--sd-accent-soft`, `--sd-accent-border` | Highlight colour, text on accent, tinted background and border |
| `--sd-success`, `--sd-warning`, `--sd-danger`, `--sd-info` (+ `-soft` for the first three) | Status colours |
| `--sd-surface`, `--sd-surface-2`, `--sd-surface-3` | Panels inside your widget (`--sd-surface` may be a gradient) |
| `--sd-border-color`, `--sd-border-width`, `--sd-border` | Borders |
| `--sd-radius`, `--sd-radius-sm` | Corner radii |
| `--sd-canvas-bg` | The display background (rarely needed) |
| `--sd-weight-display` | Font weight for big numbers and headings |
| `--sd-text-shadow` | Text shadow used by the ambient theme |
| `--sd-fs-xs`, `-sm`, `-body`, `-title`, `-lg`, `-xl`, `-hero` | Type scale. These use `cqmin`, which inside your frame resolves against the frame's viewport, so text scales with the widget size. |

The card background, border and radius are drawn by the host. Keep `html, body { background: transparent }` and don't set `color-scheme`, or the browser may paint an opaque backdrop behind your frame.

---

## 5. Settings

Settings is free-form JSON that the user edits in the inspector. Document the keys your widget expects in an HTML comment at the top of the file, as the examples do. Validate every value, because users will type anything. Render settings with `textContent`, never with `innerHTML`.

---

## 6. Raspberry Pi performance tips

- Use `sd:tick` (once a minute) instead of `setInterval(…, 1000)`. If you do need seconds, update only the text node.
- Avoid `backdrop-filter`, big `box-shadow`s, infinite CSS animations and `<canvas>` redraw loops. Pis render them in software.
- Poll APIs no faster than the data changes (≥ 30 s), add a timeout, and stop polling on `visibilitychange` when `document.hidden` is true.
- Keep the DOM small and change only what changed. Don't rebuild the whole widget every tick.
- Inline everything. Each external script, font or image is another request on a slow SD card or Wi-Fi.
- Prefer `refreshMinutes: 0` and let your code refresh its own data. A full reload costs more than a fetch.

---

## 7. Examples

All examples are self-contained single files in [`docs/widget-examples/`](widget-examples/). Paste one into the HTML box, or host it and use its https URL.

| File | What it shows | Settings |
|---|---|---|
| [`hello-sdk.html`](widget-examples/hello-sdk.html) | Minimal template that handles and displays every message | any |
| [`days-until.html`](widget-examples/days-until.html) | Countdown to a date, updated on `sd:tick` | `{"date":"2026-12-25","label":"Christmas"}` |
| [`bin-day.html`](widget-examples/bin-day.html) | Weekly bin reminder with alternating bins by ISO week parity | `{"day":"Tuesday","alternate":["Recycling","Garden"],"always":["General waste"],"weekOffset":0}` |
| [`iss-tracker.html`](widget-examples/iss-tracker.html) | Network example: polls the ISS position every 30 s with error and staleness handling | `{"units":"kilometers"}` |

`hello-sdk` and `days-until` are also built into the editor's **Load example** picker.
