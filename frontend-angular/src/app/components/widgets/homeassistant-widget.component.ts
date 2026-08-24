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
    }
    .entity-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }
    .entity-item.active {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(14, 165, 233, 0.4);
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
    }
    .entity-icon-wrap {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }
    .entity-info {
      flex: 1;
      overflow: hidden;
    }
    .entity-label {
      font-size: 0.7rem;
      color: #94a3b8;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-weight: 600;
    }
    .entity-state {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 0.95rem;
      font-weight: 600;
      color: #ffffff;
      display: flex;
      align-items: baseline;
      gap: 2px;
    }
    .state-unit {
      font-size: 0.7rem;
      color: var(--accent-cyan, #06b6d4);
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
        error: () => {
          this.isError = true;
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
