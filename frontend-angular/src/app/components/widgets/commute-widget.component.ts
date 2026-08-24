import { Component, Input, OnInit } from '@angular/core';
import { CommuteConfig, CommuteDestination } from '../../models/display.model';

@Component({
  selector: 'app-commute-widget',
  template: `
    <div class="commute-card">
      <div class="commute-header">
        <div class="header-left">
          <span class="widget-badge">🚗 LIVE COMMUTE & TRANSIT</span>
          <h3 class="commute-title">{{ config.title || 'Morning Commute' }}</h3>
        </div>
        <div class="mode-pill-toggle">
          <button [class.active]="viewMode === 'driving'" (click)="viewMode = 'driving'">Drive</button>
          <button [class.active]="viewMode === 'transit'" (click)="viewMode = 'transit'">Transit</button>
        </div>
      </div>

      <!-- Driving Mode List -->
      <div *ngIf="viewMode === 'driving'" class="commute-list">
        <div *ngFor="let dest of destinations" class="dest-row">
          <div class="dest-icon">{{ dest.icon }}</div>
          <div class="dest-info">
            <span class="dest-name">{{ dest.name }}</span>
            <span class="dest-route">{{ dest.viaRoute }}</span>
          </div>
          <div class="dest-eta-group">
            <div class="dest-duration">{{ dest.durationMinutes }}<span class="dest-min-unit">m</span></div>
            <span [class]="'traffic-chip ' + dest.trafficStatus">
              {{ getTrafficLabel(dest) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Public Transit Mode List -->
      <div *ngIf="viewMode === 'transit'" class="commute-list">
        <div *ngFor="let line of transitLines" class="transit-row">
          <div class="transit-badge">{{ line.line }}</div>
          <div class="transit-info">
            <span class="dest-name">{{ line.destination }}</span>
            <div class="departure-pills">
              <span *ngFor="let m of line.nextMinutes" class="departure-pill">
                {{ m === 0 ? 'Now' : m + ' min' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Live Pulse -->
      <div class="commute-footer">
        <span class="live-traffic-tag">
          <span class="pulse-green"></span> Live Traffic Sync
        </span>
        <span class="calc-time">Recalculated every 5 mins</span>
      </div>
    </div>
  `,
  styles: [`
    .commute-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(16px);
      color: #f1f5f9;
      font-family: var(--font-main, sans-serif);
      overflow: hidden;
    }
    .commute-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .widget-badge {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #38bdf8;
    }
    .commute-title {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      margin: 2px 0 0 0;
    }
    .mode-pill-toggle {
      display: flex;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 2px;
    }
    .mode-pill-toggle button {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-pill-toggle button.active {
      background: #0ea5e9;
      color: #ffffff;
    }

    .commute-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
      flex: 1;
      overflow-y: auto;
    }
    .dest-row, .transit-row {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dest-icon { font-size: 1.2rem; }
    .dest-info, .transit-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .dest-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #f1f5f9;
    }
    .dest-route {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .dest-eta-group {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .dest-duration {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
    }
    .dest-min-unit {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
      margin-left: 2px;
    }
    .traffic-chip {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 6px;
      margin-top: 2px;
    }
    .traffic-chip.fast {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .traffic-chip.moderate {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      border: 1px solid rgba(234, 179, 8, 0.3);
    }
    .traffic-chip.heavy {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .transit-badge {
      background: #0ea5e9;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .departure-pills {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .departure-pill {
      background: rgba(255, 255, 255, 0.08);
      color: #38bdf8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .commute-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.68rem;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
    }
    .live-traffic-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4ade80;
      font-weight: 600;
    }
    .pulse-green {
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
    }
  `]
})
export class CommuteWidgetComponent implements OnInit {
  @Input() config: CommuteConfig = {};

  viewMode: 'driving' | 'transit' = 'driving';

  destinations: CommuteDestination[] = [
    { id: '1', name: 'Downtown Office', icon: '🏢', durationMinutes: 24, trafficStatus: 'fast', viaRoute: 'via I-280 N', delayMinutes: 0 },
    { id: '2', name: 'San Jose Airport (SJC)', icon: '✈️', durationMinutes: 18, trafficStatus: 'moderate', viaRoute: 'via US-101 S', delayMinutes: 4 },
    { id: '3', name: 'Elementary School', icon: '🏫', durationMinutes: 9, trafficStatus: 'fast', viaRoute: 'via Main St', delayMinutes: 0 }
  ];

  transitLines = [
    { line: 'Express 500', destination: 'Financial District', nextMinutes: [4, 16, 28] },
    { line: 'Metro Red Line', destination: 'Airport Terminal', nextMinutes: [2, 9, 17] }
  ];

  ngOnInit(): void {
    if (this.config.destinations && this.config.destinations.length > 0) {
      this.destinations = this.config.destinations;
    }
    if (this.config.transitLines && this.config.transitLines.length > 0) {
      this.transitLines = this.config.transitLines;
    }
    if (this.config.mode) {
      this.viewMode = this.config.mode;
    }
  }

  getTrafficLabel(dest: CommuteDestination): string {
    if (dest.trafficStatus === 'fast') return '🟢 Fast';
    if (dest.trafficStatus === 'moderate') return `🟡 +${dest.delayMinutes}m delay`;
    return `🔴 +${dest.delayMinutes}m heavy`;
  }
}
