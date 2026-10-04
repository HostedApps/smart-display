import { Component, Input, OnInit, OnDestroy, OnChanges, DoCheck, SimpleChanges, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LIVE_DISPLAY } from './widget-context';
import { DataCacheService } from '../../services/data-cache.service';
import { WidgetBusService, WeatherSnapshot } from '../../services/widget-bus.service';

const MINUTE = 60_000;

interface ForecastItem {
  date: string;
  temp: number;
  icon: string;
  desc: string;
}

interface HourlyItem {
  time: string;
  temp: number;
  icon: string;
}

export interface WeatherCodeInfo {
  desc: string;
  iconDay: string;
  iconNight: string;
}

export const WMO_MAP: Record<number, WeatherCodeInfo> = {
  0: { desc: 'Clear Sky', iconDay: '01d', iconNight: '01n' },
  1: { desc: 'Mainly Clear', iconDay: '02d', iconNight: '02n' },
  2: { desc: 'Partly Cloudy', iconDay: '02d', iconNight: '02n' },
  3: { desc: 'Overcast', iconDay: '04d', iconNight: '04n' },
  45: { desc: 'Foggy', iconDay: '50d', iconNight: '50n' },
  48: { desc: 'Rime Fog', iconDay: '50d', iconNight: '50n' },
  51: { desc: 'Light Drizzle', iconDay: '09d', iconNight: '09n' },
  53: { desc: 'Moderate Drizzle', iconDay: '09d', iconNight: '09n' },
  55: { desc: 'Dense Drizzle', iconDay: '09d', iconNight: '09n' },
  56: { desc: 'Light Freezing Drizzle', iconDay: '09d', iconNight: '09n' },
  57: { desc: 'Dense Freezing Drizzle', iconDay: '09d', iconNight: '09n' },
  61: { desc: 'Slight Rain', iconDay: '10d', iconNight: '10n' },
  63: { desc: 'Moderate Rain', iconDay: '10d', iconNight: '10n' },
  65: { desc: 'Heavy Rain', iconDay: '10d', iconNight: '10n' },
  66: { desc: 'Light Freezing Rain', iconDay: '13d', iconNight: '13n' },
  67: { desc: 'Heavy Freezing Rain', iconDay: '13d', iconNight: '13n' },
  71: { desc: 'Slight Snow', iconDay: '13d', iconNight: '13n' },
  73: { desc: 'Moderate Snow', iconDay: '13d', iconNight: '13n' },
  75: { desc: 'Heavy Snow', iconDay: '13d', iconNight: '13n' },
  77: { desc: 'Snow Grains', iconDay: '13d', iconNight: '13n' },
  80: { desc: 'Slight Rain Showers', iconDay: '09d', iconNight: '09n' },
  81: { desc: 'Moderate Rain Showers', iconDay: '09d', iconNight: '09n' },
  82: { desc: 'Violent Rain Showers', iconDay: '09d', iconNight: '09n' },
  85: { desc: 'Slight Snow Showers', iconDay: '13d', iconNight: '13n' },
  86: { desc: 'Heavy Snow Showers', iconDay: '13d', iconNight: '13n' },
  95: { desc: 'Thunderstorm', iconDay: '11d', iconNight: '11n' },
  96: { desc: 'Thunderstorm with Hail', iconDay: '11d', iconNight: '11n' },
  99: { desc: 'Thunderstorm with Heavy Hail', iconDay: '11d', iconNight: '11n' }
};

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

@Component({
  selector: 'app-weather-widget',
  template: `
    <div class="weather-card sd-card">
      <!-- Severe Weather Alert Banner (Pulsing Warning Strip) -->
      <div class="weather-alert-banner" *ngIf="activeAlert">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">{{ activeAlert }}</span>
      </div>

      <ng-container *ngIf="!showUnavailable; else weatherUnavailable">
      <div class="weather-main-row">
        <div class="weather-left">
          <div class="location-tag">
            <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="city-name" [title]="resolvedLocationText || displayCity">{{ displayCity }}</span>
            <span class="updating-dot" *ngIf="loading" title="Fetching live weather..."></span>
            <span class="weather-err-tag" *ngIf="errorMessage" [title]="errorMessage">⚠️ {{ errorMessage }}</span>
          </div>

          <div class="temp-display">
            <span class="temp-num">{{ displayWeather.temp | number:'1.0-0' }}</span>
            <span class="temp-unit">°{{ config.units === 'metric' ? 'C' : 'F' }}</span>
          </div>
          
          <div class="desc-row">
            <span class="weather-desc">{{ displayWeather.desc }}</span>
            <span class="aqi-pill" *ngIf="displayAqi !== null" [style.backgroundColor]="aqiColor" [title]="'Air Quality Index: ' + displayAqi + ' (' + aqiLevel + ')'">
              AQI {{ displayAqi }}
            </span>
          </div>
        </div>

        <div class="weather-right">
          <div class="icon-aura">
            <img [src]="getIconUrl(displayWeather.icon)" [alt]="displayWeather.desc" class="weather-icon" />
          </div>
          
          <div class="metrics-column">
            <div class="metric-pill">
              <span class="metric-label">Humidity</span>
              <span class="metric-val">{{ displayWeather.humidity }}%</span>
            </div>
            <div class="metric-pill">
              <span class="metric-label">Wind</span>
              <span class="metric-val">{{ displayWeather.wind }} {{ config.units === 'metric' ? 'm/s' : 'mph' }}</span>
            </div>
            <div class="metric-pill" *ngIf="displayUv !== null">
              <span class="metric-label">UV Index</span>
              <span class="metric-val">{{ displayUv }} ({{ uvLevel }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode Selector / Forecast Strip -->
      <div class="forecast-section" *ngIf="config.showForecast !== false">
        <!-- Mode Tabs -->
        <div class="forecast-header">
          <button (click)="forecastMode = 'daily'" class="mode-tab-btn" [class.active]="forecastMode === 'daily'">5-Day</button>
          <button (click)="forecastMode = 'hourly'" class="mode-tab-btn" [class.active]="forecastMode === 'hourly'">12-Hour</button>
        </div>

        <!-- 5-Day Daily Grid -->
        <div class="forecast-grid" *ngIf="forecastMode === 'daily' && displayForecast.length > 0">
          <div *ngFor="let item of displayForecast | slice:0:5" class="forecast-col">
            <span class="forecast-day">{{ item.date | date:'EEE' }}</span>
            <img [src]="getIconUrl(item.icon)" class="forecast-mini-icon" />
            <span class="forecast-temp">{{ item.temp | number:'1.0-0' }}°</span>
          </div>
        </div>

        <!-- 12-Hour Hourly Strip -->
        <div class="forecast-grid" *ngIf="forecastMode === 'hourly' && displayHourly.length > 0">
          <div *ngFor="let item of displayHourly | slice:0:5" class="forecast-col">
            <span class="forecast-day">{{ item.time }}</span>
            <img [src]="getIconUrl(item.icon)" class="forecast-mini-icon" />
            <span class="forecast-temp">{{ item.temp | number:'1.0-0' }}°</span>
          </div>
        </div>
      </div>
      </ng-container>

      <!-- Live display without real data: never show sample weather -->
      <ng-template #weatherUnavailable>
        <div class="location-tag">
          <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span class="city-name" [title]="resolvedLocationText || displayCity">{{ displayCity }}</span>
          <span class="updating-dot" *ngIf="loading" title="Fetching live weather..."></span>
        </div>
        <app-widget-state *ngIf="!loading" kind="error" message="Weather unavailable" hint="Couldn't reach the weather service. Retrying automatically."></app-widget-state>
      </ng-template>
    </div>
  `,
  styles: [`
    .weather-card {
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    .weather-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .weather-left {
      display: flex;
      flex-direction: column;
    }
    .location-tag {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }
    .pin-icon {
      width: 12px;
      height: 12px;
      color: var(--sd-accent);
      flex-shrink: 0;
    }
    .city-name {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: var(--sd-text-muted);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .updating-dot {
      width: 6px;
      height: 6px;
      background-color: var(--sd-accent);
      border-radius: 50%;
      display: inline-block;
      animation: pulseSync 1.2s infinite ease-in-out;
      margin-left: 2px;
      flex-shrink: 0;
    }
    @keyframes pulseSync {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    .weather-err-tag {
      font-size: var(--sd-fs-xs);
      color: var(--sd-danger);
      font-weight: 600;
      white-space: nowrap;
    }
    .temp-display {
      display: flex;
      align-items: flex-start;
      line-height: 1;
      margin: 2px 0;
    }
    .temp-num {
      font-size: var(--sd-fs-xl);
      font-weight: var(--sd-weight-display);
      font-family: var(--font-display, inherit);
      color: var(--sd-text);
      letter-spacing: -1.5px;
    }
    .temp-unit {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      color: var(--sd-accent);
      margin-top: 2px;
      margin-left: 2px;
    }
    .weather-desc {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      text-transform: capitalize;
      font-weight: 500;
    }
    .weather-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icon-aura {
      position: relative;
      width: 52px;
      height: 52px;
      background: radial-gradient(circle, var(--sd-accent-soft) 0%, transparent 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .weather-icon {
      width: 50px;
      height: 50px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }
    .metrics-column {
      display: flex;
      gap: 5px;
    }
    .metric-pill {
      background: var(--sd-surface-2);
      border: var(--sd-border);
      padding: 3px 6px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .metric-label {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    .metric-val {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: var(--sd-text);
    }

    .weather-alert-banner {
      background: var(--sd-danger);
      border: var(--sd-border-width) solid var(--sd-danger);
      border-radius: var(--sd-radius-sm);
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      animation: alertPulse 2s infinite ease-in-out;
      box-shadow: 0 0 12px var(--sd-danger-soft);
    }
    @keyframes alertPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(0.99); }
    }
    .alert-icon { font-size: 0.85rem; }
    .alert-text {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: var(--sd-on-accent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.2px;
    }
    .desc-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }
    .aqi-pill {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      color: #0f172a;
      padding: 1px 6px;
      border-radius: 10px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }

    .forecast-section {
      padding-top: 8px;
      margin-top: 6px;
      border-top: var(--sd-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .forecast-header {
      display: flex;
      gap: 4px;
      align-self: flex-end;
    }
    .mode-tab-btn {
      background: none;
      border: var(--sd-border);
      color: var(--sd-text-subtle);
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .mode-tab-btn.active {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent-border);
      color: var(--sd-accent);
    }
    .forecast-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }
    .forecast-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--sd-surface-2);
      padding: 3px 2px;
      border-radius: 6px;
    }
    .forecast-day {
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      color: var(--sd-text-muted);
      text-transform: uppercase;
    }
    .forecast-mini-icon {
      width: 24px;
      height: 24px;
      margin: 1px 0;
    }
    .forecast-temp {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-text);
    }
  `]
})
export class WeatherWidgetComponent implements OnInit, OnDestroy, OnChanges, DoCheck {
  @Input() config: any = {
    apiKey: '',
    city: 'San Jose',
    units: 'imperial',
    showForecast: true,
    showHourly: false,
    aqi: null,
    uvIndex: null,
    alert: ''
  };

  forecastMode: 'daily' | 'hourly' = 'daily';
  currentWeather: any = null;
  forecast: ForecastItem[] = [];
  hourly: HourlyItem[] = [];
  activeAlert: string | null = null;
  loading: boolean = false;
  errorMessage: string | null = null;
  resolvedCityName: string = '';
  resolvedLocationText: string = '';

  private pollSub?: Subscription;
  private debounceTimer: any = null;
  private lastCity?: string;
  private lastUnits?: string;
  private lastApiKey?: string;
  private lastShowHourly?: boolean;
  private lastGeocodedCity?: string;
  private cachedCoords?: { lat: number; lon: number };
  private realAqi: number | null = null;

  private defaultWeather = {
    temp: 72,
    desc: 'Partly Cloudy',
    icon: '02d',
    humidity: 45,
    wind: 7,
    aqi: 38,
    uv: 4
  };

  private defaultForecast: ForecastItem[] = [
    { date: new Date(Date.now() + 86400000).toISOString(), temp: 74, icon: '01d', desc: 'Sunny' },
    { date: new Date(Date.now() + 86400000 * 2).toISOString(), temp: 71, icon: '02d', desc: 'Partly Cloudy' },
    { date: new Date(Date.now() + 86400000 * 3).toISOString(), temp: 68, icon: '10d', desc: 'Light Rain' },
    { date: new Date(Date.now() + 86400000 * 4).toISOString(), temp: 73, icon: '01d', desc: 'Sunny' },
    { date: new Date(Date.now() + 86400000 * 5).toISOString(), temp: 75, icon: '02d', desc: 'Mostly Sunny' }
  ];

  private defaultHourly: HourlyItem[] = [
    { time: '12 PM', temp: 73, icon: '01d' },
    { time: '3 PM', temp: 75, icon: '02d' },
    { time: '6 PM', temp: 70, icon: '02d' },
    { time: '9 PM', temp: 65, icon: '01n' },
    { time: '12 AM', temp: 61, icon: '01n' }
  ];

  get displayCity(): string {
    return this.config?.city || this.resolvedCityName || 'San Jose';
  }

  /** Live display with no real weather yet: show an unavailable state instead of sample data. */
  get showUnavailable(): boolean {
    return this.isLive && !this.currentWeather;
  }

  get displayWeather(): any {
    return this.currentWeather || this.defaultWeather;
  }

  get displayForecast(): ForecastItem[] {
    if (this.isLive) return this.forecast;
    return this.forecast.length > 0 ? this.forecast : this.defaultForecast;
  }

  get displayHourly(): HourlyItem[] {
    if (this.isLive) return this.hourly;
    return this.hourly.length > 0 ? this.hourly : this.defaultHourly;
  }

  get displayAqi(): number | null {
    if (this.config?.aqi !== undefined && this.config?.aqi !== null) {
      return Number(this.config.aqi);
    }
    if (this.realAqi !== null) {
      return this.realAqi;
    }
    if (this.isLive) {
      return this.currentWeather?.aqi ?? null;
    }
    return this.currentWeather?.aqi || 38;
  }

  get aqiLevel(): string {
    const a = this.displayAqi ?? 0;
    if (a <= 50) return 'Good';
    if (a <= 100) return 'Moderate';
    if (a <= 150) return 'Sensitive';
    if (a <= 200) return 'Unhealthy';
    if (a <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  get aqiColor(): string {
    const a = this.displayAqi ?? 0;
    if (a <= 50) return '#4ade80';    // Green
    if (a <= 100) return '#facc15';   // Yellow
    if (a <= 150) return '#fb923c';   // Orange
    if (a <= 200) return '#f87171';   // Red
    if (a <= 300) return '#c084fc';   // Purple
    return '#f43f5e';                 // Rose
  }

  get displayUv(): number | null {
    if (this.config?.uvIndex !== undefined && this.config?.uvIndex !== null) {
      return Number(this.config.uvIndex);
    }
    if (this.isLive) {
      return this.currentWeather?.uv ?? null;
    }
    return this.currentWeather?.uv || 4;
  }

  get uvLevel(): string {
    const uv = this.displayUv ?? 0;
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Mod';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'V.High';
    return 'Extreme';
  }

  readonly isLive: boolean;

  constructor(private bus: WidgetBusService, private dataCache: DataCacheService, private http: HttpClient, @Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** Share real weather with other widgets (greeting, text placeholders, calendar day overlay) */
  private publishToBus(): void {
    const w = this.currentWeather;
    if (!w || typeof w.temp !== 'number') return;
    const desc = String(w.desc || '').toLowerCase();
    const kind: WeatherSnapshot['kind'] =
      /thunder|storm/.test(desc) ? 'storm' :
      /snow|sleet|ice/.test(desc) ? 'snow' :
      /rain|drizzle|shower/.test(desc) ? 'rain' :
      /fog|mist|haze/.test(desc) ? 'fog' :
      /cloud|overcast/.test(desc) ? 'cloudy' :
      /clear|sun/.test(desc) ? 'clear' : 'unknown';
    this.bus.publish('weather', {
      city: this.displayCity,
      temp: w.temp,
      units: this.config?.units === 'metric' ? 'metric' : 'imperial',
      condition: w.desc,
      kind,
      high: this.forecast[0]?.temp,
      daily: this.forecast.map(f => ({ date: String(f.date).slice(0, 10), high: f.temp, low: f.temp, icon: this.iconEmoji(f.icon), condition: f.desc })),
      updatedAt: Date.now()
    });
  }

  /** OpenWeather-style icon code ("10d") → emoji, for widgets that show weather without image URLs */
  private iconEmoji(code: string): string {
    const base = String(code || '').slice(0, 2);
    const night = String(code || '').endsWith('n');
    const map: Record<string, string> = { '01': night ? '🌙' : '☀️', '02': '⛅', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️' };
    return map[base] || '';
  }

  ngOnInit(): void {
    this.lastCity = this.config?.city;
    this.lastUnits = this.config?.units;
    this.lastApiKey = this.config?.apiKey;
    this.lastShowHourly = this.config?.showHourly;

    if (this.config?.showHourly) {
      this.forecastMode = 'hourly';
    }
    if (this.config?.alert) {
      this.activeAlert = this.config.alert;
    }
    this.fetchWeatherData();

    // Re-poll every 15 minutes (900,000 ms)
    this.pollSub = interval(900000).subscribe(() => this.fetchWeatherData());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      if (this.config?.showHourly) {
        this.forecastMode = 'hourly';
      }
      if (this.config?.alert) {
        this.activeAlert = this.config.alert;
      }
      this.fetchWeatherData();
    }
  }

  ngDoCheck(): void {
    const currentCity = this.config?.city?.trim();
    const currentUnits = this.config?.units;
    const currentApiKey = this.config?.apiKey?.trim();
    const currentShowHourly = this.config?.showHourly;

    if (
      currentCity !== this.lastCity || 
      currentUnits !== this.lastUnits || 
      currentApiKey !== this.lastApiKey ||
      currentShowHourly !== this.lastShowHourly
    ) {
      this.lastCity = currentCity;
      this.lastUnits = currentUnits;
      this.lastApiKey = currentApiKey;
      this.lastShowHourly = currentShowHourly;

      if (currentShowHourly) {
        this.forecastMode = 'hourly';
      }

      // Debounce lookups to smoothly handle user typing in the admin editor
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.fetchWeatherData();
      }, 400);
    }
  }

  fetchWeatherData(): void {
    const city = (this.config?.city || 'San Jose').trim();
    if (!city) return;

    // If an explicit OpenWeatherMap API key is provided, try it first
    if (this.config?.apiKey && this.config.apiKey.trim()) {
      const units = this.config.units || 'imperial';
      const owmUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${units}&appid=${this.config.apiKey.trim()}`;
      
      this.loading = true;
      this.errorMessage = null;

      this.dataCache.get<any>(owmUrl, 5 * MINUTE).pipe(
        catchError(() => of(null))
      ).subscribe({
        next: (data) => {
          if (data && data.list && data.list.length > 0) {
            this.loading = false;
            this.parseOpenWeatherMapData(data);
          } else {
            // OWM failed (invalid key or 401/404) -> smoothly fall back to Open-Meteo zero-config
            this.geocodeAndFetch(city);
          }
        },
        error: () => {
          this.geocodeAndFetch(city);
        }
      });
      return;
    }

    // Default zero-config path: Open-Meteo (No API key needed!)
    this.geocodeAndFetch(city);
  }

  private geocodeAndFetch(city: string): void {
    const trimmed = city.trim();
    if (!trimmed) return;

    this.loading = true;
    this.errorMessage = null;

    // Check if coordinates already known
    if (this.lastGeocodedCity === trimmed && this.cachedCoords) {
      this.fetchForecastFromCoords(this.cachedCoords.lat, this.cachedCoords.lon);
      return;
    }

    // Parse potential city and state/country parts (e.g. "Austin, TX" -> "Austin" + "TX")
    let queryCity = trimmed;
    let regionHint: string | null = null;
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      queryCity = parts[0].trim();
      regionHint = parts[1].trim();
    }

    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=10&language=en&format=json`;

    this.dataCache.get<any>(geocodeUrl, 24 * 60 * MINUTE).pipe(
      catchError((err) => {
        console.warn('[WeatherWidget] Geocode error:', err);
        return of(null);
      })
    ).subscribe(geoRes => {
      if (geoRes && geoRes.results && geoRes.results.length > 0) {
        const bestItem = this.findBestGeocodeResult(geoRes.results, regionHint);
        this.applyGeoResult(trimmed, bestItem);
      } else if (trimmed !== queryCity) {
        // Fallback: try raw query string directly
        const rawUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;
        this.dataCache.get<any>(rawUrl, 24 * 60 * MINUTE).pipe(
          catchError(() => of(null))
        ).subscribe(fallbackRes => {
          if (fallbackRes && fallbackRes.results && fallbackRes.results.length > 0) {
            this.applyGeoResult(trimmed, fallbackRes.results[0]);
          } else {
            this.handleGeocodeNotFound(trimmed);
          }
        });
      } else {
        this.handleGeocodeNotFound(trimmed);
      }
    });
  }

  private findBestGeocodeResult(results: any[], regionHint: string | null): any {
    if (!regionHint || results.length === 1) {
      return results[0];
    }

    const hintLower = regionHint.toLowerCase();
    const resolvedState = US_STATES[regionHint.toUpperCase()]?.toLowerCase();

    // 1. Exact match on admin1 (e.g. "Texas" or "California")
    const matchAdmin = results.find(item => {
      const admin = (item.admin1 || '').toLowerCase();
      return admin === hintLower || (resolvedState && admin === resolvedState);
    });
    if (matchAdmin) return matchAdmin;

    // 2. Match country or country_code (e.g. "US", "UK", "GB")
    const matchCountry = results.find(item => {
      const cCode = (item.country_code || '').toLowerCase();
      const country = (item.country || '').toLowerCase();
      return cCode === hintLower || country === hintLower;
    });
    if (matchCountry) return matchCountry;

    return results[0];
  }

  private applyGeoResult(query: string, item: any): void {
    this.lastGeocodedCity = query;
    this.cachedCoords = { lat: item.latitude, lon: item.longitude };
    this.resolvedCityName = item.name;
    this.resolvedLocationText = item.admin1 ? `${item.name}, ${item.admin1}` : (item.country ? `${item.name}, ${item.country}` : item.name);

    if (this.config) {
      this.config.latitude = item.latitude;
      this.config.longitude = item.longitude;
    }

    this.fetchForecastFromCoords(item.latitude, item.longitude);
  }

  private handleGeocodeNotFound(query: string): void {
    this.loading = false;
    this.errorMessage = `"${query}" not found`;
  }

  private fetchForecastFromCoords(lat: number, lon: number): void {
    const isMetric = this.config?.units === 'metric';
    const tempUnit = isMetric ? 'celsius' : 'fahrenheit';
    const windUnit = isMetric ? 'ms' : 'mph';

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&forecast_hours=12&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&timeformat=iso8601&timezone=auto`;

    this.dataCache.get<any>(forecastUrl, 5 * MINUTE).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      this.loading = false;
      if (!data || !data.current) return;

      const cur = data.current;
      const isDay = cur.is_day !== 0;
      const cond = this.getConditionInfo(cur.weather_code, isDay);
      const uvVal = (data.daily?.uv_index_max && data.daily.uv_index_max.length > 0)
        ? Math.round(data.daily.uv_index_max[0])
        : (this.config?.uvIndex !== undefined && this.config?.uvIndex !== null ? Number(this.config.uvIndex) : (this.isLive ? null : 4));

      this.currentWeather = {
        temp: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        desc: cond.desc,
        icon: cond.icon,
        humidity: Math.round(cur.relative_humidity_2m),
        wind: Math.round(cur.wind_speed_10m),
        uv: uvVal
      };

      // 5-Day Daily Forecast
      if (data.daily && data.daily.time) {
        const dailyItems: ForecastItem[] = [];
        const count = Math.min(data.daily.time.length, 5);
        for (let i = 0; i < count; i++) {
          const code = data.daily.weather_code ? data.daily.weather_code[i] : 0;
          const c = this.getConditionInfo(code, true);
          dailyItems.push({
            date: data.daily.time[i],
            temp: Math.round(data.daily.temperature_2m_max[i]),
            icon: c.icon,
            desc: c.desc
          });
        }
        this.forecast = dailyItems;
      }
      this.publishToBus();

      // 12-Hour Hourly Forecast
      if (data.hourly && data.hourly.time) {
        const hourlyItems: HourlyItem[] = [];
        const times = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const codes = data.hourly.weather_code;
        const step = Math.max(1, Math.floor(times.length / 5));
        for (let i = 0; i < times.length && hourlyItems.length < 5; i += step) {
          const dt = new Date(times[i]);
          const hr = dt.getHours();
          const isDayHour = hr >= 6 && hr < 20;
          const c = this.getConditionInfo(codes[i], isDayHour);
          hourlyItems.push({
            time: dt.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
            temp: Math.round(temps[i]),
            icon: c.icon
          });
        }
        this.hourly = hourlyItems;
      }

      // Fetch Air Quality Index for this location
      this.fetchAirQuality(lat, lon);
    });
  }

  private fetchAirQuality(lat: number, lon: number): void {
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
    this.dataCache.get<any>(aqiUrl, 15 * MINUTE).pipe(
      catchError(() => of(null))
    ).subscribe(aqiRes => {
      if (aqiRes?.current?.us_aqi !== undefined && aqiRes.current.us_aqi !== null) {
        this.realAqi = Math.round(aqiRes.current.us_aqi);
      }
    });
  }

  private parseOpenWeatherMapData(data: any): void {
    const current = data.list[0];
    const computedAqi = Math.max(15, Math.min(180, Math.round(35 + (current.main.humidity % 40) - 10)));
    const hour = new Date().getHours();
    const computedUv = (hour >= 10 && hour <= 16) ? Math.max(1, Math.min(11, Math.round((16 - Math.abs(13 - hour)) / 1.8))) : 0;

    this.currentWeather = {
      temp: Math.round(current.main.temp),
      desc: current.weather[0].description,
      icon: current.weather[0].icon,
      humidity: current.main.humidity,
      wind: Math.round(current.wind.speed),
      // OWM's forecast endpoint has no AQI/UV; the computed values are estimates, so never show them live
      aqi: this.isLive ? null : computedAqi,
      uv: this.isLive ? null : computedUv
    };

    // Parse Daily (5 days)
    const dailyMap = new Map<string, any>();
    for (const item of data.list) {
      const dateStr = item.dt_txt.split(' ')[0];
      if (!dailyMap.has(dateStr) && dailyMap.size < 5) {
        dailyMap.set(dateStr, {
          date: item.dt_txt,
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          desc: item.weather[0].description
        });
      }
    }
    this.forecast = Array.from(dailyMap.values());
    this.publishToBus();

    // Parse Hourly (next 5 points, 3h intervals)
    const hourlyItems: HourlyItem[] = [];
    for (const item of data.list.slice(0, 5)) {
      const dt = new Date(item.dt_txt);
      const timeStr = dt.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      hourlyItems.push({
        time: timeStr,
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon
      });
    }
    this.hourly = hourlyItems;
  }

  getConditionInfo(code: number, isDay: boolean = true): { desc: string; icon: string } {
    const info = WMO_MAP[code] || { desc: 'Partly Cloudy', iconDay: '02d', iconNight: '02n' };
    return {
      desc: info.desc,
      icon: isDay ? info.iconDay : info.iconNight
    };
  }

  getIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode || '01d'}@2x.png`;
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    clearTimeout(this.debounceTimer);
  }
}

