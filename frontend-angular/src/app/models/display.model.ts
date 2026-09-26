export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'user' | 'admin' | 'superadmin';
  is_active?: boolean;
  email_verified?: boolean;
  oauth_provider?: string;
  created_at?: string;
  last_login_at?: string;
  display_count?: number;
  widget_count?: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
  requireVerification?: boolean;
  emailUnverified?: boolean;
  email?: string;
  devVerificationCode?: string;
  devVerificationLink?: string;
  captchaFailed?: boolean;
}

export interface CaptchaChallenge {
  success: boolean;
  captchaToken: string;
  question: string;
  num1?: number;
  op?: string;
  num2?: number;
  expiresInSeconds?: number;
  error?: string;
}

export interface CapacityStatus {
  success: boolean;
  userCount: number;
  maxCapacity: number;
  availableSlots: number;
  isFull: boolean;
  recaptchaSiteKey?: string;
  googleClientId?: string;
}

export interface SuperAdminStats {
  totalUsers: number;
  maxCapacity: number;
  capacityUsedPercent: number;
  activeUsers: number;
  verifiedUsers: number;
  totalDisplays: number;
  totalWidgets: number;
  totalDevices: number;
  recentActivities24h: number;
}

export interface UserActivityLog {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  details?: any;
  ip_address?: string;
  created_at: string;
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
  fontFamily?: string;
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
  showHourly?: boolean;
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
  albumUrl?: string;
  images?: string[];
  intervalSeconds?: number;
  fitMode?: 'cover' | 'contain';
  blurBackground?: boolean;
  showCaptions?: boolean;
  kenBurns?: boolean;
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
  title?: string;
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
  title?: string;
  symbols?: string[]; // e.g. ['AAPL', 'TSLA', 'MSFT', 'NVDA']
  cryptoIds?: string[]; // e.g. ['bitcoin', 'ethereum', 'solana']
  mode?: 'all' | 'stocks' | 'crypto';
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

export interface RadarConfig {
  cityName?: string;
  lat?: number;
  lon?: number;
  zoom?: number;
  colorScheme?: number; // 0=Original, 1=Universal Blue, 2=TITAN, 3=TWC, 4=Meteored, 5=NEXRAD, 6=Rainbow
  smooth?: boolean;
  refreshMinutes?: number;
}

export interface QuoteConfig {
  category?: 'inspirational' | 'wisdom' | 'history' | 'custom';
  customQuote?: string;
  customAuthor?: string;
  refreshHours?: number;
}

export interface AIBriefingConfig {
  apiKey?: string;
  userName?: string;
  tone?: 'warm' | 'executive' | 'motivational' | 'concise';
  refreshHours?: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string; // emoji e.g. "🦁", "🦄", "👑", "⚡", "🚀"
  points: number;
  streak: number;
}

export interface ChoreItem {
  id: string;
  memberId: string;
  title: string;
  points: number;
  completed: boolean;
}

export interface ChoresConfig {
  title?: string;
  members?: FamilyMember[];
  chores?: ChoreItem[];
}

export interface CameraPipConfig {
  title?: string;
  streamUrl?: string; // MJPEG stream / HLS / WebRTC URL
  snapshotUrl?: string;
  refreshSeconds?: number;
  aspectRatio?: '16:9' | '4:3';
  isLive?: boolean;
}

export interface CommuteDestination {
  id: string;
  name: string; // e.g. "Downtown Office", "Airport", "School"
  icon: string; // e.g. "🏢", "✈️", "🏫"
  durationMinutes: number;
  trafficStatus: 'fast' | 'moderate' | 'heavy';
  viaRoute: string; // e.g. "via I-280 N"
  delayMinutes: number;
}

export interface CommuteConfig {
  title?: string;
  destinations?: CommuteDestination[];
  mode?: 'driving' | 'transit';
  transitLines?: { line: string; destination: string; nextMinutes: number[] }[];
}

export interface WallDropItem {
  id: number;
  display_id: number;
  type: 'note' | 'photo' | 'alert';
  author: string;
  content: string;
  media_url?: string;
  color?: string;
  created_at: string;
}

export interface EmergencyBroadcast {
  id: number;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  play_sound: boolean;
  created_at: string;
}

export interface WidgetSchedule {
  enabled: boolean;
  startTime?: string; // e.g. "08:00" (24h format)
  endTime?: string;   // e.g. "17:30" (24h format)
  days?: number[];    // [0, 1, 2, 3, 4, 5, 6] (0=Sun, 6=Sat)
}

export interface WidgetRule {
  id: string;
  field: string; // 'temperature' | 'state' | 'value' | 'stock_change' | 'custom'
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'contains';
  threshold: any;
  action: 'set_style' | 'set_class';
  className?: 'alert-glow-red' | 'alert-glow-amber' | 'highlight-green' | 'pulse-border';
  style?: Partial<WidgetStyle>;
}

export interface GoogleMapsConfig {
  address?: string;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite' | 'terrain';
  showTraffic?: boolean;
  title?: string;
}

export interface WhiteboardStroke {
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
  points: { x: number; y: number }[];
}

export interface WhiteboardConfig {
  title?: string;
  canvasBackground?: 'chalkboard' | 'whiteboard' | 'grid';
  strokes?: WhiteboardStroke[];
  allowTouchDraw?: boolean;
}

export interface SlackMessage {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  timestamp: string;
  channel?: string;
}

export interface SlackConfig {
  title?: string;
  channelName?: string;
  webhookUrl?: string;
  messages?: SlackMessage[];
  maxItems?: number;
}

export interface GmailEmailPreview {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  timeAgo: string;
  unread: boolean;
}

export interface GmailConfig {
  title?: string;
  accountEmail?: string;
  unreadCount?: number;
  emails?: GmailEmailPreview[];
}

export interface Widget {
  id: number;
  page_id?: string;
  type: 'clock' | 'weather' | 'calendar' | 'photo' | 'rss' | 'todo' | 'homeassistant' | 'spotify' | 'stock_crypto' | 'sticky_note' | 'countdown' | 'meal_planner' | 'radar' | 'quote' | 'ai_briefing' | 'chores' | 'camera_pip' | 'commute' | 'youtube' | 'text' | 'qrcode' | 'world_clocks' | 'shapes' | 'scheduled_text' | 'button' | 'sun_moon' | 'analog_clock' | 'rest_fetch' | 'gauge' | 'google_maps' | 'whiteboard' | 'slack' | 'gmail';
  position: WidgetPosition;
  style?: WidgetStyle;
  config: Record<string, any>;
  schedule?: WidgetSchedule;
  rules?: WidgetRule[];
  linkedWidgetId?: number;
  locked?: boolean;
  hidden?: boolean;
  customName?: string;
}

export interface DisplayPage {
  id: string;
  name: string;
  duration_seconds: number;
  schedule?: WidgetSchedule;
}

export interface SleepScheduleConfig {
  enabled: boolean;
  sleepTime: string; // e.g. "23:00"
  wakeTime: string;  // e.g. "06:30"
  nightMode: boolean; // True: Ambient red/amber night clock, False: true black
  dimLevel: number;   // 0.1 to 1.0
}

export interface DisplayBackground {
  type: 'theme' | 'color' | 'gradient' | 'image' | 'unsplash' | 'video' | 'youtube';
  value: string;
  videoUrl?: string;
  youtubeId?: string;
  blur?: number;
  opacity?: number;
}

export type DisplayOrientation = 
  | 'landscape_720p' 
  | 'landscape_1080p' 
  | 'landscape_1440p' 
  | 'landscape_4k' 
  | 'portrait_720p' 
  | 'portrait_1080p' 
  | 'portrait_1440p' 
  | 'portrait_4k'
  | 'landscape_16_10'
  | 'portrait_16_10'
  | 'landscape_4_3'
  | 'portrait_4_3'
  | 'ultrawide'
  | 'freeform';

export interface DisplayConfig {
  id: number;
  name: string;
  theme: string;
  orientation?: DisplayOrientation;
  refresh_interval: number;
  background?: DisplayBackground;
  sleep_schedule?: SleepScheduleConfig;
  pages?: DisplayPage[];
  logo_url?: string;
  show_logo_kiosk?: boolean;
  font_family?: string;
  weather_alerts_enabled?: boolean;
  weather_alert?: { title?: string; message: string; severity?: string } | string;
  custom_css?: string;
  audio_chimes_enabled?: boolean;
  hourly_chime?: boolean;
}

export interface DisplaySummary {
  id: number;
  token: string;
  name: string;
  theme: string;
  orientation: DisplayOrientation;
  refresh_interval: number;
  logo_url?: string;
  show_logo_kiosk?: boolean;
  widget_count: number;
  device_count: number;
  created_at: string;
}

export interface Device {
  id: number;
  device_name: string;
  ip_address?: string;
  last_ping?: string;
  created_at?: string;
  display_name?: string;
}

export interface PairingCodeResponse {
  success: boolean;
  pairing_code: string;
  device_secret: string;
  expires_in_seconds: number;
}

export interface PairingStatusResponse {
  status: 'pending' | 'paired' | 'expired';
  display_token?: string;
  device_token?: string;
}

export interface DisplayResponse {
  success: boolean;
  display: DisplayConfig;
  widgets: Widget[];
}
