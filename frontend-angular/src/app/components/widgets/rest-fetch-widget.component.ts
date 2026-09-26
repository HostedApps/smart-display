import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, interval, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

export interface RestFetchConfig {
  url?: string;
  authHeader?: string;
  jsonPath?: string;
  title?: string;
  prefix?: string;
  unit?: string;
  refreshSeconds?: number;
  icon?: string;
}

@Component({
  selector: 'app-rest-fetch-widget',
  template: `
    <div class="rest-fetch-card">
      <div class="card-header">
        <div class="title-wrap">
          <span class="widget-icon">{{ safeConfig.icon || '🌐' }}</span>
          <span class="widget-title">{{ safeConfig.title || 'REST Data Feed' }}</span>
        </div>
        <div class="status-indicator" [class.online]="status === 'online'" [class.error]="status === 'error'" [title]="statusText">
          <span class="pulse-dot"></span>
        </div>
      </div>

      <div class="card-body">
        <div class="value-container" *ngIf="status !== 'error' || displayValue !== '—'">
          <span class="prefix" *ngIf="safeConfig.prefix">{{ safeConfig.prefix }}</span>
          <span class="main-val">{{ displayValue }}</span>
          <span class="unit" *ngIf="safeConfig.unit">{{ safeConfig.unit }}</span>
        </div>

        <div class="error-container" *ngIf="status === 'error' && displayValue === '—'">
          <span class="error-msg">{{ errorMessage || 'Unable to connect to endpoint' }}</span>
        </div>

        <div class="path-badge" *ngIf="safeConfig.jsonPath">
          <code>{{ safeConfig.jsonPath }}</code>
        </div>
      </div>

      <div class="card-footer">
        <span class="last-sync" *ngIf="lastUpdated">Updated {{ lastUpdated | date:'HH:mm:ss' }}</span>
        <span class="poll-interval">{{ refreshIntervalSec }}s refresh</span>
      </div>
    </div>
  `,
  styles: [`
    .rest-fetch-card {
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: inherit;
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.12);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #f8fafc;
      overflow: hidden;
      box-sizing: border-box;
      font-family: inherit;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .widget-icon {
      font-size: 1.15rem;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }

    .widget-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
      position: relative;
    }

    .status-indicator.online {
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
    }

    .status-indicator.error {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
    }

    .pulse-dot {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    .status-indicator.online .pulse-dot {
      animation: pulse 2s infinite;
      background: rgba(16, 185, 129, 0.5);
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }

    .card-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 6px 0;
      min-height: 0;
    }

    .value-container {
      display: flex;
      align-items: baseline;
      gap: 3px;
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1.1;
      text-align: center;
    }

    .prefix {
      font-size: 1.4rem;
      color: #94a3b8;
      font-weight: 600;
    }

    .main-val {
      font-size: 2.2rem;
      color: #ffffff;
      background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .unit {
      font-size: 1rem;
      color: #38bdf8;
      font-weight: 600;
      letter-spacing: 0;
    }

    .path-badge {
      margin-top: 4px;
    }

    .path-badge code {
      font-size: 0.65rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1px 6px;
      border-radius: 4px;
      color: #94a3b8;
    }

    .error-container {
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      text-align: center;
    }

    .error-msg {
      font-size: 0.75rem;
      color: #fca5a5;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.68rem;
      color: #64748b;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .last-sync {
      color: #94a3b8;
    }

    .poll-interval {
      opacity: 0.8;
    }
  `]
})
export class RestFetchWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: RestFetchConfig = {};

  displayValue: string = '—';
  status: 'online' | 'error' | 'loading' = 'loading';
  statusText: string = 'Connecting...';
  errorMessage: string = '';
  lastUpdated: Date | null = null;

  private destroy$ = new Subject<void>();

  get safeConfig(): RestFetchConfig {
    return this.config || {};
  }

  get refreshIntervalSec(): number {
    const sec = Number(this.safeConfig.refreshSeconds);
    return (sec && sec >= 5 && sec <= 3600) ? sec : 30;
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && !changes['config'].firstChange) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startPolling(): void {
    this.destroy$.next();

    if (!this.safeConfig.url) {
      this.displayValue = 'Configure URL';
      this.status = 'error';
      this.statusText = 'No URL specified';
      return;
    }

    // Immediate first fetch
    this.fetchData();

    // Periodic poll
    interval(this.refreshIntervalSec * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchData();
      });
  }

  private fetchData(): void {
    const url = this.safeConfig.url?.trim();
    if (!url) return;

    let headers = new HttpHeaders();
    if (this.safeConfig.authHeader) {
      headers = headers.set('Authorization', this.safeConfig.authHeader.trim());
    }

    this.http.get<any>(url, { headers })
      .pipe(
        catchError(err => {
          this.status = 'error';
          this.statusText = err.message || 'Fetch failed';
          this.errorMessage = err.status === 0 ? 'CORS / Network Unreachable' : `HTTP Error ${err.status}`;
          return of(null);
        })
      )
      .subscribe(res => {
        if (res !== null) {
          this.status = 'online';
          this.statusText = 'Connected & Live';
          this.errorMessage = '';
          this.lastUpdated = new Date();
          this.displayValue = this.extractValue(res, this.safeConfig.jsonPath);
        }
      });
  }

  private extractValue(data: any, path?: string): string {
    if (data === null || data === undefined) return '—';

    // If no path specified, check if data is already a scalar
    if (!path || !path.trim()) {
      if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean') {
        return String(data);
      }
      // If object has a 'state' (common Home Assistant key) or 'value' or 'result'
      if (data.state !== undefined) return String(data.state);
      if (data.value !== undefined) return String(data.value);
      if (data.result !== undefined) return String(data.result);
      return JSON.stringify(data).slice(0, 24);
    }

    // Traverse dot-notation path, e.g. "bpi.USD.rate" or "data.0.price"
    const parts = path.trim().replace(/\[(\w+)\]/g, '.$1').split('.').filter(p => !!p);
    let cur: any = data;

    for (const part of parts) {
      if (cur === null || cur === undefined) return '—';
      cur = cur[part];
    }

    if (cur === null || cur === undefined) return '—';

    // Format numbers nicely
    if (typeof cur === 'number') {
      if (Number.isInteger(cur)) {
        return cur.toLocaleString('en-US');
      }
      return cur.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    return String(cur);
  }
}
