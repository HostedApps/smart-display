import { Widget, ChoresConfig, CommuteConfig } from '../models/display.model';

export interface DashboardTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  accentColor: string;
  badge: string;
  generateWidgets: (width: number, height: number, pageId?: string) => Partial<Widget>[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'family_command_center',
    name: 'Family Command Center',
    icon: '🏡',
    category: 'Home & Family',
    badge: 'Popular',
    accentColor: '#38bdf8',
    description: 'DAKboard & Hearth-inspired all-in-one family organizer with clock, weather, shared calendar, chores chart, and meal planner.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'clock',
        page_id: pageId,
        customName: 'Digital Clock',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.03), width: Math.round(cw * 0.46), height: Math.round(ch * 0.28) },
        config: { format: '12h', showDate: true },
        style: { borderRadius: 16 }
      },
      {
        type: 'weather',
        page_id: pageId,
        customName: 'Weather Forecast',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.03), width: Math.round(cw * 0.48), height: Math.round(ch * 0.28) },
        config: { city: 'San Jose, CA', units: 'imperial', showForecast: true, showHourly: false },
        style: { borderRadius: 16 }
      },
      {
        type: 'calendar',
        page_id: pageId,
        customName: 'Family Calendar',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.33), width: Math.round(cw * 0.46), height: Math.round(ch * 0.63) },
        config: { title: 'Family Agenda', viewMode: 'agenda', maxEvents: 6 },
        style: { borderRadius: 16 }
      },
      {
        type: 'chores',
        page_id: pageId,
        customName: 'Kids Chores & Habits',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.33), width: Math.round(cw * 0.48), height: Math.round(ch * 0.36) },
        config: {
          title: 'Daily Family Chores',
          members: [
            { id: 'emma', name: 'Emma', avatar: '🦄', points: 0, streak: 0 },
            { id: 'lucas', name: 'Lucas', avatar: '🦁', points: 0, streak: 0 }
          ],
          chores: [
            { id: '1', memberId: 'emma', title: 'Make bed & tidy room 🛏️', points: 10, completed: false },
            { id: '2', memberId: 'lucas', title: 'Feed & walk puppy 🐕', points: 15, completed: false },
            { id: '3', memberId: 'emma', title: 'Finish homework & reading 📚', points: 20, completed: false },
            { id: '4', memberId: 'lucas', title: 'Empty dishwasher 🍽️', points: 10, completed: false }
          ]
        } satisfies ChoresConfig,
        style: { borderRadius: 16 }
      },
      {
        type: 'meal_planner',
        page_id: pageId,
        customName: 'Dinner Planner',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.71), width: Math.round(cw * 0.48), height: Math.round(ch * 0.25) },
        config: {
          title: 'Weekly Dinners',
          meals: [
            { day: 'Mon', meal: 'Grilled Salmon & Veggies', cook: 'Mom' },
            { day: 'Tue', meal: 'Taco Tuesday 🌮', cook: 'Dad' },
            { day: 'Wed', meal: 'Pasta Primavera', cook: 'Emma' },
            { day: 'Thu', meal: 'Stir-Fry Rice Bowls', cook: 'Dad' },
            { day: 'Fri', meal: 'Homemade Pizza Night 🍕', cook: 'Family' }
          ]
        },
        style: { borderRadius: 16 }
      }
    ]
  },
  {
    id: 'smart_home_ops',
    name: 'Smart Home Operations',
    icon: '⚡',
    category: 'Home Automation',
    badge: 'Pro IoT',
    accentColor: '#10b981',
    description: 'High-density telemetry dashboard with live camera PIP, real-time power grid gauge, climate HVAC gauge, and Home Assistant sensors.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'camera_pip',
        page_id: pageId,
        customName: 'Front Doorbell Camera',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.03), width: Math.round(cw * 0.48), height: Math.round(ch * 0.45) },
        config: { label: 'Front Porch • Live HUD', refreshIntervalSeconds: 3 },
        style: { borderRadius: 16 }
      },
      {
        type: 'gauge',
        page_id: pageId,
        customName: 'Grid Power Meter',
        position: { x: Math.round(cw * 0.52), y: Math.round(ch * 0.03), width: Math.round(cw * 0.22), height: Math.round(ch * 0.45) },
        config: { title: 'Power Grid', icon: '⚡', value: 3.4, min: 0, max: 8, unit: 'kW', warnThreshold: 5.5, critThreshold: 7.0, colorScheme: 'green-yellow-red' },
        style: { borderRadius: 16 }
      },
      {
        type: 'gauge',
        page_id: pageId,
        customName: 'HVAC Climate Gauge',
        position: { x: Math.round(cw * 0.76), y: Math.round(ch * 0.03), width: Math.round(cw * 0.22), height: Math.round(ch * 0.45) },
        config: { title: 'Living Room AC', icon: '❄️', value: 72, min: 50, max: 95, unit: '°F', warnThreshold: 78, critThreshold: 85, colorScheme: 'blue-cyan-emerald' },
        style: { borderRadius: 16 }
      },
      {
        type: 'commute',
        page_id: pageId,
        customName: 'Work & Transit Commute',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.51), width: Math.round(cw * 0.48), height: Math.round(ch * 0.45) },
        config: {
          destinations: [
            { id: '1', name: 'Office (Downtown)', icon: '🏢', durationMinutes: 24, trafficStatus: 'moderate', viaRoute: 'via Downtown San Jose', delayMinutes: 5 },
            { id: '2', name: 'Airport (SJC)', icon: '✈️', durationMinutes: 14, trafficStatus: 'fast', viaRoute: 'via US-101 S', delayMinutes: 0 }
          ]
        } satisfies CommuteConfig,
        style: { borderRadius: 16 }
      },
      {
        type: 'radar',
        page_id: pageId,
        customName: 'RainViewer Live Radar',
        position: { x: Math.round(cw * 0.52), y: Math.round(ch * 0.51), width: Math.round(cw * 0.46), height: Math.round(ch * 0.45) },
        config: { cityName: 'Local Rain Radar', latitude: 37.3382, longitude: -121.8863, zoom: 7 },
        style: { borderRadius: 16 }
      }
    ]
  },
  {
    id: 'minimalist_desk_clock',
    name: 'Minimalist Desk Clock',
    icon: '🕰️',
    category: 'Minimalist',
    badge: 'Clean Aesthetics',
    accentColor: '#f59e0b',
    description: 'Serene, distraction-free bedside or desk companion featuring an elegant sweeping analog clock, sun/moon phases, and inspiring quotes.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'analog_clock',
        page_id: pageId,
        customName: 'Minimal Analog Clock',
        position: { x: Math.round(cw * 0.03), y: Math.round(ch * 0.08), width: Math.round(cw * 0.44), height: Math.round(ch * 0.84) },
        config: { showSeconds: true, style: 'minimal' },
        style: { borderRadius: 24 }
      },
      {
        type: 'clock',
        page_id: pageId,
        customName: 'Precision Digital Time',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.08), width: Math.round(cw * 0.47), height: Math.round(ch * 0.28) },
        config: { format: '12h', showDate: true },
        style: { borderRadius: 20 }
      },
      {
        type: 'sun_moon',
        page_id: pageId,
        customName: 'Sun & Lunar Phase',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.39), width: Math.round(cw * 0.47), height: Math.round(ch * 0.25) },
        config: { cityName: 'San Jose, CA', latitude: 37.3382, longitude: -121.8863 },
        style: { borderRadius: 20 }
      },
      {
        type: 'quote',
        page_id: pageId,
        customName: 'Daily Inspiration',
        position: { x: Math.round(cw * 0.50), y: Math.round(ch * 0.67), width: Math.round(cw * 0.47), height: Math.round(ch * 0.25) },
        config: { category: 'wisdom', refreshHours: 12 },
        style: { borderRadius: 20 }
      }
    ]
  },
  {
    id: 'executive_finance',
    name: 'Executive Finance & Tech',
    icon: '📈',
    category: 'Finance & News',
    badge: 'Markets',
    accentColor: '#6366f1',
    description: 'Wall Street command display with live stock and crypto tickers, Gemini AI executive briefing, global market timezones, and RSS news feeds.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'stock_crypto',
        page_id: pageId,
        customName: 'Market Watch Tickers',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.03), width: Math.round(cw * 0.96), height: Math.round(ch * 0.16) },
        config: { symbols: ['BTC', 'ETH', 'SPY', 'AAPL', 'NVDA', 'GOOGL'] },
        style: { borderRadius: 14 }
      },
      {
        type: 'ai_briefing',
        page_id: pageId,
        customName: 'Executive AI Morning Brief',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.22), width: Math.round(cw * 0.48), height: Math.round(ch * 0.48) },
        config: { briefingType: 'morning', persona: 'executive' },
        style: { borderRadius: 16 }
      },
      {
        type: 'world_clocks',
        page_id: pageId,
        customName: 'Financial Hub Clocks',
        position: { x: Math.round(cw * 0.52), y: Math.round(ch * 0.22), width: Math.round(cw * 0.46), height: Math.round(ch * 0.48) },
        config: {
          clocks: [
            { label: 'New York (NYSE)', timezone: 'America/New_York' },
            { label: 'London (LSE)', timezone: 'Europe/London' },
            { label: 'Tokyo (TSE)', timezone: 'Asia/Tokyo' },
            { label: 'Frankfurt (DAX)', timezone: 'Europe/Berlin' }
          ]
        },
        style: { borderRadius: 16 }
      },
      {
        type: 'rss',
        page_id: pageId,
        customName: 'Financial & Tech Headlines',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.73), width: Math.round(cw * 0.96), height: Math.round(ch * 0.24) },
        config: { feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', title: 'Global Business & Tech Wire', maxItems: 5 },
        style: { borderRadius: 14 }
      }
    ]
  },
  {
    id: 'transit_commute',
    name: 'Transit & Commute Hub',
    icon: '🚦',
    category: 'Commute & Travel',
    badge: 'Live Traffic',
    accentColor: '#ec4899',
    description: 'Hallway entrance dashboard with multi-destination commute traffic ETAs, live Doppler rain radar, weather forecast, and flight/transit schedules.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'commute',
        page_id: pageId,
        customName: 'Traffic Departure Board',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.03), width: Math.round(cw * 0.48), height: Math.round(ch * 0.45) },
        config: {
          destinations: [
            { id: '1', name: 'Headquarters Office', icon: '🏢', durationMinutes: 28, trafficStatus: 'moderate', viaRoute: 'via Palo Alto, CA', delayMinutes: 6 },
            { id: '2', name: 'Elementary School', icon: '🏫', durationMinutes: 8, trafficStatus: 'fast', viaRoute: 'via Willow Glen', delayMinutes: 0 },
            { id: '3', name: 'San Francisco Downtown', icon: '🚆', durationMinutes: 65, trafficStatus: 'fast', viaRoute: 'via Caltrain to Market St', delayMinutes: 0 }
          ]
        } satisfies CommuteConfig,
        style: { borderRadius: 16 }
      },
      {
        type: 'radar',
        page_id: pageId,
        customName: 'Regional Doppler Radar',
        position: { x: Math.round(cw * 0.52), y: Math.round(ch * 0.03), width: Math.round(cw * 0.46), height: Math.round(ch * 0.45) },
        config: { cityName: 'Bay Area Doppler Radar', latitude: 37.3382, longitude: -121.8863, zoom: 8 },
        style: { borderRadius: 16 }
      },
      {
        type: 'weather',
        page_id: pageId,
        customName: '5-Day Weather Forecast',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.51), width: Math.round(cw * 0.48), height: Math.round(ch * 0.45) },
        config: { city: 'San Jose, CA', units: 'imperial', showForecast: true },
        style: { borderRadius: 16 }
      },
      {
        type: 'world_clocks',
        page_id: pageId,
        customName: 'Travel Times & Transit',
        position: { x: Math.round(cw * 0.52), y: Math.round(ch * 0.51), width: Math.round(cw * 0.46), height: Math.round(ch * 0.45) },
        config: {
          clocks: [
            { label: 'Pacific Time (Local)', timezone: 'America/Los_Angeles' },
            { label: 'Eastern Time (DC / NY)', timezone: 'America/New_York' },
            { label: 'UTC / Flight Time', timezone: 'UTC' }
          ]
        },
        style: { borderRadius: 16 }
      }
    ]
  },
  {
    id: 'ambient_art_frame',
    name: 'Ambient Art & Photo Frame',
    icon: '🖼️',
    category: 'Art & Media',
    badge: 'Ambient Living',
    accentColor: '#8b5cf6',
    description: 'Transform your TV or wall display into dynamic living art with full-bleed photo slideshows, ambient fireplace/music, subtle analog clock, and solar info.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'photo',
        page_id: pageId,
        customName: 'Art & Nature Slideshow',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.03), width: Math.round(cw * 0.60), height: Math.round(ch * 0.94) },
        config: { fitMode: 'cover', kenBurns: true, intervalSeconds: 30 },
        style: { borderRadius: 20 }
      },
      {
        type: 'youtube',
        page_id: pageId,
        customName: 'Ambient Lo-Fi Stream',
        position: { x: Math.round(cw * 0.64), y: Math.round(ch * 0.03), width: Math.round(cw * 0.34), height: Math.round(ch * 0.40) },
        config: { videoId: 'jfKfPfyJRdk', autoPlay: true, mute: true, loop: true },
        style: { borderRadius: 20 }
      },
      {
        type: 'analog_clock',
        page_id: pageId,
        customName: 'Subtle Living Room Clock',
        position: { x: Math.round(cw * 0.64), y: Math.round(ch * 0.46), width: Math.round(cw * 0.34), height: Math.round(ch * 0.30) },
        config: { showSeconds: false, style: 'modern' },
        style: { borderRadius: 20 }
      },
      {
        type: 'quote',
        page_id: pageId,
        customName: 'Evening Wisdom',
        position: { x: Math.round(cw * 0.64), y: Math.round(ch * 0.79), width: Math.round(cw * 0.34), height: Math.round(ch * 0.18) },
        config: { category: 'art', refreshHours: 24 },
        style: { borderRadius: 20 }
      }
    ]
  }
];
