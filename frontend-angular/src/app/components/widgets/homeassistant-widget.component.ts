import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Optional, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { HomeAssistantEntity } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-homeassistant-widget',
  template: `
    <div class="ha-card sd-card">
      <div class="ha-header">
        <div class="header-title">
          <svg class="ha-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
          </svg>
          <h3 class="widget-title">{{ config.title || 'Smart Home' }}</h3>
        </div>
        <span class="status-indicator" [class.online]="!isError" [class.offline]="isError">
          {{ isLiveHA ? (isError ? 'HA Offline' : 'HA Connected') : 'Smart Home' }}
        </span>
      </div>

      <app-widget-state *ngIf="isLive && !hasRealConfig; else haBody" message="Home Assistant not connected" hint="Add your Home Assistant URL and token in the editor."></app-widget-state>

      <ng-template #haBody>
      <div class="entities-grid" *ngIf="entitiesList.length > 0; else emptyState">
        <div 
          *ngFor="let entity of entitiesList" 
          class="entity-item" 
          [ngClass]="getEntityStatusClass(entity)"
          (click)="toggleEntity(entity)"
          [title]="'Click to toggle ' + (entity.label || entity.entityId)"
        >
          <div class="entity-icon-wrap">
            <span class="entity-emoji">{{ getEntityIcon(entity) }}</span>
          </div>
          <div class="entity-info">
            <div class="entity-label">{{ entity.label || entity.entityId }}</div>
            <div class="entity-state">
              <span class="state-val">{{ entity.state }}</span>
              <span class="state-unit" *ngIf="entity.unit">{{ entity.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <p>No smart entities configured</p>
        </div>
      </ng-template>
      </ng-template>
    </div>
  `,
  styles: [`
    .ha-card {
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .ha-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: var(--sd-border);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ha-icon {
      width: 16px;
      height: 16px;
      color: var(--sd-accent);
    }
    .widget-title {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      margin: 0;
      color: var(--sd-text);
    }
    .status-indicator {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--sd-radius-sm);
    }
    .status-indicator.online { background: var(--sd-success-soft); color: var(--sd-success); }
    .status-indicator.offline { background: var(--sd-danger-soft); color: var(--sd-danger); }

    .entities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      overflow-y: auto;
      flex: 1;
      padding-right: 2px;
    }
    .entity-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      transition: all 0.2s;
      cursor: pointer;
      user-select: none;
    }
    .entity-item:hover {
      background: var(--sd-surface-3);
      border-color: var(--sd-accent-border);
      transform: translateY(-1px);
    }
    .entity-item.active {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent-border);
      box-shadow: 0 0 12px var(--sd-accent-soft);
    }
    .entity-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: var(--sd-radius-sm);
      background: var(--sd-surface-2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    .entity-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }
    .entity-label {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .entity-state {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      font-weight: 500;
    }
    .entity-item.active .entity-state {
      color: var(--sd-accent);
      font-weight: 700;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--sd-text-subtle);
      font-size: var(--sd-fs-sm);
    }
  `]
})
export class HomeAssistantWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    title: 'Smart Home',
    haUrl: '',
    token: '',
    entities: [],
    refreshSeconds: 30
  };

  isError: boolean = false;
  readonly isLive: boolean;
  private pollSub?: Subscription;

  defaultEntities: HomeAssistantEntity[] = [
    { entityId: 'light.living_room', label: 'Living Room Lights', state: 'on', icon: '💡' },
    { entityId: 'climate.thermostat', label: 'Nest Thermostat', state: '72', unit: '°F', icon: '🌡️' },
    { entityId: 'lock.front_door', label: 'Front Door Lock', state: 'locked', icon: '🔒' },
    { entityId: 'binary_sensor.driveway_motion', label: 'Driveway Camera', state: 'clear', icon: '📹' }
  ];

  get isLiveHA(): boolean {
    return !!(this.config.haUrl && this.config.token);
  }

  /** URL, token and at least one entity are configured (the only case a live display shows entities). */
  get hasRealConfig(): boolean {
    return this.isLiveHA && Array.isArray(this.config.entities) && this.config.entities.length > 0;
  }

  get entitiesList(): HomeAssistantEntity[] {
    if (this.config.entities && Array.isArray(this.config.entities) && this.config.entities.length > 0) {
      return this.config.entities;
    }
    if (this.isLive) return [];
    return this.defaultEntities;
  }

  constructor(private http: HttpClient, @Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    if (this.isLiveHA) {
      this.fetchEntityStates();
      this.startPolling();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.isLiveHA) {
      this.fetchEntityStates();
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    const intervalSec = Math.max(10, Number(this.config.refreshSeconds) || 30);
    this.pollSub = interval(intervalSec * 1000).subscribe(() => this.fetchEntityStates());
  }

  fetchEntityStates(): void {
    if (!this.config.haUrl || !this.config.token || !this.config.entities || this.config.entities.length === 0) {
      return;
    }

    const cleanUrl = this.config.haUrl.replace(/\/+$/, '');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    });

    this.config.entities.forEach((entity: HomeAssistantEntity) => {
      this.http.get<any>(`${cleanUrl}/api/states/${entity.entityId}`, { headers }).subscribe({
        next: (data) => {
          this.isError = false;
          if (data && data.state !== undefined) {
            entity.state = data.state;
            if (data.attributes && data.attributes.unit_of_measurement) {
              entity.unit = data.attributes.unit_of_measurement;
            }
          }
        },
        error: () => {
          this.isError = true;
        }
      });
    });
  }

  toggleEntity(entity: HomeAssistantEntity): void {
    if (this.isLiveHA) {
      const cleanUrl = this.config.haUrl.replace(/\/+$/, '');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json'
      });
      const domain = entity.entityId.split('.')[0] || 'homeassistant';
      this.http.post<any>(`${cleanUrl}/api/services/${domain}/toggle`, { entity_id: entity.entityId }, { headers }).subscribe({
        next: () => {
          setTimeout(() => this.fetchEntityStates(), 500);
        }
      });
    } else {
      // Interactive local state toggle
      if (entity.state === 'on') entity.state = 'off';
      else if (entity.state === 'off') entity.state = 'on';
      else if (entity.state === 'locked') entity.state = 'unlocked';
      else if (entity.state === 'unlocked') entity.state = 'locked';
      else if (entity.state === 'clear') entity.state = 'motion';
      else if (entity.state === 'motion') entity.state = 'clear';
    }
  }

  getEntityIcon(entity: HomeAssistantEntity): string {
    if (entity.icon) return entity.icon;
    const id = entity.entityId.toLowerCase();
    if (id.includes('temp') || id.includes('climate')) return '🌡️';
    if (id.includes('humid')) return '💧';
    if (id.includes('light')) return '💡';
    if (id.includes('lock')) return '🔒';
    if (id.includes('motion')) return '🏃';
    if (id.includes('camera')) return '📹';
    if (id.includes('door') || id.includes('window')) return '🚪';
    return '⚡';
  }

  getEntityStatusClass(entity: HomeAssistantEntity): string {
    const s = String(entity.state).toLowerCase();
    if (s === 'on' || s === 'open' || s === 'unlocked' || s === 'motion' || s === 'active') return 'active';
    return '';
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
