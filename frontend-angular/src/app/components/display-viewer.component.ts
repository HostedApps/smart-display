import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription, switchMap, catchError, of } from 'rxjs';
import { DisplayResponse, Widget, DisplayConfig, DisplayPage, EmergencyBroadcast } from '../models/display.model';
import { environment } from '../../environments/environment';
import { OfflineCacheService } from '../services/offline-cache.service';
import { WakeLockService } from '../services/wake-lock.service';
import { EmergencyService } from '../services/emergency.service';
import { loadGoogleFont, getFontFamilyString } from '../utils/font-loader.util';
import { SevereWeatherAlertData } from './widgets/severe-weather-alert-banner.component';

@Component({
  selector: 'app-display-viewer',
  template: `
    <div 
      class="display-canvas" 
      [ngClass]="[displayConfig?.theme || 'dark', displayConfig?.orientation || 'landscape_720p']"
      [style.background]="canvasBackgroundStyle"
      [style.fontFamily]="canvasFontFamily"
    >
      <!-- Background Image Overlay if Configured -->
      <div 
        *ngIf="backgroundImageUrl" 
        class="bg-image-layer" 
        [style.backgroundImage]="'url(' + backgroundImageUrl + ')'"
        [style.filter]="'blur(' + (displayConfig?.background?.blur || 0) + 'px)'"
        [style.opacity]="(displayConfig?.background?.opacity !== undefined ? displayConfig?.background?.opacity : 1)"
      ></div>

      <!-- Background Video Overlay if Configured -->
      <video
        *ngIf="displayConfig?.background?.type === 'video' && displayConfig?.background?.videoUrl"
        class="bg-video-layer"
        [src]="displayConfig?.background?.videoUrl"
        autoplay
        muted
        loop
        playsinline
        [style.filter]="'blur(' + (displayConfig?.background?.blur || 0) + 'px)'"
        [style.opacity]="(displayConfig?.background?.opacity !== undefined ? displayConfig?.background?.opacity : 1)"
      ></video>

      <!-- Background YouTube Embed if Configured -->
      <iframe
        *ngIf="displayConfig?.background?.type === 'youtube' && displayConfig?.background?.youtubeId"
        class="bg-youtube-layer"
        [src]="getSafeYoutubeUrl(displayConfig?.background?.youtubeId)"
        frameborder="0"
        allow="autoplay; encrypted-media"
        allowfullscreen
        [style.filter]="'blur(' + (displayConfig?.background?.blur || 0) + 'px)'"
        [style.opacity]="(displayConfig?.background?.opacity !== undefined ? displayConfig?.background?.opacity : 1)"
      ></iframe>

      <!-- Offline Diagnostic Pill -->
      <div 
        class="offline-pill" 
        *ngIf="!isOnline" 
        (click)="retrySync()"
        [title]="'Click to retry sync. Diagnostic reason: ' + (offlineReason || 'Network or Server Unreachable')"
      >
        <span class="offline-dot"></span>
        <span class="offline-text">Offline Mode</span>
        <span class="offline-reason" *ngIf="offlineReason">: {{ offlineReason }}</span>
        <button class="btn-retry-icon" title="Retry sync now">↻</button>
      </div>

      <!-- Brand Logo Watermark (Optional) -->
      <div class="kiosk-brand-watermark" *ngIf="displayConfig?.logo_url && displayConfig?.show_logo_kiosk">
        <img [src]="displayConfig?.logo_url" alt="Logo" class="watermark-logo-img" />
      </div>

      <!-- Severe Weather Auto-Alert Banner -->
      <app-severe-weather-alert-banner 
        *ngIf="activeSevereAlert && !isSevereAlertDismissed" 
        [alert]="activeSevereAlert" 
        (dismissed)="isSevereAlertDismissed = true"
      ></app-severe-weather-alert-banner>

      <!-- Ambient Night Mode Clock Overlay -->
      <div class="night-mode-overlay" *ngIf="isSleeping && displayConfig?.sleep_schedule?.nightMode">
        <div class="night-clock">
          <div class="night-time">{{ currentTime | date:'hh:mm' }}</div>
          <div class="night-period">{{ currentTime | date:'a' }}</div>
          <div class="night-date">{{ currentTime | date:'EEEE, MMM d' }}</div>
        </div>
      </div>

      <!-- Blackout Sleep Screen (Hardware simulation) -->
      <div class="blackout-overlay" *ngIf="isSleeping && !displayConfig?.sleep_schedule?.nightMode"></div>

      <!-- Active Screen Widgets Area -->
      <div class="widgets-container" *ngIf="!isSleeping">
        <div 
          *ngFor="let widget of activeWidgets; trackBy: trackWidgetById" 
          class="widget-wrapper"
          [style.left.px]="widget.position.x"
          [style.top.px]="widget.position.y"
          [style.width.px]="widget.position.width"
          [style.height.px]="widget.position.height"
          [style.opacity]="widget.style?.opacity !== undefined ? widget.style?.opacity : 1"
          [style.border-radius.px]="widget.style?.borderRadius !== undefined ? widget.style?.borderRadius : 12"
          [style.fontFamily]="getWidgetFont(widget)"
        >
          <app-clock-widget *ngIf="widget.type === 'clock'" [config]="widget.config"></app-clock-widget>
          <app-weather-widget *ngIf="widget.type === 'weather'" [config]="widget.config"></app-weather-widget>
          <app-calendar-widget *ngIf="widget.type === 'calendar'" [config]="widget.config"></app-calendar-widget>
          <app-photo-widget *ngIf="widget.type === 'photo'" [config]="widget.config"></app-photo-widget>
          <app-rss-widget *ngIf="widget.type === 'rss'" [config]="widget.config"></app-rss-widget>
          <app-todo-widget *ngIf="widget.type === 'todo'" [config]="widget.config"></app-todo-widget>
          <app-homeassistant-widget *ngIf="widget.type === 'homeassistant'" [config]="widget.config"></app-homeassistant-widget>
          <app-spotify-widget *ngIf="widget.type === 'spotify'" [config]="widget.config"></app-spotify-widget>
          <app-stock-crypto-widget *ngIf="widget.type === 'stock_crypto'" [config]="widget.config"></app-stock-crypto-widget>
          <app-sticky-note-widget *ngIf="widget.type === 'sticky_note'" [config]="widget.config"></app-sticky-note-widget>
          <app-countdown-widget *ngIf="widget.type === 'countdown'" [config]="widget.config"></app-countdown-widget>
          <app-meal-planner-widget *ngIf="widget.type === 'meal_planner'" [config]="widget.config"></app-meal-planner-widget>
          <app-radar-widget *ngIf="widget.type === 'radar'" [config]="widget.config"></app-radar-widget>
          <app-quote-widget *ngIf="widget.type === 'quote'" [config]="widget.config"></app-quote-widget>
          <app-ai-briefing-widget *ngIf="widget.type === 'ai_briefing'" [config]="widget.config"></app-ai-briefing-widget>
          <app-chores-widget *ngIf="widget.type === 'chores'" [config]="widget.config"></app-chores-widget>
          <app-camera-pip-widget *ngIf="widget.type === 'camera_pip'" [config]="widget.config"></app-camera-pip-widget>
          <app-commute-widget *ngIf="widget.type === 'commute'" [config]="widget.config"></app-commute-widget>
          <app-youtube-widget *ngIf="widget.type === 'youtube'" [config]="widget.config"></app-youtube-widget>
          <app-text-widget *ngIf="widget.type === 'text'" [config]="widget.config"></app-text-widget>
          <app-qrcode-widget *ngIf="widget.type === 'qrcode'" [config]="widget.config"></app-qrcode-widget>
          <app-world-clocks-widget *ngIf="widget.type === 'world_clocks'" [config]="widget.config"></app-world-clocks-widget>
          <app-shapes-widget *ngIf="widget.type === 'shapes'" [config]="widget.config"></app-shapes-widget>
          <app-scheduled-text-widget *ngIf="widget.type === 'scheduled_text'" [config]="widget.config"></app-scheduled-text-widget>
          <app-button-widget *ngIf="widget.type === 'button'" [config]="widget.config"></app-button-widget>
          <app-sun-moon-widget *ngIf="widget.type === 'sun_moon'" [config]="widget.config"></app-sun-moon-widget>
          <app-analog-clock-widget *ngIf="widget.type === 'analog_clock'" [config]="widget.config"></app-analog-clock-widget>
          <app-rest-fetch-widget *ngIf="widget.type === 'rest_fetch'" [config]="widget.config"></app-rest-fetch-widget>
          <app-gauge-widget *ngIf="widget.type === 'gauge'" [config]="widget.config"></app-gauge-widget>
        </div>
      </div>

      <!-- Fullscreen Emergency Broadcast Takeover Overlay -->
      <div 
        class="emergency-takeover-overlay" 
        *ngIf="activeEmergency"
        [ngClass]="activeEmergency.severity"
      >
        <div class="emergency-strobe-border"></div>
        <div class="emergency-card">
          <div class="emergency-siren-badge">
            <span class="siren-icon">🚨</span>
            <span class="siren-label">{{ activeEmergency.severity === 'critical' ? 'CRITICAL EMERGENCY BROADCAST' : 'URGENT FLEET BROADCAST' }}</span>
          </div>
          <h1 class="emergency-title">{{ activeEmergency.title }}</h1>
          <p class="emergency-message">{{ activeEmergency.message }}</p>
          <div class="emergency-footer">
            <span class="emergency-timestamp">Broadcast transmitted at {{ activeEmergency.created_at | date:'shortTime' }}</span>
            <button (click)="dismissEmergency()" class="btn-dismiss-alert">Dismiss on this screen</button>
          </div>
        </div>
      </div>

      <!-- Multi-Screen Page Carousel Dots Indicator -->
      <div class="carousel-dots" *ngIf="pages.length > 1 && !isSleeping">
        <span 
          *ngFor="let page of pages; let idx = index" 
          class="dot" 
          [class.active]="activePageIndex === idx"
          [class.inactive-schedule]="!isPageScheduledActive(page)"
          (click)="goToPage(idx)"
          [title]="page.name + (!isPageScheduledActive(page) ? ' (Resting on schedule)' : '')"
        ></span>
      </div>
    </div>
  `,
  styles: [`
    .display-canvas {
      width: 100vw;
      height: 100vh;
      position: relative;
      overflow: hidden;
      background-color: #080c14;
      color: #f8fafc;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }
    .bg-image-layer {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      z-index: 0;
    }
    .bg-video-layer, .bg-youtube-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
      pointer-events: none;
      z-index: 0;
    }
    .widgets-container {
      position: absolute;
      inset: 0;
      z-index: 1;
    }
    .widget-wrapper {
      position: absolute;
      box-sizing: border-box;
      padding: 6px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .offline-pill {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 99;
      background: rgba(220, 38, 38, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5);
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s;
    }
    .offline-pill:hover {
      transform: scale(1.02);
      background: rgba(239, 68, 68, 0.95);
    }
    .offline-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fca5a5;
      animation: blink-dot 1.2s ease-in-out infinite alternate;
    }
    @keyframes blink-dot {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }
    .offline-reason {
      font-size: 0.7rem;
      font-weight: 500;
      color: #fecaca;
    }
    .btn-retry-icon {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      font-size: 0.8rem;
      font-weight: bold;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 2px;
    }
    .kiosk-brand-watermark {
      position: absolute;
      bottom: 20px;
      right: 24px;
      z-index: 40;
      opacity: 0.65;
      pointer-events: none;
    }
    .watermark-logo-img {
      max-height: 40px;
      max-width: 150px;
      object-fit: contain;
      filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.7));
    }
    .carousel-dots {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 50;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 20px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .dot.active {
      width: 24px;
      border-radius: 4px;
      background: #0ea5e9;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.8);
    }
    .dot.inactive-schedule {
      opacity: 0.35;
      background: rgba(255, 255, 255, 0.15);
      border: 1px dashed rgba(255, 255, 255, 0.3);
    }

    /* Ambient Night Clock Mode */
    .night-mode-overlay {
      position: absolute;
      inset: 0;
      background: #000000;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ea580c;
      opacity: 0.75;
    }
    .night-clock {
      text-align: center;
      animation: oledBurnInPrevent 600s ease-in-out infinite alternate;
    }
    @keyframes oledBurnInPrevent {
      0% { transform: translate(0px, 0px); }
      25% { transform: translate(3px, -2px); }
      50% { transform: translate(-2px, 3px); }
      75% { transform: translate(-3px, -1px); }
      100% { transform: translate(2px, 2px); }
    }
    .night-time {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 8.5rem;
      font-weight: 200;
      line-height: 1;
      letter-spacing: -3px;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0 40px rgba(234, 88, 12, 0.3);
    }
    .night-period {
      font-family: var(--font-main, sans-serif);
      font-size: 1.6rem;
      font-weight: 600;
      margin-top: 6px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .night-date {
      font-family: var(--font-main, sans-serif);
      font-size: 1.3rem;
      font-weight: 400;
      margin-top: 10px;
      opacity: 0.85;
      letter-spacing: 0.5px;
    }

    .blackout-overlay {
      position: absolute;
      inset: 0;
      background: #000000;
      z-index: 100;
    }

    /* Fullscreen Emergency Takeover */
    .emergency-takeover-overlay {
      position: absolute;
      inset: 0;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      box-sizing: border-box;
      animation: alert-fade-in 0.3s ease-out;
    }
    .emergency-takeover-overlay.critical {
      background: rgba(69, 10, 10, 0.97);
    }
    .emergency-takeover-overlay.warning {
      background: rgba(67, 20, 7, 0.97);
    }
    .emergency-strobe-border {
      position: absolute;
      inset: 0;
      border: 12px solid #ef4444;
      pointer-events: none;
      animation: strobe 1s infinite;
    }
    .emergency-takeover-overlay.warning .emergency-strobe-border {
      border-color: #f59e0b;
    }
    @keyframes strobe {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    @keyframes alert-fade-in { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }

    .emergency-card {
      max-width: 780px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      z-index: 2;
    }
    .emergency-siren-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.25);
      border: 2px solid #ef4444;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 6px 16px;
      border-radius: 30px;
    }
    .siren-icon { font-size: 1.4rem; animation: wobble 1s infinite; }
    @keyframes wobble { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
    .emergency-title {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -1px;
      margin: 0;
      color: #ffffff;
      text-shadow: 0 0 30px rgba(239, 68, 68, 0.6);
    }
    .emergency-message {
      font-size: 1.4rem;
      line-height: 1.5;
      color: #f1f5f9;
      margin: 0;
      max-width: 650px;
    }
    .emergency-footer {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .emergency-timestamp {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .btn-dismiss-alert {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-dismiss-alert:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `]
})
export class DisplayViewerComponent implements OnInit, OnDestroy {
  displayConfig?: DisplayConfig;
  widgets: Widget[] = [];
  pages: DisplayPage[] = [];
  activePageIndex: number = 0;

  isOnline: boolean = true;
  offlineReason: string = '';
  isSleeping: boolean = false;
  currentTime: Date = new Date();

  activeEmergency?: EmergencyBroadcast;
  activeSevereAlert: SevereWeatherAlertData | null = null;
  isSevereAlertDismissed: boolean = false;
  private pollSub?: Subscription;
  private carouselTimerSub?: Subscription;
  private clockTimerSub?: Subscription;
  private emergencyPollSub?: Subscription;
  private token: string = '';

  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private offlineCache: OfflineCacheService,
    private sanitizer: DomSanitizer,
    private wakeLock: WakeLockService,
    private emergencyService: EmergencyService
  ) {}

  getSafeYoutubeUrl(id?: string): SafeResourceUrl {
    const videoId = id || 'jfKfPfyJRdk';
    const url = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  get canvasFontFamily(): string {
    return getFontFamilyString(this.displayConfig?.font_family);
  }

  getWidgetFont(widget: Widget): string {
    return widget.style?.fontFamily ? getFontFamilyString(widget.style.fontFamily) : 'inherit';
  }

  detectSevereWeatherAlerts(): void {
    if (this.displayConfig?.weather_alerts_enabled === false) {
      this.activeSevereAlert = null;
      return;
    }

    // 1. DisplayConfig manual/emergency alert
    if (this.displayConfig?.weather_alert) {
      const wa = this.displayConfig.weather_alert;
      if (typeof wa === 'string' && wa.trim()) {
        this.activeSevereAlert = {
          title: 'Severe Weather Warning',
          message: wa.trim(),
          severity: 'warning'
        };
        return;
      } else if (typeof wa === 'object' && wa.message) {
        this.activeSevereAlert = {
          title: wa.title || 'Severe Weather Warning',
          message: wa.message,
          severity: (wa.severity as any) || 'warning'
        };
        return;
      }
    }

    // 2. Weather widget alerts
    const weatherWidgets = this.widgets.filter(w => w.type === 'weather');
    for (const w of weatherWidgets) {
      const alert = (w.config as any)?.alert;
      if (alert && alert.trim()) {
        this.activeSevereAlert = {
          title: 'Active Weather Advisory',
          message: alert.trim(),
          city: (w.config as any)?.city,
          severity: 'warning'
        };
        return;
      }
    }
  }

  get activeWidgets(): Widget[] {
    let list = this.widgets;
    if (this.pages.length > 1) {
      const curPage = this.pages[this.activePageIndex];
      if (curPage) {
        list = this.widgets.filter(w => !w.page_id || w.page_id === curPage.id || w.page_id === 'default');
      }
    }
    return list.filter(w => this.isWidgetScheduledActive(w));
  }

  isWidgetScheduledActive(w: Widget, now: Date = this.currentTime): boolean {
    if (w.hidden) return false;
    const sched = w.schedule || (w.config as any)?.schedule;
    if (!sched || !sched.enabled) return true;

    // 1. Day of week check (0=Sun, 1=Mon, ..., 6=Sat)
    if (Array.isArray(sched.days) && sched.days.length > 0) {
      if (!sched.days.includes(now.getDay())) {
        return false;
      }
    }

    // 2. Time range check (HH:mm)
    if (sched.startTime && sched.endTime) {
      const [sH, sM] = sched.startTime.split(':').map(Number);
      const [eH, eM] = sched.endTime.split(':').map(Number);
      const curMin = now.getHours() * 60 + now.getMinutes();
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (startMin <= endMin) {
        return curMin >= startMin && curMin <= endMin;
      } else {
        // Overnight range spanning midnight (e.g. 22:00 to 06:00)
        return curMin >= startMin || curMin <= endMin;
      }
    }

    return true;
  }

  isPageScheduledActive(page: DisplayPage, now: Date = this.currentTime): boolean {
    const sched = page.schedule;
    if (!sched || !sched.enabled) return true;

    if (Array.isArray(sched.days) && sched.days.length > 0) {
      if (!sched.days.includes(now.getDay())) {
        return false;
      }
    }

    if (sched.startTime && sched.endTime) {
      const [sH, sM] = sched.startTime.split(':').map(Number);
      const [eH, eM] = sched.endTime.split(':').map(Number);
      const curMin = now.getHours() * 60 + now.getMinutes();
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (startMin <= endMin) {
        return curMin >= startMin && curMin <= endMin;
      } else {
        return curMin >= startMin || curMin <= endMin;
      }
    }

    return true;
  }

  get backgroundImageUrl(): string | null {
    const bg = this.displayConfig?.background;
    if (bg && (bg.type === 'image' || bg.type === 'unsplash') && bg.value) {
      return bg.value;
    }
    return null;
  }

  get canvasBackgroundStyle(): string | null {
    const bg = this.displayConfig?.background;
    if (bg && (bg.type === 'color' || bg.type === 'gradient')) {
      return bg.value;
    }
    return null;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.offlineCache.isOnline$.subscribe(status => this.isOnline = status);

    // Re-check and sync immediately when network reconnects
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.loadConfiguration();
    });

    // Keep screen awake 24/7 on iPad and Android/Fire TV
    this.wakeLock.requestWakeLock();

    // Initial check from offline cache
    if (this.token) {
      const cached = this.offlineCache.getDisplay(this.token);
      if (cached) {
        this.handleData(cached);
      }
      this.loadConfiguration();

      // Periodic resync every 60s with error catch to keep subscription alive
      this.pollSub = interval(60000)
        .pipe(
          switchMap(() => this.fetchDisplayData().pipe(
            catchError(() => {
              this.isOnline = false;
              return of(null);
            })
          ))
        )
        .subscribe(res => {
          if (res && res.success) {
            this.isOnline = true;
            this.offlineCache.saveDisplay(this.token, res);
            this.handleData(res);
          }
        });

      // Poll for 1-Click Emergency Takeover every 5 seconds
      this.checkEmergency();
      this.emergencyPollSub = interval(5000).subscribe(() => {
        this.checkEmergency();
      });
    }

    // 1-second clock for time & sleep check
    this.clockTimerSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.checkSleepSchedule();
    });
  }

  checkEmergency(): void {
    if (!this.token) return;
    this.emergencyService.checkActiveBroadcast(this.token).subscribe({
      next: (res) => {
        if (res.active && res.broadcast) {
          const isNew = !this.activeEmergency || this.activeEmergency.id !== res.broadcast.id;
          this.activeEmergency = res.broadcast;
          if (isNew && res.broadcast.play_sound) {
            this.playEmergencySiren();
          }
        } else {
          this.activeEmergency = undefined;
        }
      }
    });
  }

  dismissEmergency(): void {
    this.activeEmergency = undefined;
  }

  private playEmergencySiren(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.9);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  }

  // Fire TV / Android TV Remote & Keyboard Controls
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.pages.length > 1) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ' || event.key === 'MediaTrackNext') {
        this.goToNextPage();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'MediaTrackPrevious') {
        this.goToPrevPage();
      } else if (event.key === 'Enter') {
        this.goToNextPage();
      }
    }
  }

  // iPad / Touchscreen Swipe Gestures
  @HostListener('touchstart', ['$event'])
  handleTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  @HostListener('touchend', ['$event'])
  handleTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length > 0 && this.pages.length > 1) {
      const deltaX = event.changedTouches[0].clientX - this.touchStartX;
      const deltaY = event.changedTouches[0].clientY - this.touchStartY;
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          this.goToNextPage();
        } else {
          this.goToPrevPage();
        }
      }
    }
  }

  retrySync(): void {
    this.offlineReason = 'Syncing...';
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    if (!this.token || this.token === 'YOUR_TOKEN') {
      this.isOnline = false;
      this.offlineReason = 'Placeholder Token (YOUR_TOKEN)';
      return;
    }

    this.fetchDisplayData().subscribe({
      next: res => {
        if (res && res.success) {
          this.isOnline = true;
          this.offlineReason = '';
          this.offlineCache.saveDisplay(this.token, res);
          this.handleData(res);
        } else {
          this.isOnline = false;
          this.offlineReason = (res && (res as any).error) || 'Invalid server response';
        }
      },
      error: (err) => {
        this.isOnline = false;
        if (err.status === 404) {
          this.offlineReason = 'Display Not Found (404)';
        } else if (err.status === 401 || err.status === 403) {
          this.offlineReason = 'Unauthorized. Redirecting to pair...';
          localStorage.removeItem('device_token');
          this.router.navigate(['/pair']);
          return;
        } else if (err.status === 0) {
          this.offlineReason = 'Network or DNS Unreachable';
        } else if (err.status >= 500) {
          this.offlineReason = `Server Error (${err.status})`;
        } else {
          this.offlineReason = err.statusText || 'Connection Error';
        }
        // Fast retry after 8 seconds in case Raspberry Pi booted before WiFi connected
        setTimeout(() => this.loadConfiguration(), 8000);
      }
    });
  }

  private fetchDisplayData() {
    return this.http.get<DisplayResponse>(`${environment.apiUrl}/get_display.php?token=${this.token}`);
  }

  trackWidgetById(index: number, widget: Widget): any {
    return widget.id || index;
  }

  private handleData(response: DisplayResponse): void {
    if (response && response.success) {
      this.displayConfig = response.display;

      // Smart diffing: only update widgets array reference if content actually changed
      const currentWidgetsJson = JSON.stringify(this.widgets);
      const newWidgetsJson = JSON.stringify(response.widgets);
      if (currentWidgetsJson !== newWidgetsJson) {
        this.widgets = response.widgets;
      }

      if (response.display.pages && response.display.pages.length > 0) {
        this.pages = response.display.pages;
      } else {
        this.pages = [{ id: 'default', name: 'Main Dashboard', duration_seconds: 30 }];
      }

      if (this.displayConfig?.font_family) {
        loadGoogleFont(this.displayConfig.font_family);
      }
      this.widgets.forEach(w => {
        if (w.style?.fontFamily) loadGoogleFont(w.style.fontFamily);
      });
      this.detectSevereWeatherAlerts();

      this.startCarousel();
      this.checkSleepSchedule();
    }
  }

  private getEligiblePageIndices(): number[] {
    const eligible = this.pages
      .map((p, idx) => ({ p, idx }))
      .filter(item => this.isPageScheduledActive(item.p))
      .map(item => item.idx);
    return eligible.length > 0 ? eligible : this.pages.map((_, i) => i);
  }

  private startCarousel(): void {
    this.carouselTimerSub?.unsubscribe();
    if (this.pages.length <= 1) return;

    const available = this.getEligiblePageIndices();
    if (!available.includes(this.activePageIndex)) {
      this.activePageIndex = available[0] ?? 0;
    }

    if (available.length <= 1) return;

    const curPage = this.pages[this.activePageIndex] || this.pages[0];
    const duration = Math.max(5, curPage.duration_seconds || 30);

    this.carouselTimerSub = interval(duration * 1000).subscribe(() => {
      const currentPos = available.indexOf(this.activePageIndex);
      const nextPos = (currentPos + 1) % available.length;
      this.activePageIndex = available[nextPos];
      this.startCarousel();
    });
  }

  goToPage(idx: number): void {
    this.activePageIndex = idx;
    this.startCarousel();
  }

  goToNextPage(): void {
    const available = this.getEligiblePageIndices();
    const currentPos = available.indexOf(this.activePageIndex);
    const nextPos = (currentPos + 1) % available.length;
    this.goToPage(available[nextPos]);
  }

  goToPrevPage(): void {
    const available = this.getEligiblePageIndices();
    const currentPos = available.indexOf(this.activePageIndex);
    const prevPos = (currentPos - 1 + available.length) % available.length;
    this.goToPage(available[prevPos]);
  }

  private checkSleepSchedule(): void {
    const now = new Date();

    // Check if active page eligibility changed every 10 seconds
    if (now.getSeconds() % 10 === 0 && this.pages.length > 1) {
      const eligible = this.getEligiblePageIndices();
      if (!eligible.includes(this.activePageIndex)) {
        this.activePageIndex = eligible[0] ?? 0;
        this.startCarousel();
      }
    }

    const sched = this.displayConfig?.sleep_schedule;
    if (!sched || !sched.enabled || !sched.sleepTime || !sched.wakeTime) {
      this.isSleeping = false;
      return;
    }

    const curMinutes = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = sched.sleepTime.split(':').map(Number);
    const sleepMin = sH * 60 + sM;

    const [wH, wM] = sched.wakeTime.split(':').map(Number);
    const wakeMin = wH * 60 + wM;

    if (sleepMin < wakeMin) {
      this.isSleeping = curMinutes >= sleepMin && curMinutes < wakeMin;
    } else {
      // Over midnight (e.g. 23:00 to 06:30)
      this.isSleeping = curMinutes >= sleepMin || curMinutes < wakeMin;
    }
  }

  ngOnDestroy(): void {
    this.wakeLock.releaseWakeLock();
    this.pollSub?.unsubscribe();
    this.carouselTimerSub?.unsubscribe();
    this.clockTimerSub?.unsubscribe();
    this.emergencyPollSub?.unsubscribe();
  }
}
