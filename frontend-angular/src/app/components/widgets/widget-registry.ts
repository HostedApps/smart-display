import { Type } from '@angular/core';
import { WidgetType, WIDGET_TYPES } from '../../models/display.model';
import { YoutubeWidgetComponent } from './youtube-widget.component';
import { AIBriefingWidgetComponent } from './ai-briefing-widget.component';
import { ChoresWidgetComponent } from './chores-widget.component';
import { CameraPipWidgetComponent } from './camera-pip-widget.component';
import { CommuteWidgetComponent } from './commute-widget.component';
import { ClockWidgetComponent } from './clock-widget.component';
import { WeatherWidgetComponent } from './weather-widget.component';
import { CalendarWidgetComponent } from './calendar-widget.component';
import { PhotoWidgetComponent } from './photo-widget.component';
import { RssWidgetComponent } from './rss-widget.component';
import { TodoWidgetComponent } from './todo-widget.component';
import { HomeAssistantWidgetComponent } from './homeassistant-widget.component';
import { SpotifyWidgetComponent } from './spotify-widget.component';
import { StockCryptoWidgetComponent } from './stock-crypto-widget.component';
import { StickyNoteWidgetComponent } from './sticky-note-widget.component';
import { CountdownWidgetComponent } from './countdown-widget.component';
import { MealPlannerWidgetComponent } from './meal-planner-widget.component';
import { RadarWidgetComponent } from './radar-widget.component';
import { QuoteWidgetComponent } from './quote-widget.component';
import { TextWidgetComponent } from './text-widget.component';
import { QrcodeWidgetComponent } from './qrcode-widget.component';
import { WorldClocksWidgetComponent } from './world-clocks-widget.component';
import { ShapesWidgetComponent } from './shapes-widget.component';
import { ScheduledTextWidgetComponent } from './scheduled-text-widget.component';
import { ButtonWidgetComponent } from './button-widget.component';
import { SunMoonWidgetComponent } from './sun-moon-widget.component';
import { AnalogClockWidgetComponent } from './analog-clock-widget.component';
import { RestFetchWidgetComponent } from './rest-fetch-widget.component';
import { GaugeWidgetComponent } from './gauge-widget.component';
import { WhiteboardWidgetComponent } from './whiteboard-widget.component';
import { GoogleMapsWidgetComponent } from './google-maps-widget.component';
import { SlackWidgetComponent } from './slack-widget.component';
import { GmailWidgetComponent } from './gmail-widget.component';
import { TradingviewWidgetComponent } from './tradingview-widget.component';
import { RedditWidgetComponent } from './reddit-widget.component';
import { GreetingWidgetComponent } from './greeting-widget.component';
import { CustomWidgetComponent } from './custom-widget.component';

export type WidgetCategory = 'time' | 'weather' | 'family' | 'media' | 'info' | 'data' | 'layout';

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: 'time', label: 'Time & Date' },
  { id: 'weather', label: 'Weather' },
  { id: 'family', label: 'Family & Home' },
  { id: 'media', label: 'Photos & Media' },
  { id: 'info', label: 'News & Info' },
  { id: 'data', label: 'Smart Home & Data' },
  { id: 'layout', label: 'Text & Layout' }
];

/**
 * Single source of truth for every widget type. The editor palette, new-widget defaults,
 * layer labels, help catalog and both renderers (editor canvas + kiosk display) read from here.
 * Adding a widget = create its component, add one entry below, and (for now) its inspector form.
 */
export interface WidgetDefinition {
  type: WidgetType;
  /** Short label for the palette tile */
  label: string;
  /** Full display name (layers, inspector, help) */
  name: string;
  /** Emoji used in the help catalog */
  icon: string;
  /** Lucide icon name (see components/shared/icon.component.ts) for editor UI */
  svgIcon: string;
  category: WidgetCategory;
  /** Help catalog badge */
  tag: string;
  description: string;
  /** Palette hover text */
  tooltip: string;
  /** Configuration hint shown in help */
  tips: string;
  component: Type<unknown>;
  defaultSize: { width: number; height: number };
  /** Factory so every new widget gets its own config object */
  defaultConfig: () => Record<string, any>;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'youtube',
    label: 'YouTube',
    name: 'YouTube Video & Stream',
    icon: '▶️',
    svgIcon: 'youtube',
    category: 'media',
    tag: 'Media',
    description: 'Embeds ambient videos, live news, and music streams with autoplay and loop controls.',
    tooltip: 'Embed ambient YouTube videos or live news/music streams with auto-play and loop',
    tips: 'Accepts standard watch URLs, youtu.be, shorts, or raw Video IDs.',
    component: YoutubeWidgetComponent,
    defaultSize: { width: 440, height: 260 },
    defaultConfig: () => ({
      title: 'Lofi Chill Beats ☕',
      urlOrId: 'jfKfPfyJRdk',
      autoplay: true,
      muted: true,
      loop: true,
      showControls: false,
      isLive: true
    })
  },
  {
    type: 'ai_briefing',
    label: 'AI Briefing',
    name: 'AI Ambient Briefing',
    icon: '🧠',
    svgIcon: 'sparkles',
    category: 'info',
    tag: 'AI Engine',
    description: 'A short morning, afternoon or evening briefing about your weather and next event, written by Google Gemini or the built-in engine.',
    tooltip: 'AI-written daily briefing using your local weather and calendar',
    tips: 'Set a location (or add a Weather widget to the same screen) and a Calendar widget for the next event. A Gemini API key is optional.',
    component: AIBriefingWidgetComponent,
    defaultSize: { width: 460, height: 200 },
    defaultConfig: () => ({
      userName: '',
      tone: 'warm',
      refreshHours: 1,
      city: '',
      units: 'imperial'
    })
  },
  {
    type: 'chores',
    label: 'Chores & Habits',
    name: 'Chores & Habit Streaks',
    icon: '🏆',
    svgIcon: 'trophy',
    category: 'family',
    tag: 'Gamification',
    description: 'Interactive Hearth-style family chore charts with avatar emojis, flame streaks, and confetti rewards.',
    tooltip: 'Interactive Hearth-style family chore charts with avatar emojis, flame streaks, and confetti',
    tips: 'Add family members, allocate points per task, and tap to complete.',
    component: ChoresWidgetComponent,
    defaultSize: { width: 380, height: 320 },
    // No members/chores seeded: the widget shows its built-in example (badged as sample on live displays)
    defaultConfig: () => ({
      title: 'Family Chores'
    })
  },
  {
    type: 'camera_pip',
    label: 'Live Camera',
    name: 'Live Camera PIP',
    icon: '📹',
    svgIcon: 'cctv',
    category: 'media',
    tag: 'Security',
    description: 'Low-latency RTSP/MJPEG live doorbell and security camera PIP stream with snapshot refresh HUD.',
    tooltip: 'Low-latency RTSP/MJPEG live doorbell and security camera PIP stream with snapshot refresh HUD',
    tips: 'Configure stream URL or image snapshot endpoint with refresh interval.',
    component: CameraPipWidgetComponent,
    defaultSize: { width: 380, height: 240 },
    defaultConfig: () => ({
      title: 'Driveway Camera',
      streamUrl: '',
      snapshotUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80',
      aspectRatio: '16:9',
      refreshSeconds: 4
    })
  },
  {
    type: 'commute',
    label: 'Commute',
    name: 'Commute & Transit',
    icon: '🚗',
    svgIcon: 'car',
    category: 'info',
    tag: 'Transit',
    description: 'Real-time driving traffic ETA matrices and public transit live departure countdowns.',
    tooltip: 'Real-time driving route traffic ETA matrices and public transit live departure countdowns',
    tips: 'Add destinations (Office, Airport, School) with route badges.',
    component: CommuteWidgetComponent,
    defaultSize: { width: 360, height: 240 },
    // No destinations seeded: the widget shows its built-in example (badged as sample on live displays)
    defaultConfig: () => ({
      title: 'Morning Commute'
    })
  },
  {
    type: 'clock',
    label: 'Clock',
    name: 'Digital Clock',
    icon: '⏰',
    svgIcon: 'clock',
    category: 'time',
    tag: 'Core',
    description: 'Precision digital clock with 12h/24h formats, date display, and typography styling.',
    tooltip: 'Precision digital clock with 12h/24h formats, date display, and typography styling',
    tips: 'Supports multiple time formats (hh:mm:ss a, HH:mm).',
    component: ClockWidgetComponent,
    defaultSize: { width: 300, height: 140 },
    defaultConfig: () => ({ format: 'hh:mm:ss a', showDate: true })
  },
  {
    type: 'weather',
    label: 'Weather',
    name: 'Weather Forecast',
    icon: '⛅',
    svgIcon: 'cloud-sun',
    category: 'weather',
    tag: 'Weather',
    description: 'Current temperature, weather condition icons, humidity, wind, and 5-day forecasts.',
    tooltip: 'Current temperature, weather condition icons, humidity, wind, and 5-day forecast',
    tips: 'City name and Imperial (°F) or Metric (°C). No API key needed; an OpenWeather key is optional.',
    component: WeatherWidgetComponent,
    defaultSize: { width: 360, height: 220 },
    defaultConfig: () => ({ city: 'San Jose', apiKey: '', units: 'imperial', showForecast: true })
  },
  {
    type: 'calendar',
    label: 'Calendar',
    name: 'Family Calendar',
    icon: '📅',
    svgIcon: 'calendar-days',
    category: 'family',
    tag: 'Scheduling',
    description: 'Monthly calendar grid and agenda list synchronized with Google Calendar, iCloud, and Outlook via iCal.',
    tooltip: 'Monthly calendar grid and agenda list synchronized with Google Calendar, iCloud, and Outlook iCal',
    tips: 'Paste public/secret iCal URLs from Google/Apple Calendar.',
    component: CalendarWidgetComponent,
    defaultSize: { width: 380, height: 340 },
    defaultConfig: () => ({
      title: 'Family Calendar',
      viewMode: 'agenda',
      maxEvents: 6,
      feeds: [
      { name: 'Kids', url: '', color: '#ec4899' },
      { name: 'Work', url: '', color: '#3b82f6' }
      ]
    })
  },
  {
    type: 'photo',
    label: 'Photos',
    name: 'Photo Slideshow & Google Photos',
    icon: '🖼️',
    svgIcon: 'image',
    category: 'media',
    tag: 'Media',
    description: 'Rotating family photo album slideshow and live streaming from Google Photos shared albums.',
    tooltip: 'Rotating family photo album slideshow with crossfade transitions',
    tips: 'Paste any Google Photos shared link (e.g. photos.app.goo.gl) or custom image URLs.',
    component: PhotoWidgetComponent,
    defaultSize: { width: 440, height: 280 },
    defaultConfig: () => ({
      albumUrl: '',
      images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&q=80',
      'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1280&q=80'
      ],
      intervalSeconds: 10,
      fitMode: 'cover',
      blurBackground: true,
      showCaptions: false
    })
  },
  {
    type: 'rss',
    label: 'RSS News',
    name: 'RSS News Feed',
    icon: '📰',
    svgIcon: 'newspaper',
    category: 'info',
    tag: 'Information',
    description: 'Live headline ticker pulling from major news outlets, tech blogs, and custom RSS feeds.',
    tooltip: 'Live headline ticker pulling from major news outlets, tech blogs, and custom RSS XML feeds',
    tips: 'Enter any valid RSS XML endpoint URL (e.g. BBC, NYT, Hacker News).',
    component: RssWidgetComponent,
    defaultSize: { width: 400, height: 300 },
    defaultConfig: () => ({ feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml', title: 'World News', maxItems: 4 })
  },
  {
    type: 'todo',
    label: 'Tasks',
    name: 'Tasks & To-Do',
    icon: '📝',
    svgIcon: 'list-checks',
    category: 'family',
    tag: 'Productivity',
    description: 'Shared family or office checklist with strike-through completion.',
    tooltip: 'Shared family or office checklist with strike-through task completion',
    tips: 'Add checklist items directly or sync with task managers.',
    component: TodoWidgetComponent,
    defaultSize: { width: 340, height: 260 },
    defaultConfig: () => ({ title: 'Daily Tasks', items: [], filterCompleted: false })
  },
  {
    type: 'homeassistant',
    label: 'Smart Home',
    name: 'Smart Home & Home Assistant',
    icon: '🏠',
    svgIcon: 'house',
    category: 'data',
    tag: 'Smart Home',
    description: 'Displays live entity states, lights, sensors, thermostat gauges from Home Assistant, Google Home, Alexa, or custom virtual devices.',
    tooltip: 'Displays live entity states, lights, sensors, temperature gauges from Home Assistant',
    tips: 'Home Assistant URL & token or custom smart entities.',
    component: HomeAssistantWidgetComponent,
    defaultSize: { width: 360, height: 240 },
    defaultConfig: () => ({
      title: 'Smart Home',
      haUrl: '',
      token: '',
      entities: [
      { entityId: 'light.living_room', label: 'Living Room Lights', state: 'on', icon: '💡' },
      { entityId: 'climate.thermostat', label: 'Nest Thermostat', state: '72', unit: '°F', icon: '🌡️' },
      { entityId: 'lock.front_door', label: 'Front Door Lock', state: 'locked', icon: '🔒' },
      { entityId: 'binary_sensor.driveway', label: 'Driveway Camera', state: 'clear', icon: '📹' }
      ],
      refreshSeconds: 30
    })
  },
  {
    type: 'spotify',
    label: 'Spotify',
    name: 'Spotify Now Playing',
    icon: '🎵',
    svgIcon: 'music',
    category: 'media',
    tag: 'Music',
    description: 'Shows active track artwork, artist name, progress bar, and playback status.',
    tooltip: 'Shows active track artwork, artist name, progress bar, and playback status',
    tips: 'OAuth connection or simulated ambient music player mode.',
    component: SpotifyWidgetComponent,
    defaultSize: { width: 360, height: 160 },
    defaultConfig: () => ({ track: 'Midnight City', artist: 'M83', isPlaying: true })
  },
  {
    type: 'stock_crypto',
    label: 'Markets',
    name: 'Markets & Stocks Ticker',
    icon: '📈',
    svgIcon: 'trending-up',
    category: 'data',
    tag: 'Finance',
    description: 'Live ticker tracking for US & Global Stocks (AAPL, TSLA, NVDA, SPY, MSFT, GOOGL) and Cryptocurrencies (BTC, ETH, SOL) with sparklines and % change.',
    tooltip: 'Live price tracking for Bitcoin, Ethereum, and major stock market indices',
    tips: 'Enter comma-separated stock symbols (e.g. AAPL, NVDA, SPY) and crypto tokens.',
    component: StockCryptoWidgetComponent,
    defaultSize: { width: 360, height: 280 },
    defaultConfig: () => ({
      title: 'Markets & Stocks',
      symbols: ['AAPL', 'TSLA', 'NVDA', 'SPY'],
      cryptoIds: ['bitcoin', 'ethereum', 'solana'],
      mode: 'all',
      currency: 'USD',
      showSparklines: true,
      refreshMinutes: 3
    })
  },
  {
    type: 'sticky_note',
    label: 'Sticky Notes',
    name: 'Sticky Notes',
    icon: '📌',
    svgIcon: 'sticky-note',
    category: 'family',
    tag: 'Family Board',
    description: 'Colored virtual post-it notes with handwriting typography.',
    tooltip: 'Colored virtual post-it notes with handwriting typography',
    tips: 'Set author, message, and note paper color.',
    component: StickyNoteWidgetComponent,
    defaultSize: { width: 340, height: 260 },
    defaultConfig: () => ({
      title: 'Family Notes',
      notes: [
      { id: '1', text: 'Don\'t forget soccer practice at 5:00 PM! ⚽', author: 'Mom', color: '#fef08a', date: 'Today' },
      { id: '2', text: 'Picked up groceries 🥖🍏', author: 'Dad', color: '#bbf7d0', date: 'Today' }
      ]
    })
  },
  {
    type: 'countdown',
    label: 'Countdown',
    name: 'Countdown Timer',
    icon: '⏳',
    svgIcon: 'hourglass',
    category: 'time',
    tag: 'Events',
    description: 'Live countdown timer to vacations, weddings, birthdays, or product launches.',
    tooltip: 'Live countdown timer to vacations, weddings, birthdays, or product launches',
    tips: 'Pick target date & time and give the event a title.',
    component: CountdownWidgetComponent,
    defaultSize: { width: 300, height: 220 },
    defaultConfig: () => ({
      title: 'Hawaii Vacation',
      targetDate: '2026-12-25',
      emoji: '🌴'
    })
  },
  {
    type: 'meal_planner',
    label: 'Meal Plan',
    name: 'Meal Planner',
    icon: '🍽️',
    svgIcon: 'utensils',
    category: 'family',
    tag: 'Lifestyle',
    description: 'Weekly Monday-to-Sunday dinner and lunch meal schedule for the whole family.',
    tooltip: 'Weekly Monday-to-Sunday dinner and lunch meal schedule for the whole family',
    tips: 'Edit daily menu items directly in the inspector.',
    component: MealPlannerWidgetComponent,
    defaultSize: { width: 360, height: 340 },
    defaultConfig: () => ({
      title: 'Weekly Menu',
      days: [
      { day: 'Monday', lunch: 'Salad Bowl', dinner: 'Pasta Primavera' },
      { day: 'Tuesday', lunch: 'Turkey Wrap', dinner: 'Taco Tuesday 🌮' },
      { day: 'Wednesday', lunch: 'Minestrone Soup', dinner: 'Baked Salmon' },
      { day: 'Thursday', lunch: 'Buddha Bowl', dinner: 'Pizza Night 🍕' },
      { day: 'Friday', lunch: 'BLT', dinner: 'Thai Green Curry' },
      { day: 'Saturday', lunch: 'Cafe Lunch', dinner: 'BBQ Burgers 🍔' },
      { day: 'Sunday', lunch: 'Roast', dinner: 'Charcuterie Board' }
      ]
    })
  },
  {
    type: 'radar',
    label: 'Radar',
    name: 'Weather Radar',
    icon: '🛰️',
    svgIcon: 'radar',
    category: 'weather',
    tag: 'Weather',
    description: 'Live animated Doppler rain and cloud radar map. Powered by RainViewer — 100% Free & Zero API Key Required.',
    tooltip: 'Live animated Doppler rain and cloud radar map for your geographical region',
    tips: 'Pick a quick city preset or enter Lat/Lon coordinates. No API key needed!',
    component: RadarWidgetComponent,
    defaultSize: { width: 380, height: 300 },
    defaultConfig: () => ({
      cityName: 'San Francisco Bay Area',
      lat: 37.7749,
      lon: -122.4194,
      zoom: 7,
      colorScheme: 2,
      smooth: true,
      refreshMinutes: 10
    })
  },
  {
    type: 'quote',
    label: 'Daily Quote',
    name: 'Daily Quotes',
    icon: '💬',
    svgIcon: 'quote',
    category: 'info',
    tag: 'Inspiration',
    description: 'Daily motivational thoughts, stoic philosophy, or custom family mottos.',
    tooltip: 'Daily motivational thoughts, stoic philosophy, or custom family mottos',
    tips: 'Select category or enter custom family quote.',
    component: QuoteWidgetComponent,
    defaultSize: { width: 340, height: 180 },
    defaultConfig: () => ({
      category: 'inspirational'
    })
  },
  {
    type: 'text',
    label: 'Text',
    name: 'Text & Announcements',
    icon: '📝',
    svgIcon: 'type',
    category: 'layout',
    tag: 'Core',
    description: 'Rich static text blocks for welcome messages, notices, and headings.',
    tooltip: 'Static text announcements, room labels, or custom messages',
    tips: 'Set text, size, alignment, and optional gradient header.',
    component: TextWidgetComponent,
    defaultSize: { width: 340, height: 200 },
    defaultConfig: () => ({
      title: 'Announcement',
      body: 'Welcome to the Smart Display!\nAdd your message here.',
      fontSize: 'medium',
      textAlign: 'left'
    })
  },
  {
    type: 'qrcode',
    label: 'QR Code',
    name: 'QR Code',
    icon: '📱',
    svgIcon: 'qr-code',
    category: 'layout',
    tag: 'Utility',
    description: 'Scannable QR codes for guest WiFi, URLs, menus, or contact cards.',
    tooltip: 'Generate QR codes for WiFi passwords, URLs, or contact info',
    tips: 'Enter the URL or WiFi credentials to encode.',
    component: QrcodeWidgetComponent,
    defaultSize: { width: 240, height: 280 },
    defaultConfig: () => ({
      data: 'https://smart-kiosk.online',
      label: 'Scan Me',
      size: 200
    })
  },
  {
    type: 'world_clocks',
    label: 'World Clocks',
    name: 'World Clocks',
    icon: '🌐',
    svgIcon: 'globe',
    category: 'time',
    tag: 'Core',
    description: 'Side-by-side clocks for multiple cities and time zones.',
    tooltip: 'Multiple timezone clocks for distributed teams or family abroad',
    tips: 'Add cities with their IANA time zone (e.g. Europe/London).',
    component: WorldClocksWidgetComponent,
    defaultSize: { width: 320, height: 220 },
    defaultConfig: () => ({
      clocks: [
      { label: 'New York', timezone: 'America/New_York' },
      { label: 'London', timezone: 'Europe/London' },
      { label: 'Tokyo', timezone: 'Asia/Tokyo' }
      ]
    })
  },
  {
    type: 'shapes',
    label: 'Shapes',
    name: 'Shapes & Dividers',
    icon: '⬛',
    svgIcon: 'shapes',
    category: 'layout',
    tag: 'Decor',
    description: 'Rectangles, circles, and divider lines to structure your layout.',
    tooltip: 'Decorative shapes, dividers, color panels, and visual separators',
    tips: 'Pick shape, fill colour, border, and opacity.',
    component: ShapesWidgetComponent,
    defaultSize: { width: 300, height: 4 },
    defaultConfig: () => ({
      shape: 'rectangle',
      color: '#6366f1',
      fillOpacity: 0.3
    })
  },
  {
    type: 'scheduled_text',
    label: 'Scheduled Text',
    name: 'Scheduled Text',
    icon: '⏰',
    svgIcon: 'calendar-clock',
    category: 'layout',
    tag: 'Core',
    description: 'Announcements that automatically show and hide on chosen days and times.',
    tooltip: 'Text announcements that appear and disappear at scheduled times',
    tips: 'Add messages with start/end time and active weekdays.',
    component: ScheduledTextWidgetComponent,
    defaultSize: { width: 340, height: 180 },
    defaultConfig: () => ({
      message: 'Good morning! Have a great day!',
      startTime: '06:00',
      endTime: '12:00',
      showDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    })
  },
  {
    type: 'button',
    label: 'Button',
    name: 'Button / Link',
    icon: '🔘',
    svgIcon: 'mouse-pointer-click',
    category: 'layout',
    tag: 'Interactive',
    description: 'Touch buttons that jump to another page or open a URL.',
    tooltip: 'Interactive touch buttons for navigation between pages or external links',
    tips: 'Choose a label, icon, and target page or link.',
    component: ButtonWidgetComponent,
    defaultSize: { width: 200, height: 160 },
    defaultConfig: () => ({
      label: 'Open Link',
      icon: '🔗',
      url: '',
      style: 'gradient'
    })
  },
  {
    type: 'sun_moon',
    label: 'Sun & Moon',
    name: 'Sun & Moon',
    icon: '🌙',
    svgIcon: 'sunrise',
    category: 'time',
    tag: 'Weather',
    description: 'Sunrise, sunset, golden hour, and current moon phase for your location.',
    tooltip: 'Sunrise, sunset times and current moon phase with illumination',
    tips: 'Enter a city name — coordinates are looked up automatically.',
    component: SunMoonWidgetComponent,
    defaultSize: { width: 320, height: 280 },
    defaultConfig: () => ({
      latitude: 37.3382,
      longitude: -121.8863,
      cityName: 'San Jose'
    })
  },
  {
    type: 'analog_clock',
    label: 'Analog Clock',
    name: 'Analog Clock',
    icon: '🕐',
    svgIcon: 'clock-3',
    category: 'time',
    tag: 'Core',
    description: 'Classic dial clock with hour, minute, and optional second hands.',
    tooltip: 'Classic analog clock dial with hour, minute, and second hands',
    tips: 'Choose dial style and whether to show the second hand.',
    component: AnalogClockWidgetComponent,
    defaultSize: { width: 260, height: 260 },
    defaultConfig: () => ({
      showSeconds: true,
      showNumbers: true,
      accentColor: '#3b82f6'
    })
  },
  {
    type: 'rest_fetch',
    label: 'REST Data',
    name: 'External Data (REST)',
    icon: '📡',
    svgIcon: 'plug',
    category: 'data',
    tag: 'Data',
    description: 'Poll any JSON API and display a value with a label and unit.',
    tooltip: 'Fetch live JSON data from Home Assistant or external REST APIs',
    tips: 'Set the URL, optional auth header, and a JSONPath to the value.',
    component: RestFetchWidgetComponent,
    defaultSize: { width: 280, height: 180 },
    defaultConfig: () => ({
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      jsonPath: 'bitcoin.usd',
      title: 'Bitcoin Price',
      prefix: '$',
      unit: 'USD',
      refreshSeconds: 60,
      icon: '🪙'
    })
  },
  {
    type: 'gauge',
    label: 'Gauge',
    name: 'Radial Gauge',
    icon: '⚡',
    svgIcon: 'gauge',
    category: 'data',
    tag: 'Data',
    description: 'Semicircular gauge with warning and critical thresholds; can receive pushed values.',
    tooltip: 'Semicircular radial gauge meter for temperatures, CPU, or metrics',
    tips: 'Set min/max, thresholds, and unit, or push values via the webhook API.',
    component: GaugeWidgetComponent,
    defaultSize: { width: 280, height: 210 },
    // No value seeded: set one in the inspector or push it via the webhook API
    defaultConfig: () => ({
      min: 0,
      max: 100,
      unit: '%',
      title: 'System Load',
      warnThreshold: 75,
      critThreshold: 90,
      colorScheme: 'green-yellow-red',
      icon: '⚡'
    })
  },
  {
    type: 'whiteboard',
    label: 'Whiteboard',
    name: 'Whiteboard',
    icon: '🎨',
    svgIcon: 'pen-line',
    category: 'family',
    tag: 'Family Board',
    description: 'Touch and stylus drawing board with pen, highlighter, and eraser that syncs across devices.',
    tooltip: 'Touch-interactive family whiteboard and chalkboard for notes and doodles',
    tips: 'Choose a background and default pen colour.',
    component: WhiteboardWidgetComponent,
    defaultSize: { width: 440, height: 320 },
    defaultConfig: () => ({
      defaultColor: '#00ffcc',
      defaultSize: 3,
      backgroundColor: '#1a1d24',
      canvasTitle: 'Family Notes & Doodles',
      strokes: []
    })
  },
  {
    type: 'google_maps',
    label: 'Google Maps',
    name: 'Google Maps',
    icon: '🗺️',
    svgIcon: 'map',
    category: 'info',
    tag: 'Maps',
    description: 'Interactive or satellite map of any location with live traffic.',
    tooltip: 'Interactive map embed with location search, zoom, and live traffic',
    tips: 'Search a location and adjust zoom level and map type.',
    component: GoogleMapsWidgetComponent,
    defaultSize: { width: 420, height: 320 },
    defaultConfig: () => ({
      address: 'Austin, TX',
      zoom: 13,
      mapType: 'm',
      showTraffic: true,
      title: 'Austin Live Traffic & Map'
    })
  },
  {
    type: 'slack',
    label: 'Slack Feed',
    name: 'Slack Channel',
    icon: '💬',
    svgIcon: 'slack',
    category: 'info',
    tag: 'Productivity',
    description: 'Latest messages from a Slack channel with avatars and timestamps.',
    tooltip: 'Live Slack channel message feed with avatars and timestamps',
    tips: 'Provide a Slack bot token and channel ID.',
    component: SlackWidgetComponent,
    defaultSize: { width: 380, height: 300 },
    defaultConfig: () => ({
      channelName: 'announcements',
      maxItems: 5
    })
  },
  {
    type: 'gmail',
    label: 'Gmail Inbox',
    name: 'Gmail Unread',
    icon: '✉️',
    svgIcon: 'mail',
    category: 'info',
    tag: 'Productivity',
    description: 'Unread email count with sender and subject previews.',
    tooltip: 'Gmail inbox unread count badge and latest email previews',
    tips: 'Connect a Google account with Gmail read access.',
    component: GmailWidgetComponent,
    defaultSize: { width: 360, height: 280 },
    defaultConfig: () => ({
      accountEmail: 'family@smart-display.online'
    })
  },
  {
    type: 'tradingview',
    label: 'TradingView',
    name: 'TradingView Chart',
    icon: '📈',
    svgIcon: 'chart-candlestick',
    category: 'data',
    tag: 'Finance',
    description: 'Live candlestick, line, or area charts for stocks, crypto, and forex.',
    tooltip: 'Interactive TradingView financial candlestick and area charts',
    tips: 'Enter a symbol (e.g. NASDAQ:AAPL), interval, and theme.',
    component: TradingviewWidgetComponent,
    defaultSize: { width: 480, height: 320 },
    defaultConfig: () => ({
      symbol: 'NASDAQ:AAPL',
      interval: '1D',
      theme: 'dark',
      chartStyle: '1',
      showVolume: true,
      title: 'Apple Inc. (AAPL)'
    })
  },
  {
    type: 'reddit',
    label: 'Reddit Media',
    name: 'Reddit Media',
    icon: '📸',
    svgIcon: 'images',
    category: 'media',
    tag: 'Media',
    description: 'Photo slideshow from top posts of image subreddits like r/EarthPorn or r/space.',
    tooltip: 'Live Reddit photo slideshow from curated photography subreddits',
    tips: 'List subreddits and choose the time range (day, week, all).',
    component: RedditWidgetComponent,
    defaultSize: { width: 440, height: 320 },
    defaultConfig: () => ({
      subreddit: 'EarthPorn',
      sort: 'hot',
      intervalSeconds: 30,
      showScore: true,
      showTitle: true
    })
  },
  {
    type: 'greeting',
    label: 'Greeting',
    name: 'Greeting & Compliments',
    icon: '👋',
    svgIcon: 'sparkles',
    category: 'info',
    tag: 'Mirror',
    description: 'MagicMirror-style time-of-day greeting with rotating compliments that react to the weather and your next calendar event.',
    tooltip: 'Good-morning greeting with rotating compliments, weather and next-event hints',
    tips: 'Add names (comma-separated) to rotate who is greeted. Add your own lines, one per line. Weather and event hints appear when a Weather or Calendar widget is on the screen.',
    component: GreetingWidgetComponent,
    defaultSize: { width: 520, height: 200 },
    defaultConfig: () => ({
      names: '',
      customMessages: '',
      mode: 'mixed',
      rotateSeconds: 30,
      align: 'center',
      showSubline: true
    })
  },
  {
    type: 'custom',
    label: 'Custom',
    name: 'Custom Widget (SDK)',
    icon: '🧩',
    svgIcon: 'code',
    category: 'data',
    tag: 'SDK',
    description: 'Run your own HTML/JS widget in a secure sandbox. It receives the time, theme colours, weather and the next calendar event.',
    tooltip: 'Build your own widget with HTML & JavaScript (sandboxed) or embed an https page',
    tips: 'Paste a self-contained HTML file or an https link. See docs/WIDGET_SDK.md for the message protocol and examples.',
    component: CustomWidgetComponent,
    defaultSize: { width: 320, height: 220 },
    defaultConfig: () => ({
      source: 'html',
      html: '',
      url: '',
      title: '',
      refreshMinutes: 0,
      settings: '{}',
      allowPopups: false
    })
  }
];

const BY_TYPE = new Map<string, WidgetDefinition>(WIDGET_REGISTRY.map(d => [d.type, d]));

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return BY_TYPE.get(type);
}

/** Registry types that are missing from WIDGET_TYPES or vice versa (should always be empty). */
export function registryMismatches(): string[] {
  const known = new Set<string>(WIDGET_TYPES);
  return [
    ...WIDGET_REGISTRY.filter(d => !known.has(d.type)).map(d => `unknown:${d.type}`),
    ...WIDGET_TYPES.filter(t => !BY_TYPE.has(t)).map(t => `unregistered:${t}`)
  ];
}
