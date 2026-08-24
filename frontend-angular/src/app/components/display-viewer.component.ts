import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription, switchMap } from 'rxjs';
import { DisplayResponse, Widget, DisplayConfig, DisplayPage } from '../models/display.model';
import { environment } from '../../environments/environment';
import { OfflineCacheService } from '../services/offline-cache.service';

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

  private pollSub?: Subscription;
  private carouselTimerSub?: Subscription;
  private clockTimerSub?: Subscription;
  private token: string = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private offlineCache: OfflineCacheService,
    private sanitizer: DomSanitizer
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
    }

    // 1-second clock for time & sleep check
    this.clockTimerSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.checkSleepSchedule();
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.pages.length > 1) {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        this.goToPage((this.activePageIndex + 1) % this.pages.length);
      } else if (event.key === 'ArrowLeft') {
        this.goToPage((this.activePageIndex - 1 + this.pages.length) % this.pages.length);
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
    this.pollSub?.unsubscribe();
    this.carouselTimerSub?.unsubscribe();
    this.clockTimerSub?.unsubscribe();
  }
}
