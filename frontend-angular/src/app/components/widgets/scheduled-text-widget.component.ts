import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';

export interface ScheduledTextConfig {
  message?: string;
  startTime?: string;
  endTime?: string;
  showDays?: string[];
}

@Component({
  selector: 'app-scheduled-text-widget',
  template: `
    <div class="scheduled-text-card" [class.inactive]="!isActive">
      <!-- Active Announcement Mode -->
      <ng-container *ngIf="isActive; else scheduledInactive">
        <div class="card-header">
          <div class="status-indicator">
            <span class="live-dot"></span>
            <span class="status-label">Active</span>
          </div>
          <span class="time-window-hint">{{ safeConfig.startTime }} – {{ safeConfig.endTime }}</span>
        </div>

        <div class="announcement-body">
          <span class="quote-mark">“</span>
          <p class="announcement-text">{{ safeConfig.message }}</p>
        </div>

        <div class="card-footer">
          <span class="active-badge">Active Announcement</span>
        </div>
      </ng-container>

      <!-- Outside Window: Dimmed Scheduled Badge Mode -->
      <ng-template #scheduledInactive>
        <div class="scheduled-container">
          <div class="scheduled-badge">
            <span class="schedule-icon">🕒</span>
            <span class="badge-title">Scheduled</span>
            <span class="badge-range">{{ safeConfig.startTime }} – {{ safeConfig.endTime }}</span>
          </div>

          <div class="dimmed-content">
            <p class="dimmed-message">{{ safeConfig.message }}</p>
          </div>

          <div class="scheduled-days" *ngIf="safeConfig.showDays && safeConfig.showDays.length">
            <span 
              *ngFor="let day of allDays" 
              class="day-pill"
              [class.day-active]="isDayConfigured(day)"
            >
              {{ day }}
            </span>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .scheduled-text-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 18px 20px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
      color: #ffffff;
      transition: all 0.3s ease;
    }

    .scheduled-text-card.inactive {
      opacity: 0.72;
    }

    /* Active Header */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 3px 10px;
      border-radius: 20px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #22c55e;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }

    .status-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #4ade80;
    }

    .time-window-hint {
      font-size: 0.78rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.55);
      font-variant-numeric: tabular-nums;
    }

    /* Active Body */
    .announcement-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 8px 0;
      position: relative;
    }

    .quote-mark {
      font-size: 2.4rem;
      line-height: 1;
      color: rgba(255, 255, 255, 0.2);
      font-family: Georgia, serif;
      margin-bottom: -10px;
    }

    .announcement-text {
      font-size: clamp(1.05rem, 2.5vw, 1.35rem);
      font-weight: 600;
      line-height: 1.4;
      color: #ffffff;
      margin: 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      letter-spacing: -0.2px;
    }

    /* Active Footer */
    .card-footer {
      display: flex;
      justify-content: flex-start;
      margin-top: 4px;
    }

    .active-badge {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: rgba(255, 255, 255, 0.45);
    }

    /* Inactive / Dimmed Scheduled State */
    .scheduled-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 6px 0;
    }

    .scheduled-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 20px;
      padding: 5px 14px;
    }

    .schedule-icon {
      font-size: 0.9rem;
    }

    .badge-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94a3b8;
    }

    .badge-range {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
      font-variant-numeric: tabular-nums;
    }

    .dimmed-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 8px;
    }

    .dimmed-message {
      font-size: 0.95rem;
      font-weight: 400;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.4);
      margin: 0;
      font-style: italic;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .scheduled-days {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .day-pill {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .day-pill.day-active {
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.18);
    }
  `]
})
export class ScheduledTextWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    message: 'Good morning! Have a great day!',
    startTime: '06:00',
    endTime: '12:00',
    showDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  isActive: boolean = false;
  allDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  private checkIntervalId: any;

  get safeConfig(): ScheduledTextConfig {
    return {
      message: this.config?.message ?? 'Good morning! Have a great day!',
      startTime: this.config?.startTime ?? '06:00',
      endTime: this.config?.endTime ?? '12:00',
      showDays: this.config?.showDays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };
  }

  ngOnInit(): void {
    this.evaluateSchedule();
    this.checkIntervalId = setInterval(() => {
      this.evaluateSchedule();
    }, 30000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.evaluateSchedule();
    }
  }

  ngOnDestroy(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }
  }

  isDayConfigured(day: string): boolean {
    const list = this.safeConfig.showDays || [];
    const target = day.toLowerCase();
    return list.some((d: string) => {
      const lower = d.toLowerCase();
      return lower === target || lower.startsWith(target) || target.startsWith(lower);
    });
  }

  evaluateSchedule(): void {
    const now = new Date();

    // 1. Day Check
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = dayNames[now.getDay()];
    const isDayAllowed = this.isDayConfigured(currentDayName);

    // 2. Time Window Check
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startTimeStr = this.safeConfig.startTime || '06:00';
    const endTimeStr = this.safeConfig.endTime || '12:00';

    const [startH, startM] = startTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let isTimeAllowed = false;
    if (startMinutes <= endMinutes) {
      // Normal range within same day (e.g. 06:00 - 12:00)
      isTimeAllowed = nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // Overnight range spanning midnight (e.g. 22:00 - 06:00)
      isTimeAllowed = nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }

    this.isActive = isDayAllowed && isTimeAllowed;
  }
}
