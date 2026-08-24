import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription, switchMap } from 'rxjs';
import { DisplayResponse, Widget, DisplayConfig, DisplayPage, EmergencyBroadcast } from '../models/display.model';
import { environment } from '../../environments/environment';
import { OfflineCacheService } from '../services/offline-cache.service';
import { WakeLockService } from '../services/wake-lock.service';
import { EmergencyService } from '../services/emergency.service';

@Component({
  selector: 'app-display-viewer',
  template: `
    <div 
      class="display-canvas" 
      [ngClass]="[displayConfig?.theme || 'dark', displayConfig?.orientation || 'landscape_720p']"
      [style.background]="canvasBackgroundStyle"
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

      <!-- Offline Pill -->
      <div class="offline-pill" *ngIf="!isOnline">
        <span>Offline Mode</span>
      </div>

      <!-- Brand Logo Watermark (Optional) -->
      <div class="kiosk-brand-watermark" *ngIf="displayConfig?.logo_url && displayConfig?.show_logo_kiosk">
        <img [src]="displayConfig?.logo_url" alt="Logo" class="watermark-logo-img" />
      </div>

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
          *ngFor="let widget of activeWidgets" 
          class="widget-wrapper"
          [style.left.px]="widget.position.x"
          [style.top.px]="widget.position.y"
          [style.width.px]="widget.position.width"
          [style.height.px]="widget.position.height"
          [style.opacity]="widget.style?.opacity !== undefined ? widget.style?.opacity : 1"
          [style.border-radius.px]="widget.style?.borderRadius !== undefined ? widget.style?.borderRadius : 12"
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
          (click)="goToPage(idx)"
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
      background: rgba(239, 68, 68, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
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
  isSleeping: boolean = false;
  currentTime: Date = new Date();

  activeEmergency?: EmergencyBroadcast;
  private pollSub?: Subscription;
  private carouselTimerSub?: Subscription;
  private clockTimerSub?: Subscription;
  private emergencyPollSub?: Subscription;
  private token: string = '';

  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(
    private route: ActivatedRoute, 
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

  get activeWidgets(): Widget[] {
    if (this.pages.length <= 1) {
      return this.widgets;
    }
    const curPage = this.pages[this.activePageIndex];
    if (!curPage) return this.widgets;
    return this.widgets.filter(w => !w.page_id || w.page_id === curPage.id || w.page_id === 'default');
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

    // Keep screen awake 24/7 on iPad and Android/Fire TV
    this.wakeLock.requestWakeLock();

    // Initial check from offline cache
    if (this.token) {
      const cached = this.offlineCache.getDisplay(this.token);
      if (cached) {
        this.handleData(cached);
      }
      this.loadConfiguration();

      this.pollSub = interval(120000)
        .pipe(switchMap(() => this.fetchDisplayData()))
        .subscribe({
          next: res => this.handleData(res),
          error: () => this.isOnline = false
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
        this.goToPage((this.activePageIndex + 1) % this.pages.length);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'MediaTrackPrevious') {
        this.goToPage((this.activePageIndex - 1 + this.pages.length) % this.pages.length);
      } else if (event.key === 'Enter') {
        this.goToPage((this.activePageIndex + 1) % this.pages.length);
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
          this.goToPage((this.activePageIndex + 1) % this.pages.length);
        } else {
          this.goToPage((this.activePageIndex - 1 + this.pages.length) % this.pages.length);
        }
      }
    }
  }

  private loadConfiguration(): void {
    this.fetchDisplayData().subscribe({
      next: res => {
        this.isOnline = true;
        this.offlineCache.saveDisplay(this.token, res);
        this.handleData(res);
      },
      error: () => {
        this.isOnline = false;
      }
    });
  }

  private fetchDisplayData() {
    return this.http.get<DisplayResponse>(`${environment.apiUrl}/get_display.php?token=${this.token}`);
  }

  private handleData(response: DisplayResponse): void {
    if (response && response.success) {
      this.displayConfig = response.display;
      this.widgets = response.widgets;

      if (response.display.pages && response.display.pages.length > 0) {
        this.pages = response.display.pages;
      } else {
        this.pages = [{ id: 'default', name: 'Main Dashboard', duration_seconds: 30 }];
      }

      this.startCarousel();
      this.checkSleepSchedule();
    }
  }

  private startCarousel(): void {
    this.carouselTimerSub?.unsubscribe();
    if (this.pages.length <= 1) return;

    const curPage = this.pages[this.activePageIndex] || this.pages[0];
    const duration = Math.max(5, curPage.duration_seconds || 30);

    this.carouselTimerSub = interval(duration * 1000).subscribe(() => {
      this.activePageIndex = (this.activePageIndex + 1) % this.pages.length;
      this.startCarousel(); // adjust for next page's duration
    });
  }

  goToPage(idx: number): void {
    this.activePageIndex = idx;
    this.startCarousel();
  }

  private checkSleepSchedule(): void {
    const sched = this.displayConfig?.sleep_schedule;
    if (!sched || !sched.enabled || !sched.sleepTime || !sched.wakeTime) {
      this.isSleeping = false;
      return;
    }

    const now = new Date();
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
