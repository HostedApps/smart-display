import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-spotify-widget',
  template: `
    <div class="spotify-card">
      <div class="spotify-top">
        <div class="brand">
          <svg class="spotify-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.485 17.294c-.215.353-.674.466-1.026.252-2.812-1.718-6.353-2.107-10.522-1.155-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.568-1.044 8.49-.607 11.628 1.335.353.214.466.673.252 1.026zm1.463-3.254c-.27.44-.848.58-1.288.31-3.218-1.978-8.125-2.55-11.932-1.394-.496.15-1.023-.133-1.174-.63-.15-.497.133-1.023.63-1.174 4.356-1.322 9.775-.68 13.454 1.599.44.27.58.848.31 1.289zm.126-3.391c-3.858-2.29-10.224-2.502-13.896-1.387-.591.18-1.218-.16-1.398-.752-.18-.592.16-1.219.752-1.399 4.225-1.283 11.25-1.037 15.688 1.597.532.316.707 1.004.39 1.536-.316.532-1.003.707-1.536.405z"/>
          </svg>
          <span class="now-playing-label">Now Playing</span>
        </div>

        <div class="equalizer-bars" *ngIf="isPlaying && (config.showEqualizer !== false)">
          <span class="bar bar1"></span>
          <span class="bar bar2"></span>
          <span class="bar bar3"></span>
          <span class="bar bar4"></span>
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

          <div class="playback-bar-wrap">
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
    </div>
  `,
  styles: [`
    .spotify-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      margin-bottom: 6px;
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
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #1ed760;
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
      gap: 14px;
      flex: 1;
    }
    .art-container {
      position: relative;
      width: 68px;
      height: 68px;
      flex-shrink: 0;
    }
    .album-art {
      width: 100%;
      height: 100%;
      border-radius: 10px;
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
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      letter-spacing: -0.2px;
    }
    .track-artist {
      font-size: 0.85rem;
      color: #1ed760;
      font-weight: 600;
      margin-top: 1px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .track-album {
      font-size: 0.7rem;
      color: #94a3b8;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .playback-bar-wrap {
      margin-top: 6px;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #1ed760;
      box-shadow: 0 0 8px rgba(30, 215, 96, 0.8);
      border-radius: 2px;
      transition: width 1s linear;
    }
    .time-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: #94a3b8;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
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
    showEqualizer: true
  };

  currentProgressMs: number = 78000;
  totalDurationMs: number = 243000;
  private tickerSub?: Subscription;

  get trackTitle(): string { return this.config.track || 'Midnight City'; }
  get artistName(): string { return this.config.artist || 'M83'; }
  get albumName(): string { return this.config.album || 'Hurry Up, We\'re Dreaming'; }
  get albumArt(): string { return this.config.albumArtUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80'; }
  get isPlaying(): boolean { return this.config.isPlaying !== false; }

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
          this.currentProgressMs = 0;
        }
      }
    });
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
