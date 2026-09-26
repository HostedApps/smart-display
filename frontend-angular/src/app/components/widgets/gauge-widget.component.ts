import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

export interface GaugeConfig {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  title?: string;
  warnThreshold?: number;
  critThreshold?: number;
  colorScheme?: 'green-yellow-red' | 'blue-cyan-emerald' | 'amber-orange-red';
  icon?: string;
}

@Component({
  selector: 'app-gauge-widget',
  template: `
    <div class="gauge-card">
      <div class="card-header">
        <div class="title-wrap">
          <span class="widget-icon">{{ safeConfig.icon || '⚡' }}</span>
          <span class="widget-title">{{ safeConfig.title || 'Metric Gauge' }}</span>
        </div>
        <span class="threshold-badge" [ngClass]="severityClass">{{ severityLabel }}</span>
      </div>

      <div class="gauge-svg-container">
        <svg viewBox="0 0 200 125" class="gauge-svg">
          <defs>
            <linearGradient id="gaugeTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="60%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#ef4444" />
            </linearGradient>
            <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0ea5e9" />
              <stop offset="70%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- Background Track Arc (Radius 70, from 180 to 0 degrees) -->
          <path
            d="M 25 110 A 75 75 0 0 1 175 110"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            stroke-width="16"
            stroke-linecap="round"
          />

          <!-- Colored Active Value Arc -->
          <path
            d="M 25 110 A 75 75 0 0 1 175 110"
            fill="none"
            [attr.stroke]="activeColor"
            stroke-width="16"
            stroke-linecap="round"
            [attr.stroke-dasharray]="arcLength"
            [attr.stroke-dashoffset]="dashOffset"
            filter="url(#gaugeGlow)"
            class="active-arc"
          />

          <!-- Center Pivot Accent Circle -->
          <circle cx="100" cy="110" r="6" fill="#f8fafc" opacity="0.3" />
        </svg>

        <!-- Center Value Overlay -->
        <div class="center-value-overlay">
          <div class="val-display">
            <span class="num">{{ displayValue }}</span>
            <span class="unit" *ngIf="safeConfig.unit">{{ safeConfig.unit }}</span>
          </div>
          <div class="percent-label">{{ percent | number:'1.0-0' }}%</div>
        </div>
      </div>

      <div class="gauge-footer">
        <span class="scale-limit">{{ min }}</span>
        <span class="scale-limit">{{ max }}</span>
      </div>
    </div>
  `,
  styles: [`
    .gauge-card {
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: inherit;
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.12);
      padding: 12px 16px;
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
      gap: 6px;
    }

    .title-wrap {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }

    .widget-icon {
      font-size: 1.1rem;
    }

    .widget-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .threshold-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .threshold-badge.normal {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .threshold-badge.warn {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .threshold-badge.crit {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      animation: alertPulse 1.5s infinite;
    }

    @keyframes alertPulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    .gauge-svg-container {
      position: relative;
      width: 100%;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    .gauge-svg {
      width: 100%;
      height: 100%;
      max-height: 140px;
      overflow: visible;
    }

    .active-arc {
      transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
    }

    .center-value-overlay {
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
    }

    .val-display {
      display: flex;
      align-items: baseline;
      gap: 2px;
    }

    .val-display .num {
      font-size: 1.8rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }

    .val-display .unit {
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .percent-label {
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    .gauge-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.68rem;
      font-weight: 600;
      color: #64748b;
      padding: 0 8px;
    }
  `]
})
export class GaugeWidgetComponent implements OnInit, OnChanges {
  @Input() config: GaugeConfig = {};

  arcLength = Math.PI * 75; // ~235.619px (semi-circle perimeter for r=75)

  get safeConfig(): GaugeConfig {
    return this.config || {};
  }

  get min(): number {
    return this.safeConfig.min !== undefined ? Number(this.safeConfig.min) : 0;
  }

  get max(): number {
    return this.safeConfig.max !== undefined ? Number(this.safeConfig.max) : 100;
  }

  get value(): number {
    return this.safeConfig.value !== undefined ? Number(this.safeConfig.value) : 68;
  }

  get percent(): number {
    const range = this.max - this.min;
    if (range <= 0) return 0;
    const clamped = Math.max(this.min, Math.min(this.max, this.value));
    return ((clamped - this.min) / range) * 100;
  }

  get dashOffset(): number {
    const ratio = Math.max(0, Math.min(1, this.percent / 100));
    return this.arcLength * (1 - ratio);
  }

  get displayValue(): string {
    const v = this.value;
    return Number.isInteger(v) ? v.toString() : v.toFixed(1);
  }

  get severityClass(): 'normal' | 'warn' | 'crit' {
    const warn = this.safeConfig.warnThreshold !== undefined ? Number(this.safeConfig.warnThreshold) : 75;
    const crit = this.safeConfig.critThreshold !== undefined ? Number(this.safeConfig.critThreshold) : 90;

    if (this.value >= crit) return 'crit';
    if (this.value >= warn) return 'warn';
    return 'normal';
  }

  get severityLabel(): string {
    const sev = this.severityClass;
    if (sev === 'crit') return 'Critical';
    if (sev === 'warn') return 'Warning';
    return 'Normal';
  }

  get activeColor(): string {
    const scheme = this.safeConfig.colorScheme || 'green-yellow-red';
    if (scheme === 'blue-cyan-emerald') {
      return 'url(#cyanGrad)';
    }

    const sev = this.severityClass;
    if (sev === 'crit') return '#ef4444';
    if (sev === 'warn') return '#f59e0b';
    return '#10b981';
  }

  ngOnInit(): void {}
  ngOnChanges(changes: SimpleChanges): void {}
}
