import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { CommuteConfig, CommuteDestination } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-commute-widget',
  template: `
    <div class="commute-card sd-card">
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
        <span class="calc-time" *ngIf="!(isLive && showingSample)">Recalculated every 5 mins</span>
        <!-- Sits in the footer (not top-right) so it doesn't cover the Drive/Transit toggle -->
        <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
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
      font-family: var(--font-main, sans-serif);
      position: relative;
      overflow: hidden;
    }
    .commute-footer app-sample-badge {
      position: static;
    }
    .commute-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .widget-badge {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--sd-accent);
    }
    .commute-title {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      margin: 2px 0 0 0;
    }
    .mode-pill-toggle {
      display: flex;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 2px;
    }
    .mode-pill-toggle button {
      background: none;
      border: none;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-pill-toggle button.active {
      background: var(--sd-accent);
      color: var(--sd-on-accent);
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
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
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
      font-size: var(--sd-fs-body);
      font-weight: 700;
      color: var(--sd-text);
    }
    .dest-route {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
    }
    .dest-eta-group {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .dest-duration {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-lg);
      font-weight: var(--sd-weight-display);
      color: var(--sd-text);
      line-height: 1;
    }
    .dest-min-unit {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      font-weight: 600;
      margin-left: 2px;
    }
    .traffic-chip {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 6px;
      margin-top: 2px;
    }
    .traffic-chip.fast {
      background: var(--sd-success-soft);
      color: var(--sd-success);
      border: 1px solid color-mix(in srgb, var(--sd-success) 40%, transparent);
    }
    .traffic-chip.moderate {
      background: var(--sd-warning-soft);
      color: var(--sd-warning);
      border: 1px solid color-mix(in srgb, var(--sd-warning) 40%, transparent);
    }
    .traffic-chip.heavy {
      background: var(--sd-danger-soft);
      color: var(--sd-danger);
      border: 1px solid color-mix(in srgb, var(--sd-danger) 40%, transparent);
    }

    .transit-badge {
      background: var(--sd-accent);
      color: var(--sd-on-accent);
      font-size: var(--sd-fs-sm);
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
      background: var(--sd-surface-3);
      color: var(--sd-accent);
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .commute-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-subtle);
      border-top: var(--sd-border);
      padding-top: 8px;
    }
    .live-traffic-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--sd-success);
      font-weight: 600;
    }
    .pulse-green {
      width: 6px;
      height: 6px;
      background: var(--sd-success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--sd-success);
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

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when the list in view is the built-in example (no destinations / transit lines configured). */
  get showingSample(): boolean {
    const list = this.viewMode === 'transit' ? this.config.transitLines : this.config.destinations;
    return !(list && list.length > 0);
  }

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
