import { Component, Input, OnInit, OnDestroy, DoCheck, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AIBriefingConfig } from '../../models/display.model';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../../services/data-cache.service';
import { NextEventSnapshot, WeatherSnapshot, WidgetBusService } from '../../services/widget-bus.service';
import { LIVE_DISPLAY } from './widget-context';
import { US_STATES, WMO_MAP } from './weather-widget.component';

const MINUTE = 60_000;
/** How long to wait for a Weather / Calendar widget on the same screen to publish before the first briefing */
const CONTEXT_WAIT_MS = 6000;
/** Retry delays after a failed briefing; kept long so retries don't eat into a Gemini quota */
const RETRY_DELAYS_MS = [10 * MINUTE, 30 * MINUTE, 60 * MINUTE];
/** Briefings are refreshed every few hours at most; Gemini free-tier quotas are small */
const DEFAULT_REFRESH_HOURS = 3;
const MIN_REFRESH_HOURS = 2;

/** Real facts sent to the server; anything unknown is left empty, never guessed */
interface BriefingContext {
  location: string;
  weather: string;
  events: string;
  localHour: number;
  localDate: string;
}

@Component({
  selector: 'app-ai-briefing-widget',
  template: `
    <div class="ai-card sd-card">
      <div class="ai-header">
        <div class="ai-orb-wrap">
          <div class="ai-orb"></div>
          <div class="ai-glow"></div>
        </div>
        <div class="ai-title-group">
          <span class="ai-badge">DAILY INTELLIGENCE</span>
          <span class="ai-time-label">{{ greeting }}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button (click)="fetchBriefing(true)" class="btn-action" title="Regenerate Briefing">
            🔄
          </button>
          <button (click)="toggleSpeak()" class="btn-action" [class.speaking]="isSpeaking" title="Read Aloud">
            {{ isSpeaking ? '🔊' : '🔈' }}
          </button>
        </div>
      </div>

      <app-widget-state *ngIf="briefingFailed && !loading; else briefingBody" kind="error" message="Briefing unavailable" hint="Couldn't generate the briefing. Retrying automatically."></app-widget-state>

      <ng-template #briefingBody>
      <div class="ai-content">
        <p class="briefing-text" [class.loading-shimmer]="loading">
          {{ displayedText || 'Synthesizing daily schedule, weather outlook, and reminders...' }}
        </p>
      </div>

      </ng-template>

      <div class="ai-footer" *ngIf="!(briefingFailed && !loading)">
        <span class="provider-pill" [class.is-gemini]="provider === 'gemini'" [class.has-error]="!!geminiError" [title]="providerTitle">
          <ng-container *ngIf="provider === 'gemini'">✨ Powered by Google Gemini</ng-container>
          <ng-container *ngIf="provider !== 'gemini' && geminiError">⚠️ Gemini Error (Fallback Active)</ng-container>
          <ng-container *ngIf="provider !== 'gemini' && !geminiError">⚡ Ambient Offline Engine</ng-container>
        </span>
        <span class="synced-time">{{ lastSync }}</span>
      </div>
    </div>
  `,
  styles: [`
    .ai-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: var(--font-main, sans-serif);
      overflow: hidden;
      position: relative;
    }
    .ai-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-orb-wrap {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ai-orb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #a855f7, #ec4899);
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.8);
      animation: rotate-orb 3s linear infinite;
    }
    .ai-glow {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent 70%);
      animation: pulse-glow 2s ease-in-out infinite;
    }
    @keyframes rotate-orb {
      0% { transform: rotate(0deg) scale(0.95); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(0.95); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    .ai-title-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .ai-badge {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--sd-accent);
    }
    .ai-time-label {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
    }
    .btn-action {
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 4px 8px;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--sd-text-muted);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-action:hover, .btn-action.speaking {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent);
      color: var(--sd-text);
    }

    .ai-content {
      margin: 10px 0;
      flex: 1;
      display: flex;
      align-items: flex-start;
      overflow-y: auto;
      max-height: 100%;
    }
    .briefing-text {
      font-family: var(--font-editorial, 'Newsreader', serif);
      font-size: var(--sd-fs-title);
      font-style: italic;
      line-height: 1.5;
      color: var(--sd-text);
      margin: 0;
    }
    .loading-shimmer {
      opacity: 0.6;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

    .ai-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-subtle);
      border-top: var(--sd-border);
      padding-top: 8px;
    }
    .provider-pill {
      color: var(--sd-text-muted);
      font-weight: 600;
      transition: all 0.2s;
    }
    .provider-pill.is-gemini {
      color: var(--sd-accent);
      text-shadow: 0 0 10px var(--sd-accent-soft);
    }
    .provider-pill.has-error {
      color: var(--sd-warning);
      cursor: help;
    }
  `]
})
export class AIBriefingWidgetComponent implements OnInit, OnDestroy, DoCheck {
  @Input() config: AIBriefingConfig = {};

  greeting: string = 'Daily Briefing';
  displayedText: string = '';
  loading: boolean = true;
  isSpeaking: boolean = false;
  provider: string = 'ambient_engine';
  geminiError: string = '';
  /** True when Gemini failed and the server served an earlier Gemini briefing instead */
  stale: boolean = false;
  model: string = '';
  lastSync: string = '';
  /** Live displays only: set when the briefing could not be generated (no canned text is shown). */
  briefingFailed: boolean = false;
  readonly isLive: boolean;

  private configKey = '';
  private usedWeatherCity = '';
  private usedEventTitle = '';
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private retryCount = 0;
  private lastFetchAt = 0;
  private requestSub?: Subscription;
  private busSub = new Subscription();

  constructor(
    private http: HttpClient,
    private dataCache: DataCacheService,
    private bus: WidgetBusService,
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;
  }

  get providerTitle(): string {
    if (this.provider === 'gemini') {
      const via = this.model ? `Written by Google Gemini (${this.model})` : 'Written by Google Gemini';
      return this.stale ? `${via} earlier today. Latest attempt failed: ${this.geminiError}` : via;
    }
    return this.geminiError || 'Written by the built-in briefing engine (add a Gemini API key for AI briefings)';
  }

  ngOnInit(): void {
    this.configKey = this.currentConfigKey();
    this.updateGreeting();

    // With no fixed location, the briefing uses the Weather / Calendar widgets on this screen.
    // Give them a moment to publish so the first briefing isn't written without them.
    const needsBus = !this.config?.city?.trim();
    const waitMs = needsBus && !this.bus.snapshot('weather') ? (this.isLive ? CONTEXT_WAIT_MS : 1500) : 0;
    this.debounceTimer = setTimeout(() => this.fetchBriefing(), waitMs);

    // Regenerate when better context arrives later (e.g. the weather widget loads, or its city changes)
    this.busSub.add(this.bus.select('weather').subscribe(w => {
      if (this.config?.city?.trim() || this.loading) return;
      if (w.city !== this.usedWeatherCity) this.scheduleFetch(1000);
    }));
    this.busSub.add(this.bus.select('nextEvent').subscribe(e => {
      if (this.loading) return;
      // A new "next event" every time one ends shouldn't cost a Gemini call each time
      if ((e?.title || '') !== this.usedEventTitle && Date.now() - this.lastFetchAt > 30 * MINUTE) this.scheduleFetch(1000);
    }));
  }

  ngDoCheck(): void {
    // Editor edits: wait until typing stops instead of calling Gemini on every keystroke
    const key = this.currentConfigKey();
    if (key !== this.configKey) {
      this.configKey = key;
      this.scheduleFetch(1500);
    }
  }

  private currentConfigKey(): string {
    const c = this.config || {};
    return [c.apiKey, c.userName, c.tone, c.city, c.units].map(v => (v ?? '').toString().trim()).join('|');
  }

  private scheduleFetch(delayMs: number): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetchBriefing(), delayMs);
  }

  updateGreeting(): void {
    const hr = new Date().getHours();
    if (hr < 12) this.greeting = 'Good Morning Briefing';
    else if (hr < 17) this.greeting = 'Afternoon Briefing';
    else this.greeting = 'Evening Briefing';
  }

  fetchBriefing(manual = false): void {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.retryTimer);
    clearTimeout(this.refreshTimer);
    this.requestSub?.unsubscribe();
    this.updateGreeting();
    this.loading = true;
    this.lastFetchAt = Date.now();

    this.requestSub = this.buildContext().pipe(
      switchMap(ctx => {
        this.usedWeatherCity = this.bus.snapshot('weather')?.city || '';
        this.usedEventTitle = this.bus.snapshot('nextEvent')?.title || '';
        return this.http.post<any>(`${environment.apiUrl}/ai_briefing.php`, {
          apiKey: this.config?.apiKey || '',
          userName: this.config?.userName || '',
          tone: this.config?.tone || 'warm',
          refreshHours: this.refreshHours,
          refresh: manual,
          ...ctx
        });
      })
    ).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleFailure(err?.error?.error || 'Network error')
    });
  }

  private handleResponse(res: any): void {
    this.loading = false;
    if (!res?.success || !res.briefing) {
      this.handleFailure(res?.geminiError || res?.error || 'No briefing returned');
      return;
    }
    this.briefingFailed = false;
    this.displayedText = res.briefing;
    this.provider = res.provider || 'ambient_engine';
    this.model = res.model || '';
    this.stale = !!res.stale;
    this.geminiError = res.geminiError || '';
    const generated = res.generatedAt ? new Date(res.generatedAt) : new Date();
    this.lastSync = 'Updated ' + generated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Gemini failed (template or earlier briefing shown): try again later; otherwise refresh on schedule.
    // After a rate limit, wait as long as the server says (it pauses Gemini for every display on that key).
    if (this.geminiError) {
      this.scheduleRetry(Number(res.retryAfter) > 0 ? Number(res.retryAfter) * 1000 : undefined);
    } else {
      this.retryCount = 0;
      this.scheduleRefresh();
    }
  }

  private handleFailure(message: string): void {
    this.loading = false;
    this.geminiError = message;
    if (this.isLive) {
      this.briefingFailed = true;
      this.displayedText = '';
    } else {
      this.displayedText = 'The briefing could not be generated right now. It will appear here once the server responds.';
      this.provider = 'ambient_engine';
    }
    this.scheduleRetry();
  }

  private get refreshHours(): number {
    return Math.max(MIN_REFRESH_HOURS, Number(this.config?.refreshHours) || DEFAULT_REFRESH_HOURS);
  }

  private scheduleRefresh(): void {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.fetchBriefing(), this.refreshHours * 60 * MINUTE);
  }

  private scheduleRetry(minDelayMs = 0): void {
    clearTimeout(this.retryTimer);
    const delay = Math.max(minDelayMs, RETRY_DELAYS_MS[Math.min(this.retryCount, RETRY_DELAYS_MS.length - 1)]);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this.fetchBriefing(), delay);
  }

  // ---------------------------------------------------------------------------
  // Context: only real data from this display
  // ---------------------------------------------------------------------------

  private buildContext(): Observable<BriefingContext> {
    const now = new Date();
    const base = {
      events: this.describeEvent(this.bus.snapshot('nextEvent'), now),
      localHour: now.getHours(),
      localDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    };
    const city = this.config?.city?.trim();
    const weather$: Observable<{ location: string; weather: string }> = city
      ? this.lookupWeather(city)
      : of(this.describeBusWeather(this.bus.snapshot('weather')));
    return weather$.pipe(map(w => ({ ...base, ...w })));
  }

  /** Weather published by a Weather widget on this screen */
  private describeBusWeather(w: WeatherSnapshot | undefined): { location: string; weather: string } {
    if (!w || typeof w.temp !== 'number') return { location: '', weather: '' };
    const unit = w.units === 'metric' ? '°C' : '°F';
    // Bus data is only as good as the weather widget's refresh; ignore anything over 2 hours old
    if (Date.now() - w.updatedAt > 120 * MINUTE) return { location: w.city || '', weather: '' };
    let text = `${(w.condition || '').toLowerCase()} and ${Math.round(w.temp)}${unit}`.trim();
    if (typeof w.high === 'number') text += ` (high ${Math.round(w.high)}${unit})`;
    return { location: w.city || '', weather: text.replace(/^and /, '') };
  }

  /** The briefing's own location: geocode with Open-Meteo (no key), then current conditions */
  private lookupWeather(city: string): Observable<{ location: string; weather: string }> {
    const [name, region] = city.split(',').map(p => p.trim());
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
    return this.dataCache.get<any>(geoUrl, 24 * 60 * MINUTE).pipe(
      switchMap(geo => {
        const results: any[] = geo?.results || [];
        if (!results.length) return of({ location: city, weather: '' });
        // "Austin, TX" / "Austin, Texas" / "Paris, FR": match state (incl. US abbreviations) or country
        const hints = [region, US_STATES[(region || '').toUpperCase()]].filter(Boolean).map(h => h.toLowerCase());
        const place = (hints.length && results.find(r =>
          [r.admin1, r.country, r.country_code].some((v: string) => hints.includes((v || '').toLowerCase()))
        )) || results[0];
        const location = [place.name, place.admin1 || place.country].filter(Boolean).join(', ');
        const metric = this.config?.units === 'metric';
        const unit = metric ? '°C' : '°F';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}`
          + `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`
          + `&forecast_days=1&temperature_unit=${metric ? 'celsius' : 'fahrenheit'}&timezone=auto`;
        return this.dataCache.get<any>(url, 10 * MINUTE).pipe(
          map(fc => {
            const cur = fc?.current;
            if (!cur || typeof cur.temperature_2m !== 'number') return { location, weather: '' };
            const condition = (WMO_MAP[cur.weather_code]?.desc || '').toLowerCase();
            let weather = `${condition ? condition + ' and ' : ''}${Math.round(cur.temperature_2m)}${unit}`;
            const hi = fc.daily?.temperature_2m_max?.[0];
            const lo = fc.daily?.temperature_2m_min?.[0];
            const rain = fc.daily?.precipitation_probability_max?.[0];
            const extras: string[] = [];
            if (typeof hi === 'number' && typeof lo === 'number') extras.push(`high ${Math.round(hi)}${unit}, low ${Math.round(lo)}${unit}`);
            if (typeof rain === 'number' && rain >= 30) extras.push(`${rain}% chance of rain`);
            if (extras.length) weather += ` (${extras.join(', ')})`;
            return { location, weather };
          })
        );
      }),
      catchError(() => of({ location: city, weather: '' }))
    );
  }

  /** "Dentist at 3:00 PM today" — only events from now until the end of tomorrow */
  private describeEvent(e: NextEventSnapshot | null | undefined, now: Date): string {
    if (!e || !e.title) return '';
    const start = new Date(e.start);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOffset = Math.floor((start.getTime() - startOfToday) / (24 * 60 * MINUTE));
    if (dayOffset < 0 || dayOffset > 1) return '';
    const day = dayOffset === 0 ? 'today' : 'tomorrow';
    const when = e.allDay ? `${day} (all day)` : `at ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${day}`;
    return `${e.title} ${when}`;
  }

  toggleSpeak(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      return;
    }
    if (!this.displayedText) return;
    const utterance = new SpeechSynthesisUtterance(this.displayedText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => this.isSpeaking = false;
    utterance.onerror = () => this.isSpeaking = false;
    this.isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.retryTimer);
    clearTimeout(this.refreshTimer);
    this.requestSub?.unsubscribe();
    this.busSub.unsubscribe();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
