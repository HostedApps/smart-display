import {
  Widget, WidgetPosition, ChoresConfig, CommuteConfig, ClockConfig, WeatherConfig, CalendarConfig, PhotoConfig,
  RssConfig, TodoConfig, StickyNoteConfig, CountdownConfig, MealPlannerConfig, QuoteConfig, StockCryptoConfig,
  TradingViewConfig, RadarConfig, CameraPipConfig, AIBriefingConfig
} from '../models/display.model';
import type { ThemePreset } from './theme.util';
import type { GaugeConfig } from '../components/widgets/gauge-widget.component';
import type { RestFetchConfig } from '../components/widgets/rest-fetch-widget.component';
import type { AnalogClockConfig } from '../components/widgets/analog-clock-widget.component';
import type { SunMoonConfig } from '../components/widgets/sun-moon-widget.component';
import type { ScheduledTextConfig } from '../components/widgets/scheduled-text-widget.component';

export interface DashboardTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  accentColor: string;
  badge: string;
  /** Theme preset that best suits this layout (applied as a suggestion by the editor). */
  recommendedTheme?: ThemePreset;
  generateWidgets: (width: number, height: number, pageId?: string) => Partial<Widget>[];
}

/** Converts canvas fractions to a rounded pixel rect. */
function pos(cw: number, ch: number, x: number, y: number, w: number, h: number): WidgetPosition {
  return { x: Math.round(cw * x), y: Math.round(ch * y), width: Math.round(cw * w), height: Math.round(ch * h) };
}

/** YYYY-MM-DD for a date `days` from now, so sample countdowns never start out expired. */
function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
          days: [
            { day: 'Monday', dinner: 'Grilled Salmon & Veggies' },
            { day: 'Tuesday', dinner: 'Taco Tuesday 🌮' },
            { day: 'Wednesday', dinner: 'Pasta Primavera' },
            { day: 'Thursday', dinner: 'Stir-Fry Rice Bowls' },
            { day: 'Friday', dinner: 'Homemade Pizza Night 🍕' }
          ]
        } satisfies MealPlannerConfig,
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
        config: { title: 'Front Porch • Live HUD', refreshSeconds: 3 } satisfies CameraPipConfig,
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
        config: { cityName: 'Local Rain Radar', lat: 37.3382, lon: -121.8863, zoom: 7 } satisfies RadarConfig,
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
    recommendedTheme: 'mirror',
    accentColor: '#f59e0b',
    description: 'Serene, distraction-free bedside or desk companion featuring an elegant sweeping analog clock, sun/moon phases, and inspiring quotes.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => [
      {
        type: 'analog_clock',
        page_id: pageId,
        customName: 'Minimal Analog Clock',
        position: { x: Math.round(cw * 0.03), y: Math.round(ch * 0.08), width: Math.round(cw * 0.44), height: Math.round(ch * 0.84) },
        config: { showSeconds: true, showNumbers: false } satisfies AnalogClockConfig,
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
        config: { category: 'wisdom', refreshHours: 12 } satisfies QuoteConfig,
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
        config: { symbols: ['SPY', 'AAPL', 'NVDA', 'GOOGL'], cryptoIds: ['bitcoin', 'ethereum'], mode: 'all' } satisfies StockCryptoConfig,
        style: { borderRadius: 14 }
      },
      {
        type: 'ai_briefing',
        page_id: pageId,
        customName: 'Executive AI Morning Brief',
        position: { x: Math.round(cw * 0.02), y: Math.round(ch * 0.22), width: Math.round(cw * 0.48), height: Math.round(ch * 0.48) },
        config: { tone: 'executive' } satisfies AIBriefingConfig,
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
        config: { cityName: 'Bay Area Doppler Radar', lat: 37.3382, lon: -121.8863, zoom: 8 } satisfies RadarConfig,
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
    recommendedTheme: 'ambient',
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
        config: { urlOrId: 'jfKfPfyJRdk', autoplay: true, muted: true, loop: true },
        style: { borderRadius: 20 }
      },
      {
        type: 'analog_clock',
        page_id: pageId,
        customName: 'Subtle Living Room Clock',
        position: { x: Math.round(cw * 0.64), y: Math.round(ch * 0.46), width: Math.round(cw * 0.34), height: Math.round(ch * 0.30) },
        config: { showSeconds: false, showNumbers: true } satisfies AnalogClockConfig,
        style: { borderRadius: 20 }
      },
      {
        type: 'quote',
        page_id: pageId,
        customName: 'Evening Wisdom',
        position: { x: Math.round(cw * 0.64), y: Math.round(ch * 0.79), width: Math.round(cw * 0.34), height: Math.round(ch * 0.18) },
        config: { category: 'inspirational', refreshHours: 24 } satisfies QuoteConfig,
        style: { borderRadius: 20 }
      }
    ]
  },
  {
    id: 'magic_mirror',
    name: 'Magic Mirror',
    icon: '🪞',
    category: 'Minimalist',
    badge: 'Smart Mirror',
    recommendedTheme: 'mirror',
    accentColor: '#e5e5e5',
    description: 'MagicMirror²-style layout for two-way mirrors and OLED panels: clock and weather in the top corners, agenda on the left, a centered compliment, and headlines along the bottom — with plenty of black space.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Mirror Clock',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.28, 0.20) : pos(cw, ch, 0.04, 0.02, 0.44, 0.12),
          config: { format: 'h:mm a', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 0 }
        },
        {
          type: 'weather',
          page_id: pageId,
          customName: 'Current Weather',
          position: land ? pos(cw, ch, 0.70, 0.03, 0.28, 0.26) : pos(cw, ch, 0.52, 0.02, 0.44, 0.16),
          config: { city: 'New York, NY', units: 'imperial', showForecast: true, showHourly: false } satisfies WeatherConfig,
          style: { borderRadius: 0 }
        },
        {
          type: 'calendar',
          page_id: pageId,
          customName: 'Upcoming Events',
          position: land ? pos(cw, ch, 0.02, 0.27, 0.26, 0.44) : pos(cw, ch, 0.04, 0.20, 0.56, 0.32),
          config: { title: 'Upcoming', viewMode: 'agenda', maxEvents: 5 } satisfies CalendarConfig,
          style: { borderRadius: 0 }
        },
        {
          type: 'quote',
          page_id: pageId,
          customName: 'Compliment',
          position: land ? pos(cw, ch, 0.32, 0.40, 0.36, 0.18) : pos(cw, ch, 0.10, 0.58, 0.80, 0.14),
          config: { category: 'custom', customQuote: 'You look great today.', customAuthor: 'Your Mirror' } satisfies QuoteConfig,
          style: { borderRadius: 0 }
        },
        {
          type: 'rss',
          page_id: pageId,
          customName: 'Headlines',
          position: land ? pos(cw, ch, 0.15, 0.80, 0.70, 0.17) : pos(cw, ch, 0.04, 0.82, 0.92, 0.16),
          config: { feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', title: 'Headlines', maxItems: 3 } satisfies RssConfig,
          style: { borderRadius: 0 }
        }
      ];
    }
  },
  {
    id: 'kitchen_hub',
    name: 'Kitchen Family Hub',
    icon: '🍳',
    category: 'Home & Family',
    badge: 'Family',
    accentColor: '#f97316',
    description: 'Wall-mounted kitchen organizer with the family calendar, shared to-do list, weekly meal plan, weather, clock, and sticky notes for quick messages.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Kitchen Clock',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.31, 0.20) : pos(cw, ch, 0.02, 0.02, 0.47, 0.14),
          config: { format: 'h:mm a', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'weather',
          page_id: pageId,
          customName: 'Today\'s Weather',
          position: land ? pos(cw, ch, 0.345, 0.03, 0.31, 0.30) : pos(cw, ch, 0.51, 0.02, 0.47, 0.14),
          config: { city: 'New York, NY', units: 'imperial', showForecast: true } satisfies WeatherConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'calendar',
          page_id: pageId,
          customName: 'Family Calendar',
          position: land ? pos(cw, ch, 0.02, 0.25, 0.31, 0.72) : pos(cw, ch, 0.02, 0.18, 0.96, 0.30),
          config: { title: 'Family Calendar', viewMode: 'agenda', maxEvents: 8 } satisfies CalendarConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'meal_planner',
          page_id: pageId,
          customName: 'This Week\'s Meals',
          position: land ? pos(cw, ch, 0.345, 0.35, 0.31, 0.62) : pos(cw, ch, 0.51, 0.50, 0.47, 0.24),
          config: {
            title: 'This Week\'s Meals',
            days: [
              { day: 'Monday', lunch: 'Chicken Wraps', dinner: 'Veggie Stir-Fry' },
              { day: 'Tuesday', lunch: 'Tomato Soup', dinner: 'Taco Night 🌮' },
              { day: 'Wednesday', lunch: 'Pasta Salad', dinner: 'Baked Salmon' },
              { day: 'Thursday', lunch: 'Leftovers', dinner: 'Homemade Pizza 🍕' },
              { day: 'Friday', lunch: 'Grain Bowls', dinner: 'Curry & Rice' }
            ]
          } satisfies MealPlannerConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'todo',
          page_id: pageId,
          customName: 'Family To-Do',
          position: land ? pos(cw, ch, 0.67, 0.03, 0.31, 0.46) : pos(cw, ch, 0.02, 0.50, 0.47, 0.24),
          config: {
            title: 'Family To-Do',
            allowToggle: true,
            items: [
              { id: '1', text: 'Buy milk, eggs & bread', completed: false, priority: 'high' },
              { id: '2', text: 'Return library books', completed: false, priority: 'medium' },
              { id: '3', text: 'Water the plants', completed: false, priority: 'low' },
              { id: '4', text: 'Book dentist appointment', completed: false, priority: 'medium' }
            ]
          } satisfies TodoConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'sticky_note',
          page_id: pageId,
          customName: 'Fridge Notes',
          position: land ? pos(cw, ch, 0.67, 0.51, 0.31, 0.46) : pos(cw, ch, 0.02, 0.76, 0.96, 0.22),
          config: {
            title: 'Fridge Notes',
            notes: [
              { id: '1', text: 'Soccer practice moved to 5:30 PM ⚽', color: '#fef08a', date: 'Today' },
              { id: '2', text: 'Recycling goes out Thursday ♻️', color: '#bbf7d0', date: 'This week' },
              { id: '3', text: 'Great job on the science project! 🎉', color: '#fbcfe8', date: 'Yesterday' }
            ]
          } satisfies StickyNoteConfig,
          style: { borderRadius: 16 }
        }
      ];
    }
  },
  {
    id: 'office_lobby',
    name: 'Office Lobby Signage',
    icon: '🏢',
    category: 'Business & Signage',
    badge: 'Signage',
    accentColor: '#0ea5e9',
    description: 'Reception-area digital signage with a welcome banner, large clock, office time zones, a guest Wi-Fi QR code, and a scrolling news feed.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'text',
          page_id: pageId,
          customName: 'Welcome Banner',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.96, 0.20) : pos(cw, ch, 0.04, 0.02, 0.92, 0.14),
          config: {
            title: 'Welcome to Our Office',
            body: 'Please check in at the front desk. Enjoy your visit!',
            fontSize: 'large',
            textAlign: 'center'
          },
          style: { borderRadius: 16 }
        },
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Lobby Clock',
          position: land ? pos(cw, ch, 0.02, 0.26, 0.46, 0.40) : pos(cw, ch, 0.04, 0.18, 0.92, 0.20),
          config: { format: 'h:mm a', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'world_clocks',
          page_id: pageId,
          customName: 'Office Locations',
          position: land ? pos(cw, ch, 0.50, 0.26, 0.30, 0.40) : pos(cw, ch, 0.04, 0.40, 0.54, 0.22),
          config: {
            clocks: [
              { label: 'New York', timezone: 'America/New_York' },
              { label: 'London', timezone: 'Europe/London' },
              { label: 'Singapore', timezone: 'Asia/Singapore' }
            ]
          },
          style: { borderRadius: 16 }
        },
        {
          type: 'qrcode',
          page_id: pageId,
          customName: 'Guest Wi-Fi',
          position: land ? pos(cw, ch, 0.82, 0.26, 0.16, 0.40) : pos(cw, ch, 0.62, 0.40, 0.34, 0.22),
          config: { data: 'WIFI:T:WPA;S:Guest-WiFi;P:change-me;;', label: 'Scan for Guest Wi-Fi', size: 180 },
          style: { borderRadius: 16 }
        },
        {
          type: 'rss',
          page_id: pageId,
          customName: 'News Feed',
          position: land ? pos(cw, ch, 0.02, 0.69, 0.96, 0.28) : pos(cw, ch, 0.04, 0.64, 0.92, 0.34),
          config: { feedUrl: 'https://feeds.bbci.co.uk/news/business/rss.xml', title: 'Business News', maxItems: 4 } satisfies RssConfig,
          style: { borderRadius: 16 }
        }
      ];
    }
  },
  {
    id: 'photo_frame',
    name: 'Digital Photo Frame',
    icon: '📷',
    category: 'Art & Media',
    badge: 'Full Bleed',
    recommendedTheme: 'ambient',
    accentColor: '#14b8a6',
    description: 'Edge-to-edge photo slideshow with a gentle Ken Burns pan and a small clock and weather overlay tucked into the corner.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        // Full-canvas background layer: listed first so the overlay widgets stack above it.
        {
          type: 'photo',
          page_id: pageId,
          customName: 'Photo Slideshow',
          position: { x: 0, y: 0, width: cw, height: ch },
          config: { fitMode: 'cover', kenBurns: true, intervalSeconds: 20, blurBackground: false, showCaptions: false } satisfies PhotoConfig,
          style: { borderRadius: 0 }
        },
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Overlay Clock',
          position: land ? pos(cw, ch, 0.76, 0.66, 0.21, 0.13) : pos(cw, ch, 0.52, 0.775, 0.44, 0.08),
          config: { format: 'h:mm a', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 16, opacity: 0.85, backdropBlur: true }
        },
        {
          type: 'weather',
          page_id: pageId,
          customName: 'Overlay Weather',
          position: land ? pos(cw, ch, 0.76, 0.81, 0.21, 0.15) : pos(cw, ch, 0.52, 0.87, 0.44, 0.10),
          config: { city: 'New York, NY', units: 'imperial', showForecast: false } satisfies WeatherConfig,
          style: { borderRadius: 16, opacity: 0.85, backdropBlur: true }
        }
      ];
    }
  },
  {
    id: 'sports_fitness',
    name: 'Sports & Fitness Coach',
    icon: '🏃',
    category: 'Health & Fitness',
    badge: 'Training',
    accentColor: '#22c55e',
    description: 'Stay on track for race day with a countdown, weekly training plan, running weather, sunrise/sunset times, and a daily dose of motivation.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'countdown',
          page_id: pageId,
          customName: 'Race Day Countdown',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.36, 0.42) : pos(cw, ch, 0.04, 0.02, 0.92, 0.20),
          config: { title: 'Race Day', targetDate: isoDateInDays(84), emoji: '🏅', unit: 'days' } satisfies CountdownConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'weather',
          page_id: pageId,
          customName: 'Running Weather',
          position: land ? pos(cw, ch, 0.40, 0.03, 0.30, 0.42) : pos(cw, ch, 0.04, 0.24, 0.45, 0.20),
          config: { city: 'New York, NY', units: 'imperial', showForecast: true, showHourly: true } satisfies WeatherConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'sun_moon',
          page_id: pageId,
          customName: 'Daylight Hours',
          position: land ? pos(cw, ch, 0.72, 0.03, 0.26, 0.42) : pos(cw, ch, 0.51, 0.24, 0.45, 0.20),
          config: { cityName: 'New York', latitude: 40.7128, longitude: -74.006 } satisfies SunMoonConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'todo',
          page_id: pageId,
          customName: 'Training Plan',
          position: land ? pos(cw, ch, 0.02, 0.48, 0.56, 0.49) : pos(cw, ch, 0.04, 0.46, 0.92, 0.36),
          config: {
            title: 'This Week\'s Training',
            allowToggle: true,
            items: [
              { id: '1', text: 'Mon — Rest & mobility (20 min)', completed: false, priority: 'low' },
              { id: '2', text: 'Tue — Intervals: 6 × 800 m', completed: false, priority: 'high' },
              { id: '3', text: 'Wed — Easy run 5 km', completed: false, priority: 'medium' },
              { id: '4', text: 'Thu — Strength & core', completed: false, priority: 'medium' },
              { id: '5', text: 'Sat — Long run 16 km', completed: false, priority: 'high' }
            ]
          } satisfies TodoConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'quote',
          page_id: pageId,
          customName: 'Daily Motivation',
          position: land ? pos(cw, ch, 0.60, 0.48, 0.38, 0.49) : pos(cw, ch, 0.04, 0.84, 0.92, 0.14),
          config: { category: 'inspirational', refreshHours: 12 } satisfies QuoteConfig,
          style: { borderRadius: 16 }
        }
      ];
    }
  },
  {
    id: 'classroom',
    name: 'Classroom Board',
    icon: '🏫',
    category: 'Education',
    badge: 'School',
    accentColor: '#eab308',
    description: 'Front-of-class display with the time, timed morning announcements, an assignments list, a countdown to the next break, and a thought for the day.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Class Clock',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.30, 0.26) : pos(cw, ch, 0.04, 0.02, 0.92, 0.14),
          config: { format: 'h:mm a', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'scheduled_text',
          page_id: pageId,
          customName: 'Morning Announcements',
          position: land ? pos(cw, ch, 0.34, 0.03, 0.64, 0.26) : pos(cw, ch, 0.04, 0.18, 0.92, 0.14),
          config: {
            message: 'Good morning, class! Library visit after lunch — bring your reading logs. 📚',
            startTime: '07:30',
            endTime: '12:00',
            showDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          } satisfies ScheduledTextConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'todo',
          page_id: pageId,
          customName: 'Assignments',
          position: land ? pos(cw, ch, 0.02, 0.32, 0.46, 0.65) : pos(cw, ch, 0.04, 0.34, 0.92, 0.34),
          config: {
            title: 'Assignments Due',
            allowToggle: true,
            items: [
              { id: '1', text: 'Math — Worksheet 4.2 (Fri)', completed: false, priority: 'high' },
              { id: '2', text: 'Science — Plant journal entry', completed: false, priority: 'medium' },
              { id: '3', text: 'Reading — Chapters 5–6', completed: false, priority: 'medium' },
              { id: '4', text: 'Art — Bring an empty jar', completed: false, priority: 'low' }
            ]
          } satisfies TodoConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'countdown',
          page_id: pageId,
          customName: 'Break Countdown',
          position: land ? pos(cw, ch, 0.50, 0.32, 0.48, 0.32) : pos(cw, ch, 0.04, 0.70, 0.45, 0.28),
          config: { title: 'Winter Break', targetDate: isoDateInDays(45), emoji: '❄️', unit: 'days' } satisfies CountdownConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'quote',
          page_id: pageId,
          customName: 'Thought for the Day',
          position: land ? pos(cw, ch, 0.50, 0.66, 0.48, 0.31) : pos(cw, ch, 0.51, 0.70, 0.45, 0.28),
          config: { category: 'wisdom', refreshHours: 24 } satisfies QuoteConfig,
          style: { borderRadius: 16 }
        }
      ];
    }
  },
  {
    id: 'night_stand',
    name: 'Night Stand',
    icon: '🌙',
    category: 'Minimalist',
    badge: 'Bedside',
    recommendedTheme: 'mirror',
    accentColor: '#94a3b8',
    description: 'Dim, minimal bedside display: a large analog clock, tomorrow\'s weather at a glance, and sunrise, sunset, and moon phase.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      return [
        {
          type: 'analog_clock',
          page_id: pageId,
          customName: 'Bedside Clock',
          position: land ? pos(cw, ch, 0.03, 0.06, 0.56, 0.88) : pos(cw, ch, 0.06, 0.04, 0.88, 0.52),
          config: { showSeconds: false, showNumbers: true, accentColor: '#94a3b8' } satisfies AnalogClockConfig,
          style: { borderRadius: 24 }
        },
        {
          type: 'weather',
          page_id: pageId,
          customName: 'Weather',
          position: land ? pos(cw, ch, 0.63, 0.06, 0.34, 0.40) : pos(cw, ch, 0.06, 0.60, 0.42, 0.34),
          config: { city: 'New York, NY', units: 'imperial', showForecast: true } satisfies WeatherConfig,
          style: { borderRadius: 20 }
        },
        {
          type: 'sun_moon',
          page_id: pageId,
          customName: 'Sun & Moon',
          position: land ? pos(cw, ch, 0.63, 0.50, 0.34, 0.44) : pos(cw, ch, 0.52, 0.60, 0.42, 0.34),
          config: { cityName: 'New York', latitude: 40.7128, longitude: -74.006 } satisfies SunMoonConfig,
          style: { borderRadius: 20 }
        }
      ];
    }
  },
  {
    id: 'dev_ops_wall',
    name: 'DevOps Status Wall',
    icon: '🖥️',
    category: 'Business & Signage',
    badge: 'Engineering',
    accentColor: '#a855f7',
    description: 'Team monitoring wall with CPU, memory, and disk gauges, a live REST status check, market tickers, a TradingView chart, and a clock.',
    generateWidgets: (cw: number, ch: number, pageId: string = 'default') => {
      const land = cw >= ch;
      const gauge = (i: number, config: GaugeConfig, name: string): Partial<Widget> => ({
        type: 'gauge',
        page_id: pageId,
        customName: name,
        position: land
          ? pos(cw, ch, [0.02, 0.345, 0.67][i], 0.26, 0.31, 0.32)
          : pos(cw, ch, [0.04, 0.355, 0.67][i], 0.14, 0.29, 0.16),
        config,
        style: { borderRadius: 16 }
      });
      return [
        {
          type: 'clock',
          page_id: pageId,
          customName: 'Ops Clock',
          position: land ? pos(cw, ch, 0.02, 0.03, 0.31, 0.20) : pos(cw, ch, 0.04, 0.02, 0.92, 0.10),
          config: { format: 'HH:mm:ss', showDate: true } satisfies ClockConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'rest_fetch',
          page_id: pageId,
          customName: 'GitHub Status',
          position: land ? pos(cw, ch, 0.345, 0.03, 0.31, 0.20) : pos(cw, ch, 0.04, 0.32, 0.45, 0.14),
          config: {
            url: 'https://www.githubstatus.com/api/v2/status.json',
            jsonPath: 'status.description',
            title: 'GitHub Status',
            refreshSeconds: 120,
            icon: '🟢'
          } satisfies RestFetchConfig,
          style: { borderRadius: 16 }
        },
        {
          type: 'stock_crypto',
          page_id: pageId,
          customName: 'Tech Tickers',
          position: land ? pos(cw, ch, 0.67, 0.03, 0.31, 0.20) : pos(cw, ch, 0.51, 0.32, 0.45, 0.14),
          config: { title: 'Tech Tickers', symbols: ['MSFT', 'AMZN', 'GOOGL', 'NVDA'], mode: 'stocks', showSparklines: true } satisfies StockCryptoConfig,
          style: { borderRadius: 16 }
        },
        gauge(0, { title: 'CPU Load', icon: '🧠', value: 42, min: 0, max: 100, unit: '%', warnThreshold: 75, critThreshold: 90, colorScheme: 'green-yellow-red' }, 'CPU Gauge'),
        gauge(1, { title: 'Memory', icon: '💾', value: 63, min: 0, max: 100, unit: '%', warnThreshold: 80, critThreshold: 92, colorScheme: 'blue-cyan-emerald' }, 'Memory Gauge'),
        gauge(2, { title: 'Disk Usage', icon: '🗄️', value: 71, min: 0, max: 100, unit: '%', warnThreshold: 80, critThreshold: 95, colorScheme: 'amber-orange-red' }, 'Disk Gauge'),
        {
          type: 'tradingview',
          page_id: pageId,
          customName: 'Market Chart',
          position: land ? pos(cw, ch, 0.02, 0.61, 0.96, 0.36) : pos(cw, ch, 0.04, 0.48, 0.92, 0.50),
          config: { symbol: 'NASDAQ:QQQ', interval: '1D', theme: 'dark', chartStyle: '1', showVolume: true, title: 'Nasdaq-100 (QQQ)' } satisfies TradingViewConfig,
          style: { borderRadius: 16 }
        }
      ];
    }
  }
];
