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
          <h3 class="widget-title">Smart Home</h3>
        </div>
        <span class="status-indicator" [class.online]="!isError" [class.offline]="isError">
          {{ isError ? 'Offline' : 'Connected' }}
        </span>
      </div>

      <div class="entities-grid">
        <div *ngFor="let entity of entitiesList" class="entity-item" [ngClass]="getEntityStatusClass(entity)">
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
    </div>
  `,
  styles: [`
    .ha-card {
      height: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .ha-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ha-icon {
      width: 20px;
      height: 20px;
      color: #0284c7;
    }
    .widget-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
    }
    .status-indicator {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .status-indicator.online { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-indicator.offline { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .entities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .entity-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .entity-item.active {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }
    .entity-icon-wrap {
      width: 34px;
      height: 34px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .entity-info {
      flex: 1;
      overflow: hidden;
    }
    .entity-label {
      font-size: 0.75rem;
      opacity: 0.7;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .entity-state {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      display: flex;
      align-items: baseline;
      gap: 2px;
    }
    .state-unit {
      font-size: 0.75rem;
      opacity: 0.8;
    }
  `]
})
export class HomeAssistantWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    haUrl: '',
    token: '',
    entities: [],
    refreshSeconds: 30
  };

  isError: boolean = false;
  private pollSub?: Subscription;

  private defaultEntities: HomeAssistantEntity[] = [
    { entityId: 'sensor.living_room_temp', label: 'Living Room', icon: '🌡️', state: '72.4', unit: '°F' },
    { entityId: 'sensor.indoor_humidity', label: 'Humidity', icon: '💧', state: '45', unit: '%' },
    { entityId: 'light.kitchen_lights', label: 'Kitchen Light', icon: '💡', state: 'ON' },
    { entityId: 'lock.front_door', label: 'Front Door', icon: '🔒', state: 'Locked' }
  ];

  get entitiesList(): HomeAssistantEntity[] {
    if (this.config.entities && Array.isArray(this.config.entities) && this.config.entities.length > 0) {
      return this.config.entities;
    }
    return this.defaultEntities;
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchEntityStates();
    this.startPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
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
        error: (err) => {
          this.isError = true;
          console.error(`Failed to fetch state for ${entity.entityId}:`, err);
        }
      });
    });
  }

  getEntityIcon(entity: HomeAssistantEntity): string {
    if (entity.icon) return entity.icon;
    const id = entity.entityId.toLowerCase();
    if (id.includes('temp')) return '🌡️';
    if (id.includes('humid')) return '💧';
    if (id.includes('light')) return '💡';
    if (id.includes('lock')) return '🔒';
    if (id.includes('motion')) return '🏃';
    if (id.includes('door') || id.includes('window')) return '🚪';
    return '⚡';
  }

  getEntityStatusClass(entity: HomeAssistantEntity): string {
    const s = String(entity.state).toLowerCase();
    if (s === 'on' || s === 'open' || s === 'unlocked' || s === 'active') return 'active';
    return '';
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
