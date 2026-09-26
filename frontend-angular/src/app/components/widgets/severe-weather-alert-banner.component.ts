import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface SevereWeatherAlertData {
  title?: string;
  message: string;
  severity?: 'watch' | 'warning' | 'emergency';
  city?: string;
  source?: string;
}

@Component({
  selector: 'app-severe-weather-alert-banner',
  template: `
    <div 
      class="severe-alert-bar" 
      *ngIf="alert" 
      [ngClass]="alert.severity || 'warning'"
      role="alert"
    >
      <div class="alert-pulse-aura"></div>
      
      <div class="alert-inner">
        <div class="alert-icon-wrap">
          <span class="alert-emoji">{{ getAlertIcon(alert) }}</span>
        </div>

        <div class="alert-text-stack">
          <div class="alert-badge-row">
            <span class="alert-pill">{{ (alert.severity || 'WARNING') | uppercase }}</span>
            <span class="alert-city-tag" *ngIf="alert.city">📍 {{ alert.city }}</span>
            <span class="alert-source-tag" *ngIf="alert.source">Source: {{ alert.source }}</span>
          </div>
          <div class="alert-message-line">
            <strong class="alert-title">{{ alert.title || 'Severe Weather Warning' }}</strong>
            <span class="alert-desc" *ngIf="alert.message"> — {{ alert.message }}</span>
          </div>
        </div>

        <button 
          *ngIf="dismissable" 
          type="button" 
          class="btn-alert-dismiss" 
          (click)="onDismiss()" 
          title="Dismiss alert banner on this screen"
        >
          ✕
        </button>
      </div>
    </div>
  `,
  styles: [`
    .severe-alert-bar {
      position: absolute;
      top: 14px;
      left: 20px;
      right: 20px;
      z-index: 999;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(16px);
      animation: alertSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    @keyframes alertSlideDown {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .severe-alert-bar.warning {
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.92));
      border-color: rgba(251, 191, 36, 0.5);
    }

    .severe-alert-bar.emergency {
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95));
      border-color: rgba(248, 113, 113, 0.6);
      animation: emergencyPulse 2s infinite ease-in-out, alertSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .severe-alert-bar.watch {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.95), rgba(3, 105, 161, 0.92));
      border-color: rgba(56, 189, 248, 0.5);
    }

    @keyframes emergencyPulse {
      0%, 100% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.6); }
      50% { box-shadow: 0 0 45px rgba(239, 68, 68, 0.9); }
    }

    .alert-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 18px;
      color: #fff;
    }

    .alert-icon-wrap {
      font-size: 1.6rem;
      flex-shrink: 0;
      animation: wobble 2s infinite ease-in-out;
    }

    @keyframes wobble {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-8deg); }
      40% { transform: rotate(8deg); }
    }

    .alert-text-stack {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .alert-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .alert-pill {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .alert-city-tag, .alert-source-tag {
      font-size: 0.72rem;
      font-weight: 600;
      opacity: 0.9;
    }

    .alert-message-line {
      font-size: 0.88rem;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .alert-title {
      font-weight: 700;
    }

    .alert-desc {
      font-weight: 400;
      opacity: 0.95;
    }

    .btn-alert-dismiss {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: bold;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-alert-dismiss:hover {
      background: rgba(255, 255, 255, 0.35);
      transform: scale(1.08);
    }
  `]
})
export class SevereWeatherAlertBannerComponent {
  @Input() alert: SevereWeatherAlertData | null = null;
  @Input() dismissable: boolean = true;
  @Output() dismissed = new EventEmitter<void>();

  getAlertIcon(alert: SevereWeatherAlertData): string {
    const text = ((alert.title || '') + ' ' + (alert.message || '')).toLowerCase();
    if (text.includes('tornado') || alert.severity === 'emergency') return '🌪️';
    if (text.includes('flood') || text.includes('surge') || text.includes('tsunami')) return '🌊';
    if (text.includes('blizzard') || text.includes('snow') || text.includes('freeze') || text.includes('ice')) return '❄️';
    if (text.includes('hurricane') || text.includes('gale') || text.includes('wind')) return '💨';
    if (text.includes('fire') || text.includes('smoke') || text.includes('heat')) return '🔥';
    if (text.includes('thunder') || text.includes('lightning') || text.includes('hail')) return '⚡';
    return '⚠️';
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
