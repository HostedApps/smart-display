export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetStyle {
  opacity?: number;
  borderRadius?: number;
  backdropBlur?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export interface ClockConfig {
  format?: string;
  showDate?: boolean;
}

export interface WeatherConfig {
  apiKey?: string;
  city?: string;
  units?: 'metric' | 'imperial';
  showForecast?: boolean;
}

export interface CalendarFeed {
  name: string;
  url: string;
  color: string;
}

export interface CalendarConfig {
  feeds?: CalendarFeed[];
  icalUrl?: string;
  title?: string;
  maxEvents?: number;
  viewMode?: 'agenda' | 'month_grid';
}

export interface PhotoConfig {
  images?: string[];
  intervalSeconds?: number;
  fitMode?: 'cover' | 'contain';
  blurBackground?: boolean;
  showCaptions?: boolean;
}

export interface RssConfig {
  feedUrl?: string;
  title?: string;
  maxItems?: number;
  refreshIntervalMinutes?: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface TodoConfig {
  title?: string;
  items?: TodoItem[];
  maxItems?: number;
  filterCompleted?: boolean;
  allowToggle?: boolean;
}

export interface HomeAssistantEntity {
  entityId: string;
  label?: string;
  icon?: string;
  state?: string;
  unit?: string;
}

export interface HomeAssistantConfig {
  haUrl?: string;
  token?: string;
  entities?: HomeAssistantEntity[];
  refreshSeconds?: number;
}

export interface SpotifyConfig {
  track?: string;
  artist?: string;
  album?: string;
  albumArtUrl?: string;
  isPlaying?: boolean;
  progressMs?: number;
  durationMs?: number;
  showEqualizer?: boolean;
}

export interface StockCryptoConfig {
  symbols?: string[]; // e.g. ['AAPL', 'TSLA', 'MSFT']
  cryptoIds?: string[]; // e.g. ['bitcoin', 'ethereum', 'solana']
  currency?: string;
  showSparklines?: boolean;
  refreshMinutes?: number;
}

export interface StickyNote {
  id: string;
  text: string;
  author?: string;
  color?: string; // e.g. '#fef08a' (yellow), '#fbcfe8' (pink), '#bae6fd' (blue), '#bbf7d0' (green), '#e9d5ff' (purple)
  date?: string;
}

export interface StickyNoteConfig {
  title?: string;
  notes?: StickyNote[];
}

export interface CountdownConfig {
  targetDate: string; // e.g. "2026-12-25"
  title: string;      // e.g. "Christmas Vacation"
  emoji?: string;     // e.g. "🌴", "🎄", "🎂", "🎓"
  unit?: 'days' | 'detailed';
}

export interface MealPlanDay {
  day: string; // 'Monday', 'Tuesday', ...
  lunch?: string;
  dinner?: string;
}

export interface MealPlannerConfig {
  title?: string;
  days?: MealPlanDay[];
}

export interface Widget {
  id: number;
  page_id?: string;
  type: 'clock' | 'weather' | 'calendar' | 'photo' | 'rss' | 'todo' | 'homeassistant' | 'spotify' | 'stock_crypto' | 'sticky_note' | 'countdown' | 'meal_planner';
  position: WidgetPosition;
  style?: WidgetStyle;
  config: Record<string, any>;
}

export interface DisplayPage {
  id: string;
  name: string;
  duration_seconds: number;
}

export interface SleepScheduleConfig {
  enabled: boolean;
  sleepTime: string; // e.g. "23:00"
  wakeTime: string;  // e.g. "06:30"
  nightMode: boolean; // True: Ambient red/amber night clock, False: true black
  dimLevel: number;   // 0.1 to 1.0
}

export interface DisplayBackground {
  type: 'theme' | 'color' | 'gradient' | 'image' | 'unsplash';
  value: string;
  blur?: number;
  opacity?: number;
}

export type DisplayOrientation = 'landscape_720p' | 'landscape_1080p' | 'portrait_720p' | 'portrait_1080p';

export interface DisplayConfig {
  id: number;
  name: string;
  theme: string;
  orientation?: DisplayOrientation;
  refresh_interval: number;
  background?: DisplayBackground;
  sleep_schedule?: SleepScheduleConfig;
  pages?: DisplayPage[];
}

export interface DisplayResponse {
  success: boolean;
  display: DisplayConfig;
  widgets: Widget[];
}
