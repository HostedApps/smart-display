import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GoogleMapsConfig } from '../../models/display.model';

@Component({
  selector: 'app-google-maps-widget',
  template: `
    <div class="maps-card">
      <div class="maps-header">
        <div class="header-left">
          <svg class="maps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
            <line x1="8" y1="2" x2="8" y2="18"></line>
            <line x1="16" y1="6" x2="16" y2="22"></line>
          </svg>
          <span class="maps-title">{{ config.title || 'Location Map' }}</span>
        </div>
        <div class="header-right">
          <span class="location-badge" [title]="address">
            📍 {{ address }}
          </span>
          <span class="traffic-badge" *ngIf="config.showTraffic">
            🚦 Live Traffic
          </span>
        </div>
      </div>

      <div class="map-frame-wrapper">
        <iframe 
          *ngIf="safeMapUrl"
          [src]="safeMapUrl"
          class="map-iframe"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          loading="lazy">
        </iframe>
      </div>
    </div>
  `,
  styles: [`
    .maps-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 10px 12px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .maps-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .maps-icon {
      width: 16px;
      height: 16px;
      color: #38bdf8;
    }
    .maps-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #ffffff;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .location-badge {
      font-size: 0.65rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 10px;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .traffic-badge {
      font-size: 0.6rem;
      color: #34d399;
      background: rgba(52, 211, 153, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
    .map-frame-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.6);
      position: relative;
    }
    .map-iframe {
      width: 100%;
      height: 100%;
      border: 0;
      filter: saturate(1.1) brightness(0.95);
    }
  `]
})
export class GoogleMapsWidgetComponent implements OnInit, OnChanges {
  @Input() config: GoogleMapsConfig = {
    address: 'San Jose, CA',
    zoom: 13,
    mapType: 'roadmap',
    showTraffic: true,
    title: 'Location Map'
  };

  safeMapUrl: SafeResourceUrl | null = null;

  get address(): string {
    return this.config.address || 'San Jose, CA';
  }

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateMapUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.updateMapUrl();
    }
  }

  private updateMapUrl(): void {
    const q = encodeURIComponent(this.address);
    const zoom = this.config.zoom || 13;
    const mapType = this.config.mapType === 'satellite' ? 'k' : (this.config.mapType === 'terrain' ? 'p' : 'm');
    const url = `https://maps.google.com/maps?q=${q}&z=${zoom}&t=${mapType}&output=embed`;
    this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
