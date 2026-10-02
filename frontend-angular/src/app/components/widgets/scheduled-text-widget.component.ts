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
    <div class="scheduled-text-card sd-card" [class.inactive]="!isActive">
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
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
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
      background: var(--sd-success-soft);
      border: 1px solid color-mix(in srgb, var(--sd-success) 40%, transparent);
      padding: 3px 10px;
      border-radius: 20px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--sd-success);
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-success) 70%, transparent);
      animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-success) 70%, transparent);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px transparent;
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 transparent;
      }
    }

    .status-label {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--sd-success);
    }

    .time-window-hint {
      font-size: var(--sd-fs-sm);
      font-weight: 500;
      color: var(--sd-text-muted);
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
      font-size: var(--sd-fs-xl);
      line-height: 1;
      color: var(--sd-text-subtle);
      opacity: 0.5;
      font-family: Georgia, serif;
      margin-bottom: -10px;
    }

    .announcement-text {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      line-height: 1.4;
      color: var(--sd-text);
      margin: 0;
      text-shadow: var(--sd-text-shadow);
      letter-spacing: -0.2px;
    }

    /* Active Footer */
    .card-footer {
      display: flex;
      justify-content: flex-start;
      margin-top: 4px;
    }

    .active-badge {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      letter-spacing: 0.3px;
      color: var(--sd-text-subtle);
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
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: 20px;
      padding: 5px 14px;
    }

    .schedule-icon {
      font-size: 0.9rem;
    }

    .badge-title {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--sd-text-muted);
    }

    .badge-range {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: var(--sd-text-muted);
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
      font-size: var(--sd-fs-title);
      font-weight: 400;
      line-height: 1.4;
      color: var(--sd-text-subtle);
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
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--sd-surface-2);
      color: var(--sd-text-subtle);
      opacity: 0.6;
      border: var(--sd-border);
    }

    .day-pill.day-active {
      color: var(--sd-text-muted);
      background: var(--sd-surface-3);
      opacity: 1;
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
