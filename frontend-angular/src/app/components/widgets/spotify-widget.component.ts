import { Component, Inject, Input, OnInit, OnDestroy, Optional } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-spotify-widget',
  template: `
    <div class="spotify-card sd-card">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
      <div class="spotify-top">
        <div class="brand">
          <svg class="spotify-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.485 17.294c-.215.353-.674.466-1.026.252-2.812-1.718-6.353-2.107-10.522-1.155-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.568-1.044 8.49-.607 11.628 1.335.353.214.466.673.252 1.026zm1.463-3.254c-.27.44-.848.58-1.288.31-3.218-1.978-8.125-2.55-11.932-1.394-.496.15-1.023-.133-1.174-.63-.15-.497.133-1.023.63-1.174 4.356-1.322 9.775-.68 13.454 1.599.44.27.58.848.31 1.289zm.126-3.391c-3.858-2.29-10.224-2.502-13.896-1.387-.591.18-1.218-.16-1.398-.752-.18-.592.16-1.219.752-1.399 4.225-1.283 11.25-1.037 15.688 1.597.532.316.707 1.004.39 1.536-.316.532-1.003.707-1.536.405z"/>
          </svg>
          <span class="now-playing-label">{{ isPlaying ? 'Now Playing' : 'Paused' }}</span>
        </div>

        <div class="top-meta" *ngIf="!(isLive && showingSample)">
          <span class="device-pill" *ngIf="deviceName">
            <span class="device-icon">🔊</span> {{ deviceName }}
          </span>
          <div class="equalizer-bars" *ngIf="isPlaying && (config.showEqualizer !== false)">
            <span class="bar bar1"></span>
            <span class="bar bar2"></span>
            <span class="bar bar3"></span>
            <span class="bar bar4"></span>
          </div>
        </div>
      </div>

      <div class="track-row">
        <div class="art-container">
          <img [src]="albumArt" [alt]="trackTitle" class="album-art" />
          <div class="art-glow"></div>
        </div>

        <div class="track-info">
          <div class="track-title" [title]="trackTitle">{{ trackTitle }}</div>
          <div class="track-artist">{{ artistName }}</div>
          <div class="track-album" *ngIf="albumName">{{ albumName }}</div>

          <!-- Interactive Seek Scrub Bar -->
          <div class="playback-bar-wrap" (click)="seekTrack($event)">
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="progressPercent"></div>
            </div>
            <div class="time-meta">
              <span>{{ formatTime(currentProgressMs) }}</span>
              <span>{{ formatTime(totalDurationMs) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Touch-Interactive Playback Controls -->
      <div class="controls-row">
        <button class="ctrl-btn" (click)="prevTrack()" title="Previous Track">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button class="ctrl-btn play-btn" (click)="togglePlay()" [title]="isPlaying ? 'Pause' : 'Play'">
          <svg *ngIf="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg *ngIf="isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>

        <button class="ctrl-btn" (click)="nextTrack()" title="Next Track">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <div class="volume-container">
          <button class="ctrl-btn vol-btn" (click)="toggleMute()" title="Volume">
            <svg *ngIf="volume > 0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <svg *ngIf="volume === 0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            [(ngModel)]="volume" 
            (ngModelChange)="onVolumeChange($event)"
            class="vol-slider"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spotify-card {
      height: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    .spotify-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .spotify-icon {
      width: 18px;
      height: 18px;
      color: #1ed760;
      filter: drop-shadow(0 0 8px rgba(30, 215, 96, 0.5));
    }
    .now-playing-label {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--sd-text-muted);
    }
    .top-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .device-pill {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      background: var(--sd-surface-2);
      padding: 2px 6px;
      border-radius: var(--sd-radius-sm);
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .equalizer-bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 14px;
    }
    .bar {
      width: 3px;
      background-color: #1ed760;
      border-radius: 2px;
      animation: bounce 1.2s ease-in-out infinite alternate;
    }
    .bar1 { height: 60%; animation-delay: 0.1s; }
    .bar2 { height: 100%; animation-delay: 0.4s; }
    .bar3 { height: 40%; animation-delay: 0.2s; }
    .bar4 { height: 80%; animation-delay: 0.5s; }

    @keyframes bounce {
      0% { height: 20%; }
      100% { height: 100%; }
    }

    .track-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    .art-container {
      position: relative;
      width: 62px;
      height: 62px;
      flex-shrink: 0;
    }
    .album-art {
      width: 100%;
      height: 100%;
      border-radius: var(--sd-radius-sm);
      object-fit: cover;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
      position: relative;
      z-index: 1;
    }
    .art-glow {
      position: absolute;
      inset: -4px;
      background: radial-gradient(circle, rgba(30, 215, 96, 0.4) 0%, transparent 70%);
      border-radius: 14px;
      z-index: 0;
    }
    .track-info {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .track-title {
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      letter-spacing: -0.2px;
    }
    .track-artist {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      font-weight: 600;
      margin-top: 1px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .track-album {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .playback-bar-wrap {
      margin-top: 6px;
      cursor: pointer;
    }
    .progress-track {
      width: 100%;
      height: 5px;
      background: var(--sd-surface-3);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #1ed760;
      box-shadow: 0 0 8px rgba(30, 215, 96, 0.8);
      border-radius: 3px;
      transition: width 0.3s linear;
    }
    .time-meta {
      display: flex;
      justify-content: space-between;
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 4px;
      padding-top: 4px;
      border-top: var(--sd-border);
    }
    .ctrl-btn {
      background: var(--sd-surface-3);
      border: var(--sd-border);
      color: var(--sd-text);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ctrl-btn svg {
      width: 16px;
      height: 16px;
    }
    .ctrl-btn:hover {
      background: rgba(30, 215, 96, 0.25);
      border-color: #1ed760;
      color: #1ed760;
      transform: scale(1.05);
    }
    .play-btn {
      width: 38px;
      height: 38px;
      background: #1ed760;
      color: #0f172a;
      border-color: #1ed760;
      box-shadow: 0 0 12px rgba(30, 215, 96, 0.4);
    }
    .play-btn:hover {
      background: #22c55e;
      color: #0f172a;
      border-color: #22c55e;
    }
    .play-btn svg {
      width: 20px;
      height: 20px;
    }
    .vol-btn {
      width: 26px;
      height: 26px;
      background: none;
      border: none;
      color: var(--sd-text-muted);
    }
    .vol-btn svg {
      width: 14px;
      height: 14px;
    }
    .volume-container {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
    }
    .vol-slider {
      width: 60px;
      height: 4px;
      accent-color: #1ed760;
      cursor: pointer;
    }
  `]
})
export class SpotifyWidgetComponent implements OnInit, OnDestroy {
  @Input() config: any = {
    track: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    albumArtUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    isPlaying: true,
    progressMs: 78000,
    durationMs: 243000,
    showEqualizer: true,
    deviceName: 'Living Room Hub'
  };

  currentProgressMs: number = 78000;
  totalDurationMs: number = 243000;
  volume: number = 75;
  private prevVolume: number = 75;
  private tickerSub?: Subscription;

  private playlist = [
    {
      track: 'Midnight City',
      artist: 'M83',
      album: 'Hurry Up, We\'re Dreaming',
      albumArtUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
      durationMs: 243000
    },
    {
      track: 'Starboy',
      artist: 'The Weeknd, Daft Punk',
      album: 'Starboy',
      albumArtUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      durationMs: 230000
    },
    {
      track: 'Resonance',
      artist: 'HOME',
      album: 'Odyssey',
      albumArtUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      durationMs: 212000
    },
    {
      track: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      albumArtUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
      durationMs: 200000
    }
  ];
  private currentTrackIndex = 0;

  get trackTitle(): string { return this.config.track || this.playlist[this.currentTrackIndex].track; }
  get artistName(): string { return this.config.artist || this.playlist[this.currentTrackIndex].artist; }
  get albumName(): string { return this.config.album || this.playlist[this.currentTrackIndex].album; }
  get albumArt(): string { return this.config.albumArtUrl || this.playlist[this.currentTrackIndex].albumArtUrl; }
  get isPlaying(): boolean { return this.config.isPlaying !== false; }
  get deviceName(): string { return this.config.deviceName || 'Smart Kiosk Audio'; }

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /**
   * True when the track shown comes from the built-in demo playlist: track/artist not configured,
   * or matching a playlist entry (the editor seeds new widgets with one, and skipping writes them).
   */
  get showingSample(): boolean {
    const { track, artist } = this.config || {};
    if (!track || !artist) return true;
    return this.playlist.some(p => p.track === track && p.artist === artist);
  }

  get progressPercent(): number {
    if (this.totalDurationMs <= 0) return 0;
    return Math.min(100, (this.currentProgressMs / this.totalDurationMs) * 100);
  }

  ngOnInit(): void {
    this.currentProgressMs = Number(this.config.progressMs) || 78000;
    this.totalDurationMs = Number(this.config.durationMs) || 243000;

    this.tickerSub = interval(1000).subscribe(() => {
      if (this.isPlaying) {
        this.currentProgressMs += 1000;
        if (this.currentProgressMs >= this.totalDurationMs) {
          this.nextTrack();
        }
      }
    });
  }

  togglePlay(): void {
    this.config.isPlaying = !this.isPlaying;
  }

  prevTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.applyCurrentTrack();
  }

  nextTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.applyCurrentTrack();
  }

  private applyCurrentTrack(): void {
    const item = this.playlist[this.currentTrackIndex];
    this.config.track = item.track;
    this.config.artist = item.artist;
    this.config.album = item.album;
    this.config.albumArtUrl = item.albumArtUrl;
    this.totalDurationMs = item.durationMs;
    this.currentProgressMs = 0;
  }

  seekTrack(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    this.currentProgressMs = Math.round(this.totalDurationMs * ratio);
  }

  toggleMute(): void {
    if (this.volume > 0) {
      this.prevVolume = this.volume;
      this.volume = 0;
    } else {
      this.volume = this.prevVolume || 50;
    }
  }

  onVolumeChange(val: number): void {
    this.volume = Number(val);
  }

  formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  ngOnDestroy(): void {
    this.tickerSub?.unsubscribe();
  }
}
