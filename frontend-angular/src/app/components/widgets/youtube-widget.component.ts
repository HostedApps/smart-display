import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-youtube-widget',
  template: `
    <div class="youtube-widget-card sd-card">
      <!-- Top Title Bar (if title is provided) -->
      <div class="youtube-header" *ngIf="config.title">
        <div class="yt-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span class="yt-live-pulse" *ngIf="config.isLive">LIVE</span>
        </div>
        <span class="yt-title">{{ config.title }}</span>
      </div>

      <!-- Player Frame -->
      <div class="youtube-frame-container" [class.with-header]="!!config.title">
        <iframe
          *ngIf="safeUrl"
          [src]="safeUrl"
          class="youtube-iframe"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>

        <!-- Placeholder when no URL / ID is specified -->
        <div *ngIf="!safeUrl" class="youtube-empty-state">
          <div class="yt-empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#ff0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <span class="yt-empty-title">YouTube Player</span>
          <span class="yt-empty-subtitle">Paste any YouTube URL or Video ID in the Inspector</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .youtube-widget-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .youtube-header {
      padding: 6px 12px;
      background: var(--sd-surface);
      border-bottom: var(--sd-border);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      z-index: 2;
    }

    .yt-badge {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .yt-live-pulse {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      color: var(--sd-danger);
      background: var(--sd-danger-soft);
      border: var(--sd-border-width) solid var(--sd-danger);
      padding: 1px 4px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      animation: pulseLive 2s infinite ease-in-out;
    }

    @keyframes pulseLive {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .yt-title {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .youtube-frame-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
      flex: 1;
      overflow: hidden;
    }

    .youtube-frame-container.with-header {
      height: calc(100% - 32px);
    }

    .youtube-iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
      object-fit: cover;
    }

    .youtube-empty-state {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      text-align: center;
      background: radial-gradient(circle at center, var(--sd-danger-soft) 0%, transparent 70%), var(--sd-surface);
      box-sizing: border-box;
      gap: 6px;
    }

    .yt-empty-icon {
      margin-bottom: 2px;
    }

    .yt-empty-title {
      font-size: var(--sd-fs-body);
      font-weight: 700;
      color: var(--sd-text);
    }

    .yt-empty-subtitle {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      max-width: 240px;
      line-height: 1.3;
    }
  `]
})
export class YoutubeWidgetComponent implements OnChanges {
  @Input() config: {
    title?: string;
    urlOrId?: string;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    showControls?: boolean;
    isLive?: boolean;
  } = {};

  safeUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateSafeUrl();
  }

  private extractVideoId(input?: string): string {
    if (!input) return '';
    const val = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) {
      return val;
    }
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = val.match(regExp);
    if (match && match[1]) {
      return match[1];
    }
    return val;
  }

  private updateSafeUrl(): void {
    const videoId = this.extractVideoId(this.config.urlOrId);
    if (!videoId) {
      this.safeUrl = null;
      return;
    }

    const autoplay = this.config.autoplay !== false ? 1 : 0;
    const muted = this.config.muted !== false ? 1 : 0;
    const loop = this.config.loop !== false ? 1 : 0;
    const controls = this.config.showControls ? 1 : 0;

    const url = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&mute=${muted}&controls=${controls}&loop=${loop}&playlist=${videoId}&playsinline=1&enablejsapi=1`;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
