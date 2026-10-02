import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClockService } from '../../services/clock.service';

@Component({
  selector: 'app-clock-widget',
  template: `
    <div class="clock-card sd-card">
      <div class="clock-content">
        <div class="time-row">
          <span class="hours-mins">{{ currentTime | date:(is24Hour ? 'HH:mm' : 'hh:mm') }}</span>
          <div class="seconds-col" *ngIf="showSeconds">
            <span class="seconds">{{ currentTime | date:'ss' }}</span>
            <span class="period" *ngIf="!is24Hour">{{ currentTime | date:'a' }}</span>
          </div>
          <span class="period-solo" *ngIf="!showSeconds && !is24Hour">{{ currentTime | date:'a' }}</span>
        </div>

        <div class="date-row" *ngIf="config.showDate !== false">
          <div class="date-badge">
            <svg class="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="date-text">{{ currentTime | date:'EEEE, MMMM d' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clock-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .clock-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .time-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      line-height: 1;
    }
    .hours-mins {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-hero);
      font-weight: var(--sd-weight-display);
      letter-spacing: -1.5px;
      color: var(--sd-text);
      font-variant-numeric: tabular-nums;
    }
    .seconds-col {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .seconds {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-title);
      font-weight: 600;
      color: var(--sd-accent);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .period, .period-solo {
      font-family: var(--font-main, sans-serif);
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--sd-text-muted);
    }
    .period-solo {
      margin-left: 4px;
      align-self: flex-end;
      margin-bottom: 8px;
    }
    .date-row {
      margin-top: 10px;
    }
    .date-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      padding: 4px 10px;
      border-radius: 20px;
    }
    .cal-icon {
      width: 13px;
      height: 13px;
      color: var(--sd-accent);
    }
    .date-text {
      font-size: var(--sd-fs-body);
      font-weight: 500;
      color: var(--sd-text);
      letter-spacing: 0.2px;
    }
  `]
})
export class ClockWidgetComponent implements OnInit, OnDestroy {
  constructor(private clock: ClockService) {}

  @Input() config: any = { showDate: true, format: 'hh:mm:ss a' };
  currentTime: Date = new Date();
  private timerId?: Subscription;

  get is24Hour(): boolean {
    return this.config.format ? this.config.format.includes('HH') : false;
  }

  get showSeconds(): boolean {
    return this.config.format ? this.config.format.includes('ss') : true;
  }

  ngOnInit(): void {
    this.timerId = this.clock.tick$.subscribe(() => {
      this.currentTime = new Date();
    });
  }

  ngOnDestroy(): void {
    this.timerId?.unsubscribe();
  }
}
