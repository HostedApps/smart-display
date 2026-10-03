import { Component, Input, OnInit, OnDestroy, DoCheck } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';
import { CameraPipConfig } from '../../models/display.model';

@Component({
  selector: 'app-camera-pip-widget',
  template: `
    <div class="camera-card sd-card">
      <div class="camera-feed-wrap">
        <!-- Live Video Stream (if streamUrl provided) -->
        <iframe 
          *ngIf="isIframeStream && safeStreamUrl" 
          [src]="safeStreamUrl" 
          class="camera-iframe"
          allow="autoplay; fullscreen"
        ></iframe>

        <!-- MJPEG / Image Snapshot Stream -->
        <img 
          *ngIf="!isIframeStream" 
          [src]="currentSnapshotUrl" 
          alt="Camera Stream" 
          class="camera-img"
          (error)="handleImageError()"
        />

        <!-- Overlay HUD -->
        <div class="camera-hud-top">
          <div class="live-tag">
            <span class="pulse-dot"></span>
            <span>LIVE</span>
          </div>
          <span class="camera-title">{{ config.title || 'Driveway & Entryway' }}</span>
        </div>

        <div class="camera-hud-bottom">
          <span class="camera-time">{{ timestamp | date:'hh:mm:ss a' }}</span>
          <span class="aspect-tag">{{ config.aspectRatio || '16:9' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .camera-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
      position: relative;
    }
    .camera-feed-wrap {
      width: 100%;
      height: 100%;
      position: relative;
      background: #090d16;
    }
    .camera-iframe {
      width: 100%;
      height: 100%;
      border: none;
      object-fit: cover;
    }
    .camera-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .camera-hud-top {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
    }
    .live-tag {
      background: rgba(220, 38, 38, 0.85);
      padding: 3px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    .camera-title {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.6);
      padding: 3px 8px;
      border-radius: 6px;
    }

    .camera-hud-bottom {
      position: absolute;
      bottom: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
      font-size: var(--sd-fs-xs);
      color: rgba(255, 255, 255, 0.75);
      font-family: monospace;
    }
    .aspect-tag {
      background: rgba(0, 0, 0, 0.6);
      padding: 2px 6px;
      border-radius: 4px;
    }
  `]
})
export class CameraPipWidgetComponent implements OnInit, OnDestroy, DoCheck {
  @Input() config: CameraPipConfig = {};

  timestamp: Date = new Date();
  currentSnapshotUrl: string = 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80';
  safeStreamUrl?: SafeResourceUrl;
  isIframeStream: boolean = false;
  private pollSub?: Subscription;

  private lastStreamUrl?: string;
  private lastSnapshotUrl?: string;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.lastStreamUrl = this.config?.streamUrl;
    this.lastSnapshotUrl = this.config?.snapshotUrl;
    this.updateStreamConfig();

    // Periodic refresh
    const intervalSec = this.config.refreshSeconds || 4;
    this.pollSub = interval(intervalSec * 1000).subscribe(() => {
      this.timestamp = new Date();
      if (!this.isIframeStream && this.config.snapshotUrl) {
        // Cache-buster parameter
        this.currentSnapshotUrl = this.config.snapshotUrl + (this.config.snapshotUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      }
    });
  }

  ngDoCheck(): void {
    if (this.config?.streamUrl !== this.lastStreamUrl || this.config?.snapshotUrl !== this.lastSnapshotUrl) {
      this.lastStreamUrl = this.config?.streamUrl;
      this.lastSnapshotUrl = this.config?.snapshotUrl;
      this.updateStreamConfig();
    }
  }

  private updateStreamConfig(): void {
    if (this.config.streamUrl) {
      if (this.config.streamUrl.includes('http') || this.config.streamUrl.includes('rtsp')) {
        this.safeStreamUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.config.streamUrl);
        this.isIframeStream = true;
      }
    } else {
      this.isIframeStream = false;
      this.safeStreamUrl = undefined;
    }

    if (this.config.snapshotUrl) {
      this.currentSnapshotUrl = this.config.snapshotUrl;
    } else if (!this.isIframeStream) {
      this.currentSnapshotUrl = 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80';
    }
  }

  handleImageError(): void {
    this.currentSnapshotUrl = 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80';
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
