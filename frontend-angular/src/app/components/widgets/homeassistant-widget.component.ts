import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { HomeAssistantEntity } from '../../models/display.model';

@Component({
  selector: 'app-homeassistant-widget',
  template: `
    <div class="ha-card">
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
    </div>
  `,
  styles: [`
    .ha-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ha-icon {
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
    .status-indicator {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .status-indicator.online { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-indicator.offline { background: rgba(239, 68, 68, 0.15); color: #f87171; }

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
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.2s;
      cursor: pointer;
      user-select: none;
    }
    .entity-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }
    .entity-item.active {
      background: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.35);
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
    }
    .entity-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
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
      font-size: 0.78rem;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .entity-state {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 500;
    }
    .entity-item.active .entity-state {
      color: #38bdf8;
      font-weight: 700;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #64748b;
      font-size: 0.8rem;
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

  get entitiesList(): HomeAssistantEntity[] {
    if (this.config.entities && Array.isArray(this.config.entities) && this.config.entities.length > 0) {
      return this.config.entities;
    }
    return this.defaultEntities;
  }

  constructor(private http: HttpClient) {}

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
