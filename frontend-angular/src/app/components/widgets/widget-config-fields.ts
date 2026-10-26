import { WidgetType } from '../../models/display.model';
import { ConfigField, ConfigOption } from './widget-config-schema';

/**
 * Settings forms (editor inspector, Content tab) for widgets whose settings are plain fields.
 * Attached to the registry as WidgetDefinition.fields. Widgets with list editors or extra actions
 * use a custom form instead: components/admin/widget-forms/custom-widget-forms.ts.
 */

const ALIGN: ConfigOption[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export const WIDGET_CONFIG_FIELDS: Partial<Record<WidgetType, readonly ConfigField[]>> = {
  clock: [
    { type: 'select', key: 'format', label: 'Format', options: [
      { value: 'hh:mm:ss a', label: '12-Hour (02:30:15 PM)' },
      { value: 'HH:mm:ss', label: '24-Hour (14:30:15)' },
      { value: 'hh:mm a', label: 'Short 12-Hour (02:30 PM)' },
      { value: 'HH:mm', label: 'Short 24-Hour (14:30)' },
    ] },
    { type: 'toggle', key: 'showDate', label: 'Show Date' },
  ],

  weather: [
    { type: 'notice', icon: '🌤️', title: 'No API Key Required!', text: 'Live temperature, conditions, UV index, and Air Quality (AQI) fetch automatically via Open-Meteo.' },
    { type: 'text', key: 'city', label: 'City Name', placeholder: 'e.g. San Jose, CA or London', hint: 'Supports any global city or state (e.g. "Austin, TX", "Paris", "Tokyo").' },
    { type: 'select', key: 'units', label: 'Units', options: [
      { value: 'imperial', label: 'Imperial (°F, mph)' },
      { value: 'metric', label: 'Metric (°C, m/s)' },
    ] },
    { type: 'toggle', key: 'showForecast', label: 'Show 5-Day Forecast Strip' },
    { type: 'toggle', key: 'showHourly', label: 'Show 12-Hour Hourly Forecast' },
    { type: 'text', key: 'alert', label: 'Severe Weather Alert (Optional)', placeholder: 'e.g. Winter Storm Warning' },
    { type: 'secret', key: 'apiKey', label: 'OpenWeather API Key (Optional)', placeholder: 'Leave blank to use zero-config Open-Meteo', section: 'Advanced: Custom OpenWeather API Key' },
  ],

  rss: [
    { type: 'text', key: 'feedUrl', label: 'Feed URL' },
    { type: 'text', key: 'title', label: 'Title' },
  ],

  todo: [
    { type: 'text', key: 'title', label: 'Title' },
    { type: 'toggle', key: 'filterCompleted', label: 'Hide Completed' },
  ],

  spotify: [
    { type: 'text', key: 'track', label: 'Track Title' },
    { type: 'text', key: 'artist', label: 'Artist' },
  ],

  countdown: [
    { type: 'text', key: 'title', label: 'Event Name', placeholder: 'Hawaii Vacation' },
    { type: 'date', key: 'targetDate', label: 'Target Date' },
    { type: 'text', key: 'emoji', label: 'Emoji Icon', placeholder: '🌴' },
  ],

  radar: [
    { type: 'notice', icon: 'ℹ️', title: 'No API Key Required!', text: 'Powered by RainViewer Global Precipitation Doppler Radar.' },
    { type: 'preset', label: 'Quick City Preset', placeholder: '-- Choose City or Enter Manually --', presets: ([
      ['San Francisco', 37.77, -122.42, 'San Francisco, CA'], ['New York', 40.71, -74.00, 'New York, NY'],
      ['Los Angeles', 34.05, -118.24, 'Los Angeles, CA'], ['Chicago', 41.88, -87.63, 'Chicago, IL'],
      ['Seattle', 47.60, -122.33, 'Seattle, WA'], ['Miami', 25.76, -80.19, 'Miami, FL'],
      ['Austin', 30.27, -97.74, 'Austin, TX'], ['Dallas', 32.78, -96.80, 'Dallas, TX'],
      ['Denver', 39.74, -104.99, 'Denver, CO'], ['Boston', 42.36, -71.06, 'Boston, MA'],
      ['Toronto', 43.65, -79.38, 'Toronto, Canada'], ['London', 51.51, -0.13, 'London, UK'],
      ['Paris', 48.86, 2.35, 'Paris, France'], ['Berlin', 52.52, 13.40, 'Berlin, Germany'],
      ['Tokyo', 35.68, 139.69, 'Tokyo, Japan'], ['Sydney', -33.87, 151.21, 'Sydney, Australia'],
    ] as const).map(([cityName, lat, lon, label]) => ({ label, values: { cityName, lat, lon } })) },
    { type: 'text', key: 'cityName', label: 'Location / City Label', placeholder: 'San Francisco Bay Area' },
    { type: 'number', key: 'lat', label: 'Latitude', step: 0.01, row: 'coords' },
    { type: 'number', key: 'lon', label: 'Longitude', step: 0.01, row: 'coords' },
    { type: 'number', key: 'zoom', label: 'Zoom Level (3-12)', min: 3, max: 12, row: 'zoom' },
    { type: 'select', key: 'colorScheme', label: 'Color Palette', row: 'zoom', options: [
      { value: '0', label: 'Original Black/White' },
      { value: '1', label: 'Universal Blue' },
      { value: '2', label: 'TITAN (Standard)' },
      { value: '3', label: 'The Weather Channel' },
      { value: '5', label: 'NEXRAD Level III' },
      { value: '6', label: 'Rainbow' },
    ] },
  ],

  quote: [
    { type: 'select', key: 'category', label: 'Category', options: [
      { value: 'inspirational', label: 'Inspirational Thoughts' },
      { value: 'wisdom', label: 'Stoic Philosophy & Wisdom' },
      { value: 'history', label: 'On This Day in History' },
      { value: 'custom', label: 'Custom Family Motto' },
    ] },
    { type: 'textarea', key: 'customQuote', label: 'Custom Quote Text', rows: 2, placeholder: "Family is not an important thing. It's everything.", showIf: c => c['category'] === 'custom' },
    { type: 'text', key: 'customAuthor', label: 'Author', placeholder: 'Michael J. Fox', showIf: c => c['category'] === 'custom' },
  ],

  chores: [
    { type: 'text', key: 'title', label: 'Widget Title', placeholder: 'Family Chores & Habits' },
    { type: 'notice', text: 'Family members can interactively complete tasks, gain streak points, and trigger confetti directly on the screen!' },
  ],

  camera_pip: [
    { type: 'text', key: 'title', label: 'Camera Title', placeholder: 'e.g. Driveway & Front Porch' },
    { type: 'text', key: 'snapshotUrl', label: 'Snapshot URL (or Home Assistant proxy)', placeholder: 'http://192.168.1.50/snapshot.jpg' },
    { type: 'text', key: 'streamUrl', label: 'Video Stream URL (Optional WebRTC/HLS/MJPEG)', placeholder: 'http://.../mjpeg or WebRTC stream' },
    { type: 'select', key: 'aspectRatio', label: 'Aspect Ratio', row: 'video', options: [
      { value: '16:9', label: '16 : 9 (Widescreen)' },
      { value: '4:3', label: '4 : 3 (Standard)' },
    ] },
    { type: 'select', key: 'refreshSeconds', label: 'Refresh Interval', row: 'video', options: [
      { value: '2', label: '2 seconds (Live)' },
      { value: '4', label: '4 seconds (Balanced)' },
      { value: '10', label: '10 seconds' },
    ] },
    { type: 'notice', icon: '💡', title: 'Google & SimpliSafe Feed Tips:', text: 'Google Nest and SimpliSafe protect their feeds behind cloud logins. Bridging them through Home Assistant or Scrypted (recommended) produces a local snapshot or WebRTC/MJPEG URL you can paste above. For Nest, you can also enable Camera Sharing ("Share with password" or "Share publicly") in the Nest app and paste the embed link into Video Stream URL.' },
  ],

  commute: [
    { type: 'text', key: 'title', label: 'Widget Title', placeholder: 'Morning Commute' },
    { type: 'select', key: 'mode', label: 'Default View Mode', options: [
      { value: 'driving', label: 'Driving Routes & Live Traffic' },
      { value: 'transit', label: 'Public Transit Departures' },
    ] },
  ],

  youtube: [
    { type: 'text', key: 'title', label: 'Widget Title (Optional)', placeholder: 'e.g. Lofi Chill Beats / NASA Live' },
    { type: 'text', key: 'urlOrId', label: 'YouTube URL or Video ID', placeholder: 'https://www.youtube.com/watch?v=... or ID', hint: 'Supports standard watch links, youtu.be, shorts, and live streams.' },
    { type: 'toggle', key: 'autoplay', label: 'Auto-Play Video' },
    { type: 'toggle', key: 'muted', label: 'Mute Audio (Required for wall kiosk autoplay)' },
    { type: 'toggle', key: 'loop', label: 'Loop Continuously' },
    { type: 'toggle', key: 'showControls', label: 'Show Video Controls' },
    { type: 'toggle', key: 'isLive', label: 'Show Red "LIVE" Badge' },
  ],

  qrcode: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'data', label: 'QR Code Data (URL, text, WiFi string)' },
    { type: 'number', key: 'size', label: 'Size (px)' },
  ],

  shapes: [
    { type: 'select', key: 'shape', label: 'Shape Type', options: [
      { value: 'rectangle', label: 'Rectangle Fill' },
      { value: 'circle', label: 'Circle' },
      { value: 'horizontal_line', label: 'Horizontal Line (Divider)' },
      { value: 'vertical_line', label: 'Vertical Line (Divider)' },
    ] },
    { type: 'text', key: 'color', label: 'Color (Hex or Name)' },
    { type: 'number', key: 'fillOpacity', label: 'Fill Opacity (0.0 - 1.0)', step: 0.1, min: 0, max: 1 },
  ],

  scheduled_text: [
    { type: 'textarea', key: 'message', label: 'Announcement Message', rows: 3 },
    { type: 'time', key: 'startTime', label: 'Start Time (HH:MM)' },
    { type: 'time', key: 'endTime', label: 'End Time (HH:MM)' },
    { type: 'list', key: 'showDays', label: 'Active Days (comma separated: Mon,Tue,Wed)' },
  ],

  button: [
    { type: 'text', key: 'label', label: 'Button Label' },
    { type: 'text', key: 'icon', label: 'Icon (Emoji)' },
    { type: 'text', key: 'url', label: 'Target URL (Optional)', placeholder: 'https://...' },
    { type: 'select', key: 'style', label: 'Button Style', options: [
      { value: 'gradient', label: 'Vibrant Gradient' },
      { value: 'solid', label: 'Solid Indigo' },
      { value: 'outline', label: 'Outline Transparent' },
    ] },
  ],

  sun_moon: [
    { type: 'text', key: 'cityName', label: 'City Name' },
    { type: 'number', key: 'latitude', label: 'Latitude', step: 0.0001 },
    { type: 'number', key: 'longitude', label: 'Longitude', step: 0.0001 },
  ],

  analog_clock: [
    { type: 'text', key: 'accentColor', label: 'Accent Color (Hex)' },
    { type: 'toggle', key: 'showSeconds', label: 'Show Second Hand' },
    { type: 'toggle', key: 'showNumbers', label: 'Show Numbers' },
  ],

  rest_fetch: [
    { type: 'preset', label: '1-Click Quick Preset', placeholder: 'Select a preset or custom API...', presets: [
      { label: '🏠 Home Assistant Sensor', values: { url: 'http://homeassistant.local:8123/api/states/sensor.temperature', authHeader: 'Bearer YOUR_HOME_ASSISTANT_TOKEN', jsonPath: 'state', title: 'Living Room Temp', prefix: '', unit: '°F', icon: '🌡️', refreshSeconds: 30 } },
      { label: '🪙 Bitcoin Live Price (CoinGecko)', values: { url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', authHeader: '', jsonPath: 'bitcoin.usd', title: 'Bitcoin Price', prefix: '$', unit: 'USD', icon: '🪙', refreshSeconds: 60 } },
      { label: '📍 Public IP & City (ipapi.co)', values: { url: 'https://ipapi.co/json/', authHeader: '', jsonPath: 'city', title: 'Current City', prefix: '', unit: '', icon: '📍', refreshSeconds: 300 } },
    ] },
    { type: 'text', key: 'url', label: 'REST Endpoint URL', placeholder: 'https://api.example.com/data.json' },
    { type: 'secret', key: 'authHeader', label: 'Authorization Header (Optional)', placeholder: 'Bearer YOUR_TOKEN' },
    { type: 'text', key: 'jsonPath', label: 'JSON Data Key / Path', placeholder: 'state or data.price', hint: 'e.g. state for Home Assistant, bitcoin.usd for crypto' },
    { type: 'text', key: 'title', label: 'Title Header', placeholder: 'Feed Title', row: 'head' },
    { type: 'text', key: 'icon', label: 'Icon / Emoji', placeholder: '🌐', row: 'head' },
    { type: 'text', key: 'prefix', label: 'Value Prefix', placeholder: '$', row: 'affix' },
    { type: 'text', key: 'unit', label: 'Value Suffix / Unit', placeholder: '°F, %, kW', row: 'affix' },
    { type: 'number', key: 'refreshSeconds', label: 'Refresh Interval (seconds)', min: 5, max: 3600 },
  ],

  gauge: [
    { type: 'number', key: 'value', label: 'Current Value', row: 'value' },
    { type: 'text', key: 'unit', label: 'Unit Label', placeholder: '°F, %, kW', row: 'value' },
    { type: 'number', key: 'min', label: 'Min Scale', row: 'scale' },
    { type: 'number', key: 'max', label: 'Max Scale', row: 'scale' },
    { type: 'text', key: 'title', label: 'Title Header', placeholder: 'Gauge Title', row: 'head' },
    { type: 'text', key: 'icon', label: 'Icon / Emoji', placeholder: '⚡', row: 'head' },
    { type: 'number', key: 'warnThreshold', label: 'Warning (Amber)', placeholder: '75', row: 'thresholds' },
    { type: 'number', key: 'critThreshold', label: 'Critical (Red)', placeholder: '90', row: 'thresholds' },
    { type: 'select', key: 'colorScheme', label: 'Color Theme', options: [
      { value: 'green-yellow-red', label: 'Emerald → Amber → Crimson (Standard)' },
      { value: 'blue-cyan-emerald', label: 'Sky Blue → Cyan → Emerald' },
    ] },
    { type: 'webhook', title: '📡 Inbound Webhook / HA Push', text: 'Push live data directly into this gauge via HTTP POST:' },
  ],

  whiteboard: [
    { type: 'text', key: 'canvasTitle', label: 'Canvas Board Title', placeholder: 'Family Notes & Doodles' },
    { type: 'color', key: 'defaultColor', label: 'Default Pen Color', row: 'colors' },
    { type: 'color', key: 'backgroundColor', label: 'Background Color', row: 'colors' },
    { type: 'range', key: 'defaultSize', label: 'Default Stroke Width', min: 1, max: 12, step: 1, defaultValue: 3, unit: 'px' },
  ],

  google_maps: [
    { type: 'text', key: 'title', label: 'Widget Title', placeholder: 'Live Traffic & Map' },
    { type: 'text', key: 'address', label: 'Location / Address or City', placeholder: 'Austin, TX' },
    { type: 'range', key: 'zoom', label: 'Zoom Level', min: 3, max: 19, step: 1, defaultValue: 13, row: 'map' },
    { type: 'select', key: 'mapType', label: 'Map View Type', row: 'map', options: [
      { value: 'm', label: 'Roadmap (Standard)' },
      { value: 'k', label: 'Satellite Aerial' },
    ] },
    { type: 'toggle', key: 'showTraffic', label: 'Show Live Traffic Indicator Badge' },
  ],

  slack: [
    { type: 'text', key: 'channelName', label: 'Slack Channel Name', placeholder: 'announcements' },
    { type: 'number', key: 'maxItems', label: 'Max Messages Shown', min: 1, max: 15 },
  ],

  gmail: [
    { type: 'text', key: 'accountEmail', label: 'Google / Gmail Account', placeholder: 'user@gmail.com' },
    { type: 'number', key: 'unreadCount', label: 'Unread Badge Count', min: 0 },
  ],

  tradingview: [
    { type: 'text', key: 'symbol', label: 'Symbol / Ticker', placeholder: 'NASDAQ:AAPL, BINANCE:BTCUSDT', hint: 'Supports stocks, crypto, forex, indices (e.g. NASDAQ:AAPL, BINANCE:BTCUSDT, FX:EURUSD, SPY)' },
    { type: 'select', key: 'interval', label: 'Chart Interval', row: 'chart', options: [
      { value: '1', label: '1 Minute' }, { value: '5', label: '5 Minutes' }, { value: '15', label: '15 Minutes' },
      { value: '60', label: '1 Hour' }, { value: '1D', label: '1 Day (Daily)' }, { value: '1W', label: '1 Week' },
      { value: '1M', label: '1 Month' },
    ] },
    { type: 'select', key: 'theme', label: 'Color Theme', row: 'chart', options: [
      { value: 'dark', label: 'Dark Theme' },
      { value: 'light', label: 'Light Theme' },
    ] },
    { type: 'select', key: 'chartStyle', label: 'Chart Style', options: [
      { value: '1', label: 'Candlesticks' }, { value: '2', label: 'Line Chart' },
      { value: '3', label: 'Area Chart' }, { value: '8', label: 'Heikin Ashi' },
    ] },
    { type: 'toggle', key: 'showVolume', label: 'Show Volume Indicator' },
    { type: 'text', key: 'title', label: 'Custom Title (Optional)', placeholder: 'e.g. Tech Portfolio, Bitcoin Tracker' },
  ],

  reddit: [
    { type: 'text', key: 'subreddit', label: 'Subreddit', prefix: 'r/', placeholder: 'EarthPorn, space, wallpapers, aww', hint: 'Curated suggestions: EarthPorn, space, CityPorn, wallpapers, art, aww, ITAP' },
    { type: 'select', key: 'sort', label: 'Sort Feed By', row: 'feed', options: [
      { value: 'hot', label: '🔥 Hot Posts' },
      { value: 'top', label: '⭐ Top Rated' },
      { value: 'new', label: '✨ New Posts' },
    ] },
    { type: 'number', key: 'intervalSeconds', label: 'Slide Interval (Seconds)', min: 5, max: 300, row: 'feed' },
    { type: 'toggle', key: 'showScore', label: 'Show Upvote Count', row: 'badges' },
    { type: 'toggle', key: 'showTitle', label: 'Show Post Title & Author', row: 'badges' },
  ],

  greeting: [
    { type: 'text', key: 'names', label: 'Names (comma-separated, optional)', placeholder: 'e.g. Emma, Lucas' },
    { type: 'select', key: 'mode', label: 'Messages', options: [
      { value: 'mixed', label: 'Built-in + weather/event hints + my lines' },
      { value: 'custom_only', label: 'Only my lines' },
    ] },
    { type: 'textarea', key: 'customMessages', label: 'Your Own Lines (one per line)', rows: 4, placeholder: "You're going to crush it today!\nDon't forget to water the plants." },
    { type: 'number', key: 'rotateSeconds', label: 'Rotate Every (seconds, min 10)', min: 10 },
    { type: 'select', key: 'align', label: 'Alignment', options: ALIGN },
    { type: 'toggle', key: 'showSubline', label: 'Show compliment line', defaultOn: true },
  ],
};
