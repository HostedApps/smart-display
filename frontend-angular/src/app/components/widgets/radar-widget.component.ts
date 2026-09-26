import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RadarConfig } from '../../models/display.model';

interface RainViewerFrame {
  time: number;
  path: string;
}

@Component({
  selector: 'app-radar-widget',
  template: `
    <div class="radar-card">
      <div class="radar-header">
        <div class="title-wrap">
          <svg class="radar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="3" x2="12" y2="21"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
          </svg>
          <h3 class="widget-title">{{ config.cityName || 'Weather Radar' }}</h3>
        </div>
        <div class="radar-badge">
          <span class="live-dot"></span>
          <span class="timestamp-label">{{ currentFrameTimeLabel }}</span>
        </div>
      </div>

      <!-- Map & Doppler Canvas Viewport -->
      <div class="map-viewport">
        <!-- Base Map Tiles (Dark Tile Layer) -->
        <div class="tile-layer base-layer" [style.backgroundImage]="baseTileUrl ? 'url(' + baseTileUrl + ')' : ''"></div>
        
        <!-- RainViewer Doppler Precipitation Tile Layer -->
        <div 
          class="tile-layer radar-layer" 
          *ngIf="currentRadarTileUrl"
          [style.backgroundImage]="'url(' + currentRadarTileUrl + ')'"
        ></div>

        <!-- Center Crosshair Marker -->
        <div class="center-crosshair">
          <div class="ring"></div>
          <div class="dot"></div>
        </div>

        <!-- Precipitation Legend -->
        <div class="intensity-legend">
          <span class="legend-label">Light</span>
          <div class="color-bar"></div>
          <span class="legend-label">Heavy</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .radar-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px 14px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .radar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .radar-icon {
      width: 16px;
      height: 16px;
      color: var(--accent-blue, #0ea5e9);
    }
    .widget-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .radar-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(0, 0, 0, 0.45);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 8px #ef4444;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .timestamp-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .map-viewport {
      flex: 1;
      position: relative;
      background: #090d16;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tile-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      transition: opacity 0.3s ease;
    }
    .base-layer {
      filter: invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2) saturate(0.3);
    }
    .radar-layer {
      mix-blend-mode: screen;
      filter: saturate(1.4);
    }

    .center-crosshair {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .center-crosshair .ring {
      width: 24px;
      height: 24px;
      border: 1.5px dashed rgba(56, 189, 248, 0.8);
      border-radius: 50%;
      animation: spin 10s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .center-crosshair .dot {
      position: absolute;
      width: 5px;
      height: 5px;
      background: #38bdf8;
      border-radius: 50%;
      box-shadow: 0 0 8px #38bdf8;
    }

    .intensity-legend {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 3px 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(4px);
    }
    .legend-label {
      font-size: 0.55rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
    }
    .color-bar {
      width: 48px;
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(to right, #00ffff, #00ff00, #ffff00, #ff8000, #ff0000, #ff00ff);
    }
  `]
})
export class RadarWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: RadarConfig = {
    cityName: 'San Francisco Bay Area',
    lat: 37.7749,
    lon: -122.4194,
    zoom: 7,
    colorScheme: 2,
    smooth: true,
    refreshMinutes: 10
  };

  baseTileUrl: string = '';
  currentRadarTileUrl: string = '';
  currentFrameTimeLabel: string = 'LIVE';
  
  private frames: RainViewerFrame[] = [];
  private hostUrl: string = 'https://tilecache.rainviewer.com';
  private frameIndex: number = 0;
  private animSub?: Subscription;
  private pollSub?: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateMapTiles();
    this.fetchRadarMetadata();
    this.pollSub = interval((this.config.refreshMinutes || 10) * 60000).subscribe(() => this.fetchRadarMetadata());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.updateMapTiles();
      this.fetchRadarMetadata();
    }
  }

  private updateMapTiles(): void {
    const lat = this.config.lat || 37.7749;
    const lon = this.config.lon || -122.4194;
    const zoom = this.config.zoom || 7;

    const tile = this.latLonToTile(lat, lon, zoom);
    this.baseTileUrl = `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
  }

  private fetchRadarMetadata(): void {
    this.http.get<any>('https://api.rainviewer.com/public/weather-maps.json')
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && res.host && res.radar && res.radar.past) {
          this.hostUrl = res.host;
          this.frames = res.radar.past.concat(res.radar.nowcast || []);
          this.startAnimationLoop();
        }
      });
  }

  private startAnimationLoop(): void {
    this.animSub?.unsubscribe();
    if (this.frames.length === 0) return;

    this.frameIndex = 0;
    this.renderCurrentFrame();

    this.animSub = interval(800).subscribe(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.renderCurrentFrame();
    });
  }

  private renderCurrentFrame(): void {
    if (this.frames.length === 0) return;
    const frame = this.frames[this.frameIndex];
    const lat = this.config.lat || 37.7749;
    const lon = this.config.lon || -122.4194;
    const zoom = this.config.zoom || 7;
    const colorScheme = this.config.colorScheme || 2;
    const smooth = this.config.smooth !== false ? 1 : 0;

    const tile = this.latLonToTile(lat, lon, zoom);
    this.currentRadarTileUrl = `${this.hostUrl}${frame.path}/512/${zoom}/${tile.x}/${tile.y}/${colorScheme}/${smooth}_1.png`;

    const frameDate = new Date(frame.time * 1000);
    const diffMinutes = Math.round((frameDate.getTime() - Date.now()) / 60000);
    
    if (Math.abs(diffMinutes) <= 5) {
      this.currentFrameTimeLabel = 'NOW';
    } else if (diffMinutes < 0) {
      this.currentFrameTimeLabel = `${diffMinutes}m`;
    } else {
      this.currentFrameTimeLabel = `+${diffMinutes}m`;
    }
  }

  private latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
    );
    return { x, y };
  }

  ngOnDestroy(): void {
    this.animSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }
}
